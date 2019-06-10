const schedule = require("node-schedule");

var jobs = [];

exports.schedule = function (config, callback) {
    jobs[config.name] = schedule.scheduleJob(config.cron, callback);
};

exports.reschedule = function (config) {
    jobs[config.name] = schedule.rescheduleJob(jobs[config.name], config.cron);
};

exports.nextInvocation = function (config) {
    if(jobs[config.name] !== undefined && jobs[config.name] !== null) {
        return jobs[config.name].nextInvocation();
    } else {
        return "";
    }
};
