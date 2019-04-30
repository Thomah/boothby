const { RTMClient, WebClient } = require("@slack/client");
const db = require("./db.js");
const logger = require("./logger.js");

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

var post = function(workspace, channelId, blocks) {
  return new WebClient(workspace.bot.bot_access_token).chat.postMessage({
    channel: channelId,
    type: "message",
    text: "Impossible d'afficher ce contenu",
    blocks: JSON.stringify(blocks),
    link_names: true
  });
};

var postMessage = function (workspace, channelId, content) {
  return new WebClient(workspace.bot.bot_access_token).chat.postMessage({
    channel: channelId,
    text: content.text,
    link_names: true,
    attachments: content.attachments
  });
};

var revokeToken = function (workspace) {
  return new WebClient(workspace.bot.bot_access_token).auth.revoke(workspace.access_token);
};

var sendSimpleMessage = function (workspace, channelId, message) {
  var content = { text: message };
  postMessage(workspace, channelId, content).catch(logger.error);
};

var updateMessage = function (workspace, message) {
  return new WebClient(workspace.bot.bot_access_token).chat.update(message);
};

var uploadFiles = function(workspace, files) {
  return new WebClient(workspace.bot.bot_access_token).files.upload(files);
};

exports.initRtm = initRtm;
exports.join = join;
exports.listUsers = listUsers;
exports.openIM = openIM;
exports.post = post;
exports.postMessage = postMessage;
exports.revokeToken = revokeToken;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
exports.uploadFiles = uploadFiles;