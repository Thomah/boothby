const { parse } = require("querystring");
const db = require('./db/index.js');
const logger = require("./logger.js");

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

exports.create = function(experience, callback) {
    db.querySync('SELECT grant_xp($1, $2, $3)', [experience.slack_id, experience.reason, experience.experience], err => {
        if (err) {
            logger.error('Cannot create experience in DB : \n -> ' + err);
        } else {
            if(callback !== undefined) {
                callback();
            }
        }
    });
};

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
