const mongodb = require("mongodb");
const DB_NAME = "heroku_lqkdtf3k";
const MONGODB_URI = process.env.MONGODB_URI;
var dbo;

exports.init = function () {
  mongodb.MongoClient.connect(
    MONGODB_URI,
    { useNewUrlParser: true },
    function (err, database) {
      if (err) throw err;
      dbo = database.db(DB_NAME);
    }
  );
};

exports.mongodb = function() {
  return mongodb;
}

exports.delete = function (collection, id, callback) {
  dbo
    .collection(collection)
    .deleteOne({ _id: new mongodb.ObjectId(id) }, function (err, result) {
      if (err) throw err;
      callback(result);
    });
};

exports.read = function(collection, match, callback) {
  dbo.collection(collection).findOne(match, function(err, result) {
    if (err) throw err;
    callback(result);
  });
};

exports.update = function (collection, id, content, callback) {
  delete content._id;
  dbo
    .collection(collection)
    .updateOne({ _id: new mongodb.ObjectId(id) }, { $set: content }, function (
      error,
      results
    ) {
      if (error) throw error;
      callback(results);
    });
};

exports.updateByName = function (collection, name, content) {
  dbo.collection(collection).updateOne(
    { name: name },
    {
      $set: content
    },
    function (error, results) {
      if (error) throw error;
    }
  );
};

exports.upsert = function (collection, content, callback) {
  dbo.collection(collection).updateOne(
    { id: content.id },
    {
      $set: content
    },
    { upsert: true },
    (error, result) => {
      if (error) throw error;
      callback(result);
    }
  );
};

exports.insert = function (collection, name, content) {
  content.name = name;
  dbo.collection(collection).insertOne(content, function (error, result) {
    if (error) throw error;
  });
};

exports.insert = function (collection, name, content, callback) {
  content.name = name;
  dbo.collection(collection).insertOne(content, function (error, result) {
    if (error) throw error;
    callback(result);
  });
};

exports.list = function (collection, callback) {
  var sort = { scheduling: -1 };
  dbo
    .collection(collection)
    .find({})
    .sort(sort)
    .toArray(function (err, result) {
      if (err) throw err;
      callback(result);
    });
};

exports.close = function () {
  dbo.close();
};
