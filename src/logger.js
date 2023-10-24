const fs = require("fs");

const SAVE_LOGS = process.env.SAVE_LOGS ? process.env.SAVE_LOGS : false;

var print = function (level, message) {
    message = '[' + new Date().toLocaleString("FR", { timeZone: 'Europe/Paris' }) + '][' + level + '] ' + message;
    // eslint-disable-next-line no-console
    console.log(message);
    if(SAVE_LOGS) {
        fs.appendFile('console.log', message + '\n', function (err) {
            if (err) throw err;
        });
    }
}

exports.debug = function(message) {
    print('DEBUG', message);
}

exports.log = function(message) {
    print('INFO', message);
}

exports.info = function(message) {
    print('INFO', message);
}

exports.error = function(message) {
    print('ERROR', message);
}
