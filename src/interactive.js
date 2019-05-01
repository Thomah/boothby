const { parse } = require("querystring");

const db = require("./db.js");
const slack = require("./slack.js");
const workspaces = require("./workspaces.js");

var answerSurvey = function (payload, callback) {
    var splitActionValue = payload.actions[0].value.split("-");
    db.read("dialogs", { _id: new db.mongodb().ObjectId(splitActionValue[0]) }, function (data) {
        callback(data[splitActionValue[1]]);
    });

    db.read("surveys", { name: payload.actions[0].name }, function (data) {
        var newMessage = payload.original_message;
        if (data === null) {
            data = {};
            data.name = payload.actions[0].name;
            db.insert("surveys", data);
        }
        if (data.texts === undefined) {
            data.texts = {};
            data.actions = {};
            data.values = {};
            data.users = {};
            for (
                var noAction = 0;
                noAction < newMessage.attachments[0].actions.length;
                noAction++
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
        db.updateByName("surveys", payload.actions[0].name, data);

        for (var id in data.texts) {
            newMessage.attachments[0].actions[data.actions[id]].text =
                data.texts[id] + " (" + data.values[id] + ")";
        }

        workspaces.forEach(function (workspace) {
            slack.updateMessage(workspace, {
                channel: payload.channel.id,
                text: newMessage.text,
                link_names: true,
                ts: payload.message_ts,
                attachments: newMessage.attachments
            });
        });
    });
};

var route = function (request, response) {
    response.writeHead(200, { "Content-Type": "application/json" });
    let body = "";
    request.on("data", chunk => {
        body += chunk.toString();
    });
    request.on("end", () => {
        var payload = JSON.parse(parse(body).payload);
        if (payload.type === "interactive_message") {
            answerSurvey(payload, function (data) {
                response.write(JSON.stringify(data));
                response.end();
            });
        }
    });

};

exports.route = route;