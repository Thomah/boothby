const db = require("./db.js");
const scheduler = require("./scheduler.js");

var init = function() {
    db.read("configs", {name: "dialog-publish"}, function(config) {
        if(config === null) {
            db.insert("configs", {
                name: "dialog-publish",
                cron: "42 9 * * 2,4",
                active: true
            }, () => {});
        }
    });
    db.read("configs", {name: "dialog-publish"}, function(config) {
        if(config === null) {
            db.insert("configs", {
                name: "backup",
                cron: "0 17 * * *",
                active: true
            }, () => {});
        }
    });
};

var get = function(callback) {
    db.list("configs", {_id: 1}, function(configs) {
        for(var configNum in configs) {
            configs[configNum].nextInvocation = scheduler.nextInvocation(configs[configNum]);
        }
        callback(configs);
    });
};

var route = function (request, response) {

    // GET : retrieve config
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      get(function (data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    }

    // PUT : update config
    else if (request.method === "PUT") {
      response.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      request.on("data", chunk => {
        body += chunk.toString();
      });
      request.on("end", () => {
        var configs = JSON.parse(body);
        for(var configNum in configs) {
          var config = configs[configNum];
          db.update("configs", { name: config.name }, config, () => {});
          scheduler.reschedule(config);
        }
        response.write(JSON.stringify({}));
        response.end();
      });
    }

    // Otherwise 404
    else {
      response.writeHead(404, { "Content-Type": "application/octet-stream" });
      response.end();
    }
};

exports.init = init;
exports.get = get;
exports.route = route;