
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
		// NOTE: needs trailing '&' or something between here and the server fails silently
		var url = this.rootUrl + "?action=shortcuts&";
		this._doQuery(url, success, error);
	},

	getRootLocation : function(success, error) {
		// NOTE: needs trailing '&' or something between here and the server fails silently
		var url = this.rootUrl + "?action=navigate&direction=home&";
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
			success(data.loc);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			console.log("FSM Error:", textStatus);
			error("FSM Error: " + textStatus);
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
    
    // Disable ajax caching for IE
    jQuery.ajaxSetup({ cache: false });
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
//			console.log("callback: " + textStatus);
			if(data.error) {
				error(data.error);
			}
			else {
				success(data.contents, textStatus);
			}
		}).fail(function(jqXHR, textStatus, errorThrown) {
			console.log("FSM Error:", textStatus);
			if(error) {
				error("FSM Error: " + textStatus);
			}
		});	
	},

	_doQuery2 : function(url, success, error) {
		//		console.log("_doQuery: " + url);
		jQuery.ajax({
			url : url,
			dataType : 'json'
		}).done(function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}).fail(function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		}).always(function(jqXHR, textStatus, errorThrown) {
			console.log(textStatus);
		});	
	},

	_encodeLocation : function(location) {
		return encodeURIComponent(location);
	}
}

