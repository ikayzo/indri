
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

	getContents : function(location, callback) {
		var url = this.rootUrl;	// + "?loc=" + location;
		if(location != "" && location != '.')
			url += "?loc=" + encodeURIComponent(location);

//		console.log("getContents: " + url);
		jQuery.getJSON(url, function(data, textStatus, jqXHR) {
//			console.log("callback: " + textStatus);
			callback(data.contents, textStatus);
		}).fail(function(jqXHR, testStatus, errorThrown) {
//			console.log(errorThrown);
		});	
	},
}



/*
	The FileBrowser type manages:
		- a file system manager instance (provided by the application)
		- a current location
		- a list of that location's contents
		- display and filtering data
*/
function FileBrowser(rootElem, fileSystemManager, initializer) {
	this.rootElem = jQuery(rootElem);
	this.fsm = fileSystemManager;

	this._initialize(initializer);

	// TEMP some defaults
	var fileBrowser = this;
	this._getParentElem().click(function() { fileBrowser.navigateRelative("parent"); });
	this._getRefreshElem().click(function() { fileBrowser.navigateToLocation(fileBrowser.currentLocation); });

	this.navigateToRoot();
}

FileBrowser.prototype = {
	currentLocation : {},
	currentContents : [],
	currentSelection : [],

	filter : null,
	sorter : null,

	locationRenderer : null,
	contentRenderer : null,
	statusRenderer : null,

	/*
		Primary API
	*/
	navigateToRoot : function() {
		this.fsm.getRootLocation(this._makeCallback(this.navigateToLocation));
	},

	navigateToLocation : function(location, status) {
		this._updateLocation(location);
		this.fsm.getContents(location, this._makeCallback(this._updateContents));
	},

	navigateRelative : function(direction) {
		this.fsm.getRelativeLocation(this.currentLocation, direction, this._makeCallback(this.navigateToLocation));
	},


	/*
		Internal methods
	*/
	_updateLocation : function(location) {
		this.currentLocation = location;

		if(this.locationRenderer) {
			this.locationRenderer.render(this._getLocationElem(), this.currentLocation);
		}
		else {
			this._getLocationElem().html(this.currentLocation);
		}
	},

	_updateContents : function(contents, status) {
		this.currentContents = contents;
		this.currentSelection = [];

		this._populateContentUI();
		this._updateStatus(status);
	},

	_populateContentUI : function() {
		// apply filter and sorter
		var contents = this._applySorter(this._applyFilter(this.currentContents));

		// use view to populate UI
		this._getContentsElem().empty().append(this.contentRenderer.render(contents, this._makeCallback(this._handleContentEvent)));
		this.contentRenderer.updateSelection(this.currentSelection);
	},

	_handleContentEvent : function(contentItem, evt) {
		if(evt.type == "dblclick") {
			if(contentItem.isDir) {
				this.navigateToLocation(contentItem.location);
			}
			else {
				console.log("User chose item: " + contentItem.location);
			}
		}
		else if(evt.type == "click") {
			if(!evt.shiftKey) {
				this.currentSelection.length = 0;
				this.currentSelection.push(contentItem);
			}
			else {
				var index = jQuery.inArray(contentItem, this.currentSelection);
				if(index == -1) {
					this.currentSelection.push(contentItem);
				}
				else {
					this.currentSelection.splice(index, 1);
				}
			}

			this.contentRenderer.updateSelection(this.currentSelection);
		}
	},

	_updateStatus : function(status) {
		if(this.statusRenderer) {
			this.statusRenderer.render(this._getStatusElem(), status);
		}
		else {
			this._getStatusElem().html(status);
		}	
	},

	_makeCallback : function(callback) {
		var fileBrowser = this;
		return function() { callback.apply(fileBrowser, arguments); }
	},

	// Component callbacks/support
	_viewChanged : function() {
		this._populateContentUI();
	},

	_filterChanged : function() {
		this.currentSelection = [];
		this._populateContentUI();
	},

	_applyFilter : function(items) {
		return this.filter ? this.filter.apply(items) : items;
	},


	_sortChanged : function() {
		this._populateContentUI();
	},

	_applySorter : function(items) {
		return this.sorter ? this.sorter.apply(items) : items;
	},


	// UI Accessors
	uiNames : {
		parent : '#parent-nav',
		refresh : '#refresh-nav',
		location : '#location-display',
		viewControls : '#view-controls',
		contents : '#contents-display',
		status : '#status-display',
		filter : '#filter-controls',
	},

	_getParentElem : function() {
		return this.rootElem.find(this.uiNames.parent);
	},

	_getRefreshElem : function() {
		return this.rootElem.find(this.uiNames.refresh);
	},

	_getLocationElem : function() {
		return this.rootElem.find(this.uiNames.location);
	},

	_getViewControlsElem : function() {
		return this.rootElem.find(this.uiNames.viewControls);
	},

	_getContentsElem : function() {
		return this.rootElem.find(this.uiNames.contents);
	},

	_getStatusElem : function() {
		return this.rootElem.find(this.uiNames.status);
	},
	
	_getFilterElem : function() {
		return this.rootElem.find(this.uiNames.filter);
	},


	// Initialization methods
	_initialize : function(overrides) {
		var initializer = new this.DefaultInitializer();
		if(overrides) {
			jQuery.extend(initializer, overrides);

			if(overrides.additionalFilters) {
				overrides.additionalFilters.forEach(function(filter) {
					initializer.filters.filters.push(filter);
				});
			}

			if(overrides.additionalViews) {
				overrides.additionalViews.forEach(function(view) {
					initializer.views.push(view);
				});
			}
		}

		this.locationRenderer = initializer.locationRenderer;
		this.statusRenderer = initializer.statusRenderer;
		this._initializeFiltering(initializer.filters);
		this._initializeViews(initializer.views);
	},

	_initializeViews : function(settings) {
		var fileBrowser = this;
		var controlContainer = this._getViewControlsElem();

		settings.forEach(function(settings) {
			var button = jQuery(document.createElement("button")).html(settings.name).click(function() {
				fileBrowser.contentRenderer = settings;
				fileBrowser._viewChanged();
			});
			controlContainer.append(button);

		});

		this.contentRenderer = settings[0];
	},

	_initializeFiltering : function(settings) {
		var fileBrowser = this;
		if(settings.selectedFilter == null) {
			settings.selectedFilter = new RegExp(settings.filters[0].value);
		};	

		// set up handler
		this.filter = {
			options : settings,

			apply : function(items) {
				var filteredItems = items.filter(function(item) {
					return item.isDir || item.name.match(this.selectedFilter);
				}, this.options);

				return filteredItems;
			}
		}

		// create selector
		var select = $(document.createElement("select")).attr("id", "filterSelector");
		select.change(function() {
			settings.selectedFilter = new RegExp(select.find("option:selected").val());
			fileBrowser._filterChanged();
		});

		// populate it
		settings.filters.forEach(function(filter) {
			var item = $(document.createElement("option")).attr("value", filter.value).html(filter.text);
			if(settings.selectedFilter == filter) {
				item.attr("selected", "selected");
			}
			select.append(item);
		});

		// add selector to the dom
		this._getFilterElem().append(select);
	}
};

