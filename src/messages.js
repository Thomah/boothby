const { parse } = require("querystring");
const db = require('./db/index.js');
const logger = require("./logger.js");
const messages = require("./messages.js");
const slack = require("./slack.js");
const workspaces = require("./workspaces.js");

exports.create = function(message, callback) {
    db.querySync('INSERT INTO messages(type_slack, client_msg_id, text_slack, user_slack, ts, team_slack, blocks, channel, event_ts, channel_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [message.type, message.client_msg_id, message.text, message.user, message.ts, message.team, JSON.stringify(message.blocks), message.channel, message.event_ts, message.channel_type], err => {
        if (err) {
            logger.error('Cannot create message in DB ' + message.text + ' : \n -> ' + err);
        } else {
            if(callback !== undefined) {
                callback();
            }
        }
    });
};

exports.router = {};

exports.router.list = function (req, res) {
    db.querySync('SELECT id, text_slack, user_slack, ts, team_slack, channel FROM messages', [], (err, data) => {
        if (err) {
            logger.error('Cannot list messages : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.router.send = function (req, res) {
    let body = "";
    req.on("data", chunk => {
        body += chunk.toString();
    });
    req.on("end", () => {
        var parsedBody = parse(body);
        workspaces.getByTeamId(parsedBody.workspace,
            slackTeam => {
                slack.sendSimpleMessage(slackTeam, parsedBody.channel, parsedBody.message);
                messages.create({
                    type: 'message',
                    client_msg_id: '',
                    text: parsedBody.message,
                    user: slackTeam.bot_user_id,
                    ts: Math.floor(new Date().getTime() / 1000),
                    team: slackTeam.team_id,
                    blocks: '[]',
                    channel: parsedBody.channel,
                    event_ts: Math.floor(new Date().getTime() / 1000),
                    channel_type: 'channel'
                });
            },
            () => {
                res.status(500).end();
            });
    });
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end();
};

exports.router.delete = function (req, res) {
    db.querySync('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.status(200).end();
};
