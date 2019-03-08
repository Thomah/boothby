const { RTMClient, WebClient } = require("@slack/client");
const db = require("./db.js");

var initRtm = function (tokens) {
  const rtm = new RTMClient(tokens.bot_access_token);
  rtm.start();
  rtm.on("message", message => {
    db.insert("messages", message);
  });
};

var join = function (tokens, channelName) {
  return new WebClient(tokens.user_access_token).channels.join({ name: channelName });
};

var postMessage = function (tokens, channelId, content) {
  return new WebClient(tokens.bot_access_token).chat.postMessage({
    channel: channelId,
    text: content.text,
    link_names: true,
    attachments: content.attachments
  });
};

var revokeToken = function (tokens) {
  return new WebClient(tokens.bot_access_token).auth.revoke(tokens.user_access_token);
};

var sendSimpleMessage = function (token, channelId, message) {
  var content = { text: message };
  postMessage({bot_access_token: token}, channelId, content).catch(console.error);
};

var updateMessage = function (tokens, message) {
  return new WebClient(tokens.bot_access_token).chat.update(message);
};

exports.initRtm = initRtm;
exports.join = join;
exports.postMessage = postMessage;
exports.revokeToken = revokeToken;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