FileBrowser.prototype.DefaultInitializer = function() {
	this.multiSelect = false;

	this.filters = {
		filters : [ 
			{ value: ".*", text: "All files (*.*)"}, 
		],
		selectedFilter : null
	};

	this.views = [{
		name : "List",

		render : function(contents, callback) {
			var renderer = this;
			renderer.lookup = [];

			renderer.$list = renderer._renderContainer();
			contents.forEach(function(contentItem) { 
				renderer.$list.append(renderer._renderItem(renderer, contentItem, callback));
			});

			return renderer.$list;
		},

		updateSelection : function(newSelection) {
			this.$list.children("li").removeClass("fb-content-selected");
			newSelection.forEach(function(selectedItem) {
				this.lookup[selectedItem.name].addClass("fb-content-selected");
			}, this);
		},

		_renderContainer : function() {
			return jQuery(document.createElement("ul")).addClass("fb-filelist");
		},

		_renderItem : function(renderer, contentItem, callback) {
			$icon = jQuery(document.createElement("img")).attr("src", this._getIcon(contentItem));
			var $listItem = jQuery(document.createElement("li")).addClass("fb-listitem")
								.append($icon).append(contentItem.name)
			.dblclick(function(evt) {
				callback(contentItem, evt);
			}).click(function(evt) {
				callback(contentItem, evt);
			});

			renderer.lookup[contentItem.name] = $listItem;
			return $listItem;
		},

		_getIcon : function(contentItem) {
			return contentItem.isDir ? "img/small_folder_icon.png" : "img/small_file_icon.png";
		}
	}];

	this.locationRenderer = {
		render : function(elem, location) {
			if(!location || location == ".") {
				location = "(root)";
			}

			location = location.replace(/^\./, "(root)");

			elem.html(location);
		}
	};

	this.statusRenderer = {
		render : function(elem, status) {
			elem.html("<strong>" + status + "</strong>");
		}
	};
};

