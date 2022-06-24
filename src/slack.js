const { App, LogLevel } = require('@slack/bolt');
const schedule = require("node-schedule");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const workspaces = require("./workspaces.js");

const proxy = process.env.HTTP_PROXY ? new HttpsProxyAgent(process.env.HTTP_PROXY) : null;
let app;

var initJobs = function () {
    schedule.scheduleJob("* * * * * *", postShift);
    schedule.scheduleJob("*/2 * * * * *", updateShift);
};

const authorizeFn = async ({ teamId, enterpriseId }) => {
    const { rows, error } = await pool.query('SELECT * FROM slack_team')
    if (error) {
        throw error
    }
    for (const team of rows) {
        if (team.team_id === teamId) {
            return {
                userToken: team.access_token,
                botToken: team.bot_access_token,
                botId: team.bot_id,
                botUserId: team.bot_user_id
            };
        }
    }
    throw new Error('No matching authorizations');
}

var initApp = function () {
    this.app = new App({
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        agent: proxy,
        authorize: authorizeFn,
        logLevel: LogLevel.INFO
    });
    
    this.app.message(async ({ message }) => {
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

    this.app.event('team_join', async ({ event }) => {
        db.read("workspaces", { team_id: event.user.team_id }, function (workspacesOfNewUser) {
            if (!Array.isArray(workspacesOfNewUser)) {
                workspacesOfNewUser = [workspacesOfNewUser];
            }
            var previous_bot_access_token = [];
            for (var workspaceNum in workspacesOfNewUser) {
                var workspaceOfNewUser = workspacesOfNewUser[workspaceNum];
                if (previous_bot_access_token.indexOf(workspaceOfNewUser.bot.bot_access_token) < 0) {
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
                    previous_bot_access_token.push(workspaceOfNewUser.bot.bot_access_token);
                }
            }
        });
    });
    return this.app;
};

var join = function (workspace, channelName) {
    return app.client(workspace.bot.bot_access_token).channels.join({ name: channelName });
};

var listUsers = function (workspace) {
    return app.client(workspace.bot.bot_access_token).users.list();
};

var openIM = function (workspace, params) {
    return app.client(workspace.bot.bot_access_token).im.open(params);
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
        (async () => {
            try {
                await app.client(shift.token).chat.postMessage(shift.message);
            } catch (error) {
                logger.error(error);
            }
        })();
    }
};

var revokeToken = function (workspace) {
    return app.client(workspace.bot.bot_access_token).auth.revoke(workspace.access_token);
};

var sendSimpleMessage = function (workspace, channelId, message) {
    var content = { text: message };
    postMessage(workspace, channelId, content);
};

var updateQueue = [];
var updateMessage = function (workspace, message) {
    updateQueue.push({
        token: workspace.bot.bot_access_token,
        message: message
    })
};
var updateShift = function () {
    var shift = updateQueue.shift();
    if (shift !== undefined) {
        (async () => {
            try {
                await app.client(shift.token).chat.update(shift.message);
            } catch (error) {
                logger.error(error);
            }
        })();
    }
};

var uploadFiles = function (workspace, files) {
    return app.client(workspace.bot.bot_access_token).files.upload(files);
};

exports.initApp = initApp;
exports.initJobs = initJobs;
exports.join = join;
exports.listUsers = listUsers;
exports.openIM = openIM;
exports.postMessage = postMessage;
exports.revokeToken = revokeToken;
exports.sendSimpleMessage = sendSimpleMessage;
exports.updateMessage = updateMessage;
exports.uploadFiles = uploadFiles;