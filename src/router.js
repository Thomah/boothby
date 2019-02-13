const fs = require("fs");
const path = require("path");
const { parse } = require("querystring");
const api = require("./api.js");
const scheduler = require("./scheduler.js");
const NodeCache = require( "node-cache");

const resourceFolder = {
  ".html": "./public/html",
  ".css": "./public/css",
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
var socket;
var myCache; //server cache

//Functions used to generate the auth token
//https://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details
var rand = function() {
  return Math.random().toString(36).substr(2);
};

var generate_token = function() {
  return rand() + rand();
}

var getFilePath = function (request) {
  var extname = String(path.extname(request.simpleUrl)).toLowerCase();
  var folder = resourceFolder[extname] || resourceFolder[".html"];
  var filePath = folder + request.simpleUrl;
  if (filePath === resourceFolder[".html"] + "/") {
    filePath = resourceFolder[".html"] + "/index.html";
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
  // /api/user
  if (request.url === "/api/user") {

    // GET : retrieve existing user, and send back the username and the token
    //       used during authentication
    if(request.method === "GET") {
      var credentials = {
        username:request.headers.user,
        password:request.headers.pwd
      };
      api.checkCredentialsUser(credentials, function (data) {
        if (data != false){
          //On stocke dans le serveur en cache le user et le token associé
          generated_token = generate_token();
          username = data;
          obj = { user: username, token: generated_token };
          myCache.set( "Key"+username, obj, function( err, success ){
            if( !err && success ){
              //console.log( success );
            }
          });
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify(obj));
        }else{
        //FIXME : If no user in database, which status code should I return ?
          response.writeHead(201, { "Content-Type": "application/json" });
          response.end();
        }
      });
    }
  }
  // /api/config
  else if (request.url === "/api/config") {

    // GET : retrieve config
    if(request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      api.getConfig(function (data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    }

    // POST : update config
    else if(request.method === "PUT") {
      response.writeHead(200, { "Content-Type": "application/json" });
      let body = "";
      request.on("data", chunk => {
        body += chunk.toString();
      });
      request.on("end", () => {
        var config = JSON.parse(body);
        api.updateObjectInDb("global", {name: "state"}, config, function (data) {
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
    var regex_play = /^\/api\/dialogs\/([^/]+)\/play$/;
    var regex_dialogName = /^\/api\/dialogs\/([^/]+)$/;

    // api/dialogs
    if (request.url.match(/^\/api\/dialogs\/?$/) !== null) {
      // GET : list dialogs
      if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.listDialogs(function (data) {
          response.write(JSON.stringify(data));
          response.end();
        });
      }

      // POST : create new dialog
      else if (request.method === "POST") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.createDialog(function (data) {
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

    // api/dialogs/<id>/play
    else if (request.url.match(regex_play) !== null) {
      var dialogId = request.url.match(regex_play)[1];
      api.processDialog("dialogs", dialogId);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end();
    }

    // api/dialogs/<id>
    else if (request.url.match(regex_dialogName) !== null) {
      var dialogId = request.url.match(regex_dialogName)[1];

      // GET : get a dialog
      if (request.method === "GET") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.getObjectInDbById("dialogs", dialogId, function (data) {
          response.write(JSON.stringify(data));
          response.end();
        });
      }

      // PUT : update a dialog
      else if (request.method === "PUT") {
        response.writeHead(200, { "Content-Type": "application/json" });
        let body = "";
        request.on("data", chunk => {
          body += chunk.toString();
        });
        request.on("end", () => {
          var dialog = JSON.parse(body);
          api.updateObjectInDbById("dialogs", dialogId, dialog, function (data) {
            scheduler
            response.write(JSON.stringify(data));
            response.end();
          });
        });
      }

      // DELETE : delete a dialog
      else if (request.method === "DELETE") {
        response.writeHead(200, { "Content-Type": "application/json" });
        api.deleteObjectInDb("dialogs", dialogId, function (data) {
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

    // Otherwise 404
    else {
      response.writeHead(404, { "Content-Type": "application/octet-stream" });
      response.end();
    }
  }

  // GET : retrieve channels and IMs
  else if (request.url === "/api/channelsAndIMs") {
    response.writeHead(200, { "Content-Type": "application/json" });
    nbIMs = 1; // Hack to not pass the waitForChannelsAndIMs condition instantly
    api.listObjectsInDb("channels", function (data) {
      channels = data;
    });
    api.listObjectsInDb("ims", function (data) {
      ims = data;
      nbIMs = ims.length;
    });
    waitForChannelsAndIMs(function (data) {
      response.write(JSON.stringify(data));
      response.end();
    });
  }

  // GET : refresh channels and IMs stored in DB
  else if (request.url === "/api/channelsAndIMs/refresh") {
    api.listChannels(function (data) {
      api.upsertObjectsInDb("channels", data.channels, function () {
        channels = data;
      });
    });
    api.listUsers(function (dataUsers) {
      var tmpUsers = dataUsers.members;
      console.log(tmpUsers.length);
      nbIMs = tmpUsers.length;
      for (var userNb in tmpUsers) {
        var user = tmpUsers[userNb];
        if (!user.is_bot) {
          setTimeout(saveIM, userNb * 1000, user);
        } else {
          ims.push({ user: user });
        }
      }
    });
    waitForChannelsAndIMs(function (data) {
      socket.emit("message", {
        ts: new Date().getTime(),
        text: "SYNC OVER"
      });
    });
    response.writeHead(200, { "Content-Type": "application/octet-stream" });
    response.end();
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
      api.interactive(parsedBody.payload);
    });
    response.write("{}");
    response.end();
  }
  
  // /api/simple-messages
  else if (request.url.startsWith("/api/simple-messages")) {

    // GET : retrieve messages
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      api.listMessages(function (data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    } 
    
    // DELETE : delete a message
    else if (request.method === "DELETE") {
      var regex_delete = /^\/api\/simple-messages\/([^/]+)\/?$/;
      if (request.url.match(regex_delete) !== null) {
        var messageId = request.url.match(regex_delete)[1];
        api.deleteObjectInDb("messages", messageId, function (data) {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end();
        });
      } else {
        response.writeHead(404, { "Content-Type": "application/octet-stream" });
        response.end();
      }
    }
    
    // POST : send a message
    else if (request.method === "POST") {
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

var saveIM = function (user) {
  api.openIm(user, function (data) {
    api.upsertObjectInDb("ims", data.channel, function () {
      ims.push(data.channel);
    });
  });
};

var waitForChannelsAndIMs = function (callback) {
  if (channels === undefined || ims.length !== nbIMs) {
    setTimeout(function () {
      waitForChannelsAndIMs(callback);
    }, 100);
  } else {
    var data = {
      channels: channels,
      ims: ims
    };
    channels = undefined;
    ims = [];
    callback(data);
  }
};

exports.serve = function (request, response) {

  //If API request, there is a token in the request header which proves that 
  //   the user is authenticated
  if (request.headers.token){
    username = request.headers.username;
    token = request.headers.token;
  }

  var auth = false;
  
  // We check if the token in the request header, is the same that matches the one
  //   which has been saved in the cache server
  if (typeof token !== 'undefined'){
    myCache.get( "Key"+username, function( err, value ){
      if( !err ){
        if(value == undefined){
          auth = false;
        }else{
          if(value['token'] == token && value['user'] == username){
            auth = true;          
          }
        }
      }
    });
  }
    
  if (!request.url.startsWith("/api/")) {
    var match_params = request.url.match(/^.*(\?.+)\/?$/);
    if (match_params !== null) {
      request.simpleUrl = request.url.replace(match_params[1], "");
    } else {
      request.simpleUrl = request.url;
    }
    routeStatic(request, response);
  } else {
    // We can access the /api/user when not auth
    // TODO : When switched from POST to GET in /api/user, we need to add a strict check on the method = GET and the api = /api/user
    if (!auth && request.url != '/api/user' && request.url != 'GET'){
      response.writeHead(401); // 401 status code = not allowed to access API
      response.end();
    }else{
      routeApi(request, response);
    }
  }
  return response;
};

exports.setSocket = function (io) {
  socket = io;
};

exports.initCache = function (){
  myCache = new NodeCache();
}
