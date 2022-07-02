const https = require("https");
const schedule = require("node-schedule");
const querystring = require("querystring");
const logger = require("./logger.js");

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

exports.getAccessToken = function(code, callback_end, callback_err) {

  var b = new Buffer.from(SLACK_CLIENT_ID + ":" + SLACK_CLIENT_SECRET);
  var basicAuth = b.toString('base64');

  var postData = querystring.stringify({
    code: code,
    redirect_uri: process.env.APP_URL + "/api/oauth"
  });

  var options = {
    host: 'slack.com',
    path: '/api/oauth.v2.access',
    method: 'POST',
    headers: {
      "Authorization": "Basic " + basicAuth,
      "Content-Type": 'application/x-www-form-urlencoded'
    }
  };

  var req = https.request(options, function(response) {
    var str = ''
    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      callback_end(JSON.parse(str));
    });
  });
  
  req.on('error', function (err) {
    callback_err(JSON.parse(err));
  });
 
  req.write(postData);
  req.end();
}

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

var postQueue = [];
exports.postMessage = function (workspace, channelId, message) {
    logger.debug(JSON.stringify(message.blocks));
    if (message.blocks.length > 0) {
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
                await app.client.chat.update(shift.message);
            } catch (error) {
                logger.error(error);
            }
        })(app);
    }
};
