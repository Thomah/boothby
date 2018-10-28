require('dotenv').config();
const { WebClient } = require('@slack/client');
const Express = require('express');
const BodyParser = require('body-parser');
const Schedule = require('node-schedule');
const Speach = require('./speach');

// Load Express Framework
var app = Express();
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Load Slack Web Client
const HttpsProxyAgent = require("https-proxy-agent");
const token = process.env.SLACK_TOKEN;
var webAdditionalParams;
if (process.env.HTTP_PROXY) {
  webAdditionalParams = { agent: new HttpsProxyAgent(process.env.HTTP_PROXY) };
} else {
  webAdditionalParams = {};
}
const web = new WebClient(token, webAdditionalParams);

function init(dialogId) {
  web.api
    .test()
    .then(() => {
      Speach.Speach(web);
      if (dialogId !== undefined) {
        Speach.processDialog(dialogId);
      }
    })
    .catch(console.error);
}

function resume() {
  init();
  Speach.readDb('global', 'state', function(data) {
    if(data === null) {
      data = {};
      data.daily = 1;
      data.name = 'state';
      Speach.insertInDb('global', 'state', data);
    }
    if(data.daily < 4) {
      Speach.processDialog('daily/' + data.daily);
    }
    data.daily++;
    Speach.updateInDb('global', 'state', data);
  });
}

// Load View Engine
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

// Home Route
app.get("/", function(req, res) {
  init();
  res.render("index");
});
app.get("/intro", function(req, res) {
  init("intro");
  res.render("index");
});
app.get("/publish/:id", function(req, res) {
  init("daily/" + req.params.id);
  res.render("index");
});
app.post("/callback", function(req, res) {
  res.send("OK");
  init();
  Speach.survey(req);
});

app.listen(8080);
 
// Main Scheduler
var cronEveryDay = '42 10 * * 1-5'
var j = Schedule.scheduleJob('* * * * *', function(fireDate){
  console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
  resume();
});
console.log("cron set");