var overrides = {
	additionalFilters : [ 
		{ value: "\.(htm|html)$", text: "HTML files (*.htm, *.html)"}, 
		{ value: "\.js$", text: "Javascript files (*.js)"}, 
		{ value: "\.(jpg|png)", text: "Image files (*.jpg, *.png)"}, 
	],

	additionalViews : [
		{
			name : "Icon",

			render : function(contents, callback) {
				var renderer = this;
				renderer.lookup = [];

				renderer.$list = renderer._renderContainer();
				contents.forEach(function(contentItem) { 
					renderer.$list.append(renderer._renderItem(renderer, contentItem, callback));
				});

				return this.$list;
			},

			updateSelection : function(newSelection) {
				this.$list.children("li").removeClass("fb-content-selected");
				newSelection.forEach(function(selectedItem) {
					this.lookup[selectedItem.name].addClass("fb-content-selected");
				}, this);
			},

			_renderContainer : function() {
				return jQuery(document.createElement("ul")).addClass("fb-filelist fb-iconlist");
			},

			_renderItem : function(renderer, contentItem, callback) {
				var $icon = jQuery(document.createElement("img")).attr("src", this._getIcon(contentItem));
				var $listItem = jQuery(document.createElement("li")).addClass("fb-iconitem")
								.append($icon).append("<br>" + contentItem.name)
				.dblclick(function(evt) {
					callback(contentItem, evt);
				}).click(function(evt) {
					callback(contentItem, evt);
				});

				renderer.lookup[contentItem.name] = $listItem;
				return $listItem;
			},

			_getIcon : function(contentItem) {
				return contentItem.isDir ? "img/default_folder_icon.png" : "img/default_file_icon.png";
			}
		},

		{
			name : "Details",

			render : function(contents, callback) {
				var renderer = this;
				renderer.lookup = [];

				renderer.$table = renderer._renderContainer();
				contents.forEach(function(contentItem) { 
					renderer.$table.append(renderer._renderItem(renderer, contentItem, callback));
				});

				return renderer.$table;
			},

			updateSelection : function(newSelection) {
				this.$table.children("tbody").children("tr").removeClass("fb-content-selected");
				newSelection.forEach(function(selectedItem) {
					this.lookup[selectedItem.name].addClass("fb-content-selected");
				}, this);
			},


			_renderContainer : function() {
				var $tr = jQuery(document.createElement("tr"));
				this._fieldNames.forEach(function(field) {
					$tr.append(jQuery(document.createElement("th")).addClass("fb-detailheader").html(field));
				});

				return jQuery(document.createElement("table")).addClass("fb-filelist fb-detaillist")
					.append(jQuery(document.createElement("thead"))).append($tr);
			},

			_renderItem : function(renderer, contentItem, callback) {
				var $tr = jQuery(document.createElement("tr")).addClass("fb-detaillist");
				$tr.append(jQuery(document.createElement("td")).html(this._formatName(contentItem)));
				$tr.append(jQuery(document.createElement("td")).html(this._formatSize(contentItem.size)));
				$tr.append(jQuery(document.createElement("td")).html(this._formatDate(contentItem.created)));
				$tr.append(jQuery(document.createElement("td")).html(this._formatDate(contentItem.modified)));

					
				$tr.dblclick(function(evt) {
					callback(contentItem, evt);
				}).click(function(evt) {
					callback(contentItem, evt);
				});

				renderer.lookup[contentItem.name] = $tr;
				return $tr;
			},

			_formatName : function(contentFile) {
				return contentFile.isDir ? ("<b>" + contentFile.name + "/</b>") : contentFile.name;
			},

			_formatSize : function(size) {
				if(size < 1024) {
					return size + " " + ((size == 1) ? "byte" : "bytes");
				}
				else if(size < 1024 * 1024) {
					return (size / 1024).toFixed(1) + " KB";
				}

				return (size / (1024 * 1024)).toFixed(1) + " MB";
			},

			_formatDate : function(timestamp) {
				return new Date(timestamp).toDateString();
			},

			_fieldNames : [ "name", "size", "created", "modified" ],

			dateFormatString : "yyyy-MM-dd, hh:mm ",
		}
	],
};

var fileBrowser = new FileBrowser(jQuery("#browserui"), new FileSystemManager("filesystem.php"), overrides);