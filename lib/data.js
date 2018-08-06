/*
* this is file is for storing and editing data
*
*/

//dependencies
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

//container for the module
var lib = {};

//base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');

//write data to a file
lib.create = function(dir, file, data, callback){
	//open the file for writing
	fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){ 
		if(!err && fileDescriptor){
			//convert data to string
			var stringData = JSON.stringify(data);

			//write to file and close it
			fs.writeFile(fileDescriptor, stringData, function(){
				if(!err){
					fs.close(fileDescriptor, function(err){
						if(!err){
							callback(false);
						} else {
							callback("error closing new file");
						}
					});
				}else{
					callback("error writing to file");
				}
			});
		}else{
			callback('Could not create new file--it may already exist');
		}
	});

};

//read data from a file
lib.read = function(dir, file, callback){
	fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', function(err, data){
		if(!err && data){
			var parsedData = helpers.parseJsonToObject(data);
			callback(false, parsedData);
		} else {
			callback(err, data);
		}
	});
};

//update an existing file with new data
lib.update = function(dir, file, data, callback){
	fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
		if(!err && fileDescriptor){
			//convert data to string
			var stringData = JSON.stringify(data);

			fs.truncate(fileDescriptor, function(err){
				if(!err){
					//write to the file and close it
					fs.writeFile(fileDescriptor, stringData, function(err){
						if(!err){
							fs.close(fileDescriptor, function(err){
								if(!err){
									callback(false);
								} else {
									callback("There was an error closing the existing file");
								}
							});
						} else {
							callback("error writing to existing file");
						}
					});
				} else {
					callback('Error truncating file');
				}
			});
		}else{
			callback('Could not open the file--it may not exist yet');
		}
	});
};

//delete an existing file
lib.delete = function(dir, file, callback){
	//unlink (remove) the file from the file system
	fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err){
		if(!err){
			callback(false);
		} else {
			callback("There was error deleteing the file");
		}
	}); 
};

//list all the items in a dir
lib.list = function(dir, callback){
  fs.readdir(lib.baseDir + dir + '/', function(err,data){
  	if(!err && data && data.length > 0){
  		var trimmedFileNames = [];
  		data.forEach(function(fileName){
  			trimmedFileNames.push(fileName.replace('.json', ''));
  		});
  		callback(false, trimmedFileNames);
  	} else {
  		callback(err,data);
  	}
  });
}

module.exports = lib;