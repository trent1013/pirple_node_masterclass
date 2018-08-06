/**
* server-related tasks
*
*/

//dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var _data = require('./data');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

//instantiate the server module object
var server = {};




//instantiate the http server
server.httpServer = http.createServer(function(req, res){
	server.unifiedServer(req, res);

});

//instantiate the https server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
	unifiedServer(req, res);

});

//all of the server logic for both http and https
server.unifiedServer = function(req, res){
	//get the url and parse it
	var parsedUrl = url.parse(req.url, true); // the 'true' makes it parse the query string

	//get the path
	var path = parsedUrl.pathname; //pathname is a key for the parsedUrl object
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	//get the query string as an object
	var queryStringObject = parsedUrl.query;

	// get the http method
	var method = req.method.toLowerCase();

	//get the headers as an object
	var headers = req.headers;

	//get the payload, if any
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data){
		buffer += decoder.write(data);
	});
	req.on('end', function(){
		buffer += decoder.end();

		//choose the handler this request should go to
		var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		//construct the data object to send to the handler 
		var data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer)
		}

		//route the data to the handler specified in the router
		chosenHandler(data, function(statusCode, payload){
			//use the status code called back by the handler or default to 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			//use the payload called abck by the handler, or default to an empty object
			payload = typeof(payload) == 'object' ? payload : {};

			//convert the payload to a string
			var payloadString = JSON.stringify(payload);

			//return the response
			res.setHeader('Content-Type','application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

			// if the res is 200, print green, otherwise print red
			if(statusCode == 200){
				debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode, payloadString);
			} else {
				debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode, payloadString);
			} 		

		});
	
	});
};

//define the request router
server.router = {
    'ping' : handlers.ping,
    'hello' : handlers.hello,
    'users' : handlers.users,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};

//init script
server.init = function(){
	//start the http server
	server.httpServer.listen(config.httpPort, function(){
		console.log('\x1b[36m%s\x1b[0m', "The server is listening on "+ config.httpPort);
	});

	//start the https server
	server.httpsServer.listen(config.httpsPort, function(){
		console.log('\x1b[35m%s\x1b[0m', "The server is listening on "+ config.httpsPort);
	});
}

//export the module
module.exports = server;


