const fs = require("fs");

const api = require("./api.js");
const db = require("./db.js");
const slack = require("./slack.js");

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function (request, response) {
    var regex_play = /^\/api\/dialogs\/([^/]+)\/play$/;
    var regex_dialogName = /^\/api\/dialogs\/([^/]+)$/;

    // api/dialogs
    if (request.url.match(/^\/api\/dialogs\/?$/) !== null) {
        // GET : list dialogs
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.list("dialogs", function (data) {
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
            db.insert("dialogs", dialog, function (data) {
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
        var dialogId = request.url.match(regex_play)[1];
        processDialog("dialogs", dialogId);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end();
    }

    // api/dialogs/<id>
    else if (request.url.match(regex_dialogName) !== null) {
        var dialogId = request.url.match(regex_dialogName)[1];

        // GET : get a dialog
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.read("dialogs", { _id: new db.mongodb().ObjectId(dialogId) }, function (data) {
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
                db.update("dialogs", { _id: new db.mongodb().ObjectId(dialogId) }, dialog, function (data) {
                    response.write(JSON.stringify(data));
                    response.end();
                });
            });
        }

        // DELETE : delete a dialog
        else if (request.method === "DELETE") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.delete("dialogs", dialogId, function (data) {
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

var processDialog = function (collection, id) {
    db.read(collection, { _id: new db.mongodb().ObjectId(id) }, function (data) {
        if (data !== null) {
            api.forEachWorkspace(function (tokens) {
                speakRecurse(tokens, data, "0");
            });
        }
    });
};

var resumeDialogs = function () {
    db.read("global", { name: "state" }, function (data) {
        if (data === null) {
            data = {};
            data.daily = 1;
            data.name = "state";
            db.insert("global", data);
        }
        db.read("dialogs", { scheduling: parseInt(data.daily) }, function (dialog) {
            if (dialog === null) {
                console.log('PROBLEM Captain\' : There is no dialog related to the global.daily :' + data.daily);
            } else {
                processDialog("dialogs", dialog._id);
                data.daily++;
                db.updateByName("global", "state", data);
            }
        });
    });
};

var speakRecurse = function (tokens, dialog, currentId) {
    if (dialog[currentId].wait === undefined) {
        dialog[currentId].wait = 0;
    }
    setTimeout(() => {
        slack
            .join(tokens, dialog[currentId].channel)
            .then(res => {
                dialog[currentId].channelId = res.channel.id;
                uploadFilesOfMessage(tokens, dialog[currentId], 0, function () {
                    slack
                        .postMessage(tokens, res.channel.id, dialog[currentId])
                        .then(() => {
                            if (dialog[currentId].next !== undefined) {
                                speakRecurse(tokens, dialog, dialog[currentId].next);
                            }
                        })
                        .catch(console.error);
                });
            })
            .catch(console.error);
    }, dialog[currentId].wait);
};

var uploadFilesOfMessage = function (tokens, message, attachmentId, callback) {
    if (message.attachments !== undefined && message.attachments[attachmentId] !== undefined && message.attachments[attachmentId].file_id !== null) {
        var attachment = message.attachments[attachmentId];
        fs.readFile("files/" + attachment.file_id, function (error, content) {
            if (!error) {
                var files = {
                    channels: message.channelId,
                    file: content,
                    filename: attachment.filename,
                    filetype: attachment.filetype,
                    initial_comment: attachment.initial_comment,
                    title: attachment.title
                };
                slack.uploadFiles(tokens, files)
                    .then((retour) => {
                        delete message.attachments[attachmentId];
                        uploadFilesOfMessage(tokens, message, attachmentId + 1, callback);
                    })
                    .catch(console.error);
            }
        });
    } else if (message.attachments !== undefined && message.attachments[attachmentId + 1] !== undefined) {
        uploadFilesOfMessage(tokens, message, attachmentId + 1);
    } else {
        callback();
    }
};

exports.processDialog = processDialog;
exports.resumeDialogs = resumeDialogs;
exports.route = route;