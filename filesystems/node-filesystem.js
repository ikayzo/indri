
var fs = require('fs');
var path = require('path');
var http = require('http');

var config = {};

function isValidFile(fileName) {
	return fileName[0] != '.';
}

function getFileInfo(fullPath) {

	var ext = path.extname(fullPath);
	var previewUrl = (ext == ".png" || ext == ".jpg" || ext == ".gif") ? fullPath : null;

	var stats = fs.statSync(fullPath);
	return { 
		name: path.basename(fullPath),
		location: encodeLocation(fullPath.slice(config.rootDir.length)),
		isDir: stats.isDirectory(),
		size: (stats.isFile() ? stats.size : undefined),
		created: stats.ctime.getTime(),
		modified: stats.mtime.getTime(),
		id: stats.ino,
		previewUrl : previewUrl,
	};
}

function constrainPath(path) {
	// TODO Apply constraints
	//return (path.indexOf(config.rootDir) != 0) ? config.rootDir : path;
	return path;
}

function parseLocation(location) {
	return location ? JSON.parse(location) : "/";
}

function encodeLocation(location) {
	return JSON.stringify(location);
}

function handleFileRequest(req, res) {
	try {
		console.log(req.url);
		var result = { };

		var parsedQuery = require('url').parse(req.url, true);
		console.log('parsed query:', parsedQuery);

		var action = parsedQuery.query.action || "browse";
		var loc = parseLocation(parsedQuery.query.loc);
		console.log(parsedQuery.query.loc, ' -> ', loc);

		console.log('parsed query:', parsedQuery);
		
		if(action == "navigate") {
			result.origLoc = loc;
			var direction = parsedQuery.query.direction;
			if(direction == "parent") {
				if(loc != "/") {
					loc = path.dirname(loc);
				}
			}
			console.log(loc);
			result.loc = encodeLocation(loc);
			console.log(result);
		}
		else if(action == "browse") {
			result.realLoc = constrainPath(path.join(config.rootDir, loc));
			result.loc = loc = result.realLoc.slice(config.rootDir.length);

			result.contents = [];
			fs.readdirSync(result.realLoc).forEach(function(fileName) {
				if(isValidFile(fileName)) {
					result.contents.push(getFileInfo(path.join(result.realLoc, fileName)));
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
				var oldFile = path.join(config.rootDir, loc);
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
			if(!parsedQuery.query.locs) {
				throw "Missing locations to delete";
			}

			var locations = JSON.parse(parsedQuery.query.locs);
			result.locations = locations;

			result.attempt = [];
			result.failure = {};

			result.contents = [];

			locations.forEach(function(location) {
				location = parseLocation(location);
				if(location.length) {
					var fullPath = path.join(config.rootDir, location);
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

			var fullPath = path.join(config.rootDir, loc, parsedQuery.query.name);
			result.attemp = fullPath;

			fs.mkdirSync(fullPath);
			result.contents = [getFileInfo(fullPath)];
		}
		else if(action == 'shortcuts') {
    		result.contents = [];
    		if(config.shortcuts) {
                config.shortcuts.forEach(function(item) {
                    result.contents.push({name: item.name, location: encodeLocation(item.location)});
                });
            }
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


var configFile = (process.argv.length > 2) ? process.argv[2] : './config-default.json';
console.log("Parsing settings from: ", configFile);
fs.readFile(configFile, 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    config = JSON.parse(data);

    http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
      handleFileRequest(req, res);
    }).listen(config.serverPort, config.serverName);
    console.log('Server running at http://' + config.serverName + ':' + config.serverPort);
    console.log('Serving files from ', config.rootDir);
});