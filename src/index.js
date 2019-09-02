const fs = require("fs");
const http = require("http");
const https = require('https');
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

const SSL_KEY_FILE = process.env.BOOTHBY_SSL_KEY_FILE;
const SSL_CERT_FILE = process.env.BOOTHBY_SSL_CERT_FILE;

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

var server = http.createServer(router.serve);

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

server.listen(80);

if(SSL_KEY_FILE !== undefined && SSL_CERT_FILE !== undefined) {
  var options = {
    key: fs.readFileSync(SSL_KEY_FILE, 'utf8'),
    cert: fs.readFileSync(SSL_CERT_FILE, 'utf8')
  };
  var serverSecured = https.createServer(options, router.serve);
  
  serverSecured.listen(443);
}