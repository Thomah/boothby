const schedule = require("node-schedule");
const logger = require("./logger.js");

let app

var initJobs = function () {
    schedule.scheduleJob("* * * * * *", postShift);
    schedule.scheduleJob("*/2 * * * * *", updateShift);
};

var setApp = function(newApp) {
    app = newApp;
}

var authTest = function (workspace) {
    return app.client.auth.test({ token: workspace.access_token });
};

var join = function (workspace, channelId) {
    return app.client.conversations.join({ token: workspace.access_token, channel: channelId });
};

var listUsers = function (workspace) {
    return app.client.users.list({ token: workspace.access_token });
};

var openIM = function (workspace, params) {
    params.token = workspace.access_token;
    return app.client.conversations.open(params);
}

var postQueue = [];
var postMessage = function (workspace, channelId, content) {
    if (content.text !== undefined) {
        postQueue.push({
            token: workspace.access_token,
            message: {
                channel: channelId,
                text: content.text,
                link_names: true,
                attachments: content.attachments
            }
        })
    } else {
        postQueue.push({
            token: workspace.access_token,
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

var revokeToken = function (workspace) {
    return app.client.auth.revoke(workspace.access_token);
};

var sendSimpleMessage = function (workspace, channelId, message) {
    var content = { text: message };
    postMessage(workspace, channelId, content);
};

var updateQueue = [];
var updateMessage = function (workspace, message) {
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

var uploadFiles = function (workspace, files) {
    files.token = workspace.access_token;
    return app.client.files.upload(files);
};

exports.setApp = setApp;
exports.initJobs = initJobs;
exports.authTest = authTest;
exports.join = join;
exports.listUsers = listUsers;
exports.openIM = openIM;
exports.postMessage = postMessage;
exports.revokeToken = revokeToken;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
exports.uploadFiles = uploadFiles;