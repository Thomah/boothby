const fs = require("fs");

var print = function (level, message) {
    message = '[' + new Date().toLocaleString("FR", { timeZone: 'Europe/Paris' }) + '][' + level + '] ' + message;
    // eslint-disable-next-line no-console
    console.log(message);
    fs.appendFile('console.log', message + '\n', function (err) {
        if (err) throw err;
    });
}

exports.log = function(message) {
    print('INFO', message);
}

exports.error = function(message) {
    print('ERROR', message);
}
