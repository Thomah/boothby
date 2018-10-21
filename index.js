var botScriptExecutor = require('bot-script').executor;
var scr_config = require('./scr_config.json');

function MessageHandler(context, event) {
    if(event.messageobj.refmsgid == "askRegister") {
        if(event.message == "Avec plaisir !") {
            context.simpledb.roomleveldata.register = true;
            if(context.simpledb.botleveldata.subscribers == null) {
                context.simpledb.botleveldata.subscribers = [];
            }
            context.simpledb.botleveldata.subscribers[event.contextobj.contextid]= JSON.stringify(event.contextobj);
        }
    }
    ScriptHandler(context, event);
}

function EventHandler(context, event) {
    context.simpledb.roomleveldata = {};
    MessageHandler(context, event);
}

function ScheduledMessageHandler(context, event, section) {
    var options = Object.assign({}, scr_config);
    options.current_dir = __dirname;
    options.start_section = section;
    options.success = function (opm) {
        context.sendResponse(JSON.stringify(opm));
    };
    options.error = function (err) {
        console.log(err.stack);
        context.sendResponse("Sorry Some error occurred.");
    };
    botScriptExecutor.execute(options, event, context);
}

function ScriptHandler(context, event) {
    var options = Object.assign({}, scr_config);
    options.data = {};
    options.current_dir = __dirname;
    options.success = function (opm) {
        context.sendResponse(JSON.stringify(opm));
    };
    options.error = function (err) {
        console.log(err.stack);
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
    if(event.headers.apikey == context.simpledb.botleveldata.config.apikey) {
        for(let sub of context.simpledb.botleveldata.subscribers) {
            ScheduledMessageHandler(sub, event, "default.main");
        }
    } else {
        context.sendResponse('The API Key is needed');
    }
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
