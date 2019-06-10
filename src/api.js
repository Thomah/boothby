const https = require("https");
var querystring = require("querystring");
const db = require("./db.js");

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

exports.getAccessToken = function(code, callback_end, callback_err) {

  var b = new Buffer.from(SLACK_CLIENT_ID + ":" + SLACK_CLIENT_SECRET);
  var basicAuth = b.toString('base64');

  var postData = querystring.stringify({
    code: code
  });

  var options = {
    host: 'slack.com',
    path: '/api/oauth.access',
    method: 'POST',
    headers: {
      "Authorization": "Basic " + basicAuth,
      "Content-Type": 'application/x-www-form-urlencoded'
    }
  };

  var req = https.request(options, function(response) {
    var str = ''
    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      callback_end(JSON.parse(str));
    });
  });
  
  req.on('error', function (err) {
    callback_err(JSON.parse(err));
  });
 
  req.write(postData);
  req.end();
}

var checkCredentialsUser = function (credentials, callback) {
  db.read("user", {username:credentials['username']},function (data) {
    if (data == null){
      callback(false);
    }else{
      callback(data);
    }
  });
};

var addUser = function (credentials, callback) {
  db.read("user", {username:credentials['username']},function (data) {
    if (data == null){
      credentials.name = credentials['username'];
      db.insert("user",credentials,callback);
    }else{
      //the user already exists
      callback(false);
    }
  });
};

var createDefaultUser = function(credentials,callback) {
  db.read("user", { }, function (data) {
    if (data === null) {
      credentials.name = credentials['username'];
      db.insert("user",credentials,callback);
    }else{
      callback(false);
    }
  });
};

exports.addUser = addUser;
exports.checkCredentialsUser = checkCredentialsUser;
exports.createDefaultUser = createDefaultUser;