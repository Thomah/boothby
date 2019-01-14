const db = require("./db.js");
const slack = require("./slack.js");

var speakRecurse = function(dialog, currentId) {
  if (dialog[currentId].wait === undefined) {
    dialog[currentId].wait = 0;
  }
  setTimeout(() => {
    slack
      .join(dialog[currentId].channel)
      .then(res => {
        slack
          .postMessage(res.channel.id, dialog[currentId])
          .then(res => {
            if (dialog[currentId].next !== undefined) {
              speakRecurse(dialog, dialog[currentId].next);
            }
          })
          .catch(console.error);
      })
      .catch(console.error);
  }, dialog[currentId].wait);
};

exports.createDialog = function(callback) {
  var dialog = {
    "main": {
      "text": "first message"
    }
  };
  db.insert("dialogs-daily", "new-dialog", dialog, callback);
}

exports.deleteMessage = function(mesageId, callback) {
  db.delete("messages", mesageId, callback);
};

exports.getObjectInDb = function(collection, name, callback) {
  db.read(collection, name, callback);
};

exports.interactive = function(rawPayload) {
  var payload = JSON.parse(rawPayload);
  db.read("surveys", payload.actions[0].name, function(data) {
    var newMessage = payload.original_message;
    if (data === null) {
      data = {};
      data.name = payload.actions[0].name;
      db.insert("surveys", payload.actions[0].name, data);
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
    db.update("surveys", payload.actions[0].name, data);

    for (var id in data.texts) {
      newMessage.attachments[0].actions[data.actions[id]].text =
        data.texts[id] + " (" + data.values[id] + ")";
    }
    slack.updateMessage({
      channel: payload.channel.id,
      text: newMessage.text,
      link_names: true,
      ts: payload.message_ts,
      attachments: newMessage.attachments
    });
  });
};

exports.listDialogs = function(callback) {
  db.list("dialogs-daily", callback);
};

exports.listChannels = function(callback) {
  slack.listChannels(callback);
};

exports.listMessages = function(callback) {
  db.list("messages", callback);
};

exports.listUsers = function(callback) {
  slack.listUsers(callback);
};

exports.openIm = function(user, callback) {
  slack.openIm(user, callback);
};

exports.processDialog = function(collection, name) {
  db.read(`dialogs-${collection}`, name, function(data) {
    if (data !== null) {
      speakRecurse(data, "main");
    }
  });
};

exports.resumeDialogs = function() {
  db.read("global", "state", function(data) {
    if (data === null) {
      data = {};
      data.daily = 1;
      data.name = "state";
      db.insert("global", "state", data);
    }
    this.processDialog("daily", data.daily.toString());
    data.daily++;
    db.update("global", "state", data);
  });
};

exports.sendSimpleMessage = function(channelId, message) {
  slack.sendSimpleMessage(channelId, message);
};
