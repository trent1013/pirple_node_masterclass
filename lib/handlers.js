/*
* These are the request handlers
*
*/

//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

//define the handlers
var handlers = {};

//ping handler
handlers.ping = function(data, callback){
    callback(200);
}

//hello handler
handlers.hello = function(data, callback){
	callback(200, {'greeting' : 'this is a greeting'})
}

//not found handler
handlers.notFound = function(data, callback){
	callback(404);
};

handlers.users = function(data, callback){
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._users[data.method](data, callback);
	} else {
		callback(405);
	}
};

//container for the users submethods
handlers._users = {};

//Users - post
//required data: firstname, lastname, phone, password, tosAgreement
//optional data: none
handlers._users.post = function(data, callback){
	//check that all req'd fields are filled out
	var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;	

	if(firstName && lastName && phone && password && tosAgreement){
		//make sure that the user doesn't already exist
		_data.read('users', phone, function(err, data){
			if(err){
				//hash the password
				var hashedPassword = helpers.hash(password);

				if(hashedPassword){
					//create user obj
					var userObject = {
						'firstName' : firstName,
						'lastName' : lastName,
						'phone' : phone,
						'hashedPassword' : hashedPassword,
						'tosAgreement' : true
					};

					//store the user
					_data.create('users', phone, userObject, function(err){
						if(!err){
							callback(200);
						} else { 
							console.log(err);
							callback(500, {'Error' : 'Could not create the new user'})
						}
					});
				} else {
					callback(500, {'Error' : 'Could not hash the user\'s password'});
				}

				


			} else {
				//user already exists
				callback(400, {'Error' : "A user with that phone number already exists."});
			}
		});
	} else {
		callback(400, {'Error' : "Missing required fields"});
	}
};

//Users - get
//required data: phone
//optional data: none
handlers._users.get = function(data, callback){
  //check that the phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

  	// get the tokens from the headers
  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  	//verify that the given token is valid for the phone number
  	handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
  		if(tokenIsValid){
  			//look up the user
		  	_data.read('users', phone, function(err, data){
		  	  if(!err && data){
		  	  	//remove the hashed Pass word from the user object before returning it ot the user
		  	  	delete(data.hashedPassword);
		  	  	callback(200, data);
		  	  } else {
		  	  	callback(404);
		  	  }
		  	});
  		} else {
  			callback(403, {"Eroor" : "Missing required token in header or token is invalid"});
  		}
  	});
  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }
};

//Users - put
// required data: phone
// optiona data: first name, last name, password (at least one must be specified)
handlers._users.put = function(data, callback){
	//check for the required field
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

	//check for the additional fields
	var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

	//ensure phone is valid
	if(phone){
		if(firstName || lastName || password){
		  	//get the token form the headers
		  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		  	//verify that the given token is valid for the phone number
  	        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
	  			if(tokenIsValid){
	  				//lookup the user
					_data.read('users', phone, function(err, userData){
						if(!err && userData){
							//update the fields necessary
							if(firstName){
								userData.firstName = firstName;
							}
							if(lastName){
								userData.lastName = lastName;
							}
							if(password){
								userData.hashedPassword = helpers.hash(password);
							}

							//store the new updates
							_data.update('users', phone, userData, function(err){
								if(!err){
									callback(200);
								} else {
									console.log(err);
									callback(500,{'Error' : 'Could not update the user'});
								}
							});
						} else {
							callback(400,{'Error' : 'The specified user does not exist'});
						}
					});
	  			} else {
	  				callback(403, {"Error" : "Missing required token in header or token is invalid"});
	  			}
	  		});					
		}else{
			callback(400,{'Error' : 'Missing fields to update'});
		}
	} else {
		callback(400, {'Error' : 'Missing required fields'});
	}
};

//Users - delete
//req'd field : phone
handlers._users.delete = function(data, callback){
  //check that the phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
  	//get the token form the headers
		  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		  	//verify that the given token is valid for the phone number
  	        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
	  			if(tokenIsValid){
	  				//look up the user
				  	_data.read('users', phone, function(err, userData){
				  	  if(!err && userData){
				  	  	_data.delete('users',phone, function(err){
				  	  		if(!err){
				  	  			//delete each check associated with the user
				  	  			var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
				  	  			var checksToDelete = userChecks.length;
				  	  			if (checksToDelete > 0){
				  	  				var checksDeleted = 0;
				  	  				var deletionErrors = false;

				  	  				//loop thru checks
				  	  				userChecks.forEach(function(checkId){
				  	  					//delete the check
				  	  					_data.delete('checks', checkId, function(err){
				  	  						if(err){
				  	  							deletionErrors = true;
				  	  						} 
				  	  						checksDeleted++;
				  	  						if(checksDeleted == checksToDelete){
				  	  							if(!deletionErrors){
				  	  								callback(200);
				  	  							} else {
				  	  								callback(500, {'Error' : 'Errors encountered while attempting to delete the user\'s checks. All checks were not successfully deleted'});
				  	  							}
				  	  						}
				  	  					});
				  	  				});
				  	  			} else {
				  	  				callback(200);
				  	  			}
				  	  		} else {
				  	  			callback(500, {'Error' : 'Could not delte the specified user'});
				  	  		}
				  	  	});
				  	  } else {
				  	  	callback(400, {'Error' : 'Could not find the specified user'});
				  	  }
				  	});
	  			} else {
	  				callback(403, {"Error" : "Missing required token in header or token is invalid"});
	  			}	
	  		});	

  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }

};

