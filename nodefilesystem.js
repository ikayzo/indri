
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

	var result = {};

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
		else {
			result.error = "Invalid action";
			result.action = action;
			result.loc = loc;
		}
	}
	catch(ex) {
		result.error = "Error accessing " + loc;
		result.exception = ex;
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