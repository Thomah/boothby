const fs = require("fs");
const db = require('./db/index.js');
const conversations = require("./conversations.js");
const experiences = require("./experiences.js");
const logger = require("./logger.js");
const slack = require("./slack.js");
const surveys = require("./surveys.js");
const workspaces = require("./workspaces.js");

exports.get = function (id, callback_success, callback_error) {
    db.querySync('SELECT id, "name", category, channel, scheduling, messages FROM dialogs WHERE id = $1', [id], (err, data) => {
        if (err) {
            logger.error('Cannot get dialog ' + id + ' : \n -> ' + err);
            if (callback_error) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get dialog ' + id + ': multiple occurrences in DB');
            if (callback_error) {
                callback_error();
            }
        } else {
            var dialog = data.rows[0];
            dialog.messages = JSON.parse(dialog.messages);
            callback_success(dialog);
        }
    });
};

exports.getByScheduling = function (scheduling, callback_success, callback_error) {
    db.querySync('SELECT id, "name", category, channel, scheduling, messages FROM dialogs WHERE scheduling = $1', [scheduling], (err, data) => {
        if (err) {
            logger.error('Cannot get dialog by scheduling ' + scheduling + ' : \n -> ' + err);
            if (callback_error) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get dialog by scheduling ' + scheduling + ': multiple occurrences in DB');
            if (callback_error) {
                callback_error();
            }
        } else {
            var dialog = data.rows[0];
            dialog.messages = JSON.parse(dialog.messages);
            callback_success(dialog);
        }
    });
};

exports.getByName = function (name, callback_success, callback_error) {
    db.querySync("SELECT id, name, category, channel, scheduling, messages FROM dialogs WHERE name = $1", [name], (err, data) => {
        if (err) {
            logger.error('Cannot get dialog by name ' + name + ' : \n -> ' + err);
            if (callback_error) {
                callback_error();
            }
        } else if (data.rowCount > 1) {
            logger.error('Cannot get dialog by name ' + name + ': multiple occurrences in DB');
            if (callback_error) {
                callback_error();
            }
        } else if (data.rowCount == 0) {
            logger.error('Cannot get dialog by name ' + name + ': no result found');
            if (callback_error) {
                callback_error();
            }
        } else {
            var dialog = data.rows[0];
            dialog.messages = JSON.parse(dialog.messages);
            callback_success(dialog);
        }
    });
};

exports.create = function (dialog, callback_success, callback_error) {
    db.querySync("INSERT INTO dialogs(name, category, channel, scheduling, messages) VALUES($1, $2, $3, $4, $5)", [dialog.name, dialog.category, 'nowhere', 9999, JSON.stringify(dialog.messages)], (err) => {
        if (err) {
            logger.error(err);
            if (callback_error) {
                callback_error();
            }
        } else {
            callback_success();
        }
    });
};

exports.router = {};

