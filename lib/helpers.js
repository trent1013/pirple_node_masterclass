/*
* helpers for various tasks
*
*/

//dependencies
var crypto = require('crypto');
var config = require('./config')
var https = require('https');
var querystring = require('querystring');

//container for the helpers
var helpers = {};

//create a sha256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0)
  {
  	var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  	return hash;
  }else{
  	return false;
  }
};

// parse a json string to an object in all cases without throwing
helpers.parseJsonToObject = function(str){
  try{
  	var obj = JSON.parse(str);
  	return obj;
  } catch(e) {
  	return {};
  }
};

//create a string of random alphanumeric chars of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    //define all the possible chars that could be in a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    //start the string
    var str = '';

    for(i = 1; i <= strLength; i++){
      //get random char from possiblechars
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      //append to final string
      str += randomCharacter;
    }

    return str;
  } else {
    return false;
  }
};

//Send SMS messages via Twilio
helpers.sendTwilioSms = function(phone, msg, callback){
  //validate the params
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    //configure the request payload
    var payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+1'+phone,
      'Body' : msg
    };

    //stringify the payload
    var stringPayload = querystring.stringify(payload);

    //configure the request details
    var requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    //instantiate the request object
    var req = https.request(requestDetails, function(res){
      //grab the status of the sent request
      var status = res.statusCode;
      var statusMessage = res.statusMessage;
      //console.log("here is the entire result ",res);
      //callback successfully if the request went through
      if(status == 200 || status == 201){
        callback(false);
      } else {
        callback('status code returned was '+status, statusMessage);
      }
    });

    //bind to the error event so it doesnt get thrown
    req.on('error', function(e){
      callback(e);
    });

    //add the payload
    req.write(stringPayload);

    //end the request
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};








//export the container
module.exports = helpers;