const { ExpressReceiver } = require('@slack/bolt');
const fs = require("fs");

const backups = require("./backups.js");
const configs = require("./configs.js");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const router = require("./router.js");
const scheduler = require("./scheduler.js");
const slack = require("./slack.js");
const users = require("./users.js");

require('dotenv').config();

const PORT = process.env.PORT ? process.env.PORT : 80;

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
router.initRoutes(receiver);
const app = slack.initApp(receiver);

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

db.init(function () {
  configs.init();
  readFiles('./files/preset-dialogs/', function (content) {
    var contentToSave = JSON.parse(content);
    db.upsert("dialogs", { name: contentToSave.name }, contentToSave, function () { });
  }, logger.error);
  configs.get(function (data) {
    for (var dataNum in data) {
      var config = data[dataNum];
      if (config.name === "dialog-publish") {
        scheduler.schedule(config, function (fireDate) {
          logger.log('CRON Execution : dialog-publish (scheduled at ' + fireDate + ')');
          dialogs.resumeDialogs();
        });
      } else if (config.name === "backup") {
        scheduler.schedule(config, function (fireDate) {
          logger.log('CRON Execution : backup (scheduled at ' + fireDate + ')');
          backups.backup();
        });
      }
    }
  });
  users.createDefaultUser();
  slack.initJobs();
});

users.initCache();

(async () => {
  // Start the built-in server
  const server = await app.start(PORT);

  // Log a message when the server is ready
  logger.log('🚀 Boothby is running !');
  logger.log(`-> Local Port : ${server.address().port}`)
  logger.log(`-> Public URL : ${process.env.APP_URL}`)
})();