//Tokens
handlers.tokens = function(data, callback){
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._tokens[data.method](data, callback);
	} else {
		callback(405);
	}
};

//container for all of the token submethods
handlers._tokens = {};

//Tokens - post
//required data : phone & pass
//optional data: none
handlers._tokens.post = function(data, callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	if(phone && password){
		//lookup the user
		_data.read('users', phone, function(err, userData){
			if(!err && userData){
				//hash the sent password and compare to the pass stored in the user object
				var hashedPassword = helpers.hash(password);
				if(hashedPassword == userData.hashedPassword){
					//if valid, create a new token with a random name. Set expiration to 1 hr from now
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() * 1000 * 60 * 60;
					var tokenObject = {
						'phone' : phone,
						'id' : tokenId,
						'expires' : expires
					};
					_data.create('tokens', tokenId, tokenObject, function(err){
						if(!err){
							callback(200, tokenObject);
						} else {
							callback(500, {'Error' : 'Could not create the new token'});
						}
					});
				} else { 
					callback(400, {'Error' : 'Password did not match specified user\'s stored password'});
				}
			} else {
				callback(400, {'Error' : 'Could not find the specified user'});
			}
		});
	}else{
		callback(400, {'Error' : 'Missing required fields'});
	}
};

//Tokens - get
//required data: id
//optional data: none
handlers._tokens.get = function(data, callback){
  //check that the id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
  	//look up the token
  	_data.read('tokens', id, function(err, tokenData){
  	  if(!err && data){
  	  	callback(200, tokenData);
  	  } else {
  	  	callback(404);
  	  }
  	});

  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }
};

//Tokens - put  (allows you to extend the expiration time)
//Required fields: id, extend
//optional fields: none
handlers._tokens.put = function(data, callback){
  //
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if (id && extend){
  	_data.read('tokens', id, function(err, tokenData){
  		if(!err && tokenData){
  			//check to make sure that the token isn't already expired
  			if(tokenData.expires > Date.now()){
  				//set the exp to one hour from now
  				tokenData.expires = Date.now() * 100 * 60 * 60;

  				//store the new updates
  				_data.update('tokens', id, tokenData, function(err){
  					if(!err){
  						callback(200);
  					} else {
  						callback(500, {'Error' : 'Error updating token\'s expiration'	})
  					}
  				});
  			} else {
  				callback(400, {'Error' : 'The token has already expired and cannot be extended'})
  			}
  		} else {
  			callback(400, {'Error' : 'Specified token does not exist'});
  		}
  	});

  }else {
  	callback(400,{'Error' : 'Missing required field(s) or field(s) are invalid'});
  }
};

//Tokens - delete
//required data: id
//optional data: none
handlers._tokens.delete = function(data, callback){
  //check that id is valid	
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
  	//look up the user
  	_data.read('tokens', id, function(err, data){
  	  if(!err && data){
  	  	_data.delete('tokens', id, function(err){
  	  		if(!err){
  	  			callback(200);
  	  		} else {
  	  			callback(500, {'Error' : 'Could not delete the specified token'});
  	  		}
  	  	});
  	  } else {
  	  	callback(400, {'Error' : 'Could not find the specified token'});
  	  }
  	});

  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }
};

//Verify if a given token id is currenty valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback){
  //lookup the token
  _data.read('tokens', id, function(err, tokenData){
  	if (!err && tokenData){
  		//check that token is for given user and has not expired
  		if(tokenData.phone == phone && tokenData.expires > Date.now()){
  			callback(true);
  		} else {
  			callback(false);
  		}
  	} else {
  		callback(false);
  	}
  });
};

//CHECKS
handlers.checks = function(data, callback){
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._checks[data.method](data, callback);
	} else {
		callback(405);
	}
};

//container for the checks methods
handlers._checks = {};

