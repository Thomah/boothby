const bcrypt = require('bcrypt-nodejs');
const NodeCache = require("node-cache");

const logger = require("./logger.js");
const db = require('./db/index.js');

var myCache;
var ttlCache = 36000;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD : 'admin';

var rand = function () {
    return Math.random().toString(36).substr(2);
};

var generate_token = function () {
    return rand() + rand();
};

exports.getInCache = function (key, callback) {
    myCache.get(key, callback);
};

exports.initCache = function () {
    myCache = new NodeCache({ stdTTL: ttlCache });
};

exports.createDefaultUser = async function () {
    bcrypt.hash(ADMIN_PASSWORD, null, null, function (err, hash) {
        var credentials = {
            'username': ADMIN_USERNAME,
            'password': hash
        };
        db.querySync('SELECT username FROM users WHERE username = $1', [credentials['username']], (err, data) => {
            if (err) {
                logger.error('Cannot create user ' + credentials['username'] + ' : \n -> ' + err);
            } else if (data.rowCount >= 1) {
                logger.log('No need to create default admin : already users in database ');
            } else {
                credentials.name = credentials['username'];
                db.query("INSERT INTO users(username, password) VALUES ($1, $2)", [credentials['username'], credentials['password']]);
            }
        });
    });
};

exports.router = {};

exports.router.login = function (req, res) {
    var credentials = {
        username: req.headers.user,
        password: req.headers.pwd
    };

    db.querySync('SELECT username, password FROM users WHERE username = $1', [credentials['username']], (err, data) => {
        if (err) {
            logger.error('Cannot login user ' + credentials['username'] + ' : \n -> ' + err);
            res.status(500).end();
        } else if (data.rowCount != 1) {
            logger.error('Cannot login user ' + credentials['username'] + ' : not found');
            res.status(403).end();
        } else {
            bcrypt.compare(credentials['password'], data.rows[0]['password'], function (err, bcrypdata) {
                if (err) {
                    logger.error('Cannot login user ' + credentials['username'] + ' : ' + err);
                    res.status(500).end();
                } else if (!bcrypdata) {
                    logger.error('Cannot login user ' + credentials['username'] + ' : invalid credentials');
                    res.status(401).end();
                } else {
                    var generated_token = generate_token();
                    //We get the array tokens in the server cache
                    myCache.get("tokens", function (err, value) {
                        if(err) {
                            logger.error('Cannot login user ' + credentials['username'] + ' : cannot get token in cache');
                            res.status(500).end();
                        } else {
                            if(value == undefined) {
                                value = [generated_token];
                            } else {
                                value.push(generated_token);
                            }
                            myCache.set("tokens", value, function (err) {
                                if (err) {
                                    logger.error('Cannot login user ' + credentials['username'] + ' : cannot set token in cache');
                                    res.status(500).end();
                                } else {
                                    logger.log(value.length + ' token(s) in cache');
                                    res.send(generated_token);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

exports.router.logout = function (req, res) {
    myCache.get("tokens", function (err, value) {
        if (!err) {
            //We remove this specific token from the server cache
            var tokens = value;
            var index_token_to_remove = tokens.indexOf(req.headers.token);
            if (index_token_to_remove >= 0) {
                tokens.splice(index_token_to_remove, 1);
                myCache.set("tokens", tokens, function (err) {
                    if (err) {
                        logger.error('Cannot logout user : cannot update token in cache');
                        res.status(500).end();
                    } else {
                        logger.log(tokens.length + ' tokens in cache');
                    }
                });
            }
        }
    });
    res.status(200).end();
};

exports.router.list = function (req, res) {
    db.querySync('SELECT id, username FROM users', [], (err, data) => {
        if (err) {
            logger.error('Cannot list users : \n -> ' + err);
            res.status(500).end();
        } else {
            res.send(data.rows);
        }
    });
};

exports.router.create = function (req, res) {
    var credentials = {
        username: req.headers.user,
        password: req.headers.pwd
    };
    bcrypt.hash(credentials['password'], null, null, function (err, hash) {
        credentials['password'] = hash;
        db.querySync('SELECT username FROM users WHERE username = $1', [credentials['username']], (err, data) => {
            if (err) {
                logger.error('Cannot create user ' + credentials['username'] + ' : \n -> ' + err);
                res.status(500).end();
            } else if (data.rowCount >= 1) {
                logger.error('Cannot create user ' + credentials['username'] + ' : already exists in database ');
                res.status(400).end();
            } else {
                credentials.name = credentials['username'];
                db.querySync("INSERT INTO users(username, password) VALUES ($1, $2)", [credentials['username'], credentials['password']], (err) => {
                    if (err) {
                        logger.error(err);
                        res.status(500).end();
                    } else {
                        res.status(200).end();
                    }
                });
            }
        });
    });
};

exports.router.delete = function (req, res) {
    var userId = req.params.id;
    db.querySync('SELECT COUNT(id) AS nb_users FROM users', [], (err, data) => {
        if (err) {
            logger.error(err);
            res.status(500).end();
        } else if (data.rowCount === 1 && data.rows[0].nb_users == 1) {
            logger.log('Cannot delete the last user');
            res.status(400).end();
        } else {
            db.querySync('DELETE FROM users WHERE id = $1', [userId]);
            res.status(200).end();
        }
    })
};
