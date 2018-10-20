var botScriptExecutor = require('bot-script').executor;
var scr_config = require('./scr_config.json');

function MessageHandler(context, event) {
    console.log("CONTEXT " + JSON.stringify(context));
    console.log("EVENT " + JSON.stringify(event));
    if(event.messageobj.refmsgid == "askRegister") {
        if(event.message == "Avec plaisir !") {
            context.simpledb.roomleveldata.register = true;
        }
    }
    ScriptHandler(context, event);
}

function EventHandler(context, event) {
    context.simpledb.roomleveldata = {};
    MessageHandler(context, event);
}


function ScriptHandler(context, event) {
    var options = Object.assign({}, scr_config);
    options.data = {};
    options.current_dir = __dirname;
    options.default_message = "Sorry I am young and still learning. I am unable to understand your query.";
    // You can add any start point by just mentioning the <script_file_name>.<section_name>
    // options.start_section = "default.main";
    options.success = function (opm) {
        context.sendResponse(JSON.stringify(opm));
    };
    options.error = function (err) {
        context.console.log(err.stack);
        context.sendResponse("Sorry Some error occurred.");
    };
    options.data.name = event.senderobj.firstName;
    botScriptExecutor.execute(options, event, context);
}

function HttpResponseHandler(context, event) {
    if (event.geturl === "http://ip-api.com/json")
        context.sendResponse('This is response from http \n' + JSON.stringify(event.getresp, null, '\t'));
}

function DbGetHandler(context, event) {
    context.sendResponse("testdbput keyword was last sent by:" + JSON.stringify(event.dbval));
}

function DbPutHandler(context, event) {
    context.sendResponse("testdbput keyword was last sent by:" + JSON.stringify(event.dbval));
}

function HttpEndpointHandler(context, event) {
    context.sendResponse('This is response from http \n' + JSON.stringify(event, null, '\t'));
}

function LocationHandler(context, event) {
    context.sendResponse("Got location");
}

exports.onMessage = MessageHandler;
exports.onEvent = EventHandler;
exports.onHttpResponse = HttpResponseHandler;
exports.onDbGet = DbGetHandler;
exports.onDbPut = DbPutHandler;
if (typeof LocationHandler == 'function') {
    exports.onLocation = LocationHandler;
}
if (typeof HttpEndpointHandler == 'function') {
    exports.onHttpEndpoint = HttpEndpointHandler;
}
