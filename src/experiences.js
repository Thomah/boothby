const { parse } = require("querystring");
const db = require('./db.js');
const logger = require("./logger.js");
const slack = require("./slack.js");

exports.list = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, obtained_at, slack_id, reason, experience FROM experiences WHERE slack_team_id = $1', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get experiences for Slack Team ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows);
        }
    });
};

exports.listBySlackUserId = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, obtained_at, slack_id, reason, experience FROM experiences WHERE slack_id = $1 ORDER BY obtained_at DESC LIMIT 15', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get experiences ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows);
        }
    });
};

exports.listTopSlackUsersBySlackTeamId = function (id, callback_success, callback_error) {
    db.querySync('SELECT slack_id, sum(experience) AS sum_experience FROM experiences where slack_team_id = $1 group by slack_id ORDER BY sum_experience DESC LIMIT 15', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get top Slack Users for Slack Team ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows);
        }
    });
};

exports.getTotalForSlackUserId = function (id, callback_success, callback_error) {
    db.querySync('SELECT COALESCE(SUM(experience), 0) AS total_experience FROM experiences WHERE slack_id = $1', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get total experience for Slack User ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot total experience for Slack User ' + id + ': multiple occurrences in DB');
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows[0]);
        }
    });
};

exports.getLevelById = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, slack_team_id, level, experience, max_experience FROM levels WHERE id = $1', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get level ' + id + ': \n -> ' + err);
            if (callback_error !== undefined) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get level ' + id + ': multiple occurrences in DB');
            if (callback_error !== undefined) {
                callback_error();
            }
        } else {
            callback_success(data.rows[0]);
        }
    });
};

exports.initSlackTeam = function (slackTeamId, callback_error) {
    db.querySync("INSERT INTO levels(slack_team_id) VALUES($1) RETURNING id", [slackTeamId], (err, data) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            db.querySync("UPDATE slack_teams SET level_id = $1 WHERE id = $2", [data.rows[0].id, slackTeamId], (err) => {
                if (err) {
                    logger.error(err);
                    if (callback_error) {
                        callback_error();
                    }
                }
            });
        }
    });
}

exports.create = function (experience, callback) {
    db.querySync('SELECT grant_xp($1, $2, $3)', [experience.slack_id, experience.reason, experience.experience], err => {
        if (err) {
            logger.error('Cannot create experience in DB : \n -> ' + err);
        } else {
            if (callback !== undefined) {
                callback();
            }
        }
    });
};

exports.delete = function (id, callback) {
    db.querySync('SELECT remove_xp($1)', [id], err => {
        if (err) {
            logger.error('Cannot delete experience ' + id + ' in DB : \n -> ' + err);
        } else {
            if (callback !== undefined) {
                callback();
            }
        }
    });
};

