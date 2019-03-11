const https = require("https");
var querystring = require("querystring");
const db = require("./db.js");
const scheduler = require("./scheduler.js");
const slack = require("./slack.js");

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

var nbObjects = 0;

var forEachWorkspace = function(callback) {
  db.list("workspaces", function(workspaces) {
    var previous_bot_access_token = [];
    for(var workspaceId in workspaces) {
      var tokens = {
        user_access_token: workspaces[workspaceId].access_token,
        bot_access_token: workspaces[workspaceId].bot.bot_access_token
      }
      if(previous_bot_access_token.indexOf(tokens.bot_access_token) < 0) {
        callback(tokens);
        previous_bot_access_token.push(tokens.bot_access_token);
      }
    }
  });
};

exports.getAccessToken = function(code, callback_end, callback_err) {

  var b = new Buffer(SLACK_CLIENT_ID + ":" + SLACK_CLIENT_SECRET);
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

exports.getConfig = function(callback) {
  db.read("global", { name: "state" }, function (data) {
    if (data === null) {
      data = {};
      data.daily = 1;
      data.name = "state";
      data.cron = "42 9 * * 1,3,5";
      db.insert("global", data);
    }
    db.updateByName("global", "state", data);
    data.nextInvocation = scheduler.nextInvocation();
    callback(data);
  });
};

exports.insertObjectInDb = function(collection, content, callback) {
  db.insert(collection, content, callback);
}

exports.getObjectInDb = function (collection, condition, callback) {
  db.read(collection, condition, callback);
};

exports.listObjectsInDb = function (collection, callback) {
  db.list(collection, callback);
};

exports.updateObjectInDb = function (collection, condition, object, callback) {
  db.update(collection, condition, object, callback);
};

exports.upsertObjectInDb = function (collection, object, callback) {
  db.upsert(collection, object, callback);
};

exports.upsertObjectsInDb = function (collection, objects, callback) {
  for (var idObject in objects) {
    db.upsert(collection, objects[idObject], incObjects);
  }
  waitForUpsertObjectsInDb(objects.length, callback);
};

var incObjects = function (result) {
  nbObjects++;
};

var waitForUpsertObjectsInDb = function (nbObjectsWaited, callback) {
  if (nbObjectsWaited !== nbObjects) {
    setTimeout(function () {
      waitForUpsertObjectsInDb(nbObjectsWaited, callback);
    }, 100);
  } else {
    nbObjects = 0;
    callback();
  }
};

exports.interactive = function (rawPayload, callback) {
  var payload = JSON.parse(rawPayload);

  // Quick answer
  var splitActionValue = payload.actions[0].value.split("-");
  db.read("dialogs", { _id: new db.mongodb().ObjectId(splitActionValue[0]) }, function(data) {
    callback(data[splitActionValue[1]]);
  });

  db.read("surveys", { name: payload.actions[0].name }, function (data) {
    var newMessage = payload.original_message;
    if (data === null) {
      data = {};
      data.name = payload.actions[0].name;
      db.insert("surveys", data);
    }
    if (data.texts === undefined) {
      data.texts = {};
      data.actions = {};
      data.values = {};
      data.users = {};
      for (
        var noAction = 0;
        noAction < newMessage.attachments[0].actions.length;
        noAction++
      ) {
        var value = newMessage.attachments[0].actions[noAction].value;
        data.actions[value] = noAction;
        data.texts[value] = newMessage.attachments[0].actions[noAction].text;
        data.values[value] = 0;
      }
    }
    if (data.values[payload.actions[0].value] === undefined) {
      data.values[payload.actions[0].value] = 0;
    }
    if (data.users[payload.user.id] === undefined) {
      data.values[payload.actions[0].value]++;
      data.users[payload.user.id] = payload.actions[0].value;
    } else if (
      data.users[payload.user.id] !== undefined &&
      data.users[payload.user.id] !== payload.actions[0].value
    ) {
      data.values[data.users[payload.user.id]]--;
      data.users[payload.user.id] = payload.actions[0].value;
      data.values[payload.actions[0].value]++;
    } else {
      data.values[data.users[payload.user.id]]--;
      data.users[payload.user.id] = undefined;
    }
    db.updateByName("surveys", payload.actions[0].name, data);

    for (var id in data.texts) {
      newMessage.attachments[0].actions[data.actions[id]].text =
        data.texts[id] + " (" + data.values[id] + ")";
    }

    forEachWorkspace(function(tokens) {
      slack.updateMessage(tokens, {
        channel: payload.channel.id,
        text: newMessage.text,
        link_names: true,
        ts: payload.message_ts,
        attachments: newMessage.attachments
      });
    });
  });
};

exports.listMessages = function (callback) {
  db.list("messages", callback);
};

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
exports.forEachWorkspace = forEachWorkspace;
exports.createDefaultUser = createDefaultUser;