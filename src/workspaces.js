const db = require("./db.js");
const slack = require("./slack.js");

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function (request, response) {

    // GET : retrieve messages
    if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        db.list("workspaces", function (data) {
            response.write(JSON.stringify(data));
            response.end();
        });
    }

    // DELETE : delete a message
    else if (request.method === "DELETE") {
        var regex_delete = /^\/api\/workspaces\/([^/]+)\/?$/;
        if (request.url.match(regex_delete) !== null) {
            var objectId = request.url.match(regex_delete)[1];
            db.read("workspaces", { _id: new db.mongodb().ObjectId(objectId) }, function(workspace) {
                slack.revokeToken({
                    user_access_token: workspace.access_token,
                    bot_access_token: workspace.bot.bot_access_token
                  });
            });
            db.delete("workspaces", objectId, function (_result) {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end();
            });
        } else {
            response404(response);
        }
    }

    // Any other verb
    else {
        response404(response);
    }
};

exports.route = route;
