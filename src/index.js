require('dotenv').config();
const { WebClient } = require('@slack/client');
const Express = require('express');
const BodyParser = require('body-parser');
const Schedule = require('node-schedule');
const Db = require('./db');
const Speach = require('./speach');

// Load Express Framework
var app = Express();
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Load Slack Web Client
const HttpsProxyAgent = require("https-proxy-agent");
var webAdditionalParams;
if (process.env.HTTP_PROXY) {
  webAdditionalParams = { agent: new HttpsProxyAgent(process.env.HTTP_PROXY) };
} else {
  webAdditionalParams = {};
}
const web = new WebClient(process.env.SLACK_TOKEN, webAdditionalParams);

function init(callback) {
  web.api
    .test()
    .then(() => {
      Speach.Speach(web);
      callback();
    })
    .catch(console.error);
}

function resume() {
  init(function() {
    Db.readDb('global', 'state', function(data) {
      if(data === null) {
        data = {};
        data.daily = 1;
        data.name = 'state';
        Db.insertInDb('global', 'state', data);
      }
      Speach.processDialog('daily', data.daily.toString());
      data.daily++;
      Db.updateInDb('global', 'state', data);
    });
  });
}

// Load View Engine
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

// Home Route
app.get('/', function(req, res) {
  init(() => {});
  res.render('index');
});
app.get('/setup', function(req, res) {
  init(function() {
    Speach.loadInDb();
  });
  res.render("index");
});

app.get('/resume', function(req, res) {
  resume();
  res.render("index");
});

app.get('/publish/:collection/:name', function(req, res) {
  init(function() {
    Speach.processDialog(req.params.collection, req.params.name);
  });
  res.render("index");
});
app.post("/callback", function(req, res) {
  res.send("OK");
  init();
  Speach.survey(req);
});

app.listen(8080);
 
// Main Scheduler
var cron = '42 9 * * 1-5';
var j = Schedule.scheduleJob(cron, function(fireDate){
  console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
  resume();
});
console.log(`CRON set : ${cron} on resume()`);