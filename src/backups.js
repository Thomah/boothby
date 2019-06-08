const fs = require("fs");
const db = require("./db.js");
const logger = require("./logger.js");

const collections = ['conversations', 'dialogs', 'files', 'global', 'messages', 'surveys', 'user', 'workspaces'];

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function (request, response) {
    var regex_backupId = /^\/api\/backups\/([^/]+)$/;

    // api/backups
    if (request.url.match(/^\/api\/backups\/?$/) !== null) {
        // GET : list backups
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            fs.mkdir('files/backups', { recursive: true }, (err) => {
                if (err && err.code !== 'EEXIST') throw err;
                fs.readdir('files/backups/', (err, files) => {
                    if(err) logger.error(err);
                    response.write(JSON.stringify(files));
                    response.end();
                });
            });
        }

        // POST : create new backup
        else if (request.method === "POST") {
            const now = new Date();
            const path = 'files/backups/' + now.getFullYear() + '-' + now.getMonth() + '-' + now.getDay() + '-' + now.getHours() + now.getMinutes() + now.getSeconds();
            for(var collectionNum in collections) {
                var collection = collections[collectionNum];
                db.list(collection, {_id: 1}, function(result, collection) {
                    const file = path + '/' + collection + '.json'
                    fs.mkdir(path, { recursive: true }, (err) => {
                        if (err && err.code !== 'EEXIST') throw err;
                        fs.writeFile(file, JSON.stringify(result), function(err) {
                            if(err) logger.error(err);
                        }); 
                    });
                });
              }
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end();
        }

        // Otherwise 404
        else {
            response404(response);
        }
    }

    // api/backups/<id>
    else if (request.url.match(regex_backupId) !== null) {
        //backupId = request.url.match(regex_backupId)[1];

        // GET : get a backup
        if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.write(JSON.stringify({}));
            response.end();
        }

        // PUT : update a backup
        else if (request.method === "PUT") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.write(JSON.stringify({}));
            response.end();
        }

        // DELETE : delete a backup
        else if (request.method === "DELETE") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.write(JSON.stringify({}));
            response.end();
        }

        // Otherwise 404
        else {
            response404(response);
        }
    }

    // Otherwise 404
    else {
        response404(response);
    }
};


exports.route = route;