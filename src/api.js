const db = require("./db.js");
const slack = require("./slack.js");

var nbObjects = 0;

var speakRecurse = function (dialog, currentId) {
  console.log(dialog[currentId]);
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

exports.createDialog = function (callback) {
  var dialog = {
    "0": {
      channel: "greenit",
      wait: 0,
      text: "first message"
    },
    category: "daily",
    scheduling: 99999
  };
  db.insert("dialogs", "new-dialog", dialog, callback);
};

exports.deleteObjectInDb = function (collection, id, callback) {
  console.log("delete " + collection + " " + id);
  db.delete(collection, id, callback);
};

exports.getObjectInDb = function (collection, id, callback) {
  db.read(collection, { _id: new db.mongodb().ObjectId(id) }, callback);
};

exports.listObjectsInDb = function (collection, callback) {
  db.list(collection, callback);
};

exports.updateObjectInDb = function (collection, id, object, callback) {
  db.update(collection, id, object, callback);
};

exports.upsertObjectInDb = function (collection, object, callback) {
  db.upsert(collection, object, callback);
};

exports.upsertObjectsInDb = function (collection, objects, callback) {
  for (var idObject in objects) {
    db.upsert(collection, objects[idObject], incObjects);
  }
  waitForUpsertObjectsInDb(objects.length, callback);
};

var incObjects = function (result) {
  nbObjects++;
};

var waitForUpsertObjectsInDb = function (nbObjectsWaited, callback) {
  if (nbObjectsWaited !== nbObjects) {
    setTimeout(function () {
      waitForUpsertObjectsInDb(nbObjectsWaited, callback);
    }, 100);
  } else {
    nbObjects = 0;
    callback();
  }
};

exports.interactive = function (rawPayload) {
  var payload = JSON.parse(rawPayload);
  db.read("surveys", { name: payload.actions[0].name }, function (data) {
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
    db.updateByName("surveys", payload.actions[0].name, data);

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

exports.listDialogs = function (callback) {
  db.list("dialogs", callback);
};

exports.listChannels = function (callback) {
  slack.listChannels(callback);
};

exports.listMessages = function (callback) {
  db.list("messages", callback);
};

exports.listUsers = function (callback) {
  slack.listUsers(callback);
};

exports.openIm = function (user, callback) {
  slack.openIm(user, callback);
};

exports.processDialog = function (collection, id) {
  db.read(collection, { _id: new db.mongodb().ObjectId(id) }, function (data) {
    if (data !== null) {
      speakRecurse(data, "0");
    }
  });
};

exports.resumeDialogs = function () {
  db.read("global", { name: "state" }, function (data) {
    if (data === null) {
      data = {};
      data.daily = 1;
      data.name = "state";
      db.insert("global", "state", data);
    }
    this.processDialog("daily", data.daily.toString());
    data.daily++;
    db.updateByName("global", "state", data);
  });
};

exports.sendSimpleMessage = function (channelId, message) {
  slack.sendSimpleMessage(channelId, message);
};
