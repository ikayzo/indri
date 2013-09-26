

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
}

FileBrowser.attach = function(rootElem, fileSystemManager, initializer) {
	return new FileBrowser(rootElem, fileSystemManager, initializer);
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

	allowMultipleResults : false,
	resultCallback : null,

	/*
		Primary API
	*/
	navigateToRoot : function() {
		this.fsm.getRootLocation(this._makeCallback(this.navigateToLocation), this._makeCallback(this._updateStatus));
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
			this._beginEditingContentItem(newContents[0]);
		});

		this.fsm.createFolder(this.currentLocation, IndriText.NEW_FOLDER_TEXT, success, this._makeCallback(this._updateStatus));
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
			this.locationRenderer.render(this._getUiElem(this.uiNames.location), this.currentLocation, this._makeCallback(this.navigateToLocation));
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
		else if(evt == "rename") {
			this.renameItem(contentItem, newName);
		}
		else if(evt.type == "dblclick") {
			this._returnResults(true, this.currentSelection);
		}	
		else if(evt.type == "click") {
			var index = jQuery.inArray(contentItem, this.currentSelection);
			if(evt.metaKey && this.multiSelect) {
				if(index == -1) {
					this.currentSelection.push(contentItem);
				}
				else {
					this.currentSelection.splice(index, 1);
				}
			}
			else {
				if(index != -1 && contentItem.isDir) {
					this.navigateToLocation(contentItem.location);
				}
				else {
					this.currentSelection.length = 0;
					this.currentSelection.push(contentItem);
				}
			}
			

			this._selectionChanged();
		}
	},

	_beginEditingContentItem : function(contentItem) {
		if(!contentItem && this.currentSelection.length) {
			contentItem = this.currentSelection[0];
		}

		if(contentItem) {
			this.contentRenderer.editItem(contentItem);
		}
	},

	_updateShortcuts : function(shortcuts) {
		if(this.shortcutsRenderer) {
			this._getUiElem(this.uiNames.shortcutsPanel).empty().append(
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
		var filenameText = '';
		if(this.currentSelection.length == 1) {
			filenameText = this.currentSelection[0].name;
		}
		else if(this.currentSelection.length > 0) {
			if(this.allowMultipleResults) {
				var prefix = '';
				this.currentSelection.forEach(function(selectedItem) {
					filenameText += prefix + selectedItem.name;
					prefix = ';';
				});
			}
			else {
				filenameText = "<Multiple Selection>";
			}
		}
		this._getUiElem(this.uiNames.filename).val(filenameText);

		// Enabled/disable the buttons button
		this._setEnabled(this.uiNames.delete, this.currentSelection.length != 0);
		this._setEnabled(this.uiNames.rename, this.currentSelection.length == 1);

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

	_returnResults : function(filesSelected, results) {
		if(filesSelected && !this.allowMultipleResults && results.length != 1) {
			this._updateStatus(IndriText.MULTI_SELECT_ERR);
		}
		else {
			this.resultCallback({ success: filesSelected, results: results });
		}
	},


	// Initialization methods
	_initialize : function(initializer) {
		if(!initializer) {
			initializer = new this.DefaultInitializer();
		}

		for(textItem in initializer.texts) {
			this._getUiElem(this.uiNames[textItem]).html(initializer.texts[textItem]);
		}

		for(visibility in initializer.visibility) {
			this._setVisible(this.uiNames[visibility], initializer.visibility[visibility]);
		}

		this.currentLocation = {};
		this.currentContents = {};
		this.currentSelection = [];

		this.multiSelect = initializer.multiSelect;
		this.allowMultipleResults = initializer.allowMultipleResults;

		this.sorter = initializer.sorter;
		this.sorter.browser = this;

		this.locationRenderer = initializer.locationRenderer;
		this.statusRenderer = initializer.statusRenderer;
		this.previewRenderer = initializer.previewRenderer;
		this.shortcutsRenderer = initializer.shortcutsRenderer;
		this.resultCallback = initializer.resultCallback;

		this._initializeFiltering(initializer.filter);
		this._initializeViews(initializer.viewFactory);

		var fileBrowser = this;
		this._getUiElem(this.uiNames.parent).click(function() { fileBrowser.navigateRelative("parent"); });
		this._getUiElem(this.uiNames.refresh).click(function() { fileBrowser.navigateToLocation(fileBrowser.currentLocation); });
		this._getUiElem(this.uiNames.contentsPanel).click(function(evt) {
			if(evt.toElement == this) {
				fileBrowser.clearSelection();
			}
		});
		this._getUiElem(this.uiNames.detail).click(function() { fileBrowser._toggleVisible(fileBrowser.uiNames.preview); });
		this._getUiElem(this.uiNames.shortcuts).click(function() { fileBrowser._toggleVisible(fileBrowser.uiNames.shortcutsPanel); });
		this._getUiElem(this.uiNames.delete).click(function() { fileBrowser.deleteSelected(); });
		this._getUiElem(this.uiNames.newFolder).click(function() { fileBrowser.createFolder(); });
		this._getUiElem(this.uiNames.rename).click(function() { fileBrowser._beginEditingContentItem(); });
		this._getUiElem(this.uiNames.accept).click(function() { fileBrowser._returnResults(true, fileBrowser.currentSelection); });
		this._getUiElem(this.uiNames.cancel).click(function() { fileBrowser._returnResults(false); });


		if(initializer.visibility['shortcutsPanel']) {
      fileBrowser.shortcuts = [];
			this.fsm.getShortcuts(this._makeCallback(this._updateShortcuts));
			this.fsm.getShortcuts(this._makeCallback(function(shortcuts){
        if (shortcuts.length > 0) {
		      this.navigateToLocation(shortcuts[0].location);
        } else {
			    this.navigateToRoot();
        }
      }));
		}
		else {
			this.navigateToRoot();
		}

	},


	_initializeFiltering : function(filter) {
		// set the data member
		this.filter = filter;

		// add selector to the dom
		this._getUiElem(this.uiNames.filter).empty().append(this.filter.render(this._makeCallback(this._filterChanged)));
	},

	_initializeViews : function(viewFactory) {
		viewFactory.render(this._makeCallback(function(view) { this._setRenderer(view); }), this._getUiElem(this.uiNames.viewControls));
	},


	// UI Accessors
	uiNames : {
		title 				: '#title-control',
		accept 				: '#accept-control',
		cancel 				: '#cancel-control',
		parent 				: '#parent-control',
		refresh 			: '#refresh-control',
		newFolder 			: '#newfolder-control',
		delete 				: '#delete-control',
		rename 				: '#rename-control',
		location 			: '#location-display',
		viewControls 		: '#view-controls',
		detail 				: '#detail-control',
		contents 			: '#contents-display',
		contentsPanel		: '#contents-panel',
		contentsWrapper		: '#section-wrapper',
		status 				: '#status-display',
		filter 				: '#filter-controls',
		filename 			: "#filename-control",
		previewControls		: "#preview-panel",
		preview 			: "#aside-wrapper-right",
		shortcuts 			: '#shortcuts-control',
		shortcutsList 			: '#ind-shortcut-list',
		shortcutsPanel 		: "#aside-wrapper-left",
	},

	_getUiElem : function(name) {
		return this.rootElem.find(name);
	},

	_setVisible : function(name, isVisible) {
		var displayMode = isVisible ? '' : 'none';
		this._getUiElem(name).css('display', displayMode);

		// Some special cases for the shortcuts and preview panels
		if(name == this.uiNames.preview || name == this.uiNames.shortcutsPanel) {
			var controlName = name == this.uiNames.preview ? this.uiNames.detail : this.uiNames.shortcuts;
			var className = name == this.uiNames.preview ? "ind-show-preview" : "ind-show-shortcuts";

			if(isVisible) {
				this._getUiElem(this.uiNames.contentsWrapper).addClass(className);
				this._getUiElem(controlName).addClass("ind-btn-active");
			}
			else {
				this._getUiElem(this.uiNames.contentsWrapper).removeClass(className);				
				this._getUiElem(controlName).removeClass("ind-btn-active ");
			}
		}
	},

	_toggleVisible : function(name) {
		this._setVisible(name, this._getUiElem(name).css('display') == 'none');
	},

	_setEnabled : function(name, isEnabled) {
		var $uiElem = this._getUiElem(name);

		if(isEnabled) {
			$uiElem.removeAttr('disabled');
			$uiElem.removeClass("ind-btn-dis");
		}
		else  {
			$uiElem.attr('disabled', 'true');
			$uiElem.addClass("ind-btn-dis");
		}
	},
};


FileBrowser.prototype.DefaultInitializer = {
	texts : {
		title : "FileChooser",
		accept : "OK",
		cancel : "Cancel",
	},

	visibility : {
		preview : false,
		shortcutsPanel : false,
		newFolder : false,
		delete : false,
		rename : false,
		filename : false,
		filter : false,
	},

	directoriesOnly : false,
	multiSelect : false,
	allowMultipleResults : false,
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

					if(!aValue) {
						return -1 * inverter;
					}

					if(!bValue) {
						return 1 * inverter;
					}
					
					if(aValue.toLowerCase && bValue.toLowerCase) {
						aValue = aValue.toLowerCase();
						bValue = bValue.toLowerCase();
					} 
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
			new ListContentRenderer(),
		],

		render : function(callback, container) {
			if(container) {
				container.empty();
			}
			else {
				container = jQuery(document.createElement("div"));
			}

			var btnId = 0;
			this.views.forEach(function(view) {
				var $anchor = jQuery(document.createElement("a")).addClass('ind-viewbutton entypo ind-btn').attr('id', 'ind-viewbutton-' + btnId);
				$anchor.click($anchor, function(evt) {
					jQuery('.ind-viewbutton').removeClass('ind-btn-active');
					jQuery(evt.data).addClass('ind-btn-active');

					callback(view);
				});

				if(btnId == 0) {
					$anchor.addClass('ind-btn-active');
				}

				if(view.img) {
					$anchor.append(jQuery(document.createElement("img")).attr('src', view.img));
				}
				else if(view.text) {
					$anchor.append(jQuery(document.createElement("span")).html(view.text));
				}
				else {
					$anchor.append(jQuery(document.createElement("span")).html(view.name));
				}

				container.append($anchor);
				btnId++;
			});

			callback(this.views[0]);

			return container;
		}
	},

	locationRenderer : new StringLocationRenderer(),

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
				var $listItem = jQuery(document.createElement("li")).addClass("ind-listitem ind-shortcut-item").append($label);
				$listItem.click($listItem, function(evt) {
					if(evt.which == 1) {
						jQuery(".ind-shortcut-item").removeClass("ind-shortcut-selected");
						jQuery(evt.data).addClass("ind-shortcut-selected");
						
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

FileBrowser.prototype.DebugDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {

	multiSelect : true,
	allowMultipleResults : true,

	texts : {
		title : "Test Dialog",
	},

	visibility : {
		preview : true,
		shortcutsPanel : true,
		newFolder : true,
		delete : true,
		rename : true,
		filename : true,
		filter : true,
	},
});

FileBrowser.prototype.SaveDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {

	multiSelect : false,

	texts : {
		title : "Save File",
		accept : "Save",
		cancel : "Cancel",
	},

	visibility : {
		preview : false,
		shortcutsPanel : false,
		newFolder : true,
		delete : true,
		rename : true,
		filename : true
	},
});


FileBrowser.prototype.OpenDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {

	multiSelect : true,
	allowMultipleResults : true,

	texts : {
		title : "Open File(s)",
		accept : "Open",
		cancel : "Cancel",
	},

	visibility : {
		preview : true,
		shortcutsPanel : false,
		filter : true,
	},
});
