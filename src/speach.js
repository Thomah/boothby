require("dotenv").config();
var fs = require("fs");
var MongoClient = require("mongodb").MongoClient;

(function() {
  var web;
  var conversationId;
  var dialog;

  var join = function(channelName) {
    return web.channels.join({ name: channelName });
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

  var readDb = function(collection, name, callback) {
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db("heroku_5fr6w04p");
        db.collection(collection).findOne({ name: name }, function(
          err,
          result
        ) {
          if (error) throw error;
          database.close();
          callback(result);
        });
      }
    );
  };

  var updateInDb = function(collection, name, content) {
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db("heroku_5fr6w04p");
        db.collection(collection).updateOne(
          { name: name },
          {
            $set: content
          },
          function(error, results) {
            if (error) throw error;
            database.close();
          }
        );
      }
    );
  };

  var insertInDb = function(collection, name, content) {
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db("heroku_5fr6w04p");
        db.collection(collection).insertOne(content, function(error, results) {
          if (error) throw error;
          database.close();
        });
      }
    );
  };

  module.exports.readDb = readDb;
  module.exports.updateInDb = updateInDb;
  module.exports.insertInDb = insertInDb;
  module.exports.join = join;

  module.exports.Speach = function(webClient) {
    web = webClient;
  };

  module.exports.processDialog = function(id) {
    dialog = require("./dialogs/" + id + ".json");
    speakRecurse("main");
  };

  module.exports.survey = function(req) {
    var payload = JSON.parse(req.body.payload);
    readDb("surveys", payload.actions[0].name, function(data) {
      var newMessage = payload.original_message;
      if (data === null) {
        data = {};
        data.name = payload.actions[0].name;
        insertInDb("surveys", payload.actions[0].name, data);
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
      updateInDb("surveys", payload.actions[0].name, data);

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
})();
