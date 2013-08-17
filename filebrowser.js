

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
	this._getUiElem(this.uiNames.accept).click(function() { initializer.resultCallback({ userCancelled: false, selection: fileBrowser.currentSelection }) });
	this._getUiElem(this.uiNames.cancel).click(function() { initializer.resultCallback({ userCancelled: true, selection: [] }) });

	if(initializer.showShortcuts) {
		this.fsm.getShortcuts(this._makeCallback(this._updateShortcuts), 
			this._makeCallback(function() { 
				this._setVisible(this.uiNames.shortcuts, false);
				this.navigateToRoot();
			}));
	}
	else {
		this.navigateToRoot();
	}
}

FileBrowser.prototype = {
	currentLocation : {},
	currentContents : {},

	multiSelect : false,
	currentSelection : [],

	filter : null,
	sorter : null,

	locationRenderer : null,
	contentRenderer : null,
	statusRenderer : null,
	previewRenderer : null,
	shortcutsRenderer : null,

	/*
		Primary API
	*/
	navigateToRoot : function() {
		this.fsm.getRootLocation(this._makeCallback(this.navigateToLocation));
	},

	navigateToLocation : function(location) {
		var success = this._makeCallback(function(contents, status) {
			this._updateLocation(location);
			this._updateContents(contents, status);
		});
		this.fsm.getContents(location, success, this._makeCallback(this._updateStatus));
	},

	navigateRelative : function(direction) {
		this.fsm.getRelativeLocation(this.currentLocation, direction, this._makeCallback(this.navigateToLocation));
	},

	clearSelection : function() {
		this.currentSelection.length = 0;
		this._selectionChanged();
	},

	createFolder : function() {
		var success = this._makeCallback(function(newContents, status) {
				this._modifyContents(newContents, false, status);
		});
		this.fsm.createFolder(this.currentLocation, "New Folder", success, this._makeCallback(this._updateStatus));
	},

	renameItem : function(contentItem, newName) {
			var success = this._makeCallback(function(renamedContent, status) {
				this._modifyContents(renamedContent, false, status);
			});

			this.fsm.renameItem(contentItem, newName, success, this._makeCallback(this._updateStatus));
	},

	deleteSelected : function() {
		var success = this._makeCallback(function(deletedContents, status) {
				this._modifyContents(deletedContents, true, status);

		});
		this.fsm.deleteItems(this.currentSelection, success, this._makeCallback(this._updateStatus));
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

	_modifyContents : function(items, isDelete, status) {
		items.forEach(function(item) {
			if(isDelete)
				delete this.currentContents[item.id];
			else
				this.currentContents[item.id] = item;

		}, this);

		this.currentSelection.length = 0;
		if(!isDelete)
			this.currentSelection.push(items[0]);


		this._populateContentUI();
		this._updateStatus(status);
	},

	_updateContents : function(contents, status) {
		this.currentContents = {};
		contents.forEach(function(contentItem) { 
			this.currentContents[contentItem.id] = contentItem;
		}, this);
		this.currentSelection.length = 0;

		this._populateContentUI();
		this._updateStatus(status);
	},

	_populateContentUI : function() {
		// apply filter and sorter
		var contents = [];
		for(contentId in this.currentContents) {
			contents.push(this.currentContents[contentId]);
		}
		var contents = this._applySorter(this._applyFilter(contents));

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

	_updateShortcuts : function(shortcuts) {
		if(this.shortcutsRenderer) {
			this._getUiElem(this.uiNames.shortcuts).empty().append(
				this.shortcutsRenderer.render(shortcuts, this._makeCallback(this.navigateToLocation)));
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


	// Component callbacks/support
	_setRenderer : function(renderer) {
		this.contentRenderer = renderer;
		renderer.browser = this;
		renderer.callback = this._makeCallback(this._handleContentEvent);
		renderer.lookup = {};

		this._populateContentUI();
	},

	_selectionChanged : function() {
		// Have the content renderer update the content area
		this.contentRenderer.updateSelection(this.currentSelection);

		// Fill in the selected names
		var prefix = '', filenameText = '';
		this.currentSelection.forEach(function(item) { 
			filenameText += prefix + item.name; 
			prefix = ';'; 
		});
		this._getUiElem(this.uiNames.filename).val(filenameText);

		// Enabled/disable the delete button
		if(this.currentSelection.length != 0) {
			this._getUiElem(this.uiNames.delete).removeAttr('disabled');
		}
		else  {
			this._getUiElem(this.uiNames.delete).attr('disabled', 'true');
		}

		if(this.previewRenderer) {
			this._getUiElem(this.uiNames.preview).empty().append(this.previewRenderer.render(this.currentSelection));
		}
	},


	_filterChanged : function() {
		this.currentSelection.length = 0;
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

	_makeCallback : function(callback) {
		var fileBrowser = this;
		return function() { return callback.apply(fileBrowser, arguments); }
	},


	// Initialization methods
	_initialize : function(initializer) {
		if(!initializer) {
			initializer = new this.DefaultInitializer();
		}

		this._getUiElem(this.uiNames.title).html(initializer.title);
		this._getUiElem(this.uiNames.accept).html(initializer.accept);
		this._getUiElem(this.uiNames.cancel).html(initializer.cancel);

		this._setVisible(this.uiNames.preview, initializer.showPreview);
		this._setVisible(this.uiNames.shortcuts, initializer.showShortcuts);

		this.multiSelect = initializer.multiSelect;
		this.sorter = initializer.sorter;
		this.sorter.browser = this;

		this.locationRenderer = initializer.locationRenderer;
		this.statusRenderer = initializer.statusRenderer;
		this.previewRenderer = initializer.previewRenderer;
		this.shortcutsRenderer = initializer.shortcutsRenderer;

		this._initializeFiltering(initializer.filter);
		this._initializeViews(initializer.viewFactory);
	},


	_initializeFiltering : function(filter) {
		// set the data member
		this.filter = filter;

		// add selector to the dom
		this._getUiElem(this.uiNames.filter).empty().append(this.filter.render(this._makeCallback(this._filterChanged)));
	},

	_initializeViews : function(viewFactory) {
		this._getUiElem(this.uiNames.viewControls).empty()
			.append(viewFactory.render(this._makeCallback(function(view) { this._setRenderer(view); })));
	},


	// UI Accessors
	uiNames : {
		title 			: '#title-control',
		accept 			: '#accept-control',
		cancel 			: '#cancel-control',
		parent 			: '#parent-control',
		refresh 		: '#refresh-control',
		newFolder 		: '#newfolder-control',
		delete 			: '#delete-control',
		location 		: '#location-display',
		viewControls 	: '#view-controls',
		contents 		: '#contents-display',
		status 			: '#status-display',
		filter 			: '#filter-controls',
		filename 		: "#filename-control",
		preview 		: "#preview-panel",
		shortcuts 		: "#shortcuts-controls",
	},

	_getUiElem : function(name) {
		return this.rootElem.find(name);
	},

	_setVisible : function(name, isVisible) {
		var displayMode = isVisible ? 'block' : 'none';
		this._getUiElem(name).css('display', displayMode);
	},
};


FileBrowser.prototype.DefaultInitializer = {
	title : "File Chooser",
	accept : "Save",
	cancel : "Cancel",

	showPreview : true,
	showShortcuts : false,
	directoriesOnly : false,
	multiSelect : false,
	// fileMustExist : false,

	sorter : {
		fieldName : "name",
		ascending : true,

		apply : function(items) {
			if(this.fieldName) {
				var fieldName = this.fieldName;
				var inverter = this.ascending ? 1 : -1;

				return items.sort(function(a, b) {
					var aValue = a[fieldName], bValue = b[fieldName];
					if(aValue == bValue)
						return 0;
					
					return aValue < bValue ? -1 * inverter : 1 * inverter;
				});
			}

			return items;
		},

		setSortField : function(fieldName) {
			if(this.fieldName == fieldName) {
				this.ascending = !this.ascending;
			}
			else {
				this.fieldName = fieldName;
				this.ascending = true;
			}

			// TODO  Hmmm...not pleased with this
			this.browser._sortChanged();
		}
	},

	filter : {
		options : [ 
			{ value: ".*", text: "All files (*.*)"}, 
		],

		_selectedFilter : null,

		apply : function(items) {
			var filter = this._selectedFilter;
			var filteredItems = items.filter(function(item) {
				return item.isDir || item.name.match(filter);
			}, this.options);

			return filteredItems;
		},

		render : function(callback) {
			// create selector
			var $select = jQuery(document.createElement("select")).attr("id", "filterSelector")
			.change(this, function(evt) {
				evt.data._selectedFilter = new RegExp(jQuery(this).find("option:selected").val());
				callback();
			});

			// populate it
			this.options.forEach(function(option) {
				var item = jQuery(document.createElement("option")).attr("value", option.value).html(option.text);
				$select.append(item);
			});

			// make sure we have a default
			this._selectedFilter = new RegExp(this.options[0].value);

			return $select;
		}
	},

	viewFactory : {
		views : [
			new ListRenderer(),
		],

		render : function(callback) {
			var controlContainer = jQuery(document.createElement("span"));

			this.views.forEach(function(view) {
				var button = jQuery(document.createElement("button")).html(view.name).click(function() {
					callback(view);
				});
				controlContainer.append(button);
			});
			callback(this.views[0]);

			return controlContainer;
		}
	},

	locationRenderer : {
		render : function(elem, location) {
			if(!location || location == ".") {
				location = "(root)";
			}

			location = location.replace(/^\./, "(root)");

			elem.html(location);
		}
	},

	statusRenderer : {
		render : function(elem, status) {
			elem.html("<strong>" + status + "</strong>");
		}
	},

	previewRenderer : {
		render : function(selection) {
			if(selection.length == 0) {
				return jQuery(document.createElement("span")).html("No items selected");
			}
			else if(selection.length > 1) {
				return jQuery(document.createElement("span")).html("Multiple items selected");
			}
			else if(selection[0].previewUrl == null) {
				return jQuery(document.createElement("span")).html("No preview available");
			}
			else {
				return jQuery(document.createElement("img")).attr("src", this.baseUrl + selection[0].previewUrl);				
			}
		},

		baseUrl : ""
	},

	shortcutsRenderer : {
		render : function(shortcuts, callback) {
			var $listContainer = jQuery(document.createElement("ul")).addClass("ind-shortcut-list");
			shortcuts.forEach(function(shortcut) {
				var $label = jQuery(document.createElement("span")).addClass("ind-shortcut-name").html(shortcut.name);
				var $listItem = jQuery(document.createElement("li")).addClass("ind-listitem").append($label)
				.click(function(evt) {
					if(evt.which == 1) {
						callback(shortcut.location);
					}
				});
				$listContainer.append($listItem);
			});
			return $listContainer;
		}
	},

	resultCallback : function(results) { console.log(results); },
};

