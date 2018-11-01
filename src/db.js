require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
const DB_NAME = 'heroku_5fr6w04p';

(function() {

  var readDb = function(collection, name, callback) {
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db(DB_NAME);
        db.collection(collection).findOne({ name: name }, function(
          err,
          result
        ) {
          if (error) throw error;
          database.close();
          callback(result);
        });
      }
    );
  };

  var updateInDb = function(collection, name, content) {
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db(DB_NAME);
        db.collection(collection).updateOne(
          { name: name },
          {
            $set: content
          },
          function(error, results) {
            if (error) throw error;
            database.close();
          }
        );
      }
    );
  };

  var insertInDb = function(collection, name, content) {
    content.name = name;
    MongoClient.connect(
      process.env.MONGODB_URI,
      { useNewUrlParser: true },
      function(error, database) {
        if (error) console.log(error);
        const db = database.db(DB_NAME);
        db.collection(collection).insertOne(content, function(error, results) {
          if (error) throw error;
          database.close();
        });
      }
    );
  };

  module.exports.readDb = readDb;
  module.exports.updateInDb = updateInDb;
  module.exports.insertInDb = insertInDb;

})();
