const { parse } = require("querystring");

const mongo = require("./mongo.js");
const conversations = require("./conversations.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const messages = require("./messages.js");
const slack = require("./slack.js");
const workspaces = require("./workspaces.js");

var answerSurvey = function (payload, callback) {
    var splitActionValue = payload.actions[0].value.split("-");
    mongo.read("dialogs", { _id: new mongo.mongodb().ObjectId(splitActionValue[0]) }, function (data) {
        callback(data.messages[splitActionValue[1]]);
    });

    mongo.read("surveys", { name: payload.actions[0].name }, function (data) {
        var newMessage = payload.original_message;
        if (data === null) {
            data = {};
            data.name = payload.actions[0].name;
            mongo.insert("surveys", data);
        }
        if (data.texts === undefined) {
            data.texts = {};
            data.actions = {};
            data.values = {};
            data.users = {};
            for (
                var noAction = 0; noAction < newMessage.attachments[0].actions.length; noAction++
            ) {
                var value = newMessage.attachments[0].actions[noAction].value;
                data.actions[value] = noAction;
                data.texts[value] = newMessage.attachments[0].actions[noAction].text;
                data.values[value] = 0;
            }
        }
        if (data.values[payload.actions[0].value] === undefined) {
            data.values[payload.actions[0].value] = 0;
        }
        if (data.users[payload.user.id] === undefined) {
            data.values[payload.actions[0].value]++;
            data.users[payload.user.id] = payload.actions[0].value;
        } else if (
            data.users[payload.user.id] !== undefined &&
            data.users[payload.user.id] !== payload.actions[0].value
        ) {
            data.values[data.users[payload.user.id]]--;
            data.users[payload.user.id] = payload.actions[0].value;
            data.values[payload.actions[0].value]++;
        } else {
            data.values[data.users[payload.user.id]]--;
            data.users[payload.user.id] = undefined;
        }
        mongo.updateByName("surveys", payload.actions[0].name, data);

        for (var id in data.texts) {
            newMessage.attachments[0].actions[data.actions[id]].text =
                data.texts[id] + " (" + data.values[id] + ")";
        }

        workspaces.forEach(function (workspace) {
            if (payload.team.id === workspace.team_id) {
                slack.updateMessage(workspace, {
                    channel: payload.channel.id,
                    text: newMessage.text,
                    link_names: true,
                    ts: payload.message_ts,
                    attachments: newMessage.attachments
                });
            }
        });
    });
};

var updateButtonAndSpeak = function (payload, workspace, dialog) {
    var actionId = payload.actions[0].action_id.replace('output_', '');
    var actionValue = payload.actions[0].value;
    var actionValueSplit = actionValue.split('-');
    var channelId = actionValueSplit[1];
    var outputSelectedId = actionValueSplit[4];

    messages.create({
        type: 'message',
        text: payload.message.blocks[0].elements[actionId].text.text + ' (' + outputSelectedId + ')',
        user: payload.user.id,
        ts: payload.actions[0].action_ts,
        team: workspace.team_id,
        channel: channelId,
        event_ts: payload.actions[0].action_ts,
        channel_type: payload.channel.name == 'directmessage' ? 'im' : 'channel'
    });

    dialog.channelId = channelId;
    dialogs.speakRecurse(workspace, dialog, outputSelectedId);

    var newMessage = payload.message
    newMessage.blocks[0].elements[actionId].text.text += ' (:heavy_check_mark:)';
    newMessage.channel = channelId;
    newMessage.blocks = JSON.stringify(newMessage.blocks);
    delete newMessage.subtype;
    delete newMessage.username;
    delete newMessage.bot_id;
    slack.updateMessage(workspace, newMessage);
};

var resumeConversation = function (payload) {
    if (payload.actions !== undefined && payload.actions.length === 1 && payload.channel !== undefined) {
        var actionValue = payload.actions[0].value;
        var actionValueSplit = actionValue.split('-');
        var workspaceId = actionValueSplit[0];
        var channelId = actionValueSplit[1];
        var dialogId = actionValueSplit[2];
        var messageId = actionValueSplit[3];
        var outputSelectedId = actionValueSplit[4];
        conversations.get({ slack_team_id: workspaceId, dialog_id: dialogId, channel: channelId }, conversation => {
            if (conversation.last_message_id === messageId) {
                var isValidOutput = false;
                var outputs = JSON.parse(conversation.outputs);
                for (var outputNum in outputs) {
                    isValidOutput |= outputSelectedId === outputs[outputNum].id;
                }
                if (isValidOutput) {
                    workspaces.get(workspaceId, workspace => {
                        dialogs.get(dialogId, dialog => {
                            workspaces.getUsersBySlackId(payload.user.id, slackUser => {
                                if (dialog.name === "Consent PM") {
                                    slackUser.consent = outputSelectedId === '3';
                                    workspaces.saveSlackUsersInDb([slackUser], 0, () => {
                                        updateButtonAndSpeak(payload, workspace, dialog);
                                    });
                                } else if ((payload.channel.name === "directmessage" && slackUser.consent)) {
                                    updateButtonAndSpeak(payload, workspace, dialog);
                                }
                            });
                        });
                    });
                }
            }
        });
    }
};

exports.router = {};

exports.router.interact = function (req, res) {
    let body = "";
    req.on("data", chunk => {
        body += chunk.toString();
    });
    req.on("end", () => {
        var payload = JSON.parse(parse(body).payload);
        logger.info(JSON.stringify(payload));
        res.status(200).end();
        if (payload.type === "block_actions") {
            if (payload.actions[0].action_id.startsWith('survey_')) {
                logger.debug("c'est un survey !");
            }
            else if (payload.actions[0].action_id.startsWith('output_')) {
                resumeConversation(payload);
            }
        }
        // if (payload.type === "interactive_message") {
        //     answerSurvey(payload, function(data) {
        //         res.write(JSON.stringify(data));
        //         res.end();
        //     });
        // } else if (payload.type === "block_actions") {
        //     resumeConversation(payload);
        //     res.write("{}");
        //     res.end();
        // }
    });
};
