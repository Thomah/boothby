const fs = require("fs");

const db = require("./db.js");
const logger = require("./logger.js");
const slack = require("./slack.js");
const workspaces = require("./workspaces.js");

var response404 = function(response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function(request, response) {
    var dialogId;
    var regex_play = /^\/api\/dialogs\/([^/]+)\/play$/;
    var regex_dialogName = /^\/api\/dialogs\/([^/]+)$/;

    // api/dialogs
    if (request.url.match(/^\/api\/dialogs\/?$/) !== null) {
        // GET : list dialogs
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.list("dialogs", { scheduling: -1 }, function(data) {
                response.write(JSON.stringify(data));
                response.end();
            });
        }

        // POST : create new dialog
        else if (request.method === "POST") {
            var dialog = {
                messages: {
                    "0": {
                        channel: "greenit",
                        wait: 0,
                        text: "first message"
                    }
                },
                name: "new-dialog",
                category: "daily",
                scheduling: 99999
            };
            db.insert("dialogs", dialog, function(data) {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.write(JSON.stringify(data));
                response.end();
            });
        }

        // Otherwise 404
        else {
            response404(response);
        }
    }

    // api/dialogs/<id>/play
    else if (request.url.match(regex_play) !== null) {
        dialogId = request.url.match(regex_play)[1];
        playInAllWorkspaces(dialogId);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end();
    }

    // api/dialogs/<id>
    else if (request.url.match(regex_dialogName) !== null) {
        dialogId = request.url.match(regex_dialogName)[1];

        // GET : get a dialog
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.read("dialogs", { _id: new db.mongodb().ObjectId(dialogId) }, function(data) {
                response.write(JSON.stringify(data));
                response.end();
            })
        }

        // PUT : update a dialog
        else if (request.method === "PUT") {
            response.writeHead(200, { "Content-Type": "application/json" });
            let body = "";
            request.on("data", chunk => {
                body += chunk.toString();
            });
            request.on("end", () => {
                var dialog = JSON.parse(body);
                db.update("dialogs", { _id: new db.mongodb().ObjectId(dialogId) }, dialog, function(data) {
                    response.write(JSON.stringify(data));
                    response.end();
                });
            });
        }

        // DELETE : delete a dialog
        else if (request.method === "DELETE") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.delete("dialogs", dialogId, function(data) {
                response.write(JSON.stringify(data));
                response.end();
            })
        }

        // Otherwise 404
        else {
            response404(response);
        }
    }

    // Otherwise 404
    else {
        response404(response);
    }
};

var resumeDialogs = function() {
    workspaces.forEach(function(workspace) {
        db.read("dialogs", { scheduling: parseInt(workspace.progression) }, function(dialog) {
            if (dialog !== null) {
                playInWorkspace(dialog, workspace);
                workspace.progression++;
                db.update("workspaces", { _id: new db.mongodb().ObjectId(workspace._id) }, workspace, () => {});
            }
        });
    });
};

var playInWorkspace = function(dialog, workspace) {
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

var playInAllWorkspaces = function(id) {
    db.read("dialogs", { _id: new db.mongodb().ObjectId(id) }, function(dialog) {
        if (dialog !== null) {
            workspaces.forEach(function(workspace) {
                if (dialog.channel !== "pm_everybody") {
                    speakRecurse(workspace, dialog, "0");
                } else {
                    var channelsId = [];
                    for (var userId in workspace.users) {
                        channelsId.push(workspace.users[userId].im_id);
                    }
                    speakRecurseInChannels(workspace, dialog, channelsId);
                }
            });
        }
    });
};

var speakRecurseInChannels = function(workspace, dialog, channelsId) {
    if (channelsId.length > 0) {
        dialog.channelId = channelsId[0];
        speakRecurse(workspace, dialog, "0", () => {
            channelsId.splice(0, 1);
            speakRecurseInChannels(workspace, dialog, channelsId);
        });
    }
};

var speakRecurse = function(workspace, dialog, messageId, callback) {
    var message = dialog.messages[messageId];
    message.dialogId = dialog._id;
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
            slack
                .join(workspace, message.channel)
                .then(res => {
                    uploadFilesAndSendMessage(workspace, message, res.channel.id, () => {
                        if (message.outputs.length === 1) {
                            speakRecurse(workspace, dialog, message.outputs[0].id);
                        }
                    });
                })
                .catch(logger.error);
        }
    }, message.wait);
};

var uploadFilesAndSendMessageInChannels = function(workspace, dialog, messageId, callback) {
    var message = dialog.messages[messageId];
    message.dialogId = dialog._id;
    message.messageId = messageId;
    var user = workspaces.getUsersByChannelId(workspace, dialog.channelId);
    if (dialog.name === "Consent PM" || user.consent) {
        uploadFilesAndSendMessage(workspace, message, dialog.channelId, () => {
            if (message.outputs.length > 1) {
                var ids = workspace._id + '-' + dialog.channelId + '-' + dialog._id + '-' + messageId
                var actions = {
                    type: "actions",
                    block_id: ids + '-' + dialog.name,
                    elements: []
                }
                for (var outputId in message.outputs) {
                    var output = message.outputs[outputId];
                    var buttonId = ids + '-' + output.id;
                    actions.elements[outputId] = {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: output.text
                        },
                        value: buttonId,
                        action_id: outputId
                    }
                }
                slack.postMessage(workspace, dialog.channelId, [actions]);
            }
            callback();
        });
    } else {
        callback();
    }
}

var uploadFilesAndSendMessage = function(workspace, message, channelId, callback) {
    message.channelId = channelId;
    uploadFilesOfMessage(workspace, message, 0, function() {
        var conversation = {
            workspaceId: workspace._id,
            channelId: channelId,
            dialogId: message.dialogId,
            lastMessageId: message.messageId,
            outputs: message.outputs,
            status: "processing"
        };
        if (message.outputs !== undefined) {
            if (message.outputs.length > 1) {
                conversation.status = "waiting";
            } else if (message.outputs.length === 0) {
                conversation.status = "ended";
            }
        }
        db.upsert("conversations", {
            workspaceId: workspace._id,
            channelId: channelId,
            dialogId: message.dialogId
        }, conversation, function() {});
        slack.postMessage(workspace, channelId, message);
        callback();
    });
}

var uploadFilesOfMessage = function(workspace, message, attachmentId, callback) {
    if (message.attachments !== undefined && message.attachments[attachmentId] !== undefined && message.attachments[attachmentId].file_id !== undefined) {
        var attachment = message.attachments[attachmentId];
        fs.readFile("files/" + attachment.file_id, function(error, content) {
            if (!error) {
                var files = {
                    channels: message.channelId,
                    file: content,
                    filename: attachment.filename,
                    filetype: attachment.filetype,
                    initial_comment: attachment.initial_comment,
                    title: attachment.title
                };
                slack.uploadFiles(workspace, files)
                    .then(() => {
                        delete message.attachments[attachmentId];
                        uploadFilesOfMessage(workspace, message, attachmentId + 1, callback);
                    })
                    .catch(logger.error);
            }
        });
    } else if (message.attachments !== undefined && message.attachments[attachmentId + 1] !== undefined) {
        uploadFilesOfMessage(workspace, message, attachmentId + 1);
    } else {
        callback();
    }
};

exports.speakRecurse = speakRecurse;
exports.playInWorkspace = playInWorkspace;
exports.resumeDialogs = resumeDialogs;
exports.route = route;