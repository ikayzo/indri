
var fs = require('fs');
var path = require('path');
var http = require('http');
var AWS = require('aws-sdk');

var config = {};

var previewRegEx = null;

var delimiter = '/';

var defaultLocation = { bucket: "civilbeat_dev", key : ""};

function parseFsItem(fsItem) {
  return fsItem ? JSON.parse(fsItem) : {};
}

function parseLocation(fsItem) {
	if(!fsItem.location && !defaultLocation) {
		throw "Missing location parameter";
	}

	return fsItem.location ? JSON.parse(fsItem.location) : defaultLocation;
}

function encodeLocation(bucket, key) {
	return JSON.stringify({ bucket: bucket, key : key });
}

function isPreviewable(key) {
	if(!config.previewTypes) {
		return null;
	}
	
	if(!previewRegEx) {
		previewRegEx = new RegExp(config.previewTypes);
	}

	return key && key.match(previewRegEx);
}

function getPreviewUrl(key) {
	return isPreviewable(key) ? (config.previewBase + key) : null;
}

function getFileInfo(bucket, bucketObject, original) {
  
  original = original || {};
  
  original.name = path.basename(bucketObject.Key);
	original.location = encodeLocation(bucket, bucketObject.Key);
  original.isCollection = false;
  original.size = bucketObject.Size;
//  original.created = stats.ctime.getTime();
  original.modified = bucketObject.LastModified;
  original.id = bucketObject.ETag;
  original.previewUrl = getPreviewUrl(bucketObject.Key);

  return original;
}

function getDirInfo(bucket, prefix, original) {
  original = original || {};
  
  original.name = path.basename(prefix);
  original.location = encodeLocation(bucket, prefix);
  original.isCollection = true;
  original.size = null;
//  original.created = stats.ctime.getTime();
  original.modified = null;
  original.id = prefix;
  original.previewUrl = null;
  
	return original;
}

function FileSystemRequestHandler(req, res) {
  try {
    console.log(req.url);
    this.req = req;
    this.res = res;
    this.parseRequest();
    this.routeRequest();
  } catch(ex) {
    this.catchException(ex);
  }
  if(!this.async) {
    this.endResponse();
  }
}

