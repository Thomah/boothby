const fs = require("fs");
const formidable = require('formidable');
const db = require('./db/index.js');
const logger = require("./logger.js");

exports.router = {};

exports.router.create = function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var fileInDb = {
      name: req.headers.filename,
      type: files.file.type
    };
    db.querySync("INSERT INTO files(name, type) VALUES ($1, $2) RETURNING id", [fileInDb.name, fileInDb.type], (err, data) => {
      if (err) {
        logger.error('Cannot create file ' + JSON.stringify(fileInDb) + ': \n -> ' + err);
        res.status(500).end();
      } else {
        fileInDb.id = data.rows[0].id;
        fs.mkdir('files', { recursive: true }, (err) => {
          if (err && err.code !== 'EEXIST') throw err;
          fs.copyFile(files.file.path, 'files/' + data.rows[0].id, function (err) {
            if (err) throw err;
            res.write(JSON.stringify(fileInDb));
            res.end();
          });
        });
      }
    });
  });
};

exports.router.get = function (req, res) {
  var fileId = req.params.id;
  db.querySync('SELECT id, name, type FROM files WHERE id = $1', [fileId], (err, data) => {
    if (err) {
      logger.error('Cannot get file ' + fileId + ': \n -> ' + err);
      res.status(500).end();
    } else if (data.rowCount > 1) {
      logger.error('Cannot get file ' + fileId + ': multiple occurrences in DB');
      res.status(500).end();
    } else {
      fs.readFile("files/uploads/" + fileId, function (error, content) {
        if (error) {
          if (error.code === "ENOENT") {
            res.writeHead(404);
            res.end();
          } else {
            res.writeHead(500);
            res.end(
              "Sorry, check with the site admin for error: " + error.code + " ..\n"
            );
          }
        } else {
          res.writeHead(200, { "Content-Type": data.rows[0].type });
          res.end(content, "utf-8");
        }
      });
    }
  });
};
