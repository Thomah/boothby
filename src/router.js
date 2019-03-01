const fs = require("fs");
const path = require("path");
const { parse } = require("querystring");
const api = require("./api.js");
const slack = require("./slack.js");
const scheduler = require("./scheduler.js");
const NodeCache = require( "node-cache");
const bcrypt = require('bcrypt');

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
var ttlCache = 36000; //After 36000 sec (10 hrs), the variables in the cache will be reset

//Functions used to generate the auth token
//https://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details
var rand = function() {
  return Math.random().toString(36).substr(2);
};

var generate_token = function() {
  return rand() + rand();
}

var getFilePath = function (request) {
  var extname = String(path.extname(request.url)).toLowerCase();
  var folder = resourceFolder[extname] || resourceFolder[".html"];
  var filePath = folder + request.url;
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
  if (request.url === "/api/user/login") {

    // GET : retrieve existing user, and send back the username and the token
    //       used during authentication
    if(request.method === "POST") {
      //FIXME : The password can be seen in the request header, should be crypted in the client side
      var credentials = {
        username:request.headers.user,
        password:request.headers.pwd
      };
      api.checkCredentialsUser(credentials, function (data) {
        if (data != false){ //if the user exists
          bcrypt.compare(credentials['password'], data['password'], function(err, res) {
            if (res == true){
              var generated_token = generate_token();
              //We get the array tokens in the server cache
              myCache.get( "tokens", function( err, value ){
                if( !err ){
                  if(value == undefined){
                    //The array in the cache does not exist : Init of the array containing the tokens
                    myCache.set( "tokens", [generated_token], function( err, success ){
                      if (err){
                        response.writeHead(201, { "Content-Type": "application/json" });
                        response.end();
                      }
                    });
                  }else{
                    //The array tokens already exists in the cache
                    var tokens = value;
                    tokens.push(generated_token);
                    //Already a token in the server, we add the new generated token in the tokens cache array
                    myCache.set( "tokens", tokens, function( err, success ){
                      if (err){
                        response.writeHead(201, { "Content-Type": "application/json" });
                        response.end();
                      }
                    });
                  }
                }
              });
              response.writeHead(200, { "Content-Type": "application/json" });
              response.end(JSON.stringify({token:generated_token}));
            }else{
              response.writeHead(201, { "Content-Type": "application/json" });
              response.end();
            }
          });
        }else{// The username does not exist in the DB
        //FIXME : If no user in database, which status code should I return ?
          response.writeHead(201, { "Content-Type": "application/json" });
          response.end();
        }
      });
    }
  }
  else if (request.url === "/api/user/logout") {
    if(request.method === "POST") {
      myCache.get( "tokens", function( err, value ){
        if( !err ){
          //We remove this specific token from the server cache
          var tokens = value;
          var index_token_to_remove = tokens.indexOf(request.headers.token);
          tokens.splice(index_token_to_remove, 1);
          myCache.set( "tokens", tokens, function( err, success ){
            if (err){
              response.writeHead(201, { "Content-Type": "application/json" });
              response.end();
            }
          });
        }
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end();
    }
  }
  else if (request.url === "/api/user") {
   if(request.method === "POST") {
      //FIXME : The password can be seen in the request header, should be crypted in the client side
      var credentials = {
        username:request.headers.user,
        password:request.headers.pwd
      };
      //See usage of bcrypt library : https://www.npmjs.com/package/bcrypt
      var saltRounds = 10;
      bcrypt.hash(credentials['password'], saltRounds, function(err, hash) {
        credentials['password'] = hash;
        api.addUser(credentials, function (data) {
          if (data == false){//User already existing
            //FIXME : Status code
            response.writeHead(201, { "Content-Type": "application/json" });
            response.end();
          }else {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end();
          }
        });      
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
    slack.listChannels(function (data) {
      api.upsertObjectsInDb("channels", data.channels, function () {
        channels = data;
      });
    });
    slack.listUsers(function (dataUsers) {
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
      api.interactive(parsedBody.payload, function(data) {
        response.write(JSON.stringify(data));
        response.end();
      });
    });
  } 

  // /api/oauth
  else if(request.url.startsWith("/api/oauth") && request.method === "GET") {
    var response_400 = function(err, response) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.write(JSON.stringify(err));
      response.end();
    };
    if(request.params.code != undefined) {
      api.getAccessToken(request.params.code, function(infos) {
        if(!infos.ok) {
          response_400(infos, response);
        } else {
          api.insertObjectInDb("workspaces", infos, function(result) {
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
  slack.openIm(user, function (data) {
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
  var regex_params = /(\?|&)([^=]+)=([^&]+)/g;
  if (request.url.match(regex_params) !== null) {
    var matchs = request.url.match(regex_params);
    var params = {};
    var match, k;
    for(k = 0 ; k < matchs.length ; k++) {
      match = matchs[k].match(/(\?|&)([^=]+)=([^&]+)/);
      params[match[2]] = match[3];
    }
    request.params = params;
  }

  //If API request, there is a token in the request header which proves that 
  //   the user is authenticated
  if (request.headers.token){
    var token = request.headers.token;
  }

  var auth = false;
  
  // We check if the token in the request header, is the same that matches the one
  //   which has been saved in the cache server
  if (typeof token !== 'undefined'){
    myCache.get( "tokens", function( err, value ){
      if( !err ){
        if(value == undefined){
          auth = false;
        }else{
          if(value.includes(token)){
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
    if (!auth){
      if ((request.url === '/api/user/login' && request.method === 'POST')
      || (request.url === '/api/oauth' && request.method === 'GET')
      || (request.url === '/api/interactive' && request.method === 'POST')){
      //if (request.url == '/api/user'){ // To create a new user when no one has been created,
                                         // Comment the line above and uncomment this line,
                                         // you should be allowed to create a user in 
                                         // the db, then you can shut down the server
                                         // Comment this line, and uncomment the other one
                                         // FIXME : Need to create a general user, or some other stuff
      // We can access the /api/user (GET) when not auth
        routeApi(request, response);
      }else{
        response.writeHead(401); // 401 status code = not allowed to access API
        response.end();
      }
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
  myCache = new NodeCache({ stdTTL: ttlCache });
}