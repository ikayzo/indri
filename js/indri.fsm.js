
/*
	The FileSystemManager provides access to the remote file system.

	The application is responsible for providing this in a usable
	(i.e., initialized, authenticated) state.
*/
function FileSystemManager(rootUrl) {
	this.rootUrl = rootUrl;
}

FileSystemManager.prototype = {
	getShortcuts : function(success, error) {
		var url = this.rootUrl + "?action=shortcuts";
		this._doQuery(url, success, error);
	},

	getRootLocation : function(callback) {
		var url = this.rootUrl + "?action=navigate&direction=home";
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
			callback(data.loc);
		});	
	},

	getRelativeLocation : function(location, direction, callback) {
		var url = this.rootUrl + "?action=navigate&direction=" + direction + "&loc=" + this._encodeLocation(location);
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
			callback(data.loc);
		});	
	},

	getContents : function(location, success, error) {
		var url = this.rootUrl + "?action=browse";
		if(location != "" && location != '.')
			url += "&loc=" + this._encodeLocation(location);

		this._doQuery(url, success, error);
	},

	deleteItems : function(items, success, error) {
		var locations = [];
		items.forEach(function(item) { locations.push(item.location); });
		var url = this.rootUrl + "?action=delete&locs=" + encodeURIComponent(JSON.stringify(locations));

		this._doQuery(url, success, error);
	},

	renameItem : function(item, newName, success, error) {
		var url = this.rootUrl + "?action=rename&loc=" + this._encodeLocation(item.location) + "&newName=" + newName;
		this._doQuery(url, success, error);
	},

	createFolder : function(location, name, success, error) {
		var url = this.rootUrl + "?action=makedir&loc=" + this._encodeLocation(location) + "&name=" + name;
		this._doQuery(url, success, error);
	},


	_doQuery : function(url, success, error) {
		//		console.log("_doQuery: " + url);
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

	_encodeLocation : function(location) {
		return encodeURIComponent(location);
	}
}

