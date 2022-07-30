const schedule = require("node-schedule");
const logger = require("./logger.js");

require('dotenv').config();

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

let app

exports.setApp = function(newApp) {
    app = newApp;
}

exports.initJobs = function () {
    schedule.scheduleJob("* * * * * *", postShift);
    schedule.scheduleJob("*/2 * * * * *", updateShift);
};

exports.getAccessToken = function (code) {
  return app.client.oauth.v2.access({ 
    client_id: SLACK_CLIENT_ID, 
    client_secret: SLACK_CLIENT_SECRET,
    code: code,
    redirect_uri: process.env.APP_URL + "/api/oauth" });
};

exports.authTest = function (workspace) {
    return app.client.auth.test({ token: workspace.access_token });
};

exports.join = function (workspace, channelId) {
    return app.client.conversations.join({ token: workspace.access_token, channel: channelId });
};

exports.listUsers = function (workspace) {
    return app.client.users.list({ token: workspace.access_token });
};

exports.openIM = function (workspace, params) {
    params.token = workspace.access_token;
    return app.client.conversations.open(params);
}

exports.revokeToken = function (workspace) {
    return app.client.auth.revoke(workspace.access_token);
};

exports.sendSimpleMessage = function (workspace, channelId, message) {
    var content = { text: message };
    exports.postMessage(workspace, channelId, content);
};

exports.uploadFiles = function (workspace, files) {
    files.token = workspace.access_token;
    return app.client.files.upload(files);
};

exports.publishHome = function (workspace, userId, view) {
  return app.client.views.publish({
      token: workspace.access_token,
      user_id: userId,
      view: view
    });
};

exports.updateView = function (workspace, viewId, view) {
  return app.client.views.update({
      token: workspace.access_token,
      view_id: viewId,
      view: view
    });
};

exports.publishDefaultHome = function (workspace, userId) {
  return exports.publishHome(workspace, userId, {
    "type": "home",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Welcome home, <@" + userId + "> :house:*"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Learn how home tabs can be more useful and interactive <https://api.slack.com/surfaces/tabs/using|*in the documentation*>."
        }
      }
    ]
  })
};

var postQueue = [];
exports.postMessage = function (workspace, channelId, message) {
    logger.debug(JSON.stringify(message.blocks));
    if (message.blocks !== undefined && message.blocks.length > 0) {
        postQueue.push({
            token: workspace.access_token,
            message: {
                channel: channelId,
                type: "message",
                text: "Impossible d'afficher ce contenu",
                blocks: JSON.stringify(message.blocks),
                link_names: true
            }
        });
    } else {
        postQueue.push({
            token: workspace.access_token,
            message: {
                channel: channelId,
                text: message.text,
                link_names: true,
                attachments: message.attachments
            }
        });
    }
};
var postShift = function () {
    var shift = postQueue.shift();
    if (shift !== undefined) {
        (async (app) => {
            try {
                shift.message.token = shift.token;
                await app.client.chat.postMessage(shift.message);
            } catch (error) {
                logger.error(error);
            }
        })(app);
    }
};

var updateQueue = [];
exports.updateMessage = function (workspace, message) {
    updateQueue.push({
        token: workspace.access_token,
        message: message
    })
};
var updateShift = function () {
    var shift = updateQueue.shift();
    if (shift !== undefined) {
        (async (app) => {
            try {
                shift.message.token = shift.token;
                logger.debug("Sending Slack chat.update : " + shift.message.blocks);
                await app.client.chat.update(shift.message);
            } catch (error) {
                logger.error(error);
            }
        })(app);
    }
};
