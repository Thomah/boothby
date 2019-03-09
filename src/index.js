const http = require("http");
const api = require("./api.js");
const scheduler = require("./scheduler.js");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const router = require("./router.js");
const slack = require("./slack.js");
const users = require("./users.js");

const ROOT_URL = process.env.ROOT_URL;

var server = http.createServer(function (request, response) {
  router.serve(request, response);
});

db.init(function() {
  api.getConfig(function(config) {
    scheduler.schedule(config.cron, function (fireDate) {
      console.log(`This job was supposed to run at ${fireDate}, but actually ran at ${new Date()}`);
      dialogs.resumeDialogs();
    });
  });
  api.forEachWorkspace(function (tokens) {
    slack.initRtm(tokens);
  });
  
});

server.on("close", function () {
  console.log(" Stopping ...");
  db.close();
});

process.on("SIGINT", function () {
  server.close();
});

users.initCache();

server.listen(8080);
console.log("Server running at " + ROOT_URL);