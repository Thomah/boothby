const fs = require("fs");
const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');

const backups = require("./backups.js");
const configs = require("./configs.js");
const db = require("./mongo.js");
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const router = require("./router.js");
const scheduler = require("./scheduler.js");
const slack = require("./slack.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

require('dotenv').config();

const PORT = process.env.PORT ? process.env.PORT : 80;

const HttpsProxyAgent = require('https-proxy-agent');
const proxy = process.env.HTTP_PROXY ? new HttpsProxyAgent(process.env.HTTP_PROXY) : null;

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

const authorizeFn = async ({ teamId }) => {
  var marchWorkspaceId = { team_id: teamId };
  var workspace = await db.readSync("workspaces", marchWorkspaceId);
  if (workspace != null) {
    return {
      botToken: workspace.access_token,
      botId: workspace.bot_id,
      botUserId: workspace.bot_user_id
    };
  } else {
    logger.log('No matching authorizations');
  }
}

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET });
router.initRoutes(receiver);
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  authorize: authorizeFn,
  agent: proxy,
  logLevel: LogLevel.DEBUG,
  receiver: receiver,
  extendedErrorHandler: true,
  deferInitialization: true
});

app.message(async ({ message }) => {
    if (message.text !== undefined) {
        db.insert("messages", message);
    }
    if (message.text === ":house:") {
        db.read("workspaces", { team_id: message.team }, function (workspacesInDb) {
            var workspace = workspacesInDb;
            if (workspacesInDb.access_token === undefined) {
                workspace = workspacesInDb[0];
            }
            var user = workspaces.getUsersByChannelId(workspace, message.channel);
            if (user !== null) {
                db.read("dialogs", { name: "Consent PM" }, function (dialog) {
                    dialog.channelId = message.channel;
                    dialogs.speakRecurse(workspace, dialog, "0", () => { });
                })
            }
        });
    }
});

app.event('team_join', async ({ event }) => {
  db.read("workspaces", { team_id: event.user.team_id }, function (workspacesOfNewUser) {
    if (!Array.isArray(workspacesOfNewUser)) {
      workspacesOfNewUser = [workspacesOfNewUser];
    }
    var previous_bot_access_token = [];
    for (var workspaceNum in workspacesOfNewUser) {
      var workspaceOfNewUser = workspacesOfNewUser[workspaceNum];
      if (previous_bot_access_token.indexOf(workspaceOfNewUser.access_token) < 0) {
        workspaces.openIM(workspaceOfNewUser, [event.user], 0, function () {
          var workspaceId = workspaceOfNewUser._id;
          db.update("workspaces", { _id: new db.mongodb().ObjectId(workspaceId) }, workspaceOfNewUser, function () {
            db.read("dialogs", { name: "Consent PM" }, function (dialog) {
              dialog.channelId = workspaces.getUsersById(workspaceOfNewUser, event.user.id).im_id;
              workspaceOfNewUser._id = workspaceId;
              dialogs.speakRecurse(workspaceOfNewUser, dialog, 0);
            });
          });
        });
        previous_bot_access_token.push(workspaceOfNewUser.access_token);
      }
    }
  });
});

app.error(({ error, logger, context }) => {
  // Log the error using the logger passed into Bolt
  logger.error(error);

  if (context.teamId) {
    // Do something with the team's ID for debugging purposes
  }
});

(async () => {
  // Start the built-in server
  await app.init();
  const server = await app.start(PORT);
  slack.setApp(app);

  // Log a message when the server is ready
  logger.log('🚀 Boothby is running !');
  logger.log(`-> Local Port : ${server.address().port}`)
  logger.log(`-> Public URL : ${process.env.APP_URL}`)
})();
