
/*
	The FileSystemManager provides access to the remote file system.

	The application is responsible for providing this in a usable
	(i.e., initialized, authenticated) state.
*/
function FileSystemManager(rootUrl) {
	this.rootUrl = rootUrl;
}

FileSystemManager.prototype = {
	getRootLocation : function(callback) {
		callback("");
	},

	getRelativeLocation : function(location, direction, callback) {
		var url = this.rootUrl + "?action=" + direction + "&loc=" + encodeURIComponent(location);
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
			callback(data.loc);
		});	
	},

	getContents : function(location, success, error) {
		var url = this.rootUrl;	// + "?loc=" + location;
		if(location != "" && location != '.')
			url += "?loc=" + encodeURIComponent(location);

//		console.log("getContents: " + url);
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
//			console.log("callback: " + textStatus);
			if(data.error) {
				error(data.error);
			}
			else {
				success(data.contents, textStatus);
			}
		}).fail(function(jqXHR, testStatus, errorThrown) {
			console.log(errorThrown);
			error(errorThrown);
		});	
	},
}

