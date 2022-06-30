const db = require('./db/index.js');
const mongo = require("./mongo.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const slack = require("./slack.js");

var saveSlackUsersInDb = function (slackUsers, slackUserIndex, callback) {
    var slackUser = slackUsers[slackUserIndex];
    if (slackUser === undefined) {
        callback();
    } else {
        db.querySync("SELECT id, im_id FROM slack_users where slack_id = $1", [slackUser.id], (err, data) => {
            if (err) {
                logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
            } else if (data.rowCount > 1) {
                logger.error('Cannot sync slack_user ' + slackUser.id + ' : multiple occurrences in db');
            } else if (data.rowCount == 1) {
                db.querySync("UPDATE slack_users SET im_id = $1, slack_id = $2, slack_team_id = $3", [slackUser.im_id, slackUser.id, slackUser.slack_team_id], (err) => {
                    if (err) {
                        logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
                    } else {
                        saveSlackUsersInDb(slackUsers, slackUserIndex + 1, callback);
                    }
                });
            } else if (data.rowCount == 0) {
                db.querySync("INSERT INTO slack_users(im_id, slack_id, slack_team_id) VALUES($1, $2, $3)", [slackUser.im_id, slackUser.id, slackUser.slack_team_id], (err) => {
                    if (err) {
                        logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
                    } else {
                        saveSlackUsersInDb(slackUsers, slackUserIndex + 1, callback);
                    }
                });
            }
        });
    }
};

var reload = function (workspace) {
    (async () => {
        try {
            // First API call
            const slackUsers = await slack.listUsers(workspace);
            exports.openIM(workspace, slackUsers.members, 0, function () {
                saveSlackUsersInDb(slackUsers.members, 0, () => {
                    mongo.read("dialogs", { name: "Consent PM" }, function (dialog) {
                        dialogs.playInWorkspace(dialog, workspace);
                    });
                });
            });
        } catch (error) {
            logger.error(error);
        }
    })();
};

exports.openIM = function (workspace, members, memberId, callback) {
    var member = members[memberId];
    if (member === undefined) {
        callback(workspace);
    } else if (!member.is_bot && !member.deleted) {
        setTimeout(function () {
            (async () => {
                try {
                    const slackIMs = await slack.openIM(workspace, {
                        users: member.id
                    });
                    members[memberId].deleted = member.deleted;
                    members[memberId].im_id = slackIMs.channel.id;
                    members[memberId].slack_team_id = workspace.id;
                    exports.openIM(workspace, members, memberId + 1, callback);
                } catch (error) {
                    logger.error(error);
                }
            })();
        }, 600);
    } else {
        exports.openIM(workspace, members, memberId + 1, callback);
    }
};

exports.getUsersById = function (workspace, userId) {
    var numUserFound = false;
    var userNum = 0;
    var users = workspace.users;
    while (!numUserFound && userNum < users.length) {
        numUserFound |= users[userNum].id === userId;
        userNum++;
    }
    if (numUserFound) {
        return users[userNum - 1];
    }
    return null;
};

exports.getUsersByChannelId = function (workspace, channelId) {
    var numUserFound = false;
    var userNum = 0;
    var users = workspace.users;
    while (!numUserFound && userNum < users.length) {
        numUserFound |= users[userNum].im_id === channelId;
        userNum++;
    }
    if (numUserFound) {
        return users[userNum - 1];
    }
    return null;
};

exports.forEach = function (callback) {
    db.querySync('SELECT access_token, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams', [], (err, data) => {
        if (err) {
            logger.error('Cannot list slack_users : \n -> ' + err);
        } else {
            var previous_bot_access_token = [];
            for (var workspaceId in data.rows) {
                var bot_access_token = data.rows[workspaceId].access_token;
                if (previous_bot_access_token.indexOf(bot_access_token) < 0) {
                    callback(data.rows[workspaceId]);
                    previous_bot_access_token.push(bot_access_token);
                }
            }
        }
    });
};

exports.getSlackUsers = function (req, res) {
    db.querySync('SELECT id, slack_id, im_id, consent FROM slack_users WHERE slack_team_id = $1', [req.params.id], (err, data) => {
        if (err) {
            logger.error('Cannot list slack_users : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.reloadSlackUsers = function (req, res) {
    db.querySync('SELECT id, access_token, incoming_webhook_channel_id FROM slack_teams WHERE id = $1', [req.params.id], (err, data) => {
        if (err) {
            logger.error('Cannot reload slack_users ' + req.params.id + ': \n -> ' + err);
            res.status(500).end();
        } else if (data.rowCount !== 1) {
            logger.error('Cannot reload slack_users ' + req.params.id + ': multiple occurrences of slack_teams in db');
            res.status(500).end();
        } else {
            reload(data.rows[0]);
            res.status(200).end();
        }
    });
};

exports.list = function (req, res) {
    db.querySync('SELECT id, team_name, team_id, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams', [], (err, data) => {
        if (err) {
            logger.error('Cannot list slack_teams : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.get = function (req, res) {
    db.querySync('SELECT team_name, team_id, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams WHERE id = $1', [req.params.id], (err, data) => {
        if (err) {
            logger.error('Cannot get slack_teams ' + req.params.id + ': \n -> ' + err);
            res.status(500).end();
        } else if (data.rowCount !== 1) {
            logger.error('Cannot get slack_teams ' + req.params.id + ': multiple occurrences in db');
            res.status(500).end();
        } else {
            res.send(data.rows[0]);
        }
    });
};

exports.create = function (req, res) {
    var response_400 = function (err, res) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.write(JSON.stringify(err));
        res.end();
    };
    if (req.query.code != undefined) {
        slack.getAccessToken(req.query.code, function (workspace) {
            if (!workspace.ok) {
                response_400(workspace, res);
            } else {
                logger.log("Workspace : " + workspace);
                workspace.team_id = workspace.team.id;
                workspace.progression = 1;
                (async () => {
                    try {
                        const result = await slack.authTest(workspace);
                        workspace.bot_id = result.bot_id;
                        db.querySync("INSERT INTO slack_teams(app_id, authed_user_id, \"scope\", token_type, access_token, bot_user_id, team_id, team_name, incoming_webhook_channel, incoming_webhook_channel_id, incoming_webhook_configuration_url, incoming_webhook_url, bot_id, progression) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1) RETURNING id", [workspace.app_id, workspace.authed_user.id, workspace.scope, workspace.token_type, workspace.access_token, workspace.bot_user_id, workspace.team.id, workspace.team.name, workspace.incoming_webhook.channel, workspace.incoming_webhook.channel_id, workspace.incoming_webhook.configuration_url, workspace.incoming_webhook.url, result.bot_id], (err, data) => {
                            if (err) {
                                logger.error(err);
                                res.status(500).end();
                            } else {
                                workspace.id = data.rows[0].id;
                                mongo.read("dialogs", { name: "Welcome Message", category: "intro" }, function (dialog) {
                                    dialogs.playInWorkspace(dialog, workspace);
                                });
                                reload(workspace);
                                res.redirect(302, '/?installed=1');
                            }
                        });
                    } catch (error) {
                        logger.error(error);
                    }
                })();
            }
        }, response_400);
    } else {
        response_400("No code provided", res);
    }
};

exports.delete = function (req, res) {
    db.querySync('SELECT access_token FROM slack_teams WHERE id = $1', [req.params.id], (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).end();
        } else if (data.rowCount === 1) {
            (async () => {
                try {
                    await slack.revokeToken(data.rows[0]);
                    db.querySync('DELETE FROM slack_teams WHERE id = $1', [req.params.id]);
                    res.status(200).end();
                } catch (error) {
                    logger.error(error);
                }
            })();
        }
    })
};