FileSystemRequestHandler.prototype = {
  parseRequest : function() {
    this.result = {};
    
    this.parsedQuery = require('url').parse(this.req.url, true);
		this.action = this.parsedQuery.query.action || "browse";;
    
    // Grab the fsItem
    this.fsItem = parseFsItem(this.parsedQuery.query.fsItem);
    
    // Parse the location from the fsItem
    this.loc = parseLocation(this.fsItem);
  },

  routeRequest : function() {
    if(this.action == "navigate") {
      this.navigate();
    } 
    else if(this.action == "browse") {
      this.browse();
    } 
//    else if(this.action == "rename") {
//      this.rename();
//    } 
//    else if(this.action == "delete") {
//      this.delete();
//    }
//    else if(this.action == "makedir") {
//      this.makedir();
//    }
    else if(this.action == 'shortcuts') {
      this.shortcuts();
    }
    else {
      this.invalidAction();
    }
  },

  catchException : function(ex) {
    console.log("Exception: " + ex);

    this.result.error = "Error accessing " + this.loc;
    this.result.exception = ex.toString();
  },
          
  endResponse : function() {
    this.res.end(JSON.stringify(this.result) + '\n');
  },
  
  navigate : function() {
    var direction = this.parsedQuery.query.direction;
    console.log("Navigate: ", this.loc, ": ", direction);

    if (direction == "parent") {
      this.loc.key = path.dirname(this.loc.key);
      if (this.loc.key == '.') {
        this.loc.key = '';
      }
      else {
        this.loc.key += delimiter;
      }
    }

    this.result.loc = getDirInfo(this.loc.bucket, this.loc.key);
  },
  
  browse : function() {
    console.log("Browse: ", this.loc);
    console.log("Params: ", {Bucket: this.loc.bucket, Prefix: this.loc.key, Delimiter: delimiter});

    var result = this.result;
    var loc = this.loc;
    var fsItem = this.fsItem;
    var requestHandler = this;
    
    var s3 = new AWS.S3();
    s3.listObjects({Bucket: loc.bucket, Prefix: loc.key, Delimiter: delimiter}, function(err, data) {
      if (err) {
        console.log("error: ", err);
        result.error = err;
      }
      else {
        console.log("success");
        result.contents = [];
        data.Contents.forEach(function(bucketObject) {
          if (bucketObject.Key != loc.key) {
            result.contents.push(getFileInfo(loc.bucket, bucketObject));
          }
        });
        data.CommonPrefixes.forEach(function(commonPrefix) {
          result.contents.push(getDirInfo(loc.bucket, commonPrefix.Prefix));
        });
      }
      result.loc = getDirInfo(loc.bucket, loc.key, fsItem);
      requestHandler.endResponse();
    });
    this.async = true;
  },

  rename : function() {
    // TODO Implement
    
   /*
    if (!parsedQuery.query.loc) {
      throw "Missing location";
    }

    var newName = parsedQuery.query.newName;
    if (!newName) {
      result.error = "No new name supplied for rename";
    }
    else {
      var oldFile = path.join(rootDir, loc);
      if (fs.existsSync(oldFile)) {
        var newFile = path.join(path.dirname(oldFile), newName);

        result.oldFile = oldFile;
        result.newFile = newFile;

        fs.renameSync(oldFile, newFile);
        result.contents = [getFileInfo(newFile)];
      }
      else {
        result.error = "File doesn't exist: " + loc;
      }
    } 
    */
  },
  
  delete : function() {
    // TODO Implement?
    
    /*
			if(!parsedQuery.query.loc) {
				throw "Missing location";
			}

			var fileNames = loc.split(";");

			result.fileNames = fileNames;
			result.attempt = [];
			result.failure = {};

			result.contents = [];

			fileNames.forEach(function(fileName) {
				if(fileName.length) {
					var fullPath = path.join(rootDir, fileName);
					result.attempt = fullPath;

					try {
						var fileInfo = getFileInfo(fullPath);

						var stats = fs.statSync(fullPath);
						if(stats.isFile()) {
							fs.unlinkSync(fullPath);
						}
						else {
							fs.rmdirSync(fullPath);
						}

						result.contents.push(fileInfo);
					}
					catch(ex) {
						result.failure[fullPath] = ex;
					}
				}
			});     
     */
  },
          
  makedir : function() {
    // TODO Implement?
    
    /*
			if(!parsedQuery.query.name) {
				throw "Missing new folder name";
			}

			var fullPath = path.join(rootDir, loc, parsedQuery.query.name);
			result.attemp = fullPath;

			fs.mkdirSync(fullPath);
			result.contents = [getFileInfo(fullPath)]; 
     */
  },
  
  invalidAction : function() {
    this.result.error = "Invalid action";
    this.result.action = this.action;
    this.result.loc = this.loc;
  },
  
  shortcuts : function() {
    var result = this.result;
    var requestHandler = this;
    
    var s3 = new AWS.S3();
    
    s3.listBuckets(function(err, data) {
      if (err) {
        console.log("error: ", err);
        result.error = err;
      }
      else {
        console.log("success");
        result.contents = [];
        data.Buckets.forEach(function(bucket) {
          result.contents.push({name: bucket.Name, location: getDirInfo(bucket.Name, '')});
        });
      }

      requestHandler.endResponse();
    });
    this.async = true;
  }
}

// var serverName = (process.argv.length > 2) ? process.argv[2] : "localhost";
// var serverPort = (process.argv.length > 3) ? process.argv[3] : 1337;
// if(process.argv.length > 4)
// 	configurationPath = process.argv[4];

// console.log("Connecting with ", configurationPath);
// AWS.config.loadFromPath(configurationPath);

// var http = require('http');
// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
//   handleFileRequest(req, res);
// }).listen(serverPort, serverName);
// console.log('Server running at http://' + serverName + ':' + serverPort);


var configFile = (process.argv.length > 2) ? process.argv[2] : './config-default.json';
console.log("Parsing settings from: ", configFile);
fs.readFile(configFile, 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    config = JSON.parse(data);
//    console.log(config);

		AWS.config.update({accessKeyId: config.credentials.accessKeyId, secretAccessKey: config.credentials.secretAccessKey});

    http.createServer(function (req, res) {
      if (req.url == '/favicon.ico') {
        res.writeHead(404, {'Content-type' : 'text/plain'});
        res.end('not found');
      } else {
        res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
        new FileSystemRequestHandler (req, res);
      }
    }).listen(config.serverPort, config.serverName);
    console.log('Server running at http://' + config.serverName + ':' + config.serverPort);
    console.log('Serving files from ', config.rootDir);
});

