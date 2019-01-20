const http = require("http");
const schedule = require("node-schedule");
const api = require("./api.js");
const db = require("./db.js");
const router = require("./router.js");
const slack = require("./slack.js");

const ROOT_URL = process.env.ROOT_URL;

var server = http.createServer(function(request, response) {
  router.serve(request, response);
});

var io = require("socket.io").listen(server);
router.setSocket(io);
io.sockets.on("connection", function(socket) {
  console.log("Socket connected");
  socket.on("disconnect", function() {
    console.log("Socket disconnected");
  });
});

slack.initRtm(io);
db.init();

server.on("close", function() {
  console.log(" Stopping ...");
  db.close();
});

process.on("SIGINT", function() {
  server.close();
});

// Main Scheduler
var cron = "42 9 * * 1,3,5";
schedule.scheduleJob(cron, function(fireDate) {
  console.log(
    `This job was supposed to run at ${fireDate}, but actually ran at ${new Date()}`
  );
  api.resumeDialogs();
});
console.log(`CRON set : ${cron} on resume()`);

server.listen(8080);
console.log("Server running at " + ROOT_URL);
