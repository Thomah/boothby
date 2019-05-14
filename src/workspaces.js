const db = require("./db.js");
const logger = require("./logger.js");
const slack = require("./slack.js");

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var openIM = function(workspace, members, memberId, callback) {
    var member = members[memberId];
    if(member === undefined) {
        callback(workspace);
    } else if(!member.is_bot) {
        setTimeout(function () {
            slack.openIM(workspace, {
                user: member.id
                }).then(slackIMs => {
                    workspace.users.push({
                        id: member.id,
                        im_id: slackIMs.channel.id
                    });
                    openIM(workspace, members, memberId + 1, callback);
                })
                .catch(logger.error);
          }, 600);
    } else {
        openIM(workspace, members, memberId + 1, callback);
    }
}

var getUsersByChannelId = function(workspace, channelId) {
    var numUserFound = false;
    var userNum = 0;
    var users = workspace.users;
    while (!numUserFound && userNum < users.length) {
        numUserFound |= users[userNum].im_id === channelId;
        userNum++;
    }
    if(numUserFound) {
        return users[userNum - 1];
    }
    return null;
};

var forEach = function(callback) {
    db.list("workspaces", {}, function(workspaces) {
        var previous_bot_access_token = [];
        for(var workspaceId in workspaces) {
            var tokens = {
                user_access_token: workspaces[workspaceId].access_token,
                bot_access_token: workspaces[workspaceId].bot.bot_access_token
            }
            if(previous_bot_access_token.indexOf(tokens.bot_access_token) < 0) {
                callback(workspaces[workspaceId]);
                previous_bot_access_token.push(workspaces[workspaceId].bot.bot_access_token);
            }
        }
    });
};

var route = function (request, response) {

    var regex_workspaceId = /^\/api\/workspaces\/([^/]+)\/?$/;
    var regex_workspaceIdReload = /^\/api\/workspaces\/([^/]+)\/reload\/?$/;
    var objectId;

    if (request.url.match(regex_workspaceId) !== null) {
        objectId = request.url.match(regex_workspaceId)[1];

        // GET : Detail of workspace
        if(request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.read("workspaces", { _id: new db.mongodb().ObjectId(objectId) }, function (data) {
                response.write(JSON.stringify(data));
                response.end();
            });
        }

        // DELETE : revoke a workspace token
        else if (request.method === "DELETE") {
            db.read("workspaces", { _id: new db.mongodb().ObjectId(objectId) }, function(workspace) {
                slack.revokeToken({
                    user_access_token: workspace.access_token,
                    bot_access_token: workspace.bot.bot_access_token
                    });
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
            slack.listUsers(data)
                .then(slackUsers => {
                    data.users = [];
                    openIM(data, slackUsers.members, 0, function() {
                        db.update("workspaces", {_id: id}, data, function() {});
                    });
                })
                .catch(logger.error);
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

exports.getUsersByChannelId = getUsersByChannelId;
exports.forEach = forEach;
exports.route = route;
