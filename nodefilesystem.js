
var rootDir = '/Users/nathan';

var fs = require('fs');
var path = require('path');

function isValidFile(fileName) {
	return fileName[0] != '.';
}

function handleFileRequest(req, res) {
	var parsedQuery = require('url').parse(req.url, true);

	var action = parsedQuery.query.action || "browse";
	var loc = parsedQuery.query.loc || ".";

	var result = {};

	if(action == "parent") {
		if(loc != ".") {
			loc = path.dirname(loc);
		}
		result.loc = loc;
	}
	else if(action == "browse") {
		result.loc = loc;
		result.realLoc = path.join(rootDir, loc);

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

	var stats = fs.statSync(rootDir);
	res.end(JSON.stringify(result) + '\n');

}

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  handleFileRequest(req, res);
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');