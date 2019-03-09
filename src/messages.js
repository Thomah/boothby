const { parse } = require("querystring");
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
        db.list("messages", function (data) {
            response.write(JSON.stringify(data));
            response.end();
        });
    }

    // DELETE : delete a message
    else if (request.method === "DELETE") {
        var regex_delete = /^\/api\/messages\/([^/]+)\/?$/;
        if (request.url.match(regex_delete) !== null) {
            var objectId = request.url.match(regex_delete)[1];
            db.delete("messages", objectId, function () {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end();
            });
        } else {
            response404(response);
        }
    }

    // POST : send a message
    else if (request.method === "POST") {
        if (request.url === "/api/messages/send") {
            let body = "";
            request.on("data", chunk => {
                body += chunk.toString();
            });
            request.on("end", () => {
                var parsedBody = parse(body);
                db.read("workspaces", {team_id: parsedBody.workspace}, function(workspace) {
                    slack.sendSimpleMessage(workspace.bot.bot_access_token, parsedBody.channel, parsedBody.message);
                });
            });
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end();
        }
    }

    // Any other verb
    else {
        response404(response);
    }
};

exports.route = route;
