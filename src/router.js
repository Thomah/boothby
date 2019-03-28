const fs = require("fs");
const path = require("path");
const { parse } = require("querystring");
const api = require("./api.js");
const db = require("./db.js");
const dialogs = require("./dialogs.js");
const messages = require("./messages.js");
const scheduler = require("./scheduler.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

const resourceFolder = {
  ".html": "./public/html",
  ".css": "./public/css",
  ".js": "./public/js",
  ".ico": "./public/img",
  ".png": "./public/img"
};

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".png": "image/png"
};

var getFilePath = function (request) {
  var extname = String(path.extname(request.url)).toLowerCase();
  var folder = resourceFolder[extname] || resourceFolder[".html"];
  var filePath = folder + request.url;
  if (filePath === resourceFolder[".html"] + "/") {
    filePath = resourceFolder[".html"] + "/index.html";
  } else if(filePath === resourceFolder[".html"] + "/admin/") {
    filePath = resourceFolder[".html"] + "/admin/index.html";
  }
  return filePath;
};

var routeStatic = function (request, response) {
  var filePath = getFilePath(request);
  var extname = String(path.extname(filePath)).toLowerCase();
  var contentType = mimeTypes[extname] || "application/octet-stream";

  // Serving corresponding file
  fs.readFile(filePath, function (error, content) {
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

var routeApi = function (request, response) {

  if (request.url.startsWith("/api/user")) {
    users.route(request, response);
  }

  // /api/config
  else if (request.url === "/api/config") {

    // GET : retrieve config
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      api.getConfig(function (data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    }

    // POST : update config
    else if (request.method === "PUT") {
      response.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      request.on("data", chunk => {
        body += chunk.toString();
      });
      request.on("end", () => {
        var config = JSON.parse(body);
        api.updateObjectInDb("global", { name: "state" }, config, function (data) {
          scheduler.reschedule(config.cron);
          response.write(JSON.stringify(data));
          response.end();
        });
      });
    }

    // Otherwise 404
    else {
      response.writeHead(404, { "Content-Type": "application/octet-stream" });
      response.end();
    }
  }

  // /api/dialogs*
  else if (request.url.startsWith("/api/dialogs")) {
    dialogs.route(request, response);
  }

  // GET : endpoint to interactive components
  else if (request.url === "/api/interactive") {
    response.writeHead(200, { "Content-Type": "application/json" });
    let body = "";
    request.on("data", chunk => {
      body += chunk.toString();
    });
    request.on("end", () => {
      var parsedBody = parse(body);
      api.interactive(parsedBody.payload, function (data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    });
  }

  // /api/dialogs*
  else if (request.url == "/api/links") {
    var slackLink = "https://slack.com/oauth/authorize?client_id=" + process.env.SLACK_CLIENT_ID + "&scope=channels:read,channels:write,emoji:read,bot,chat:write:bot"
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write(JSON.stringify({
      "slack": slackLink
    }));
    response.end();
  }

  // /api/oauth
  else if (request.url.startsWith("/api/oauth") && request.method === "GET") {
    var response_400 = function (err, response) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.write(JSON.stringify(err));
      response.end();
    };
    if (request.params.code != undefined) {
      api.getAccessToken(request.params.code, function (infos) {
        if (!infos.ok) {
          response_400(infos, response);
        } else {
          db.insert("workspaces", infos, function () {
            response.writeHead(302, {
              'Location': `slack://channel?team=${infos.team_id}`
            });
            response.end();
          })
        }
      }, response_400);
    } else {
      response_400("No code provided", response);
    }
  }

  // /api/workspaces
  else if (request.url.startsWith("/api/workspaces")) {
    workspaces.route(request, response);
  }

  // /api/simple-messages
  else if (request.url.startsWith("/api/messages")) {
    messages.route(request, response);
  }

  else {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
  }
};

exports.serve = function (request, response) {
  var regex_params = /(\?|&)([^=]+)=([^&]+)/g;
  if (request.url.match(regex_params) !== null) {
    var matchs = request.url.match(regex_params);
    var params = {};
    var match, k;
    for (k = 0; k < matchs.length; k++) {
      match = matchs[k].match(/(\?|&)([^=]+)=([^&]+)/);
      params[match[2]] = match[3];
    }
    request.params = params;
  }

  //If API request, there is a token in the request header which proves that 
  //   the user is authenticated
  if (request.headers.token) {
    var token = request.headers.token;
  }

  var auth = false;

  // We check if the token in the request header, is the same that matches the one
  //   which has been saved in the cache server
  if (typeof token !== 'undefined') {
    users.getInCache("tokens", function (err, value) {
      if (!err) {
        if (value == undefined) {
          auth = false;
        } else {
          if (value.includes(token)) {
            auth = true;
          }
        }
      }
    });
  }

  var match_params = request.url.match(/^.*(\?.+)\/?$/);
  if (match_params !== null) {
    request.url = request.url.replace(match_params[1], "");
  }

  if (!request.url.startsWith("/api/")) {
    routeStatic(request, response);
  } else {
    if (!auth) {
      if ((request.url === '/api/user/login' && request.method === 'POST')
        || (request.url === '/api/links' && request.method === 'GET')
        || (request.url === '/api/oauth' && request.method === 'GET')
        || (request.url === '/api/interactive' && request.method === 'POST')) {
        routeApi(request, response);
      } else {
        response.writeHead(401); // 401 status code = not allowed to access API
        response.end();
      }
    } else {
      routeApi(request, response);
    }
  }
  return response;
};
