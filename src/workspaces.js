const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const slack = require("./slack.js");

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var openIM = function (workspace, members, memberId, callback) {
    var member = members[memberId];
    if (member === undefined) {
        callback(workspace);
    } else if (!member.is_bot) {
        setTimeout(function () {
            (async () => {
                try {
                    const slackIMs = await slack.openIM(workspace, {
                        user: member.id
                    });
                    workspace.users.push({
                        id: member.id,
                        im_id: slackIMs.channel.id
                    });
                    openIM(workspace, members, memberId + 1, callback);
                } catch (error) {
                    logger.error(error);
                }
            })();
        }, 600);
    } else {
        openIM(workspace, members, memberId + 1, callback);
    }
}

var getUsersById = function (workspace, userId) {
    var numUserFound = false;
    var userNum = 0;
    var users = workspace.users;
    while (!numUserFound && userNum < users.length) {
        numUserFound |= users[userNum].id === userId;
        userNum++;
    }
    if (numUserFound) {
        return users[userNum - 1];
    }
    return null;
};

var getUsersByChannelId = function (workspace, channelId) {
    var numUserFound = false;
    var userNum = 0;
    var users = workspace.users;
    while (!numUserFound && userNum < users.length) {
        numUserFound |= users[userNum].im_id === channelId;
        userNum++;
    }
    if (numUserFound) {
        return users[userNum - 1];
    }
    return null;
};

var forEach = function (callback) {
    db.list("workspaces", {}, function (workspaces) {
        var previous_bot_access_token = [];
        for (var workspaceId in workspaces) {
            var bot_access_token = workspaces[workspaceId].bot.bot_access_token;
            if (previous_bot_access_token.indexOf(bot_access_token) < 0) {
                callback(workspaces[workspaceId]);
                previous_bot_access_token.push(bot_access_token);
            }
        }
    });
};

var reloadUsers = function (workspace) {
    (async () => {
        try {
            // First API call
            const slackUsers = await slack.listUsers(workspace);
            workspace.users = [];
            openIM(workspace, slackUsers.members, 0, function () {
                var workspaceId = workspace._id;
                db.update("workspaces", { _id: new db.mongodb().ObjectId(workspace._id) }, workspace, function () {
                    workspace._id = workspaceId;
                    db.read("dialogs", { name: "Consent PM" }, function (dialog) {
                        dialogs.playInWorkspace(dialog, workspace);
                    })
                });
            });
        } catch (error) {
            logger.error(error);
        }
    })();
}

var route = function (request, response) {

    var regex_workspaceId = /^\/api\/workspaces\/([^/]+)\/?$/;
    var regex_workspaceIdReload = /^\/api\/workspaces\/([^/]+)\/reload\/?$/;
    var objectId;

    if (request.url.match(regex_workspaceId) !== null) {
        objectId = request.url.match(regex_workspaceId)[1];

        // GET : Detail of workspace
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.read("workspaces", { _id: new db.mongodb().ObjectId(objectId) }, function (data) {
                response.write(JSON.stringify(data));
                response.end();
            });
        }

        // DELETE : revoke a workspace token
        else if (request.method === "DELETE") {
            db.read("workspaces", { _id: new db.mongodb().ObjectId(objectId) }, function (workspace) {
                (async () => {
                    try {
                        await slack.revokeToken(workspace);
                    } catch (error) {
                        logger.error(error);
                    }
                })();
            });
            db.delete("workspaces", objectId, function () {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end();
            });
        }

        else {
            response404(response);
        }
    }

    else if (request.url.match(regex_workspaceIdReload) !== null) {
        objectId = request.url.match(regex_workspaceIdReload)[1];
        var id = new db.mongodb().ObjectId(objectId);
        db.read("workspaces", { _id: id }, function (data) {
            reloadUsers(data);
        });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write("{}");
        response.end();
    }

    // GET : retrieve workspaces
    else if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        db.list("workspaces", {}, function (data) {
            response.write(JSON.stringify(data));
            response.end();
        });
    }

    // Any other case
    else {
        response404(response);
    }
};

exports.forEach = forEach;
exports.getUsersByChannelId = getUsersByChannelId;
exports.getUsersById = getUsersById;
exports.openIM = openIM;
exports.reloadUsers = reloadUsers;
exports.route = route;
