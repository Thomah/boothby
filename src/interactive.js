const { parse } = require("querystring");

const conversations = require("./conversations.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const messages = require("./messages.js");
const slack = require("./slack.js");
const surveys = require("./surveys.js");
const workspaces = require("./workspaces.js");

var answerSurvey = function (payload) {
    var actionId = payload.actions[0].action_id.split("_");
    var surveyId = actionId[1];
    var answerId = actionId[2];
    var userId = payload.user.id;
    surveys.get(surveyId, survey => {
        surveys.vote(survey.id, answerId, userId, data => {
            var blocks = payload.message.blocks;
            payload.message.blocks.forEach((block, index) => {
                if(block.accessory !== undefined) {
                    var answer = data.find(row => block.accessory.action_id === 'survey_' + surveyId + '_' + row['answer_id']);
                    logger.debug(answer);
                    if(answer !== undefined) {
                        logger.debug(answer['votes_team']);
                        blocks[index + 1].elements[0].text = answer['votes_team'] + ' vote(s)';
                    }
                }
            });
            workspaces.getByTeamId(payload.team.id, slackTeam => {
                slack.updateMessage(slackTeam, {
                    channel: payload.channel.id,
                    text: payload.message.text,
                    link_names: true,
                    ts: payload.message.ts,
                    blocks: JSON.stringify(blocks)
                });
            });
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
                answerSurvey(payload);
            }
            else if (payload.actions[0].action_id.startsWith('output_')) {
                resumeConversation(payload);
            }
        }
    });
};
