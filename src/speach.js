const Path = require('path');
const Fs = require('fs');
const Db = require('./db');

(function() {
  var web;
  var conversationId;
  var dialog;

  var Speach = function(webClient) {
    web = webClient;
  };

  var loadInDb = function() {
    var directoryPath = Path.join(__dirname, 'dialogs');
    Fs.readdir(directoryPath, function (err, files) {
      if(err) {
        return console.log(`Unable to scan directory: ${err}`)
      }
      files.forEach(function (collection) {
        directoryPath = Path.join(__dirname, 'dialogs', collection);
        Fs.readdir(directoryPath, function (err, files) {
          if(err) {
            return console.log(`Unable to scan directory: ${err}`)
          }
          files.forEach(function (file) {
            var filename = file.slice(0, -5);
            Db.readDb(`dialogs/${collection}`, filename, function(data) {
              if(data === null) {
                Db.insertInDb(`dialogs/${collection}`, filename, require(`./dialogs/${collection}/${file}`));
              }
            });
          });
        });
      });
    });
  };

  var join = function(channelName) {
    return web.channels.join({ name: channelName });
  };

  var processDialog = function(collection, name) {
    Db.readDb(`dialogs/${collection}`, name, function(data) {
      dialog = data;
      if(dialog !== null) {
        speakRecurse('main');
      }
    });
  };

  var speakRecurse = function(currentId) {
    if (dialog[currentId].wait === undefined) {
      dialog[currentId].wait = 0;
    }
    setTimeout(() => {
      join(dialog[currentId].channel)
        .then(res => {
          conversationId = res.channel.id;
          publish(dialog[currentId])
            .then(res => {
              if (dialog[currentId].next !== undefined) {
                speakRecurse(dialog[currentId].next);
              }
            })
            .catch(console.error);
        })
        .catch(console.error);
    }, dialog[currentId].wait);
  };

  var publish = function(content) {
    return web.chat.postMessage({
      channel: conversationId,
      text: content.text,
      link_names: true,
      attachments: content.attachments
    });
  };

  var survey = function(req) {
    var payload = JSON.parse(req.body.payload);
    Db.readDb("surveys", payload.actions[0].name, function(data) {
      var newMessage = payload.original_message;
      if (data === null) {
        data = {};
        data.name = payload.actions[0].name;
        Db.insertInDb("surveys", payload.actions[0].name, data);
      }
      if (data.texts === undefined) {
        data.texts = {};
        data.actions = {};
        data.values = {};
        data.users = {};
        for (
          var noAction = 0;
          noAction < newMessage.attachments[0].actions.length;
          noAction++
        ) {
          var value = newMessage.attachments[0].actions[noAction].value;
          data.actions[value] = noAction;
          data.texts[value] = newMessage.attachments[0].actions[noAction].text;
          data.values[value] = 0;
        }
      }
      if (data.values[payload.actions[0].value] === undefined) {
        data.values[payload.actions[0].value] = 0;
      }
      if (data.users[payload.user.id] === undefined) {
        data.values[payload.actions[0].value]++;
        data.users[payload.user.id] = payload.actions[0].value;
      } else if (
        data.users[payload.user.id] !== undefined &&
        data.users[payload.user.id] !== payload.actions[0].value
      ) {
        data.values[data.users[payload.user.id]]--;
        data.users[payload.user.id] = payload.actions[0].value;
        data.values[payload.actions[0].value]++;
      } else {
        data.values[data.users[payload.user.id]]--;
        data.users[payload.user.id] = undefined;
      }
      Db.updateInDb("surveys", payload.actions[0].name, data);

      for (var id in data.texts) {
        newMessage.attachments[0].actions[data.actions[id]].text =
          data.texts[id] + " (" + data.values[id] + ")";
      }
      web.chat.update({
        channel: payload.channel.id,
        text: newMessage.text,
        link_names: true,
        ts: payload.message_ts,
        attachments: newMessage.attachments
      });
    });
  };
  
  module.exports.Speach = Speach;
  module.exports.loadInDb = loadInDb;
  module.exports.join = join;
  module.exports.processDialog = processDialog;
  module.exports.survey = survey;

})();
