const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');

const configs = require("./configs.js");
const db = require('./db/index.js');
const dialogs = require("./dialogs.js");
const logger = require("./logger.js");
const messages = require("./messages.js");
const router = require("./router.js");
const scheduler = require("./scheduler.js");
const slack = require("./slack.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

require('dotenv').config();

const PORT = process.env.PORT ? process.env.PORT : 80;

const HttpsProxyAgent = require('https-proxy-agent');
const proxy = process.env.HTTP_PROXY ? new HttpsProxyAgent(process.env.HTTP_PROXY) : null;

db.waitForLiquibase(() => {
  configs.list(data => {
    for (var dataNum in data) {
      var config = data[dataNum];
      if (config.name === "dialog-publish") {
        scheduler.schedule(config, function (fireDate) {
          logger.log('CRON Execution : dialog-publish (scheduled at ' + fireDate + ')');
          dialogs.resumeDialogs();
        });
      }
    }
  });
  users.createDefaultUser();
  slack.initJobs();
});

users.initCache();

const authorizeFn = async ({ teamId }) => {
  var workspace = await workspaces.getByTeamIdSync(teamId);
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
    messages.create(message);
  }
  if (message.text === ":house:") {
    workspaces.getByTeamId(message.team, slackTeam => {
      workspaces.getUsersByChannelId(message.channel, user => {
        dialogs.getByName("Consent PM", dialog => {
          dialog.channelId = user.im_id;
          dialogs.speakRecurse(slackTeam, dialog, "0", () => { });
        });
      });
    });
  }
});

app.event('team_join', async ({ event }) => {
  workspaces.getByTeamId(event.user.team_id, slackTeam => {
    if (slackTeam !== undefined) {
      var slackUser = [event.user];
      workspaces.openIM(slackTeam, slackUser, 0, () => {
        workspaces.saveSlackUsersInDb(slackUser, 0, () => {
          dialogs.getByName("Consent PM", dialog => {
            workspaces.getUsersBySlackId(event.user.id, slackUser => {
              dialog.channelId = slackUser.im_id;
              dialogs.speakRecurse(slackTeam, dialog, 0);
            });
          });
        })
      });
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
