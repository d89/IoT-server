var MongoClient = require('mongodb').MongoClient;
var logger = require('./logger');
var config = require('./config');

MongoClient.connect(config.dsn, function(err, database)
{
    if (err) throw err;

    logger.info("DATABASE CONNECTED");

    var storage = require("./storage");
    storage.setDatabase(database);

    require("./data");
});
