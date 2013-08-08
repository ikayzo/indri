

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
	this._getUiElem(this.uiNames.parent).click(function() { fileBrowser.navigateRelative("parent"); });
	this._getUiElem(this.uiNames.refresh).click(function() { fileBrowser.navigateToLocation(fileBrowser.currentLocation); });
	this._getUiElem(this.uiNames.contents).click(function(evt) {
		if(evt.toElement == this) {
			fileBrowser.clearSelection();
		}
	});
	this._getUiElem(this.uiNames.delete).click(function() { fileBrowser.deleteSelected(); });
	this._getUiElem(this.uiNames.newFolder).click(function() { fileBrowser.createFolder(); });

	this.navigateToRoot();
}

FileBrowser.prototype = {
	currentLocation : {},
	currentContents : [],

	multiSelect : false,
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

	navigateToLocation : function(location) {
		this._updateLocation(location);
		this.fsm.getContents(location, this._makeCallback(this._updateContents), this._makeCallback(this._updateStatus));
	},

	navigateRelative : function(direction) {
		this.fsm.getRelativeLocation(this.currentLocation, direction, this._makeCallback(this.navigateToLocation));
	},

	clearSelection : function() {
		this.currentSelection.length = 0;
		this._selectionChanged();
	},

	deleteSelected : function() {
		var success = this._makeCallback(function(emptyContents, status) {
			this.navigateToLocation(this.currentLocation);
			this._updateStatus(status);
		});
		this.fsm.deleteItems(this.currentSelection, success, this._makeCallback(this._updateStatus));
	},

	createFolder : function() {
		var success = this._makeCallback(function(newContents, status) {
			this.navigateToLocation(this.currentLocation);
			this._updateStatus(status);

			// TODO Update selection
		});
		this.fsm.createFolder(this.currentLocation, "New Folder", success, this._makeCallback(this._updateStatus));
	},

	renameItem : function(contentItem, newName) {
			var success = this._makeCallback(function(renamedContent, status) {
				this.navigateToLocation(this.currentLocation);
				this._updateStatus(status);

				// TODO Update selection
			});

			this.fsm.renameItem(contentItem, newName, success, this._makeCallback(this._updateStatus));
	},


	/*
		Internal methods
	*/
	_updateLocation : function(location) {
		this.currentLocation = location;

		if(this.locationRenderer) {
			this.locationRenderer.render(this._getUiElem(this.uiNames.location), this.currentLocation);
		}
		else {
			this._getUiElem(this.uiNames.location).html(this.currentLocation);
		}
	},

	_updateContents : function(contents, status) {
		this.currentContents = contents;
		this.currentSelection.length = 0;

		this._populateContentUI();
		this._updateStatus(status);
	},

	_populateContentUI : function() {
		// apply filter and sorter
		var contents = this._applySorter(this._applyFilter(this.currentContents));

		// use view to populate UI
		this._getUiElem(this.uiNames.contents).empty().append(this.contentRenderer.render(contents, this._makeCallback(this._handleContentEvent)));
		this._selectionChanged();
	},

	_handleContentEvent : function(contentItem, evt, newName) {
		if(evt == "clear") {
			this.clearSelection();
		}
		else if(evt == "longpress") {
			this.currentSelection.length = 0;
			this.currentSelection.push(contentItem);			

			this._selectionChanged();
		}
		else if(evt == "rename") {
			this.renameItem(contentItem, newName);
		}
		else if(evt.type == "dblclick") {
			if(contentItem.isDir) {
				this.navigateToLocation(contentItem.location);
			}
			else {
				console.log("User chose item: " + contentItem.location);
			}
		}
		else if(evt.type == "click") {
			if(!evt.metaKey || !this.multiSelect) {
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

			this._selectionChanged();
		}
	},

	_updateStatus : function(status) {
		if(this.statusRenderer) {
			this.statusRenderer.render(this._getUiElem(this.uiNames.status), status);
		}
		else {
			this._getUiElem(this.uiNames.status).html(status);
		}	
	},

	_makeCallback : function(callback) {
		var fileBrowser = this;
		return function() { callback.apply(fileBrowser, arguments); }
	},

	// Component callbacks/support
	_setRenderer : function(renderer) {
		this.contentRenderer = renderer;
		renderer.browser = this;
		renderer.callback = this._makeCallback(this._handleContentEvent);
		renderer.lookup = {};

		this._populateContentUI();
	},

	_selectionChanged : function() {
		this.contentRenderer.updateSelection(this.currentSelection);
		if(this.currentSelection.length != 0) {
			jQuery(this._getUiElem(this.uiNames.delete)).removeAttr('disabled');
		}
		else  {
			jQuery(this._getUiElem(this.uiNames.delete)).attr('disabled', 'true');
		}
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
		parent : '#parent-control',
		refresh : '#refresh-control',
		newFolder : '#newfolder-control',
		delete : '#delete-control',
		location : '#location-display',
		viewControls : '#view-controls',
		contents : '#contents-display',
		status : '#status-display',
		filter : '#filter-controls',
	},

	_getUiElem : function(name) {
		return this.rootElem.find(name);
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

		this.multiSelect = initializer.multiSelect;
		this.locationRenderer = initializer.locationRenderer;
		this.statusRenderer = initializer.statusRenderer;
		this._initializeFiltering(initializer.filters);
		this._initializeViews(initializer.views);
	},

	_initializeViews : function(settings) {
		var fileBrowser = this;
		var controlContainer = this._getUiElem(this.uiNames.viewControls);

		settings.forEach(function(settings) {
			var button = jQuery(document.createElement("button")).html(settings.name).click(function() {
				fileBrowser._setRenderer(settings);
			});
			controlContainer.append(button);

		});

		this._setRenderer(settings[0]);
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
		this._getUiElem(this.uiNames.filter).append(select);
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

	this.views = [
		new ListRenderer(),
		];

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

