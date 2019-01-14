const mongodb = require("mongodb");
const DB_NAME = "heroku_lqkdtf3k";
const MONGODB_URI = process.env.MONGODB_URI;
var dbo;

exports.init = function() {
  mongodb.MongoClient.connect(
    MONGODB_URI,
    { useNewUrlParser: true },
    function(err, database) {
      if (err) throw err;
      dbo = database.db(DB_NAME);
    }
  );
};

exports.delete = function(collection, id, callback) {
  dbo
    .collection(collection)
    .deleteOne({ _id: new mongodb.ObjectId(id) }, function(err, result) {
      if (err) throw err;
      callback(result);
    });
};

exports.read = function(collection, name, callback) {
  dbo.collection(collection).findOne({ name: name }, function(err, result) {
    if (err) throw err;
    callback(result);
  });
};

exports.update = function(collection, name, content) {
  dbo.collection(collection).updateOne(
    { name: name },
    {
      $set: content
    },
    function(error, results) {
      if (error) throw error;
    }
  );
};

exports.insert = function(collection, name, content) {
  content.name = name;
  dbo.collection(collection).insertOne(content, function(error, result) {
    if (error) throw error;
  });
};

exports.insert = function(collection, name, content, callback) {
  content.name = name;
  dbo.collection(collection).insertOne(content, function(error, result) {
    if (error) throw error;
    callback(result);
  });
};

exports.list = function(collection, callback) {
  dbo
    .collection(collection)
    .find({})
    .toArray(function(err, result) {
      if (err) throw err;
      callback(result);
    });
};

exports.close = function() {
  dbo.close();
};
