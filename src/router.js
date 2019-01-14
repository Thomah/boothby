const fs = require("fs");
const path = require("path");
const { parse } = require("querystring");
const api = require("./api.js");

const resourceFolder = {
  ".html": "./public/html",
  ".js": "./public/js",
  ".ico": "./public/img"
};

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon"
};

var channels = undefined;
var ims = [];
var nbIMs = 0;

var getFilePath = function(request) {
  var extname = String(path.extname(request.simpleUrl)).toLowerCase();
  var folder = resourceFolder[extname] || resourceFolder[".html"];
  var filePath = folder + request.simpleUrl;
  if (filePath === resourceFolder[".html"] + "/") {
    filePath = resourceFolder[".html"] + "/index.html";
  }
  return filePath;
};

var routeStatic = function(request, response) {
  var filePath = getFilePath(request);
  var extname = String(path.extname(filePath)).toLowerCase();
  var contentType = mimeTypes[extname] || "application/octet-stream";

  // Serving corresponding file
  fs.readFile(filePath, function(error, content) {
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
      response.writeHead(200, { "Content-Type": contentType });
      response.end(content, "utf-8");
    }
  });
};

var routeApi = function(request, response) {

  if (request.url.startsWith("/api/dialogs")) {
    var regex_play = /^\/api\/dialogs\/([^/]+)\/play$/;
    var regex_dialogName = /^\/api\/dialogs\/([^/]+)$/;
    
    // api/dialogs
    if (request.url.match(/^\/api\/dialogs\/?$/) !== null) {

      // GET : list dialogs
      if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.listDialogs(function(data) {
          response.write(JSON.stringify(data));
          response.end();
        });
      } 
      
      // POST : create new dialog
      else if (request.method === "POST") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.createDialog(function(data) {
          response.write(JSON.stringify(data));
          response.end();
        });
      }
        
        // Otherwise 404
      else {
        response.writeHead(404, { "Content-Type": "application/octet-stream" });
        response.end();
      }

    }
    
    // api/dialogs/play
    else if (request.url.match(regex_play) !== null) {
      var dialogName = request.url.match(regex_play)[1];
      api.processDialog("daily", dialogName);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end();
    } 
    
    // api/dialogs/name
    else if (request.url.match(regex_dialogName) !== null) {
      var dialogName = request.url.match(regex_dialogName)[1];
      response.writeHead(200, { "Content-Type": "application/json" });
      api.getObjectInDb("dialogs-daily", dialogName, function(data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    } 
    
    // Otherwise 404
    else {
      response.writeHead(404, { "Content-Type": "application/octet-stream" });
      response.end();
    }
  } else if (request.url === "/api/channelsAndIMs") {
    response.writeHead(200, { "Content-Type": "application/json" });
    api.listChannels(function(data) {
      channels = data;
    });
    api.listUsers(function(dataUsers) {
      var tmpUsers = dataUsers.members;
      nbIMs = tmpUsers.length;
      for (var userNb in tmpUsers) {
        var user = tmpUsers[userNb];
        if (!user.is_bot) {
          api.openIm(user, function(data) {
            ims.push(data.channel);
          });
        } else {
          ims.push({ user: user });
        }
      }
    });
    waitForChannelsAndIMs(response);
  } else if (request.url === "/api/interactive") {
    response.writeHead(200, { "Content-Type": "application/json" });
    let body = "";
    request.on("data", chunk => {
      body += chunk.toString();
    });
    request.on("end", () => {
      var parsedBody = parse(body);
      api.interactive(parsedBody.payload);
    });
    response.write("{}");
    response.end();
  } else if (request.url.startsWith("/api/simple-messages")) {
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      api.listMessages(function(data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    } else if (request.method === "DELETE") {
      var regex_delete = /^\/api\/simple-messages\/([^/]+)\/?$/;
      if (request.url.match(regex_delete) !== null) {
        var messageId = request.url.match(regex_delete)[1];
        api.deleteMessage(messageId, function(data) {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end();
        });
      } else {
        response.writeHead(404, { "Content-Type": "application/octet-stream" });
        response.end();
      }
    } else if (request.method === "POST") {
      if (request.url === "/api/simple-messages/send") {
        let body = "";
        request.on("data", chunk => {
          body += chunk.toString();
        });
        request.on("end", () => {
          var parsedBody = parse(body);
          api.sendSimpleMessage(parsedBody.channel, parsedBody.message);
        });
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end();
      }
    } else {
      response.writeHead(404, { "Content-Type": "application/octet-stream" });
      response.end();
    }
  } else {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
  }
};

var waitForChannelsAndIMs = function(response) {
  if (channels === undefined || ims.length !== nbIMs) {
    setTimeout(function() {
      waitForChannelsAndIMs(response);
    }, 100);
  } else {
    var data = {
      channels: channels,
      ims: ims
    };

    response.write(JSON.stringify(data));
    response.end();
  }
};

var serve = function(request, response) {
  if (!request.url.startsWith("/api/")) {
    var match_params = request.url.match(/^.*(\?.+)\/?$/);
    if (match_params !== null) {
      request.simpleUrl = request.url.replace(match_params[1], "");
    } else {
      request.simpleUrl = request.url;
    }
    routeStatic(request, response);
  } else {
    routeApi(request, response);
  }
  return response;
};

exports.serve = serve;
