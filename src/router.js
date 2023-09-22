const fs = require("fs");
const path = require("path");

const configs = require("./configs.js");
const dialogs = require("./dialogs.js");
const experiences = require("./experiences.js");
const files = require("./files.js");
const interactive = require("./interactive.js");
const logger = require("./logger.js");
const messages = require("./messages.js");
const surveys = require("./surveys.js");
const users = require("./users.js");
const workspaces = require("./workspaces.js");

const resourceFolder = {
  ".html": "./public/html",
  ".css": "./public/css",
  ".js": "./public/js",
  ".ico": "./public/img",
  ".png": "./public/img",
  ".jpg": "./public/img"
};

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpg"
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

var authenticate = function(req, res, next) {
  if (req.headers.cookie && req.headers.cookie.indexOf('=') >= 0) {
    var token = req.headers.cookie.split('=')[1];
    users.getInCache("tokens", function (err, value) {
      logger.info(value);
      logger.info(token);
      if (!err) {
        if (value == undefined) {
          res.redirect('/admin/auth.html');
        } else {
          if (value.includes(token)) {
            next();
          } else {
            res.redirect('/admin/auth.html');
          }
        }
      } else {
        res.redirect('/admin/auth.html');
      }
    });
  } else {
    res.redirect('/admin/auth.html');
  }
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


  // Public API
  receiver.router.post('/api/interactive', interactive.router.interact);
  receiver.router.get('/api/links', (req, res) => {
    var slackLink = "https://slack.com/oauth/v2/authorize?client_id=" + process.env.SLACK_CLIENT_ID + "&scope=app_mentions:read,channels:join,channels:read,chat:write,files:write,im:write,incoming-webhook,users:read,links:read,channels:history,im:history&user_scope=&redirect_uri=" + process.env.APP_URL + "/api/oauth"
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify({
      "slack": slackLink
    }));
    res.end();
  });
  receiver.router.post('/api/users/login', users.router.login);
  receiver.router.get('/api/oauth', workspaces.router.create);

  // Authenticated API
  receiver.router.get('/api/configs', authenticate, configs.router.list);
  receiver.router.put('/api/configs', authenticate, configs.router.update);
  receiver.router.get('/api/dialogs', authenticate, dialogs.router.list);
  receiver.router.post('/api/dialogs', authenticate, dialogs.router.create);
  receiver.router.get('/api/dialogs/:id', authenticate, dialogs.router.get);
  receiver.router.put('/api/dialogs/:id', authenticate, dialogs.router.update);
  receiver.router.delete('/api/dialogs/:id', authenticate, dialogs.router.delete);
  receiver.router.get('/api/dialogs/:id/play', authenticate, dialogs.router.play);
  receiver.router.delete('/api/experiences/:id', authenticate, experiences.router.delete);
  receiver.router.get('/api/files/:id', authenticate, files.router.get);
  receiver.router.post('/api/files', authenticate, files.router.create);
  receiver.router.get('/api/messages', authenticate, messages.router.list);
  receiver.router.post('/api/messages', authenticate, messages.router.send);
  receiver.router.delete('/api/messages/:id', authenticate, messages.router.delete);
  receiver.router.post('/api/surveys', authenticate, surveys.router.create);
  receiver.router.post('/api/surveys/:id/answers', authenticate, surveys.router.createAnswer);
  receiver.router.get('/api/users', authenticate, users.router.list);
  receiver.router.post('/api/users/logout', authenticate, users.router.logout);
  receiver.router.post('/api/users', authenticate, users.router.create);
  receiver.router.delete('/api/users/:id', authenticate, users.router.delete);
  receiver.router.get('/api/workspaces', authenticate, workspaces.router.list);
  receiver.router.get('/api/workspaces/:id', authenticate, workspaces.router.get);
  receiver.router.get('/api/workspaces/:id/users', authenticate, workspaces.router.getSlackUsers);
  receiver.router.post('/api/workspaces/:id/users', authenticate, workspaces.router.reloadSlackUsers);
  receiver.router.get('/api/workspaces/:id/experiences', authenticate, experiences.router.list);
  receiver.router.post('/api/workspaces/:id/experiences', authenticate, experiences.router.create);
  receiver.router.delete('/api/workspaces/:id', authenticate, workspaces.router.delete);

  // Public static files
  receiver.router.get('/favicon.ico', (req, res) => serveFile(req, res));
  receiver.router.get('/', (req, res) => {
    fs.readFile(resourceFolder[".html"] + "/index.html", function (error, content) {
      res.writeHead(200, { "Content-Type": mimeTypes['.html'] });
      res.end(content, "utf-8");
    });
  });
  receiver.router.get('/public/*', serveFile);
  receiver.router.get('/admin/auth.html', serveFile);
  receiver.router.get('/admin/auth.js', serveFile);
  receiver.router.get('/admin/request.js', serveFile);
  receiver.router.get('/admin/boothby.css', serveFile);

  // Private static files
  receiver.router.get('/admin/*', authenticate, serveFile);

  // Slack handlers
  receiver.unhandledRequestHandler = unhandledRequestHandler;
  receiver.processEventErrorHandler = processEventErrorHandler;
};
