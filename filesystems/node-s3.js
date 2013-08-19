

var delimiter = '/';
var configurationPath = "./aws-credentials.json";

var path = require('path');
var AWS = require('aws-sdk');

var defaultLocation = { bucket: "civilbeat_dev", key : ""};

function parseLocation(location) {
	if(!location && !defaultLocation) {
		throw "Missing location parameter";
	}

	return location ? JSON.parse(location) : defaultLocation;
}

function encodeLocation(bucket, key) {
	return JSON.stringify({ bucket: bucket, key : key });
}

function getPreviewURL(key) {
	var ext = path.extname(key);
	if(ext == '.jpg' || ext == '.png' || ext == '.gif') {
		return key;
	}

	return null;
}

function getFileInfo(bucket, bucketObject) {

	return { 
		name: path.basename(bucketObject.Key),
		location: encodeLocation(bucket, bucketObject.Key),
		isDir: false,
		size: bucketObject.Size,
//		created: stats.ctime.getTime(),
		modified: bucketObject.LastModified,
		id: bucketObject.ETag,
		previewUrl : getPreviewURL(bucketObject.Key),
	};
}

function getDirInfo(bucket, commonPrefix) {
	return { 
		name: path.basename(commonPrefix.Prefix),
		location: encodeLocation(bucket, commonPrefix.Prefix),
		isDir: true,
		size: null,
//		created: stats.ctime.getTime(),
		modified: null,
		id: commonPrefix.Prefix,
		previewUrl : null,
	};	
}



function handleFileRequest(req, res) {
	var result = { };

	try {
		var parsedQuery = require('url').parse(req.url, true);

		//console.log(parsedQuery);

		var action = parsedQuery.query.action;

		if(action == "navigate") {
			var loc = parseLocation(parsedQuery.query.loc);
			var direction = parsedQuery.query.direction;
			console.log("Navigate: ", loc, ": ", direction);

			if(direction == "parent") {
				loc.key = path.dirname(loc.key);
				if(loc.key == '.') {
					loc.key = '';
				}
				else {
					loc.key += delimiter;
				}
			}

			result.loc = encodeLocation(loc.bucket, loc.key);

			res.end(JSON.stringify(result) + '\n');			
		}
		else if(action == "browse") {
			var loc = parseLocation(parsedQuery.query.loc);
			console.log("Browse: ", loc);
			console.log("Params: ", { Bucket : loc.bucket, Prefix : loc.key, Delimiter : delimiter });

			var s3 = new AWS.S3();
			s3.listObjects( { Bucket : loc.bucket, Prefix : loc.key, Delimiter : delimiter }, function(err, data) {
				if(err) {
					console.log("error: ", err);
					result.error = err;
				}
				else {
					console.log("success");
					result.contents = [];
					data.Contents.forEach(function(bucketObject) {
						if(bucketObject.Key != loc.key) {
							result.contents.push(getFileInfo(loc.bucket, bucketObject));
						}
					});
					data.CommonPrefixes.forEach(function(commonPrefix) {
						result.contents.push(getDirInfo(loc.bucket, commonPrefix));
					});
				}

				res.end(JSON.stringify(result) + '\n');
			});
		}
/*		
		else if(action == "rename") {
			if(!parsedQuery.query.loc) {
				throw "Missing location";
			}

			var newName = parsedQuery.query.newName;
			if(!newName) {
				result.error = "No new name supplied for rename";
			}
			else {
				var oldFile = path.join(rootDir, loc);
				if(fs.existsSync(oldFile)) {
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
		}
		else if(action == "delete") {
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

		}
		else if(action == "makedir") {
			if(!parsedQuery.query.name) {
				throw "Missing new folder name";
			}

			var fullPath = path.join(rootDir, loc, parsedQuery.query.name);
			result.attemp = fullPath;

			fs.mkdirSync(fullPath);
			result.contents = [getFileInfo(fullPath)];
		}
*/		
		else if(action == 'shortcuts') {
			var s3 = new AWS.S3();
			s3.listBuckets(function(err, data) {
				if(err) {
					console.log("error: ", err);
					result.error = err;
				}
				else {
					console.log("success");
					result.contents = [];
					data.Buckets.forEach(function(bucket) {
						result.contents.push({ name : bucket.Name, location: encodeLocation(bucket.Name, '')});
					});
				}

				res.end(JSON.stringify(result) + '\n');
			});
		}
		else {
			result.error = "Invalid action";
			result.action = action;
			result.loc = loc;

			res.end(JSON.stringify(result) + '\n');
		}
	}
	catch(ex) {
		console.log("Exception: " + ex);

		result.error = "Error accessing " + loc;
		result.exception = ex.toString();

		res.end(JSON.stringify(result) + '\n');
	}
}

var serverName = (process.argv.length > 2) ? process.argv[2] : "localhost";
var serverPort = (process.argv.length > 3) ? process.argv[3] : 1337;
if(process.argv.length > 4)
	configurationPath = process.argv[4];

console.log("Connecting with ", configurationPath);
AWS.config.loadFromPath(configurationPath);

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
  handleFileRequest(req, res);
}).listen(serverPort, serverName);
console.log('Server running at http://' + serverName + ':' + serverPort);


