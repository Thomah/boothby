const db = require('./db/index.js');
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const slack = require("./slack.js");

exports.saveSlackUsersInDb = function (slackUsers, slackUserIndex, callback) {
    var slackUser = slackUsers[slackUserIndex];
    if (slackUser === undefined) {
        callback();
    } else {
        db.querySync("SELECT id, im_id FROM slack_users where slack_id = $1", [slackUser.slack_id], (err, data) => {
            if (err) {
                logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
            } else if (data.rowCount > 1) {
                logger.error('Cannot sync slack_user ' + slackUser.id + ' : multiple occurrences in db');
            } else if (data.rowCount == 1) {
                db.querySync("UPDATE slack_users SET im_id = $2, slack_id = $3, slack_team_id = $4, consent = $5 WHERE id = $1", [data.rows[0].id, slackUser.im_id, slackUser.slack_id, slackUser.slack_team_id, slackUser.consent], (err) => {
                    if (err) {
                        logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
                    } else {
                        exports.saveSlackUsersInDb(slackUsers, slackUserIndex + 1, callback);
                    }
                });
            } else if (data.rowCount == 0) {
                db.querySync("INSERT INTO slack_users(im_id, slack_id, slack_team_id, consent) VALUES($1, $2, $3, $4)", [slackUser.im_id, slackUser.slack_id, slackUser.slack_team_id, slackUser.consent], (err) => {
                    if (err) {
                        logger.error('Cannot sync slack_user ' + slackUser.id + ' : \n -> ' + err);
                    } else {
                        exports.saveSlackUsersInDb(slackUsers, slackUserIndex + 1, callback);
                    }
                });
            }
        });
    }
};

exports.reload = function (workspace) {
    (async () => {
        try {
            // First API call
            const slackUsers = await slack.listUsers(workspace);
            slackUsers.members.forEach(member => member.slack_id = member.id);
            exports.openIM(workspace, slackUsers.members, 0, function () {
                exports.saveSlackUsersInDb(slackUsers.members, 0, () => {
                    dialogs.getByName("Consent PM", dialog => {
                        dialogs.playInWorkspace(dialog, workspace);
                    });
                });
            });
        } catch (error) {
            logger.error(error);
        }
    })();
};

exports.get = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, access_token, team_name, team_id, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams WHERE id = $1', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get slack_team ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get slack_team ' + id + ': multiple occurrences in DB');
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows[0]);
        }
    });
};

exports.getByTeamIdSync = async function (teamId) {
    return await db.query('SELECT id, access_token, team_name, team_id, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams WHERE team_id = $1', [teamId]);
};

exports.getByTeamId = function (teamId, callback_success, callback_error) {
    db.querySync('SELECT id, access_token, bot_user_id, team_id, team_name, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams WHERE team_id = $1', [teamId], (err, data) => {
        if (err) {
            logger.error('Cannot get slack_team ' + teamId + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get slack_team ' + teamId + ': multiple occurrences in DB');
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows[0]);
        }
    });
};

exports.update = function (workspace) {
    db.querySync("UPDATE slack_teams SET progression = $2 WHERE id = $1", [workspace.id, workspace.progression], (err) => {
        if (err) {
            logger.error('Cannot update slack_team ' + workspace.id + ' : \n -> ' + err);
        }
    });
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

exports.getUsers = function(slackTeamId, callback_success, callback_error) {
    db.querySync('SELECT id, slack_id, slack_team_id, im_id, consent FROM slack_users WHERE slack_team_id = $1', [slackTeamId], (err, data) => {
        if (err) {
            logger.error('Cannot list slack_users : \n -> ' + err);
            if(callback_error) {
                callback_error();
            }
        } else {
            callback_success(data.rows);
        }
    });
}

exports.getUsersBySlackId = function (slackId, callback_success) {
    db.querySync('SELECT id, slack_id, slack_team_id, im_id, consent FROM slack_users WHERE slack_id = $1', [slackId], (err, data) => {
        if (err) {
            logger.error('Cannot get slack_users by Slack ID : \n -> ' + err);
        } else if (data.rowCount !== 1) {
            logger.error('Cannot get slack_users by Slack ID : \n -> multiple occurrences in DB');
        } else if (data.rowCount === 1) {
            callback_success(data.rows[0])
        }
    });
};

exports.getUsersByChannelId = function (channelId, callback_success) {
    db.querySync('SELECT id, slack_id, slack_team_id, im_id, consent FROM slack_users WHERE im_id = $1', [channelId], (err, data) => {
        if (err) {
            logger.error('Cannot get slack_users by IM ID : \n -> ' + err);
        } else if (data.rowCount !== 1) {
            logger.error('Cannot get slack_users by IM ID : \n -> multiple occurrences in DB');
        } else if (data.rowCount === 1) {
            callback_success(data.rows[0])
        }
    });
};

exports.forEach = function (callback) {
    db.querySync('SELECT id, access_token, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams', [], (err, data) => {
        if (err) {
            logger.error('Cannot run for each Slack Team : \n -> ' + err);
        } else {
            for (var workspaceIndex in data.rows) {
                callback(data.rows[workspaceIndex]);
            }
        }
    });
};

exports.router = {};

exports.router.getSlackUsers = function (req, res) {
    exports.getUsers(
        req.params.id,
        data => {
            res.send(data);
        }, () => {
            res.status(500).end();
        });
};

exports.router.reloadSlackUsers = function (req, res) {
    db.querySync('SELECT id, access_token, incoming_webhook_channel_id FROM slack_teams WHERE id = $1', [req.params.id], (err, data) => {
        if (err) {
            logger.error('Cannot reload slack_users ' + req.params.id + ': \n -> ' + err);
            res.status(500).end();
        } else if (data.rowCount !== 1) {
            logger.error('Cannot reload slack_users ' + req.params.id + ': multiple occurrences of slack_teams in db');
            res.status(500).end();
        } else {
            exports.reload(data.rows[0]);
            res.status(200).end();
        }
    });
};

exports.router.list = function (req, res) {
    db.querySync('SELECT id, team_name, team_id, incoming_webhook_channel, incoming_webhook_channel_id, progression FROM slack_teams', [], (err, data) => {
        if (err) {
            logger.error('Cannot list slack_teams : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.router.get = function (req, res) {
    exports.get(req.params.id,
        slackTeam => {
            res.send(slackTeam);
        },
        () => {
            res.status(500).end();
        });
};

exports.router.create = function (req, res) {
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
                                dialogs.getByName("Welcome Message", dialog => {
                                    dialogs.playInWorkspace(dialog, workspace);
                                });
                                exports.reload(workspace);
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

exports.router.delete = function (req, res) {
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
