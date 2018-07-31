//these are worker-related tasks

//dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');


//instantiate the worker object
var workers = {};

//timer to execute the worker process once per minute
workers.loop = function(){
	setInterval(function(){
		workers.gatherAllChecks();
	},1000 * 60)
};

//lookup all the checks, get the data, validate it
workers.gatherAllChecks = function(){
	//get all the checks that exist in the system
	_data.list('checks', function(err, checks){
		if(!err && checks && checks.length > 0){
			checks.forEach(function(checks){
				//read in the check data
				_data.read('checks',check, function(err, originalCheckData){
					if(!err && originalCheckData){
						//pass the check to a check validator
						workers.validateCheckData(originalCheckData);
					} else {
						console.log("Error reading one of the checks' data");
					}
				});
			});
		} else {
			console.log("Error:  could not find any checks to process");
		}
	});
};

//sanity checking the checkData
workers.validateCheckData = function(originalCheckData){
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol.trim() : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method.trim() : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 && originalCheckData.timeoutSeconds % 1 === 0  ? originalCheckData.timeoutSeconds : false;

  //set the keys that may not be set (if the workers have not seen the object before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state.trim() : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  //if all checks pass, pass the data along to the next step in the process
  if(originalCheckData.id &&
  	originalCheckData.userPhone &&
    originalCheckData.protocol &&
  	originalCheckData.url &&
  	originalCheckData.method &&
  	originalCheckData.successCodes &&
  	originalCheckData.timeoutSeconds){
  	  workers.performCheck(originalCheckData);
  } else {
  	  console.log("Error: one of the checks is not properly formatted");
  }
};

//perform the check, send the original check data and the outcome of the check process to the next step in the process
workers.performCheck = function(originalCheckData){
	//prepare the initial chekc outcome
	var checkOutcome = {
		'error' : false,
		'responseCode' : false
	};

	//mark that the outcome has not been sent yet
	var outcomeSent = false;

	//parse the hostname and the path out of the originalCheckData
	var parsedUrl = url.parse(originalCheckData.protocol+"://"+originalCheckData.url, true);
	var hostName = parsedUrl.hostname;
	var path = parsedUrl.path; //using path and not pathName becuase we want the query string

	//construct the req
	var requestDetails = {
		'protocol' : originalCheckData.protocol+":",
		'hostname' : hostName,
		'method' : originalCheckData.method.toUpperCase(),
		'path' : path,
		'timeout' : originalCheckData.timeoutSeconds * 1000
	};

	// instantiate the request obejct using the http or https module
	var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
	var req = _moduleToUse.request(requestDetails, function(res){
		//grab the status of the sent req
		var status = res.statusCode;

		//update the chekc outcome and passs the data along
		checkOutcome.responseCode = status;
		if(!outcomeSent){
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	//bind to the error event so that it doesn't get thrown
	req.on('error', function(e){
		//update the checkOutcom and pass the data along
		checkOutcome.error = {
			'error' : true,
			'value' : e
		};
		if(!outcomeSent){
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	//bind to the timeout event
	req.on('timeout', function(e){
		//update the checkOutcom and pass the data along
		checkOutcome.error = {
			'error' : true,
			'value' : 'timeout'
		};
		if(!outcomeSent){
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	//end the request
	req.end();
};

//to process the check outomce and update the check data if needed
//special logic for accomodating a chekc that has never been tested before; don't want to alert about that
workers.processCheckOutcome = function(originalCheckData, checkOutcome){
	//decide if the check is considered up or down in current state
	var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

	//decide if an alert is needed
	var alertWarranted  = originalCheckData.lastChecked && originalCheckData.state !== state;
};


//init script
workers.init = function (argument) {
	// execute the checks immediatele
	workers.gatherAllChecks();

	//call the loop so the checks continue to execute
	workers.loop();
}



//export the module
module.exports = workers;