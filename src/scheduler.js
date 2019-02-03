const schedule = require("node-schedule");

var job

exports.schedule = function (cron, callback) {
    job = schedule.scheduleJob(cron, callback);
};

exports.reschedule = function (cron) {
    job = schedule.rescheduleJob(job, cron);
};

exports.nextInvocation = function () {
    if(job !== undefined && job !== null) {
        return job.nextInvocation();
    } else {
        return "";
    }
};
