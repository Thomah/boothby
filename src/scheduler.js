const schedule = require("node-schedule");

var job

exports.schedule = function (cron, callback) {
    job = schedule.scheduleJob(cron, callback);
};

exports.reschedule = function (cron) {
    job.reschedule(cron);
};

exports.nextInvocation = function () {
    return job.nextInvocation();
};
