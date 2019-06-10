const fs = require("fs");
const http = require("http");
const backups = require("./backups.js");
const configs = require("./configs.js");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const router = require("./router.js");
const scheduler = require("./scheduler.js");
const slack = require("./slack.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

const ROOT_URL = process.env.ROOT_URL;

function readFiles(dirname, onFileContent, onError) {
  fs.readdir(dirname, function (err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function (filename) {
      fs.readFile(dirname + filename, 'utf-8', function (err, content) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(content);
      });
    });
  });
}

var server = http.createServer(function (request, response) {
  router.serve(request, response);
});

db.init(function () {
  configs.init();
  readFiles('./files/preset-dialogs/', function (content) {
    var contentToSave = JSON.parse(content);
    db.upsert("dialogs", { name: contentToSave.name }, contentToSave, function () { });
  }, logger.error);
  configs.get(function(data) {
    for(var dataNum in data) {
      var config = data[dataNum];
      if(config.name === "dialog-publish") {
        scheduler.schedule(config, function (fireDate) {
          logger.log('CRON Execution : dialog-publish (scheduled at ' + fireDate + ')');
          dialogs.resumeDialogs();
        });
      } else if(config.name === "backup") {
        scheduler.schedule(config, function (fireDate) {
          logger.log('CRON Execution : backup (scheduled at ' + fireDate + ')');
          backups.backup();
        });
      }
    }
  });
  workspaces.forEach(slack.initRtm);
  users.createDefaultUser();
  slack.initJobs();
});

server.on("close", function () {
  logger.log(" Stopping ...");
  db.close();
});

process.on("SIGINT", function () {
  server.close();
});

users.initCache();

server.listen(8080);
logger.log("Server running at " + ROOT_URL);