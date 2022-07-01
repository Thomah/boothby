const db = require('./db/index.js');
const logger = require("./logger.js");
const scheduler = require("./scheduler.js");

exports.list = function (callback_success, callback_error) {
  db.querySync('SELECT id, name, cron, active FROM configs', [], (err, data) => {
    if (err) {
      logger.error('Cannot list configs : \n -> ' + err);
      callback_error();
    } else {
      for (var configNum in data.rows) {
        data.rows[configNum].nextInvocation = scheduler.nextInvocation(data.rows[configNum]);
      }
      callback_success(data.rows);
    }
  });
}

exports.router = {};

exports.router.list = function (req, res) {
  exports.list(
    configs => {
      res.send(configs)
    }, () => {
      res.status(500).end();
    });
};

exports.router.update = function (req, res) {
  let body = "";
  req.on("data", chunk => {
    body += chunk.toString();
  });
  req.on("end", () => {
    var configs = JSON.parse(body);
    for (var configNum in configs) {
      var config = configs[configNum];
      db.querySync("UPDATE configs SET cron = $1, active = $2 WHERE name = $3", [config.cron, config.active, config.name], (err) => {
        if (err) {
          logger.error('Cannot update config ' + config.id + ' : \n -> ' + err);
        }
      });
      scheduler.reschedule(config);
    }
    res.status(200).end();
  });
};