// Checks - post
//required data: protocol(http or https), url, method, successCodes, timeoutSeconds
// optional data: none
handlers._checks.post = function(data, callback){
	//validate all the inputs
	var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post','get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	if(protocol && url && method && successCodes && timeoutSeconds){
		// get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		//lookup the user by reading the token
		_data.read('tokens', token, function(err, tokenData){
			if (!err && tokenData){
				var userPhone = tokenData.phone;

				//lookup the user data
				_data.read('users', userPhone,  function(err, userData){
					if(!err && userData){
						var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

						//verify that the user has less than the number of maxChacks per user
						if(userChecks.length < config.maxChecks){
							//create a random id for the check
							var checkId = helpers.createRandomString(20);

							//create the check object and include the user's phone
							 var checkObject = {
							 	'id' : checkId,
							 	'userPhone' : userPhone,
							 	'protocol' : protocol,
							 	'url' : url,
							 	'method' : method,
							 	'successCodes' : successCodes,
							 	'timeoutSeconds' : timeoutSeconds
							 };

							 //save the object to disk
							 _data.create('checks', checkId, checkObject, function(err){
							 	if(!err){
							 		//add the checkid to the user's object
							 		userData.checks = userChecks;
							 		userData.checks.push(checkId);

							 		//save the new userData
							 		_data.update('users', userPhone, userData, function(err){
							 			if (!err) {
							 				//return the data about the new check
							 				callback(200, checkObject);
							 			}else{
							 				callback(500, {'Error' : 'Could not update the user with the new check'});
							 			}
							 		});
							 	} else {
							 		callback(500, {'Error' : 'Could not create the new check'});
							 	}
							 });
						} else {
							callback(400, {'Error' : 'The user already has the max number of checks (' + config.maxChecks + ')'});
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required inputs or inputs are invalid'});
	}
};

// Checks - get
// required data : id
// optional data: none
handlers._checks.get = function(data, callback){
  //check that the phone number is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
  	//lookup the check
  	_data.read('checks', id, function(err, checkData){
  		if(!err && checkData){


  			// get the tokens from the headers
		  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		  	//verify that the given token is valid and belongs to user that created the check

		  	handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
		  		if(tokenIsValid){
		  			//return the checkData
		  			callback(200, checkData);
		  		} else {
		  			callback(403);
		  		}
		  	});


  		} else {
  			callback(404);
  		}
  	});

  
  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }
};

// Checks - put
// required data: id
// optional data: method, url, protocol, successCodes, timeoutSeconds (one must be set)
handlers._checks.put = function(data, callback){
	// check for the required fields
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

	//check for the optional fields
	var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post','get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	//validate id field
	if(id){
		//validate one of the optional fields
		if(protocol || method || url || successCodes || timeoutSeconds){
			//lookup the check
			_data.read('checks', id, function(err, checkData){
				if(!err && checkData){
					// get the tokens from the headers
				  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
				  	//verify that the given token is valid and belongs to user that created the check

				  	handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
			  		if(tokenIsValid){
			  			//update the check where necessary
			  			if(protocol){
			  				checkData.protocol = protocol;
			  			}

			  			if(url){
			  				checkData.url = url;
			  			}

			  			if(method){
			  				checkData.method = method;
			  			}

			  			if(successCodes){
			  				checkData.successCodes = successCodes;
			  			}

			  			if(timeoutSeconds){
			  				checkData.timeoutSeconds = timeoutSeconds;
			  			}

			  			//store the updates
			  			_data.update('checks', id, checkData, function(err){
			  				if(!err){
			  					callback(200);
			  				} else {
			  					callback(500, {'Error' : 'Could not update the check'});
			  				}
			  			});
		  		} else {
		  			callback(403);
		  		}
		  	});	
				} else {
					callback(400, {'Error' : 'Check ID did not exist'});
				}
			});

		} else {
			callback(400, {'Error' : 'Missing optional field(s) to update'});
			
		}
	} else {
		callback(400, {'Error' : 'Missing required fields'});
	}

};

//Checks - delete
//required data: id
//optional data: none
handlers._checks.delete = function(data, callback){
  //check that the id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){

  	//lookup the check to delete
  	_data.read('checks', id, function(err, checkData){
  		if(!err && checkData){
			//get the token form the headers
		  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		  	//verify that the given token is valid for the phone number
		    handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid){
				if(tokenIsValid){

					// Delete the check data
					_data.delete('checks', id, function(err){
						if(!err){
							//look up the user
						  	_data.read('users', checkData.userPhone, function(err, userData){
						  	  if(!err && userData){
						  	  	var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						  	  	//remove the deleted check from user's list of checks
						  	  	var checkPosition = userChecks.indexOf(id);

						  	  	if(checkPosition > -1){
						  	  		userChecks.splice(checkPosition,1);
						  	  		//re-save the user's data
						  	  		_data.update('users',checkData.userPhone, userData, function(err){
							  	  		if(!err){
							  	  			callback(200);
							  	  		} else {
							  	  			callback(500, {'Error' : 'Could not update the specified user'});
							  	  		}
							  	  	});
						  	  	} else {
						  	  		callback(500, {'Error' : 'Could not find the check on the user\'s object, so could not remove it'});
						  	  	}
						  	  } else {
						  	  	callback(500, {'Error' : 'Could not find the user who created the check, so could not remove the check from the user object'});
						  	  }
						  	});
						} else {
							callback(500, {'Error' : 'Could not delete the check data'});
						}
					});


				} else {
					callback(403);
				}	
			});	
  		} else {
  			callback(400, {'Error' : 'The specifiec check id does not exist'});
  		}
  	});


  }	else {
  	callback(400, {'Error' : 'Missing required field'});
  }

};

//export the module
module.exports = handlers;


