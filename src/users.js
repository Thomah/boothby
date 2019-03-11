const bcrypt = require('bcrypt');
const NodeCache = require("node-cache");
const api = require("./api.js");
const db = require("./db.js");

var myCache;
var ttlCache = 36000;

var saltRounds = 10;

const ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

var rand = function () {
    return Math.random().toString(36).substr(2);
};

var generate_token = function () {
    return rand() + rand();
};

var getInCache = function(key, callback) {
    myCache.get(key, callback);
};

var initCache = function() {
    myCache = new NodeCache({ stdTTL: ttlCache });
};

var response404 = function (response) {
    response.writeHead(404, { "Content-Type": "application/octet-stream" });
    response.end();
};

var route = function (request, response) {

    var credentials = {
        username: request.headers.user,
        password: request.headers.pwd
    };

    var regex_user = /^\/api\/user\/([^/]+)$/

    // GET : retrieve existing user, and send back the username and the token
    //       used during authentication
    if (request.url === "/api/user/login") {
        //FIXME : The password can be seen in the request header, should be crypted in the client side
        api.checkCredentialsUser(credentials, function (data) {
            if (data != false) { //if the user exists
                bcrypt.compare(credentials['password'], data['password'], function (err, res) {
                    if (res == true) {
                        var generated_token = generate_token();
                        //We get the array tokens in the server cache
                        myCache.get("tokens", function (err, value) {
                            if (!err) {
                                if (value == undefined) {
                                    //The array in the cache does not exist : Init of the array containing the tokens
                                    myCache.set("tokens", [generated_token], function (err) {
                                        if (err) {
                                            response.writeHead(201, { "Content-Type": "application/json" });
                                            response.end();
                                        }
                                    });
                                } else {
                                    //The array tokens already exists in the cache
                                    var tokens = value;
                                    tokens.push(generated_token);
                                    //Already a token in the server, we add the new generated token in the tokens cache array
                                    myCache.set("tokens", tokens, function (err) {
                                        if (err) {
                                            response.writeHead(201, { "Content-Type": "application/json" });
                                            response.end();
                                        }
                                    });
                                }
                            }
                        });
                        response.writeHead(200, { "Content-Type": "application/json" });
                        response.end(JSON.stringify({ token: generated_token }));
                    } else {
                        response.writeHead(201, { "Content-Type": "application/json" });
                        response.end();
                    }
                });
            } else {// The username does not exist in the DB
                //FIXME : If no user in database, which status code should I return ?
                response.writeHead(201, { "Content-Type": "application/json" });
                response.end();
            }
        });
    }

    else if (request.url === "/api/user/logout") {
        myCache.get("tokens", function (err, value) {
            if (!err) {
                //We remove this specific token from the server cache
                var tokens = value;
                var index_token_to_remove = tokens.indexOf(request.headers.token);
                tokens.splice(index_token_to_remove, 1);
                myCache.set("tokens", tokens, function (err) {
                    if (err) {
                        response.writeHead(201, { "Content-Type": "application/json" });
                        response.end();
                    }
                });
            }
        });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end();
    }


    else if (request.url === "/api/user") {
        if (request.method === "POST") {
            //FIXME : The password can be seen in the request header, should be crypted in the client side
            //See usage of bcrypt library : https://www.npmjs.com/package/bcrypt
            bcrypt.hash(credentials['password'], saltRounds, function (err, hash) {
                credentials['password'] = hash;
                api.addUser(credentials, function (data) {
                    if (data == false) {//User already existing
                        //FIXME : Status code
                        response.writeHead(201, { "Content-Type": "application/json" });
                        response.end();
                    } else {
                        response.writeHead(200, { "Content-Type": "application/json" });
                        response.end();
                    }
                });
            });
        }else if (request.method === "GET") {
            response.writeHead(200, { "Content-Type": "application/json" });
            db.list("user", function (data) {
                response.write(JSON.stringify(data));
                response.end();
            });
        }
    }else if (request.url.match(regex_user) !== null) {
        var userId = request.url.match(regex_user)[1];
        // DELETE : delete a dialog
        if (request.method === "DELETE") {
            db.list("user", function (data) {
                if(data.length <= 1){ //Last user in DB
                    response.writeHead(402, { "Content-Type": "application/json" });
                    response.end();
                }else{
                    db.delete("user", userId, function (data) {
                        response.writeHead(200, { "Content-Type": "application/json" });
                        response.write(JSON.stringify(data));
                        response.end();
                    });
                }
            });
        }
    }


    // Otherwise 404
    else {
        response404(response);
    }
};

var createDefaultUser = function(){
    bcrypt.hash(ADMIN_PASSWORD, saltRounds, function (err, hash) {
        var credentials = {
            'username':ADMIN_USERNAME,
            'password':hash
        }
        api.createDefaultUser(credentials, function (data) {
            if (data == false) {//Already users in the database
                console.log('No need to create default admin : already users in database ');
            } else {
                console.log('Default admin user created');
            }
        });
    });
};

exports.initCache = initCache;
exports.getInCache = getInCache;
exports.route = route;
exports.createDefaultUser = createDefaultUser;