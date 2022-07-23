const { parse } = require("querystring");
const db = require('./db/index.js');
const logger = require("./logger.js");
const slack = require("./slack.js");

exports.list = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, obtained_at, slack_id, reason, experience FROM experiences WHERE slack_team_id = $1', [id], (err, data) => {
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

exports.listBySlackUserId = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, obtained_at, slack_id, reason, experience FROM experiences WHERE slack_id = $1 ORDER BY obtained_at DESC LIMIT 5', [id], (err, data) => {
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
logger.log(`-> Public URL : ${process.env.APP_URL}`)

exports.updateView = function(slackTeam, viewId, userId) {
    var levelPercent = Math.round(slackTeam.experience * 100 / slackTeam.experience_required_to_next_level);
    var levelProgressBarDone = "█".repeat(levelPercent / 10);
    var levelProgressBarRemaining = "▒".repeat((100 - levelPercent) / 10);
    exports.listBySlackUserId(userId, userExperiences => {
        var userExperiencesString = "*Mes dernières contributions*\n\n";
        var userExperiencesTotal = new Number(0);
        userExperiences.forEach(userExperience => {

            userExperiencesString+= new Date(userExperience.obtained_at).toLocaleString() + " : " + userExperience.reason + " : " + userExperience.experience + " XP\n";
            userExperiencesTotal+= new Number(userExperience.experience);
        });
        userExperiencesString+= "\n*Mon total depuis le début* : " + userExperiencesTotal + " XP"
        slack.updateView(slackTeam, viewId, {
            // Home tabs must be enabled in your app configuration page under "App Home"
            "type": "home",
            "blocks": [
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
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Son CV",
                                "emoji": true
                            },
                            "url": process.env.APP_URL + '/public/cv.html'
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
                        "text": "*Niveau* : " + slackTeam.level
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Experience* : " + levelProgressBarDone + levelProgressBarRemaining + " " + levelPercent + "% (" + slackTeam.experience + " / " + slackTeam.experience_required_to_next_level + " XP)"
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
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Top des contributeurs*\n\n:first_place_medal: <@UG2K5PPQT> : 350 XP\n:second_place_medal: <@UFE0H4SCE> : 213 XP"
                        }
                    ]
                },
            ]
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
