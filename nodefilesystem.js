
var rootDir = '/tmp';

var fs = require('fs');
var path = require('path');

function isValidFile(fileName) {
	return fileName[0] != '.';
}

function constrainPath(path) {
	// TODO Apply constraints
	//return (path.indexOf(rootDir) != 0) ? rootDir : path;
	return path;
}

function handleFileRequest(req, res) {
	var parsedQuery = require('url').parse(req.url, true);

	var action = parsedQuery.query.action || "browse";
	var loc = parsedQuery.query.loc || "/";

	var result = { };

	try {
		if(action == "parent") {
			if(loc != "/") {
				loc = path.dirname(loc);
			}
			result.loc = loc;
		}
		else if(action == "browse") {
			result.realLoc = constrainPath(path.join(rootDir, loc));
			result.loc = loc = result.realLoc.slice(rootDir.length);

			result.contents = [];
			fs.readdirSync(result.realLoc).forEach(function(fileName) {
				if(isValidFile(fileName)) {
					var stats = fs.statSync(path.join(result.realLoc, fileName));
					var fileInfo = { 
						name: fileName,
						location: path.join(loc, fileName),
						isDir: stats.isDirectory(),
						size: (stats.isFile() ? stats.size : 0),
						created: stats.ctime.getTime(),
						modified: stats.mtime.getTime(),
					};
					result.contents.push(fileInfo);
				}
			});
		}
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
					var stats = fs.statSync(newFile);
					result.contents = [{ 
						name: newName,
						location: newFile,
						isDir: stats.isDirectory(),
						size: (stats.isFile() ? stats.size : 0),
						created: stats.ctime.getTime(),
						modified: stats.mtime.getTime(),
					}];
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
			result.success = [];


			fileNames.forEach(function(fileName) {
				if(fileName.length) {
					var fullPath = path.join(rootDir, fileName);
					result.attempt = fullPath;

					try {
						var stats = fs.statSync(fullPath);
						if(stats.isFile()) {
							fs.unlinkSync(fullPath);
						}
						else {
							fs.rmdirSync(fullPath);
						}

						result.success.push(fullPath);
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
			result.contents = [{ 
				name: parsedQuery.query.name,
				location: fullPath}]
			
			result.success = fullPath;			
		}
		else {
			result.error = "Invalid action";
			result.action = action;
			result.loc = loc;
		}
	}
	catch(ex) {
		console.log("Exception: " + ex);

		result.error = "Error accessing " + loc;
		result.exception = ex.toString();
	}

	res.end(JSON.stringify(result) + '\n');
}

var serverName = (process.argv.length > 2) ? process.argv[2] : "localhost";
var serverPort = (process.argv.length > 3) ? process.argv[3] : 1337;

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
  handleFileRequest(req, res);
}).listen(serverPort, serverName);
console.log('Server running at http://' + serverName + ':' + serverPort);