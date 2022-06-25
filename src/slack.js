const { App, LogLevel } = require('@slack/bolt');
const schedule = require("node-schedule");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const workspaces = require("./workspaces.js");

const HttpsProxyAgent = require('https-proxy-agent');
const proxy = process.env.HTTP_PROXY ? new HttpsProxyAgent(process.env.HTTP_PROXY) : null;
var app;

var initJobs = function () {
    schedule.scheduleJob("* * * * * *", postShift);
    schedule.scheduleJob("*/2 * * * * *", updateShift);
};

const authorizeFn = async ({ teamId }) => {
    var marchWorkspaceId = { team_id: teamId };
    db.read("workspaces", marchWorkspaceId, function(workspace) {
        if(workspace != null) {
            return {
                botToken: workspace.access_token,
                botId: workspace.bot_id,
                botUserId: workspace.bot_user_id
            };
        } else {
            logger.log('No matching authorizations');
        }
    });
}

var initApp = function (receiver) {
    app = new App({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        agent: proxy,
        authorize: authorizeFn,
        logLevel: LogLevel.INFO,
        receiver: receiver
    });
    
    app.message(async ({ message }) => {
        if (message.text !== undefined) {
            db.insert("messages", message);
        }
        if (message.text === ":house:") {
            db.read("workspaces", { team_id: message.team }, function (workspacesInDb) {
                var workspace = workspacesInDb;
                if (workspacesInDb.access_token === undefined) {
                    workspace = workspacesInDb[0];
                }
                var user = workspaces.getUsersByChannelId(workspace, message.channel);
                if (user !== null) {
                    db.read("dialogs", { name: "Consent PM" }, function (dialog) {
                        dialog.channelId = message.channel;
                        dialogs.speakRecurse(workspace, dialog, "0", () => { });
                    })
                }
            });
        }
    });

    app.event('team_join', async ({ event }) => {
        db.read("workspaces", { team_id: event.user.team_id }, function (workspacesOfNewUser) {
            if (!Array.isArray(workspacesOfNewUser)) {
                workspacesOfNewUser = [workspacesOfNewUser];
            }
            var previous_bot_access_token = [];
            for (var workspaceNum in workspacesOfNewUser) {
                var workspaceOfNewUser = workspacesOfNewUser[workspaceNum];
                if (previous_bot_access_token.indexOf(workspaceOfNewUser.access_token) < 0) {
                    workspaces.openIM(workspaceOfNewUser, [event.user], 0, function () {
                        var workspaceId = workspaceOfNewUser._id;
                        db.update("workspaces", { _id: new db.mongodb().ObjectId(workspaceId) }, workspaceOfNewUser, function () {
                            db.read("dialogs", { name: "Consent PM" }, function (dialog) {
                                dialog.channelId = workspaces.getUsersById(workspaceOfNewUser, event.user.id).im_id;
                                workspaceOfNewUser._id = workspaceId;
                                dialogs.speakRecurse(workspaceOfNewUser, dialog, 0);
                            });
                        });
                    });
                    previous_bot_access_token.push(workspaceOfNewUser.access_token);
                }
            }
        });
    });
    return app;
};

var authTest = function (workspace) {
    return app.client.auth.test({ token: workspace.access_token });
};

var join = function (workspace, channelId) {
    return app.client.conversations.join({ token: workspace.access_token, channel: channelId });
};

var listUsers = function (workspace) {
    return app.client.users.list({ token: workspace.access_token});
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

exports.initApp = initApp;
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