const fs = require("fs");
const path = require("path");

const backups = require("./backups.js");
const configs = require("./configs.js");
const dialogs = require("./dialogs.js");
const files = require("./files.js");
const interactive = require("./interactive.js");
const logger = require("./logger.js");
const messages = require("./messages.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

const resourceFolder = {
  ".html": "./public/html",
  ".css": "./public/css",
  ".js": "./public/js",
  ".ico": "./public/img",
  ".png": "./public/img",
  ".jpg": "./public/img",
  ".xsd": "./public/xsd"
};

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".xsd": "text/xml"
};

var getFilePath = function (request) {
  var extname = String(path.extname(request.url)).toLowerCase();
  var folder = resourceFolder[extname] || resourceFolder[".html"];
  var filePath = folder + request.url.replace('/public', '/').replace('//', '/').replace(/\?.*/, '');
  if (filePath === resourceFolder[".html"] + "/") {
    filePath = resourceFolder[".html"] + "/index.html";
  } else if (filePath === resourceFolder[".html"] + "/admin/") {
    filePath = resourceFolder[".html"] + "/admin/index.html";
  }
  logger.log(`Serving ${filePath}`);
  return filePath;
};

var serveFile = function (req, res) {

  var filePath = getFilePath(req);
  var extname = String(path.extname(filePath)).toLowerCase();
  var contentType = mimeTypes[extname] || "application/octet-stream";

  // Serving corresponding file
  fs.readFile(filePath, function (error, content) {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(500);
        res.end(
          "Sorry, check with the site admin for error: " + error.code + " ..\n"
        );
        res.end();
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
};

var unhandledRequestHandler = function() {
  logger.log('Acknowledging this incoming request because 2 seconds already passed...');
  return true;
};

var processEventErrorHandler = function({ error, logger, response }) {
  logger.error(`processEvent error: ${error}`);
  // acknowledge it anyway!
  response.writeHead(200);
  response.end();
  return true;
};

exports.initRoutes = function (receiver) {

  // API
  receiver.router.get('/api/backups', (req, res) => backups.route(req, res));
  receiver.router.post('/api/backups', (req, res) => backups.route(req, res));
  receiver.router.get('/api/configs', (req, res) => configs.route(req, res));
  receiver.router.put('/api/configs', (req, res) => configs.route(req, res));
  receiver.router.get('/api/dialogs', (req, res) => dialogs.route(req, res));
  receiver.router.get('/api/dialogs/:id/play', (req, res) => dialogs.play(req, res));
  receiver.router.post('/api/dialogs', (req, res) => dialogs.route(req, res));
  receiver.router.delete('/api/dialogs', (req, res) => dialogs.route(req, res));
  receiver.router.get('/api/files/*', (req, res) => files.route(req, res));
  receiver.router.post('/api/files', (req, res) => files.route(req, res));
  receiver.router.get('/api/interactive', (req, res) => interactive.route(req, res));
  receiver.router.get('/api/links', (req, res) => {
    var slackLink = "https://slack.com/oauth/v2/authorize?client_id=" + process.env.SLACK_CLIENT_ID + "&scope=app_mentions:read,channels:join,channels:read,chat:write,files:write,im:write,incoming-webhook,users:read,links:read,channels:history,im:history&user_scope=&redirect_uri=" + process.env.APP_URL + "/api/oauth"
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify({
      "slack": slackLink
    }));
    res.end();
  });
  receiver.router.get('/api/messages', (req, res) => messages.route(req, res));
  receiver.router.post('/api/messages', (req, res) => messages.route(req, res));
  receiver.router.delete('/api/messages/:id', (req, res) => messages.route(req, res));
  receiver.router.get('/api/oauth', workspaces.create);
  receiver.router.get('/api/users', users.list);
  receiver.router.get('/api/users/login', users.login);
  receiver.router.get('/api/users/logout', users.logout);
  receiver.router.post('/api/users', users.create);
  receiver.router.delete('/api/users/:id', users.delete);
  receiver.router.get('/api/workspaces', workspaces.list);
  receiver.router.get('/api/workspaces/:id', workspaces.get);
  receiver.router.get('/api/workspaces/:id/users', workspaces.getSlackUsers);
  receiver.router.post('/api/workspaces/:id/users', workspaces.reloadSlackUsers);
  receiver.router.delete('/api/workspaces/:id', workspaces.delete);

  // Static files
  receiver.router.get('/favicon.ico', (req, res) => serveFile(req, res));
  receiver.router.get('/', (req, res) => {
    fs.readFile(resourceFolder[".html"] + "/index.html", function (error, content) {
      res.writeHead(200, { "Content-Type": mimeTypes['.html'] });
      res.end(content, "utf-8");
    });
  });
  receiver.router.get('/admin/*', (req, res) => serveFile(req, res));
  receiver.router.get('/public/*', (req, res) => serveFile(req, res));

  // Slack
  receiver.unhandledRequestHandler = unhandledRequestHandler;
  receiver.processEventErrorHandler = processEventErrorHandler;
};