exports.router.play = function (req, res) {
    var dialogId = req.params.id;
    playInAllWorkspaces(dialogId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end();
};

exports.router.list = function (req, res) {
    db.querySync('SELECT id, "name", category, channel, scheduling, messages FROM dialogs', [], (err, data) => {
        if (err) {
            logger.error('Cannot list dialogs : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.router.get = function (req, res) {
    exports.get(
        req.params.id,
        dialog => {
            res.send(dialog);
        }, () => {
            res.status(500).end();
        });
};

exports.router.create = function (req, res) {
    var dialog = {
        messages: {
            "0": {
                channel: "greenit",
                wait: 0,
                text: "first message",
                xp: 0
            }
        },
        name: "new-dialog",
        category: "daily",
        scheduling: 99999
    };
    exports.create(dialog, () => {
        res.send(JSON.stringify(dialog));
    }, () => {
        res.status(500).end();
    });
};

exports.router.update = function (req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    let body = "";
    req.on("data", chunk => {
        body += chunk.toString();
    });
    req.on("end", () => {
        var dialog = JSON.parse(body);
        db.querySync("UPDATE dialogs SET name = $2, category = $3, channel = $4, scheduling = $5, messages = $6 WHERE id = $1 RETURNING id, name, category, channel, scheduling, messages", [dialog.id, dialog.name, dialog.category, dialog.channel, dialog.scheduling, JSON.stringify(dialog.messages)], (err, data) => {
            if (err) {
                logger.error('Cannot update dialog ' + dialog.id + ' : \n -> ' + err);
            } else {
                Object.values(dialog.messages).forEach(message => {
                    message.attachments.forEach(attachment => {
                        if (attachment.type === 'survey') {
                            var surveyId = attachment.content[0].accessory.action_id.split('_')[1];
                            var survey = {
                                id: surveyId,
                                type: 'single_answer',
                                text: message.text,
                                answers: []
                            };
                            var answers = [];
                            attachment.content.forEach(answerInMessage => {
                                var answerId = answerInMessage.accessory.action_id.split('_')[2];
                                var answerIndex = answers.findIndex(answer => answer.id === answerId);
                                var answer = answers[answerIndex];
                                if (answer === undefined) {
                                    answer = {
                                        id: answerId,
                                        text: answerInMessage.text.text,
                                    };
                                    answerIndex = answers.length;
                                    answers.push(answer);
                                }
                                answers[answerIndex] = answer;
                            });
                            survey.answers = answers;
                            surveys.update(survey, () => { });
                        }
                    });
                });
                res.write(JSON.stringify(data));
                res.end();
            }
        });
    });
};

exports.router.delete = function (req, res) {
    db.querySync('DELETE FROM dialogs WHERE id = $1', [req.params.id]);
    res.status(200).end();
};

var resumeDialogs = function () {
    workspaces.forEach(function (workspace) {
        exports.getByScheduling(
            workspace.progression,
            data => {
                playInWorkspace(data, workspace);
                workspace.progression++;
                workspaces.update(workspace);
            });
    });
};

var playInWorkspace = function (dialog, workspace) {
    if (dialog.channel !== "pm_everybody") {
        speakRecurse(workspace, dialog, "0");
    } else {
        var channelsId = [];
        for (var userId in workspace.users) {
            var user = workspace.users[userId];
            if (dialog.name === "Consent PM" || user.consent) {
                channelsId.push(user.im_id);
            }
        }
        speakRecurseInChannels(workspace, dialog, channelsId);
    }
}

var playInAllWorkspaces = function (id) {
    exports.get(
        id,
        dialog => {
            workspaces.forEach(function (workspace) {
                if (dialog.channel !== "pm_everybody") {
                    speakRecurse(workspace, dialog, "0");
                } else {
                    var channelsId = [];
                    workspaces.getUsers(
                        workspace.id,
                        users => {
                            for (var userId in users) {
                                channelsId.push(users[userId].im_id);
                            }
                            speakRecurseInChannels(workspace, dialog, channelsId);
                        })
                }
            });
        });
};

var speakRecurseInChannels = function (workspace, dialog, channelsId) {
    if (channelsId.length > 0) {
        dialog.channelId = channelsId[0];
        speakRecurse(workspace, dialog, "0", () => {
            channelsId.splice(0, 1);
            speakRecurseInChannels(workspace, dialog, channelsId);
        });
    }
};

var speakRecurse = function (workspace, dialog, messageId, callback) {
    var message = dialog.messages[messageId];
    message.dialogId = dialog.id;
    message.messageId = messageId;
    if (message.wait === undefined) {
        message.wait = 0;
    }
    setTimeout(() => {
        if (dialog.channelId !== undefined) {
            uploadFilesAndSendMessageInChannels(workspace, dialog, messageId, () => {
                if (message.outputs.length === 1) {
                    speakRecurse(workspace, dialog, message.outputs[0].id, callback);
                } else if (callback !== undefined) {
                    callback();
                }
            });
        } else {
            (async () => {
                try {
                    const result = await slack.join(workspace, workspace.incoming_webhook_channel_id);
                    uploadFilesAndSendMessage(workspace, message, result.channel.id, () => {
                        if (message.xp > 0) {
                            experiences.create({
                                slack_id: workspace.bot_user_id,
                                reason: "STILL_ALIVE",
                                experience: message.xp
                            }, () => { });
                        }
                        if (message.outputs.length === 1) {
                            speakRecurse(workspace, dialog, message.outputs[0].id);
                        }
                    });
                } catch (error) {
                    logger.error(error);
                }
            })();
        }
    }, message.wait);
};

var uploadFilesAndSendMessageInChannels = function (workspace, dialog, messageId, callback) {
    var message = dialog.messages[messageId];
    message.dialogId = dialog.id;
    message.messageId = messageId;
    workspaces.getUsersByChannelId(dialog.channelId, user => {
        if (dialog.name === "Consent PM" || user.consent) {
            uploadFilesAndSendMessage(workspace, message, dialog.channelId, () => {
                sendOutputChoices(workspace, dialog, message, callback);
            });
            if (dialog.name !== "Consent PM" && message.xp > 0) {
                experiences.create({
                    slack_id: user.slack_id,
                    reason: "GOOD_CHOICE",
                    experience: message.xp
                }, () => { });
            }
        } else {
            callback();
        }
    });
}

var uploadFilesAndSendMessage = function (workspace, message, channelId, callback) {
    message.channelId = channelId;
    addAttachmentsOnMessage(
        workspace, message, 0,
        () => {
            var conversation = {
                slack_team_id: workspace.id,
                channel: channelId,
                dialog_id: message.dialogId,
                last_message_id: message.messageId,
                outputs: JSON.stringify(message.outputs),
                status: "processing"
            };
            if (message.outputs !== undefined) {
                if (message.outputs.length > 1) {
                    conversation.status = "waiting";
                } else if (message.outputs.length === 0) {
                    conversation.status = "ended";
                }
            }
            conversations.save(conversation, () => {
                slack.postMessage(workspace, channelId, message);
                callback();
            });
        });
}

var addAttachmentsOnMessage = function (workspace, message, attachmentId, callback) {
    var attachment;
    if (message.attachments !== undefined && message.attachments[attachmentId] !== undefined && message.attachments[attachmentId].type === 'file') {
        attachment = message.attachments[attachmentId].content;
        fs.readFile("files/uploads/" + attachment.file_id, function (error, content) {
            if (!error) {
                var files = {
                    channels: message.channelId,
                    file: content,
                    filename: attachment.filename,
                    filetype: attachment.filetype,
                    initial_comment: attachment.initial_comment,
                    title: attachment.title
                };
                (async () => {
                    try {
                        await slack.uploadFiles(workspace, files);
                        delete message.attachments[attachmentId];
                        addAttachmentsOnMessage(workspace, message, attachmentId + 1, callback);
                    } catch (error) {
                        logger.error(error);
                    }
                })();
            }
        });
    } else if (message.attachments !== undefined && message.attachments[attachmentId] !== undefined && message.attachments[attachmentId].type === 'survey') {
        attachment = message.attachments[attachmentId].content
        message.blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: message.text
            }
        });
        message.blocks.push({
            type: "divider"
        });
        attachment.forEach(answers => {
            message.blocks.push(answers);
            message.blocks.push({
                type: "context",
                elements: [
                    {
                        type: "plain_text",
                        emoji: true,
                        text: "0 vote(s)"
                    }
                ]
            });
        });
        addAttachmentsOnMessage(workspace, message, attachmentId + 1, callback);
    } else if (message.attachments !== undefined && message.attachments[attachmentId + 1] !== undefined) {
        addAttachmentsOnMessage(workspace, message, attachmentId + 1, callback);
    } else {
        callback();
    }
};

var sendOutputChoices = function (workspace, dialog, message, callback) {
    if (message.outputs.length > 1) {
        var ids = workspace.id + '-' + dialog.channelId + '-' + dialog.id + '-' + message.messageId
        var messageOutputs = {
            blocks: [
                {
                    type: "actions",
                    block_id: ids + '-' + dialog.name,
                    elements: []
                }
            ]
        };

        for (var outputId in message.outputs) {
            var output = message.outputs[outputId];
            var buttonId = ids + '-' + output.id;
            messageOutputs.blocks[0].elements[outputId] = {
                type: "button",
                text: {
                    type: "plain_text",
                    text: output.text
                },
                value: buttonId,
                action_id: "output_" + outputId
            }
        }
        slack.postMessage(workspace, dialog.channelId, messageOutputs);
    }
    callback();
}

exports.speakRecurse = speakRecurse;
exports.playInWorkspace = playInWorkspace;
exports.resumeDialogs = resumeDialogs;
