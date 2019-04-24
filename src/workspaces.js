const db = require("./db.js");
const slack = require("./slack.js");

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function (request, response) {

    var regex_workspaceId = /^\/api\/workspaces\/([^/]+)\/?$/;
    var regex_workspaceIdReload = /^\/api\/workspaces\/([^/]+)\/reload\/?$/;

    if (request.url.match(regex_workspaceId) !== null) {

        var objectId = request.url.match(regex_workspaceId)[1];

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
        console.log("Est-ce que tu m'entends hého ?");
        response.writeHead(200, { "Content-Type": "application/json" });
        response.write("{}");
        response.end();
    }

    // GET : retrieve workspaces
    else if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        db.list("workspaces", function (data) {
            response.write(JSON.stringify(data));
            response.end();
        });
    }

    // Any other case
    else {
        response404(response);
    }
};

exports.route = route;
