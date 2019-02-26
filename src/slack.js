const { RTMClient, WebClient } = require("@slack/client");

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const bot = new WebClient(SLACK_BOT_TOKEN);

var join = function (token, channelName) {
  return new WebClient(token).channels.join({ name: channelName });
};

var listChannels = function (callback) {
  bot.channels
    .list()
    .then(res => {
      if (res.ok) callback(res);
    })
    .catch(console.error);
};

var listUsers = function (callback) {
  bot.users
    .list()
    .then(res => {
      if (res.ok) callback(res);
    })
    .catch(console.error);
};

var openIm = function (user, callback) {
  bot.im
    .open({
      user: user.id
    })
    .then(res => {
      if (res.ok) {
        res.channel.user = user;
        callback(res);
      }
    })
    .catch(console.error);
};

var postMessage = function (token, channelId, content) {
  return new WebClient(token).chat.postMessage({
    channel: channelId,
    text: content.text,
    link_names: true,
    attachments: content.attachments
  });
};

var updateMessage = function (message) {
  return bot.chat.update(message);
};

var sendSimpleMessage = function (channelId, message) {
  var content = { text: message };
  postMessage(SLACK_BOT_TOKEN, channelId, content).catch(console.error);
};

var initRtm = function (io) {
  const rtm = new RTMClient(SLACK_BOT_TOKEN);
  rtm.start();
  rtm.on("message", message => {
    //db.insert("messages", message.client_msg_id, message);
    io.emit("message", message);
  });
};

exports.initRtm = initRtm;
exports.join = join;
exports.listChannels = listChannels;
exports.listUsers = listUsers;
exports.openIm = openIm;
exports.postMessage = postMessage;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