exports.updateView = function (slackTeam, viewId, userId) {
    exports.getLevelById(slackTeam.level_id, level => {
        exports.listBySlackUserId(userId, userExperiences => {
            exports.getTotalForSlackUserId(userId, totalUser => {
                exports.listTopSlackUsersBySlackTeamId(slackTeam.id, topSlackUsers => {

                    var levelPercent = Math.round(level.experience * 100 / level.max_experience);
                    var levelProgressBarDone = "█".repeat(levelPercent / 10);
                    var levelProgressBarRemaining = "▒".repeat((100 - levelPercent) / 10);

                    var userExperiencesString = "*Mes dernières contributions*\n\n";
                    userExperiences.forEach(userExperience => {
                        userExperiencesString += new Date(userExperience.obtained_at).toLocaleString() + " : " + Reasons[userExperience.reason] + " : " + userExperience.experience + " XP\n";
                    });
                    userExperiencesString += "\n*Mon total depuis le début* : " + totalUser.total_experience + " XP";

                    var topSlackUsersString = "*Top des contributeurs*\n\n"
                    if (topSlackUsers.length >= 1) {
                        topSlackUsersString += ":first_place_medal: <@" + topSlackUsers[0].slack_id + "> : " + topSlackUsers[0].sum_experience + " XP\n"
                    }
                    if (topSlackUsers.length >= 2) {
                        topSlackUsersString += ":second_place_medal: <@" + topSlackUsers[1].slack_id + "> : " + topSlackUsers[1].sum_experience + " XP\n"
                    }
                    if (topSlackUsers.length >= 3) {
                        topSlackUsersString += ":third_place_medal: <@" + topSlackUsers[2].slack_id + "> : " + topSlackUsers[2].sum_experience + " XP\n"
                    }
                    for (var k = 3; k < topSlackUsers.length; k++) {
                        topSlackUsersString += "<@" + topSlackUsers[k].slack_id + "> : " + topSlackUsers[k].sum_experience + " XP\n"
                    }

                    var view = {
                        type: "home",
                        blocks: [
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Qui est Boothby ?",
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "Il s'agit du seul coach virtuel qui va vous donner envie d'utiliser ou de développer vos applications de façon optimisée et responsable. Sacré pari n'est-ce pas ? C'est pour ça qu'il a besoin de vous pour grandir !"
                                }
                            },
                            {
                                "type": "actions",
                                "elements": [
                                    {
                                        "type": "button",
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Son site web",
                                            "emoji": true
                                        },
                                        "url": process.env.APP_URL
                                    }
                                ]
                            },
                            {
                                "type": "divider"
                            },
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Progression de Boothby",
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "*Niveau* : " + level.level
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "*Experience* : " + levelProgressBarDone + levelProgressBarRemaining + " " + levelPercent + "% (" + level.experience + " / " + level.max_experience + " XP)"
                                }
                            },
                            {
                                "type": "actions",
                                "elements": [
                                    {
                                        "type": "button",
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Comment gagner de l'XP ?",
                                            "emoji": true
                                        },
                                        "url": process.env.APP_URL + '/public/game.html'
                                    }
                                ]
                            }
                        ]
                    }

                    if (level.level >= 4) {
                        view.blocks[2].elements.push(
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Son CV",
                                    "emoji": true
                                },
                                "url": process.env.APP_URL + '/public/cv.html'
                            });
                    }

                    if (level.level >= 2) {
                        view.blocks.push(
                            {
                                "type": "divider"
                            },
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Contributions",
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "fields": [
                                    {
                                        "type": "mrkdwn",
                                        "text": userExperiencesString
                                    }
                                ]
                            }
                        );
                    }

                    if (level.level >= 3) {
                        view.blocks[10].fields.push(
                            {
                                "type": "mrkdwn",
                                "text": topSlackUsersString
                            });
                    }

                    slack.updateView(slackTeam, viewId, view);
                });
            });
        });
    });
}

exports.router = {};

exports.router.list = function (req, res) {
    exports.list(
        req.params.id,
        data => {
            res.send(data);
        }, () => {
            res.status(500).end();
        });
};

exports.router.create = function (req, res) {
    let body = "";
    req.on("data", chunk => {
        body += chunk.toString();
    });
    req.on("end", () => {
        var parsedBody = parse(body);
        exports.create({
            slack_id: parsedBody.user,
            reason: parsedBody.reason,
            experience: parsedBody.experience
        },
            data => {
                res.send(data);
            }, () => {
                res.status(500).end();
            });
    });
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end();
};

exports.router.delete = function (req, res) {
    exports.delete(
        req.params.id,
        data => {
            res.send(data);
        }, () => {
            res.status(500).end();
        });
};

const Reasons = {
    ANSWER_SURVEY: 'A répondu à un sondage',
    GOOD_CHOICE: 'A choisi judicieusement',
    STILL_ALIVE: 'Est toujours en vie',
    CONTRIBUTED_ON_DEVELOPMENT: 'A contribué au code source de Boothby',
    SUBMITED_SUBJECT: 'A soumis un sujet de publication',
    PUBLIC_MESSAGE: 'Participe aux échanges publics'
};
