const http = require("http");
const api = require("./api.js");
const scheduler = require("./scheduler.js");
const db = require("./db.js");
const router = require("./router.js");
const slack = require("./slack.js");

const ROOT_URL = process.env.ROOT_URL;

var server = http.createServer(function (request, response) {
  router.serve(request, response);
});

var io = require("socket.io").listen(server);
router.setSocket(io);
io.sockets.on("connection", function (socket) {
  console.log("Socket connected");
  socket.on("disconnect", function () {
    console.log("Socket disconnected");
  });
});

slack.initRtm(io);
db.init(function() {
  api.getConfig(function(config) {
    scheduler.schedule(config.cron, function (fireDate) {
      console.log(`This job was supposed to run at ${fireDate}, but actually ran at ${new Date()}`);
      api.resumeDialogs();
    });
  });
});

server.on("close", function () {
  console.log(" Stopping ...");
  db.close();
});

process.on("SIGINT", function () {
  server.close();
});

router.initCache();

server.listen(8080);
console.log("Server running at " + ROOT_URL);