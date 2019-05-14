const { RTMClient, WebClient } = require("@slack/client");
const schedule = require("node-schedule");
const db = require("./db.js");
const logger = require("./logger.js");

var initJobs = function() {
  schedule.scheduleJob("* * * * * *", postShift);
};

var initRtm = function (workspace) {
  const rtm = new RTMClient(workspace.bot.bot_access_token);
  rtm.start();
  rtm.on("message", message => {
    db.insert("messages", message);
  });
};

var join = function (tokens, channelName) {
  return new WebClient(tokens.user_access_token).channels.join({ name: channelName });
};

var listUsers = function (workspace) {
  return new WebClient(workspace.bot.bot_access_token).users.list();
};

var openIM = function (workspace, params) {
  return new WebClient(workspace.bot.bot_access_token).im.open(params);
}

var postQueue = [];
var postMessage = function (workspace, channelId, content) {
  if(content.text !== undefined) {
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
var postShift = function() {
  var shift = postQueue.shift();
  if(shift !== undefined) {
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