const db = require('./db.js');
const logger = require("./logger.js");

exports.get = function (conversation, callback_success, callback_error) {
    db.querySync("SELECT id, channel, slack_team_id, dialog_id, last_message_id, outputs, status FROM conversations WHERE slack_team_id = $1 AND channel = $2 AND dialog_id = $3", [conversation.slack_team_id, conversation.channel, conversation.dialog_id], (err, data) => {
        if (err) {
            logger.error('Cannot get conversation ' + JSON.stringify(conversation) + ' : \n -> ' + err);
            if(callback_error) {
                callback_error();
            }
        } else if (data.rowCount !== 1) {
            logger.error('Cannot get conversation ' + JSON.stringify(conversation) + ' : multiple occurrences in db');
            if(callback_error) {
                callback_error();
            }
        } else if (data.rowCount == 1) {
            callback_success(data.rows[0]);
        }
    });
};

exports.save = function (conversation, callback_success, callback_error) {
    db.querySync("SELECT id FROM conversations WHERE slack_team_id = $1 AND channel = $2 AND dialog_id = $3", [conversation.slack_team_id, conversation.channel, conversation.dialog_id], (err, data) => {
        if (err) {
            logger.error('Cannot save conversation ' + JSON.stringify(conversation) + ' : \n -> ' + err);
            if(callback_error) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot save conversation ' + JSON.stringify(conversation) + ' : multiple occurrences in db');
            if(callback_error) {
                callback_error();
            }
        } else if (data.rowCount == 1) {
            db.querySync("UPDATE conversations SET last_message_id = $2, outputs = $3, status = $4 WHERE id = $1", [data.rows[0].id, conversation.last_message_id, conversation.outputs, conversation.status], (err) => {
                if (err) {
                    logger.error('Cannot save conversation ' + JSON.stringify(conversation) + ' : \n -> ' + err);
                    if(callback_error) {
                        callback_error();
                    }
                } else {
                    callback_success();
                }
            });
        } else if (data.rowCount == 0) {
            db.querySync("INSERT INTO conversations(channel, slack_team_id, dialog_id, last_message_id, outputs, status) VALUES($1, $2, $3, $4, $5, $6)", [conversation.channel, conversation.slack_team_id, conversation.dialog_id, conversation.last_message_id, conversation.outputs, conversation.status], (err) => {
                if (err) {
                    logger.error('Cannot save conversation ' + JSON.stringify(conversation) + ' : \n -> ' + err);
                    if(callback_error) {
                        callback_error();
                    }
                } else {
                    callback_success();
                }
            });
        }
    });
};
