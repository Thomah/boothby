const fs = require("fs");
var formidable = require('formidable');

const db = require("./db.js");

var response404 = function (response) {
  response.writeHead(404, { "Content-Type": "application/octet-stream" });
  response.end();
};

var route = function (request, response) {

  var regex_fileId = /^\/api\/files\/([^/]+)$/;

  // /api/files/upload
  if (request.url == "/api/files/upload") {
    var form = new formidable.IncomingForm();
    form.parse(request, function (err, fields, files) {
      var fileInDb = {
        name: request.headers.filename,
        type: files.file.type
      };
      db.insert('files', fileInDb, function (data) {
        fs.mkdir('files', { recursive: true }, (err) => {
          if (err) throw err;
          fs.copyFile(files.file.path, 'files/' + data.insertedId, function (err) {
            if (err) throw err;
            response.write(JSON.stringify(fileInDb));
            response.end();
          });
        });
      });
    });
  }

  // /api/files/<id>
  else if (request.url.match(regex_fileId) !== null) {
    var fileId = request.url.match(regex_fileId)[1];
    db.read("files", { _id: new db.mongodb().ObjectId(fileId) }, function(data) {
      fs.readFile("files/" + fileId, function (error, content) {
        if (error) {
          if (error.code === "ENOENT") {
            response.writeHead(404);
            response.end();
          } else {
            response.writeHead(500);
            response.end(
              "Sorry, check with the site admin for error: " + error.code + " ..\n"
            );
            response.end();
          }
        } else {
          response.writeHead(200, { "Content-Type": data.type });
          response.end(content, "utf-8");
        }
      });
    });
  }

  // Otherwise 404
  else {
    response404(response);
  }
};

exports.route = route;