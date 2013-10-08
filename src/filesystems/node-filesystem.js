
var static= require('node-static');
var fs = require('fs');
var path = require('path');
var http = require('http');
var util = require('util');

var config = {};

var previewRegEx = null;


function isValidFile(fileName) {
  return fileName[0] != '.';
}

function fsUrl() {
  var url = config.useHttps ? 'https://' : 'http://';
  url += config.serverName;
  if (config.serverPort != 80 && config.serverPort != 443)
    url += ':' + config.serverPort;
  return url;
}

function isPreviewable(fullPath) {
  if(!config.previewTypes) {
    return null;
  }

  if(!previewRegEx) {
    previewRegEx = new RegExp(config.previewTypes);
  }

  return fullPath && fullPath.match(previewRegEx);
}

function getPreviewUrl(fullPath) {
  return isPreviewable(fullPath) ? (fsUrl() + fullPath.slice(config.rootDir.length)).replace(/\\/g, "/") : null;
}

function getFileInfo(fullPath) {

  var previewUrl = getPreviewUrl(fullPath);

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
  this.res.end(JSON.stringify(this.result) + '\n');
}

FileSystemRequestHandler.prototype = {
  parseRequest : function() {
    this.result = {};
    this.parsedQuery = require('url').parse(this.req.url, true);
    this.action = this.parsedQuery.query.action || "browse";
    this.loc = parseLocation(this.parsedQuery.query.loc);
    if (this.loc == 'undefined')
      this.loc == '"/"';
    console.log(this.parsedQuery.query.loc, ' -> ', this.loc);
  },

  routeRequest : function() {
    if(this.action == "navigate") {
      this.navigate();
    } else if(this.action == "browse") {
      this.browse();
    } else if(this.action == "rename") {
      this.rename();
    } else if(this.action == "delete") {
      this.delete();
    }
    else if(this.action == "makedir") {
      this.makedir();
    } else if(this.action == 'shortcuts') {
      this.shortcuts();
    } else {
      this.invalidAction();
    }
  },

  catchException : function(ex) {
    console.log("Exception: " + ex);

    this.result.error = "Error accessing " + this.loc;
    this.result.exception = ex.toString();
  },

  browse : function() {
    var result = this.result;
    result.realLoc = constrainPath(path.join(config.rootDir, this.loc));
    result.loc = this.loc = result.realLoc.slice(config.rootDir.length);

    result.contents = [];
    fs.readdirSync(result.realLoc).forEach(function(fileName) {
      if(isValidFile(fileName)) {
        result.contents.push(getFileInfo(path.join(result.realLoc, fileName)));
      }
    });
  },

  delete : function() {
    var result = this.result;
    if(!this.parsedQuery.query.locs) {
      throw "Missing locations to delete";
    }

    var locations = JSON.parse(this.parsedQuery.query.locs);
    result.locations = locations;

    result.attempt = [];
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
          if(result.error) {
            result.error += ', "' + fullPath + '"';
            console.log(ex.toString())
          }
          else {
            result.error = 'Could not delete: "' + fullPath + '"';
            console.log(ex.toString());
          }
        }
      }
    });
  },

  invalidAction : function() {
    result.error = "Invalid action";
    result.action = this.action;
    result.loc = this.loc;
  },

  makedir: function() {
    var result = this.result;
    if(!this.parsedQuery.query.name) {
      throw "Missing new folder name";
    }

    var fullPath = path.join(config.rootDir, this.loc, this.parsedQuery.query.name);    
    
    // Make sure that the folder will be unique.  If not, append a number to it.
    var uniqueFullPath = fullPath;
    var numAppend = 1;
    while(fs.existsSync(uniqueFullPath)) {
      uniqueFullPath = fullPath + ' (' + numAppend + ')';
      numAppend++;
    }
    
    result.attemp = uniqueFullPath;

    fs.mkdirSync(uniqueFullPath);
    result.contents = [getFileInfo(uniqueFullPath)];
  },

  navigate : function() {
    this.result.origLoc = this.loc;
    var direction = this.parsedQuery.query.direction;
    if(direction == "parent") {
      if(this.loc != "/") {
        this.loc = path.dirname(this.loc);
      }
    }
    console.log(this.loc);
    this.result.loc = encodeLocation(this.loc);
    console.log(this.result);
  },

  rename : function() {
    var result = this.result;
    if(!this.parsedQuery.query.loc) {
      throw "Missing location";
    }

    var newName = this.parsedQuery.query.newName;
    if(!newName) {
      result.error = "No new name supplied for rename";
    }
    else {
      var oldFile = path.join(config.rootDir, this.loc);
      if(fs.existsSync(oldFile)) {
        var newFile = path.join(path.dirname(oldFile), newName);

        result.oldFile = oldFile;
        result.newFile = newFile;

        fs.renameSync(oldFile, newFile);
        result.contents = [getFileInfo(newFile)];
      }
      else {
        result.error = "File doesn't exist: " + this.loc;
      }
    }
  },

  shortcuts : function() {
    this.result.contents = [];
    console.log("shortcuts result after", this.result);
    var result = this.result;
    if(config.shortcuts) {
      config.shortcuts.forEach(function(item) {
        result.contents.push({name: item.name, location: encodeLocation(item.location)});
      });
    }
  }
}


var configFile = (process.argv.length > 2) ? process.argv[2] : './config-default.json';
console.log("Parsing settings from: ", configFile);
fs.readFile(configFile, 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }

  config = JSON.parse(data);
  var file = new(static.Server)(config.rootDir, { 
    cache: 600, 
    headers: { 'X-Powered-By': 'node-static' } 
  });

  http.createServer(function (req, res) {
    if (req.url == '/favicon.ico') {
      res.writeHead(404, {'Content-type' : 'text/plain'});
      res.end('not found');
    } else {
      var parsedQuery = require('url').parse(req.url, true);

      console.log('parsed query:', parsedQuery.query);
      // if action is undefined serve the file
      if (parsedQuery.query.action == undefined) {
        file.serve(req, res, function(err, result) {
          if (err) {
            console.error('Error serving %s - %s', req.url, err.message);
            if (err.status === 404 || err.status === 500) {
              file.serveFile(util.format('/%d.html', err.status), err.status, {}, req, res);
            } else {
              res.writeHead(err.status, err.headers);
              res.end();
            }
          } else {
            console.log('%s - %s', req.url, res.message); 
          }
        });
      } else {
        res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
        new FileSystemRequestHandler(req, res);
      }
    }
  }).listen(process.env.PORT || config.serverPort);
  console.log('Server running at http://' + config.serverName + ':' + config.serverPort);
  console.log('Serving files from ', config.rootDir);
});
