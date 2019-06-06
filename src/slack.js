const { RTMClient, WebClient } = require("@slack/client");
const schedule = require("node-schedule");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const workspaces = require("./workspaces.js");

var initJobs = function () {
  schedule.scheduleJob("* * * * * *", postShift);
};

var initRtm = function (workspace) {
  const rtm = new RTMClient(workspace.bot.bot_access_token);
  rtm.start();
  rtm.on("message", message => {
    if(message.text !== undefined) {
      db.insert("messages", message);
    }
    if(message.text === ":house:") {
      db.read("workspaces", { team_id: message.team }, function(workspacesInDb) {
        var workspace = workspacesInDb;
        if(workspacesInDb.access_token === undefined) {
          workspace = workspacesInDb[0];
        }
        var user = workspaces.getUsersByChannelId(workspace, message.channel);
        if(user !== null) {
          db.read("dialogs", { name: "Consent PM"}, function(dialog) {
            dialog.channelId = message.channel;
            dialogs.speakRecurse(workspace, dialog, "0", () => {});
          })
        }
      });
    }
  });
  rtm.on("team_join", event => {
    db.read("workspaces", { team_id: event.user.team_id }, function (workspacesOfNewUser) {
      if(!Array.isArray(workspacesOfNewUser)) {
        workspacesOfNewUser = [workspacesOfNewUser];
      }
      var previous_bot_access_token = [];
      for (var workspaceNum in workspacesOfNewUser) {
        var workspaceOfNewUser = workspacesOfNewUser[workspaceNum];
        if(previous_bot_access_token.indexOf(workspaceOfNewUser.bot.bot_access_token) < 0) {
          workspaces.openIM(workspaceOfNewUser, [event.user], 0, function () {
            var workspaceId = workspaceOfNewUser._id;
            db.update("workspaces", { _id: new db.mongodb().ObjectId(workspaceId) }, workspaceOfNewUser, function () {
              db.read("dialogs", {name: "Consent PM"}, function(dialog) {
                dialog.channelId = workspaces.getUsersById(workspaceOfNewUser, event.user.id).im_id;
                workspaceOfNewUser._id = workspaceId;
                dialogs.speakRecurse(workspaceOfNewUser, dialog, 0);
              });
            });
          });
          previous_bot_access_token.push(workspaceOfNewUser.bot.bot_access_token);
        }
      }
    });
  });
};

var join = function (workspace, channelName) {
  return new WebClient(workspace.access_token).channels.join({ name: channelName });
};

var listUsers = function (workspace) {
  return new WebClient(workspace.bot.bot_access_token).users.list();
};

var openIM = function (workspace, params) {
  return new WebClient(workspace.bot.bot_access_token).im.open(params);
}

var postQueue = [];
var postMessage = function (workspace, channelId, content) {
  if (content.text !== undefined) {
    postQueue.push({
      token: workspace.bot.bot_access_token,
      message: {
        channel: channelId,
        text: content.text,
        link_names: true,
        attachments: content.attachments
      }
    })
  } else {
    postQueue.push({
      token: workspace.bot.bot_access_token,
      message: {
        channel: channelId,
        type: "message",
        text: "Impossible d'afficher ce contenu",
        blocks: JSON.stringify(content),
        link_names: true
      }
    })
  }
};
var postShift = function () {
  var shift = postQueue.shift();
  if (shift !== undefined) {
    new WebClient(shift.token).chat.postMessage(shift.message)
      .then(() => { })
      .catch(logger.error);
  }
};

var revokeToken = function (workspace) {
  return new WebClient(workspace.bot.bot_access_token).auth.revoke(workspace.access_token);
};

var sendSimpleMessage = function (workspace, channelId, message) {
  var content = { text: message };
  postMessage(workspace, channelId, content);
};

var updateMessage = function (workspace, message) {
  return new WebClient(workspace.bot.bot_access_token).chat.update(message);
};

var uploadFiles = function (workspace, files) {
  return new WebClient(workspace.bot.bot_access_token).files.upload(files);
};

exports.initJobs = initJobs;
exports.initRtm = initRtm;
exports.join = join;
exports.listUsers = listUsers;
exports.openIM = openIM;
exports.postMessage = postMessage;
exports.revokeToken = revokeToken;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
exports.uploadFiles = uploadFiles;