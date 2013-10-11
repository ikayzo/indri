/*! indri-0.5.0 2013-10-11 */

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

;/*
	Constants and global stuff
*/

if (typeof KeyEvent == "undefined") {
    var KeyEvent = {
    	KEYCODE_ENTER : 13,
		KEYCODE_ESC : 27,
    KEYCODE_DELETE : 46
    };
}

var MouseButtons = {
	BUTTON_LEFT : 1,
};

var IndriIcons = {
	ICON_FOLDER : "&#128193;",
	ICON_DOCUMENT : "&#59190;",

	ICON_LIST_VIEW : "&#9776;",
	ICON_ICON_VIEW : "&#9871;",
	ICON_DETAIL_VIEW : "&#57349;",

	ICON_SORT_ASC : "&#59235;",
	ICON_SORT_DESC : "&#59232;",
}

var IndriText = {
	NEW_FOLDER_TEXT : "New Folder",

	MULTI_SELECT_ERR : "Error: Multiple selection is not allowed.",
};function ContentRenderer() {
}

ContentRenderer.prototype = {
  render: function(contents) {
    this._beginRender();

    $list = this._renderContainer();
    contents.forEach(function(contentItem) {
      $list.append(this._renderItem(contentItem));
    }, this);

    return $list;
  },
  updateSelection: function(newSelection) {
    for (id in this.lookup) {
      this.lookup[id].removeClass("ind-content-selected");
    }

    newSelection.forEach(function(selectedItem) {
      this.lookup[selectedItem.clientId].addClass("ind-content-selected");
    }, this);
  },
  editItem: function(contentItem) {
    var $listItem = this.lookup[contentItem.clientId];
    if ($listItem) {
      this._setupEditingEvents($listItem, contentItem);
    }
  },
  keyHandler: function(evt) {

    // check for Enter -> send evt = "enter"
    if (evt.which == (KeyEvent.KEYCODE_ENTER || KeyEvent.DOM_VK_RETURN)) {
      evt.data._handleKeyEvent("enter");
    }

    // check for delete -> send evt = "delete"
    else if (evt.which == (KeyEvent.KEYCODE_DELETE || KeyEvent.DOM_VK_DELETE)) {
      evt.data._handleKeyEvent("delete");
    }
  },
  _beginRender: function() {
    this.lookup = {};
  },
  _initItem: function($listItem, contentItem) {
    this.lookup[contentItem.clientId] = $listItem;
    this._setupNormalEvents($listItem, contentItem);
  },
  _setupEditingEvents: function($listItem, contentItem) {
    var oldText, newText;

    var $editable = $listItem.find(".ind-editable-name");
    oldText = $editable.html().replace(/"/g, "'");

    var endEditing = function(renderer) {
      $input.replaceWith($editable);
      renderer._setupNormalEvents($listItem, contentItem);
    };

    $input = jQuery(document.createElement("input")).addClass("ind-editbox").attr("type", "text").attr("value", oldText)
            .keydown(this, function(evt) {
      if (evt.which == (KeyEvent.KEYCODE_ENTER || KeyEvent.DOM_VK_RETURN)) {
        newText = $(this).val().replace(/"/g, "'");
        $input.replaceWith($editable);
        evt.data._setupNormalEvents($listItem, contentItem);

        evt.data.callback(contentItem, "rename", newText);
      }
      else if (evt.which == (KeyEvent.KEYCODE_ESC || KeyEvent.DOM_VK_ESCAPE)) {
        endEditing(evt.data);
      }
    }).blur(this, function(evt) {
      endEditing(evt.data);
    }).click(false).dblclick(false);

    $editable.replaceWith($input);
    $input.focus();
  },
  _setupNormalEvents: function($listItem, contentItem) {
    $listItem.off("click").on("click", this, function(evt) {
      if (evt.which == MouseButtons.BUTTON_LEFT) {
        evt.data.callback(contentItem, evt);
      }
    });

    $listItem.off("dblclick").on("dblclick", this, function(evt) {
      if (evt.which == MouseButtons.BUTTON_LEFT) {
        evt.data.callback(contentItem, evt);
      }
    });

    /*
     var pressTimer;
     $listItem.find(".ind-editable-name")
     .mouseup(function(){
     clearTimeout(pressTimer);
     }).mousedown(this, function(evt){
     if(evt.which == 1) {
     var renderer = evt.data;
     var editable = this;
     pressTimer = window.setTimeout(function() { 
     renderer.callback(contentItem, "longpress"); 
     renderer._setupEditingEvents($listItem, contentItem); 
     }, 1000);
     }
     });
     */
  },
  _getIcon: function(contentItem) {
    $icon = jQuery(document.createElement("span")).addClass("entypo");
    if (contentItem.isDir) {
      $icon.addClass('ind-icon-folder').html(IndriIcons.ICON_FOLDER);
    }
    else {
      $icon.addClass('ind-icon-file').html(IndriIcons.ICON_DOCUMENT);
    }

    return $icon;
  }
}
;/*
	Standard content renderers
*/

/*
	Displays the content items as a multi-column list with small icons
*/
function ListContentRenderer() {
	// List View
	this.name = "List";
	this.text = IndriIcons.ICON_LIST_VIEW;
}

ListContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {
		_renderContainer : function() {
			return jQuery(document.createElement("ul")).addClass("ind-content ind-filelist").click(this, function(evt) { 
				if(evt.toElement == this) evt.data.callback(null, 'clear');
			});
		},

		_renderItem : function(contentItem) {
			var $icon = this._getIcon(contentItem);
			var $label = jQuery(document.createElement("span")).addClass("ind-editable-name").html(contentItem.name);
			var $listItem = jQuery(document.createElement("li")).addClass("ind-listitem").append($icon).append($label);
			this._initItem($listItem, contentItem);

			return $listItem;
		}
	});


/*
	Displays content as a multi-column list with preview icons
*/
function IconContentRenderer() {
	// Icon View
	this.name = "Icon";
	this.text = IndriIcons.ICON_ICON_VIEW;
}
IconContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {
		showIconPreview : false,

		_renderContainer : function() {
			return jQuery(document.createElement("ul")).addClass("ind-content ind-iconlist").click(this, function(evt) {
				if(evt.toElement == this) evt.data.callback(null, 'clear');
			});
		},

		_renderItem : function(contentItem) {
			var $icon = this._getIcon(contentItem);
			var $label = jQuery(document.createElement("span")).addClass("ind-editable-name").html(contentItem.name);
			var $listItem = jQuery(document.createElement("li")).addClass("ind-iconitem").append($icon).append("<br>").append($label);
			this._initItem($listItem, contentItem);

			return $listItem;
		}	

	});


/*
	Displays content in a table with sortable columns
*/
function DetailContentRenderer() {
	// Detail View
	this.name = "Detail";
	this.text = IndriIcons.ICON_DETAIL_VIEW;
}
DetailContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {

		_renderContainer : function() {
			var renderer = this;
			var $tr = jQuery(document.createElement("tr"));
			this._fieldNames.forEach(function(field, index) {
				var $th = jQuery(document.createElement("th")).html(renderer._columnTitles[index]);
				if(field != '') {
					$th.click(this, function(evt){
						if(evt.target == this && evt.which == MouseButtons.BUTTON_LEFT) {
							evt.data.browser.sorter.setSortField(field);
						}
					});
				}

				// If this is the column we're sorting by, add the appropriate indicator
				if(field == this.browser.sorter.fieldName) {
					$th.addClass(this.browser.sorter.ascending ? "ind-col-sort-asc" : "ind-col-sort-desc");					
					$sortIndicator = jQuery(document.createElement("span")).addClass("ind-col-sort");
					if(this.browser.sorter.ascending) {
						$sortIndicator.addClass("ind-col-sort entypo").html(IndriIcons.ICON_SORT_ASC);
					}
					else {
						$sortIndicator.addClass("ind-col-sort entypo").html(IndriIcons.ICON_SORT_DESC);
					}

					$th.append($sortIndicator)
				}

				$tr.append($th);
			}, this);

			return jQuery(document.createElement("table")).addClass("ind-content ind-detaillist")
					.append(jQuery(document.createElement("thead")).append($tr));
		},

		_renderItem : function(contentItem) {
			var $tr = jQuery(document.createElement("tr"));

			$tr.append(jQuery(document.createElement("td")).append(this._getIcon(contentItem)));
			var $label = jQuery(document.createElement("span")).addClass("ind-editable-name").html(contentItem.name);
			if(contentItem.isDir) {
				$label.addClass("ind-detailitem-dirname");
			}
			$tr.append(jQuery(document.createElement("td")).append($label));

			$tr.append(jQuery(document.createElement("td")).html(this._formatSize(contentItem.size)));
			$tr.append(jQuery(document.createElement("td")).html(this._formatDate(contentItem.created)));
			$tr.append(jQuery(document.createElement("td")).html(this._formatDate(contentItem.modified)));
			this._initItem($tr, contentItem);

			return $tr;
		},

		_formatName : function(contentFile) {
			return contentFile.name;
		},

		_formatSize : function(size) {
			if(!size) {
				return "--";
			}

			if(size < 1024) {
				return size + " " + ((size == 1) ? "byte" : "bytes");
			}
			else if(size < 1024 * 1024) {
				return (size / 1024).toFixed(1) + " KB";
			}

			return (size / (1024 * 1024)).toFixed(1) + " MB";
		},

		_formatDate : function(timestamp) {
			return timestamp ? new Date(timestamp).toDateString() : '--';
		},

		_fieldNames : [ "isDir", "name", "size", "created", "modified" ],
		_columnTitles : [ "", "name", "size", "creation date", "last modified date" ],

		dateFormatString : "yyyy-MM-dd, hh:mm ",
	});
;/*
	Standard location renderers
*/

function splitPath(path, delimiter) {
	var parts = [];
	path.split(delimiter).forEach(function(item) {
		if(item.length) {
			parts.push(item);
		}
	});

	return parts;
}

function StringLocationRenderer() {}
StringLocationRenderer.prototype = jQuery.extend({}, {
		render : function(elem, location) {
			if(location) {
				location = JSON.parse(location);
			}

			elem.html(location.toString());
		},
	});


function SegmentedLocationRenderer() {}
SegmentedLocationRenderer.prototype = jQuery.extend({}, {
		render : function($elem, location, callback) {
			if(location) {
				location = JSON.parse(location);
			}
			else {
				location = '/';
			}

			var parts = splitPath(location, '/');

			$elem.empty();

			// Handle the root path case
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html("(root)").addClass('ind-location-segment');
			// Only add the click handler to the root path if there weren't any other segments
			if(!isEmptyPath) {
				$rootAnchor.click(JSON.stringify('/'), function(evt) {
					callback(evt.data);
				});
			}
			$elem.append($rootAnchor);

			// Add each other path component
			var fullPath = '';
			parts.forEach(function(segment, index) {
				$elem.append('<span class="ind-location-divider">&#62;</span>');
				fullPath += '/' + segment;

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click(JSON.stringify(fullPath), function(evt) {
						callback(evt.data);
					});
				}
				$elem.append($anchor);
			});

		},
	});


// { bucket: bucket, key : key }

function BucketLocationRenderer() {}
BucketLocationRenderer.prototype = jQuery.extend({}, {
		render : function($elem, location, callback) {
			if(!location) {
				return;
			}

			var bucketData = JSON.parse(location);

			var parts = splitPath(bucketData.key, '/');
			var targetLocation = { bucket: bucketData.bucket, key : '' };
			
			$elem.empty();

			// Create root link
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html(bucketData.bucket).addClass('ind-location-segment');
			if(!isEmptyPath) {
				$rootAnchor.click(JSON.stringify(targetLocation), function(evt) {
					callback(evt.data);
				});
			}
			$elem.append($rootAnchor);

			$elem.append(' : ');

			// Add all other links
			parts.forEach(function(segment, index) {
				targetLocation.key += segment + '/';

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click(JSON.stringify(targetLocation), function(evt) {
						callback(evt.data);
					});
				}
				
				$elem.append($anchor);
				$elem.append(' / ');
			});

		},
	});
;

/*
 The FileBrowser type manages:
 - a file system manager instance (provided by the application)
 - a current location
 - a list of that location's contents
 - display and filtering data
 */
function FileBrowser($rootElem, fileSystemManager, initializer) {
  // Make sure $rootElem really is a jQuery instance
  if (!$rootElem.prop)
    $rootElem = jQuery($rootElem);

  // Make sure we have the correct root element
  this.rootElem = ($rootElem.prop('id') == 'indriui') ? $rootElem : $rootElem.find('#indriui').first();
  this.fsm = fileSystemManager;

  this._initialize(initializer);
}

FileBrowser.attach = function($rootElem, fileSystemManager, initializer) {
  return new FileBrowser($rootElem, fileSystemManager, initializer);
}

FileBrowser.prototype = {
  currentLocation: {},
  currentContents: {},
  allowItemSelection: true,
  allowMultipleSelection: false,
  allowDirsInResults: false,
  currentSelection: [],
  filter: null,
  sorter: null,
  locationRenderer: null,
  contentRenderer: null,
  statusRenderer: null,
  previewRenderer: null,
  shortcutsRenderer: null,
  resultCallback: null,
  nextClientId: 0,
  /*
   Primary API
   */
  navigateToRoot: function() {
    this.fsm.getRootLocation(this._makeCallback(this.navigateToLocation), this._makeCallback(this._updateStatus));
  },
  navigateToLocation: function(location) {
    var success = this._makeCallback(function(contents, status) {
      this._updateLocation(location);
      this._updateContents(contents, status);
    });
    this.fsm.getContents(location, success, this._makeCallback(this._updateStatus));
  },
  navigateRelative: function(direction) {
    this.fsm.getRelativeLocation(this.currentLocation, direction, this._makeCallback(this.navigateToLocation));
  },
  clearSelection: function() {
    this.currentSelection.length = 0;
    this._selectionChanged();
  },
  createFolder: function() {
    var success = this._makeCallback(function(newContents, status) {
      this._modifyContents(newContents, false, status);
      this._beginEditingContentItem(newContents[0]);
    });

    this.fsm.createFolder(this.currentLocation, IndriText.NEW_FOLDER_TEXT, success, this._makeCallback(this._updateStatus));
  },
  renameItem: function(contentItem, newName) {
    var success = this._makeCallback(function(renamedContent, status) {
      // Remove the file with the old name from the currentContents
      this._modifyContents([contentItem], true, status);
      this._modifyContents(renamedContent, false, status);
    });

    this.fsm.renameItem(contentItem, newName, success, this._makeCallback(this._updateStatus));
  },
  deleteSelected: function() {
    var targets = this.currentSelection;
    var success = this._makeCallback(function(deletedContents, status) {
      this._modifyContents(targets, true, status);
    });
    this.fsm.deleteItems(this.currentSelection, success, this._makeCallback(this._updateStatus));
  },
  /*
   Internal methods
   */
  _updateLocation: function(location) {
    this.currentLocation = location;

    if (this.locationRenderer) {
      this.locationRenderer.render(this._getUiElem(this.uiNames.location), this.currentLocation, this._makeCallback(this.navigateToLocation));
    }
    else {
      this._getUiElem(this.uiNames.location).html(this.currentLocation);
    }
  },
  _modifyContents: function(items, isDelete, status) {
    items.forEach(function(item) {
      if (isDelete)
        delete this.currentContents[item.clientId];
      else {
        // Set the clientId of the item if it is new
        if (typeof item.clientId == 'undefined') {
          item.clientId = this.nextClientId++;
        }
        this.currentContents[item.clientId] = item;
      }

    }, this);

    this.currentSelection.length = 0;
    if (!isDelete)
      this.currentSelection.push(items[0]);


    this._populateContentUI();
    this._updateStatus(status);
  },
  _updateContents: function(contents, status) {
    this.currentContents = {};
    this.nextClientId = 0;
    contents.forEach(function(contentItem) {
      contentItem.clientId = this.nextClientId++;
      this.currentContents[contentItem.clientId] = contentItem;
    }, this);
    this.currentSelection.length = 0;

    this._populateContentUI();
    this._updateStatus(status);
  },
  _populateContentUI: function() {
    // apply filter and sorter
    var contents = [];
    for (contentId in this.currentContents) {
      contents.push(this.currentContents[contentId]);
    }
    var contents = this._applySorter(this._applyFilter(contents));

    // use view to populate UI
    this._getUiElem(this.uiNames.contentsPanel).empty().append(this.contentRenderer.render(contents, this._makeCallback(this._handleContentEvent)));
    this._selectionChanged();
  },
  _handleContentEvent: function(contentItem, evt, newName) {
    if (evt == "clear") {
      this.clearSelection();
    }
    else if (evt == "rename") {
      this.renameItem(contentItem, newName);
    }
    else if (evt.type == "dblclick") {
      if (contentItem.isDir) {
        this.navigateToLocation(contentItem.location);
      }
      else {
        this._applySelectionToItem(contentItem, evt.metaKey);
        this._returnResults(true);
      }
    }
    else if (evt.type == "click") {
      this._applySelectionToItem(contentItem, evt.metaKey);
    }
  },
  _handleKeyEvent: function(evt) {
    // TODO 2

    // catch "delete" evt
    if (evt == "delete") {

      // fire deleteSelected
      this.deleteSelected();
    }

    // catch "enter" evt
    else if (evt == "enter") {
      var contentItem = this.currentSelection[0];
      if (contentItem) {
        if (contentItem.isDir) {
          this.navigateToLocation(contentItem.location);
        }
        else {
          this._applySelectionToItem(contentItem, evt.metaKey);
          this._returnResults(true);
        }
      }
    }
  },
  _beginEditingContentItem: function(contentItem) {
    if (!contentItem && this.currentSelection.length) {
      contentItem = this.currentSelection[0];
    }

    if (contentItem) {
      this.contentRenderer.editItem(contentItem);
    }
  },
  _updateShortcuts: function(callback) {
    if (!callback) {
      callback = this._makeCallback(this._populateShortcuts);
    }

    this.shortcuts = [];
    this.fsm.getShortcuts(callback, this._makeCallback(this._updateStatus));
  },
  _populateShortcuts: function(shortcuts) {
    if (this.shortcutsRenderer) {
      this._getUiElem(this.uiNames.shortcutsPanel).empty().append(
              this.shortcutsRenderer.render(shortcuts, this._makeCallback(this.navigateToLocation)));
    }
  },
  _updateStatus: function(status) {
    if (this.statusRenderer) {
      this.statusRenderer.render(this._getUiElem(this.uiNames.status), status);
    }
    else {
      this._getUiElem(this.uiNames.status).html(status);
    }
  },
  // Component callbacks/support
  _setRenderer: function(renderer) {
    this.contentRenderer = renderer;
    renderer.browser = this;
    renderer.callback = this._makeCallback(this._handleContentEvent);
    renderer.lookup = {};

    this._populateContentUI();
  },
  _applySelectionToItem: function(contentItem, metaKey) {
    var includeInSelection = this.allowItemSelection || contentItem.isDir;

    // See if the item is already in the selection
    var index = jQuery.inArray(contentItem, this.currentSelection);

    // If we're doing a multiselect
    if (metaKey && this.allowMultipleSelection) {
      // add or remove the item from currentSelection as needed
      if (index == -1) {
        if (includeInSelection) {
          this.currentSelection.push(contentItem);
        }
      }
      else {
        this.currentSelection.splice(index, 1);
      }
    }
    else {
      // Otherwise, replace the selection with the new item
      this.currentSelection.length = 0;
      if (includeInSelection) {
        this.currentSelection.push(contentItem);
      }
    }

    // Pass the contentItem if we didn't add it to the selection list
    this._selectionChanged(includeInSelection ? null : contentItem);
  },
  // Take a parameter and include it in the text field content
  _selectionChanged: function(unincludedItem) {
    // Have the content renderer update the content area
    this.contentRenderer.updateSelection(this.currentSelection);

    // Fill in the selected names
    var filenameText = '';
    var prefix = '';

    this.currentSelection.forEach(function(selectedItem) {
      filenameText += prefix + selectedItem.name;
      prefix = ';';
    });
    if (unincludedItem) {
      filenameText += prefix + unincludedItem.name;
    }

    this._getUiElem(this.uiNames.filename).val(filenameText);

    // Enabled/disable the buttons
    this._setEnabled(this.uiNames.delete, this.currentSelection.length != 0);
    this._setEnabled(this.uiNames.rename, this.currentSelection.length == 1);
    this._setEnabled(this.uiNames.accept, (this._getResults().length != 0) || unincludedItem);

    if (this.previewRenderer) {
      this._getUiElem(this.uiNames.previewWrapper).empty().append(this.previewRenderer.render(this.currentSelection));
    }
  },
  _filterChanged: function() {
    this.currentSelection.length = 0;
    this._populateContentUI();
  },
  _applyFilter: function(items) {
    return this.filter ? this.filter.apply(items) : items;
  },
  _sortChanged: function() {
    this._populateContentUI();
  },
  _applySorter: function(items) {
    return this.sorter ? this.sorter.apply(items) : items;
  },
  _makeCallback: function(callback) {
    var fileBrowser = this;
    return function() {
      return callback.apply(fileBrowser, arguments);
    }
  },
  // Get results set from current selection
  _getResults: function() {
    var results = [];
    this.currentSelection.forEach(function(selectedItem) {
      if (this.allowDirsInResults || !selectedItem.isDir) {
        results.push(selectedItem);
      }
    }, this);
    return results;
  },
  _returnResults: function(returnValue) {
    this.resultCallback({
      success: returnValue,
      location: this.currentLocation,
      selection: this._getResults(),
      filename: this._getUiElem(this.uiNames.filename).val()
    });
  },
  // Initialization methods
  _initialize: function(initializer) {
    var indriMain = this;
    if (!initializer) {
      initializer = new this.DefaultInitializer();
    }

    for (textItem in initializer.texts) {
      this._getUiElem(this.uiNames[textItem]).html(initializer.texts[textItem]);
    }

    for (visibility in initializer.visibility) {
      this._setVisible(this.uiNames[visibility], initializer.visibility[visibility]);
    }

    this.currentLocation = {};
    this.currentContents = {};
    this.currentSelection = [];

    this.allowItemSelection = initializer.allowItemSelection;
    this.allowMultipleSelection = initializer.allowMultipleSelection;
    this.allowDirsInResults = initializer.allowDirsInResults;

    this.sorter = initializer.sorter;
    this.sorter.browser = this;

    this.locationRenderer = initializer.locationRenderer;
    this.statusRenderer = initializer.statusRenderer;
    this.previewRenderer = initializer.previewRenderer;
    this.shortcutsRenderer = initializer.shortcutsRenderer;
    this.resultCallback = initializer.resultCallback;

    this._initializeFiltering(initializer.filter);
    this._initializeViews(initializer.viewFactory);

    // Standard event handlers
    var fileBrowser = this;
    this._getUiElem(this.uiNames.parent).click(function() {
      fileBrowser.navigateRelative("parent");
    });
    this._getUiElem(this.uiNames.refresh).click(function() {
      fileBrowser.navigateToLocation(fileBrowser.currentLocation);
    });
    // Clear the selection if the user clicks away from any content item
    this._getUiElem(this.uiNames.contentsPanel).click(function(evt) {
      if (evt.toElement == this) {
        fileBrowser.clearSelection();
      }
    });
    // Update the accept button enabled state when the user types in the filename field
    this._getUiElem(this.uiNames.filename).keyup(function() {
      console.log(jQuery(this).val());
      fileBrowser._setEnabled(fileBrowser.uiNames.accept, (fileBrowser._getResults().length != 0) || (jQuery(this).val() != ''));
    });
    
    this._getUiElem(this.uiNames.filename).blur(function() {
      jQuery(indriMain._getUiElem(indriMain.uiNames.focusTextbox)).focus();
    });
    
    this._getUiElem(this.uiNames.preview).click(function() {
      fileBrowser._toggleVisible(fileBrowser.uiNames.previewWrapper);
    });
    this._getUiElem(this.uiNames.shortcuts).click(function() {
      fileBrowser._toggleVisible(fileBrowser.uiNames.shortcutsPanel);
    });
    this._getUiElem(this.uiNames.delete).click(function() {
      fileBrowser.deleteSelected();
    });
    this._getUiElem(this.uiNames.newFolder).click(function() {
      fileBrowser.createFolder();
    });
    this._getUiElem(this.uiNames.rename).click(function() {
      fileBrowser._beginEditingContentItem();
    });
    this._getUiElem(this.uiNames.accept).click(function() {
      fileBrowser._returnResults(true);
    });
    this._getUiElem(this.uiNames.cancel).click(function() {
      fileBrowser._returnResults(false);
    });

    if (initializer.visibility['shortcutsPanel']) {
      this._updateShortcuts(this._makeCallback(function(shortcuts) {
        this._populateShortcuts(shortcuts);
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

    // Bind key handler
    jQuery(jQuery("#indriui").parent()).on("keydown", this, initializer.viewFactory.views[0].keyHandler);
    
    jQuery(this.uiNames.focusTextbox).focus();

    jQuery(indriMain.uiNames.contentsPanel + ', ' + indriMain.uiNames.headerWrapper).click(function() {
      jQuery(indriMain.uiNames.focusTextbox).focus();
    });


  },
  _initializeFiltering: function(filter) {
    // set the data member
    this.filter = filter;

    // add selector to the dom
    this._getUiElem(this.uiNames.filter).empty().append(this.filter.render(this._makeCallback(this._filterChanged)));
  },
  _initializeViews: function(viewFactory) {
    viewFactory.render(this._makeCallback(function(view) {
      this._setRenderer(view);
    }), this._getUiElem(this.uiNames.viewsPanel));
  },
  // UI Accessors
  uiNames: {
    title: '#title-control',
    shortcuts: '#shortcuts-control',
    parent: '#parent-control',
    refresh: '#refresh-control',
    location: '#location-control',
    viewsPanel: '#views-panel',
    preview: '#preview-control',
    shortcutsPanel: "#shortcuts-wrapper",
    headerWrapper: "#header-wrapper",
    contentsWrapper: '#contents-wrapper',
    contentsPanel: '#contents-panel',
    previewWrapper: "#preview-wrapper",
    newFolder: '#newfolder-control',
    delete: '#delete-control',
    rename: '#rename-control',
    status: '#status-control',
    filter: '#filters-panel',
    filename: "#filename-control",
    filenameLabel: "#filename-label-control",
    accept: '#accept-control',
    cancel: '#cancel-control',
    focusTextbox: '#ind-focus-textbox'
  },
  _getUiElem: function(name) {
    return this.rootElem.find(name);
  },
  _setVisible: function(name, isVisible) {
    var displayMode = isVisible ? '' : 'none';
    this._getUiElem(name).css('display', displayMode);

    // Some special cases for the shortcuts and preview panels
    // TODO There should be a more systematic way to do this
    if (name == this.uiNames.previewWrapper || name == this.uiNames.shortcutsPanel) {
      var controlName = name == this.uiNames.previewWrapper ? this.uiNames.preview : this.uiNames.shortcuts;
      var className = name == this.uiNames.previewWrapper ? "ind-show-preview" : "ind-show-shortcuts";

      if (isVisible) {
        this._getUiElem(this.uiNames.contentsWrapper).addClass(className);
        this._getUiElem(controlName).addClass("ind-btn-active");
      }
      else {
        this._getUiElem(this.uiNames.contentsWrapper).removeClass(className);
        this._getUiElem(controlName).removeClass("ind-btn-active ");
      }
    }

    if (name == this.uiNames.shortcutsPanel) {
      this._updateShortcuts();
    }

    // If we hide the filename, also hide the label
    if (name == this.uiNames.filename) {
      this._getUiElem(this.uiNames.filenameLabel).css('display', displayMode);
    }
  },
  _toggleVisible: function(name) {
    this._setVisible(name, this._getUiElem(name).css('display') == 'none');
  },
  _setEnabled: function(name, isEnabled) {
    var $uiElem = this._getUiElem(name);

    if (isEnabled) {
      $uiElem.removeAttr('disabled');
      $uiElem.removeClass("ind-btn-dis");
    }
    else {
      $uiElem.attr('disabled', 'true');
      $uiElem.addClass("ind-btn-dis");
    }
  },
};


FileBrowser.prototype.DefaultInitializer = {
  texts: {
    title: "FileChooser",
    accept: "OK",
    cancel: "Cancel",
  },
  visibility: {
    previewWrapper: false,
    shortcutsPanel: false,
    newFolder: false,
    delete: false,
    rename: false,
    filename: false,
    filter: false,
  },
  directoriesOnly: false,
  allowMultipleSelection: false,
  // fileMustExist : false,

  sorter: {
    fieldName: "name",
    ascending: true,
    apply: function(items) {
      if (this.fieldName) {
        var fieldName = this.fieldName;
        var inverter = this.ascending ? 1 : -1;

        return items.sort(function(a, b) {
          var aValue = a[fieldName], bValue = b[fieldName];
          if (aValue == bValue)
            return 0;

          if (!aValue) {
            return -1 * inverter;
          }

          if (!bValue) {
            return 1 * inverter;
          }

          if (aValue.toLowerCase && bValue.toLowerCase) {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
          return aValue < bValue ? -1 * inverter : 1 * inverter;
        });
      }

      return items;
    },
    setSortField: function(fieldName) {
      if (this.fieldName == fieldName) {
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
  filter: {
    options: [
      {value: ".*", text: "All files (*.*)"},
    ],
    _selectedFilter: null,
    apply: function(items) {
      var filter = this._selectedFilter;
      var filteredItems = items.filter(function(item) {
        return item.isDir || item.name.match(filter);
      }, this.options);

      return filteredItems;
    },
    render: function(callback) {
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
  viewFactory: {
    views: [
      new ListContentRenderer(),
    ],
    render: function(callback, container) {
      if (container) {
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

        if (btnId == 0) {
          $anchor.addClass('ind-btn-active');
        }

        if (view.img) {
          $anchor.append(jQuery(document.createElement("img")).attr('src', view.img));
        }
        else if (view.text) {
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
  locationRenderer: new StringLocationRenderer(),
  statusRenderer: {
    render: function(elem, status) {
      elem.html("<strong>" + status + "</strong>");
    }
  },
  previewRenderer: {
    render: function(selection) {
      if (selection.length == 0) {
        return jQuery(document.createElement("span")).html("No items selected");
      }
      else if (selection.length > 1) {
        return jQuery(document.createElement("span")).html("Multiple items selected");
      }
      else if (selection[0].previewUrl == null) {
        return jQuery(document.createElement("span")).html("No preview available");
      }
      else {
        return jQuery(document.createElement("img")).attr("src", selection[0].previewUrl);
      }
    },
  },
  shortcutsRenderer: {
    render: function(shortcuts, callback) {
      var $listContainer = jQuery(document.createElement("ul")).addClass("ind-shortcut-list");
      shortcuts.forEach(function(shortcut) {
        var $label = jQuery(document.createElement("span")).addClass("ind-shortcut-name").html(shortcut.name);
        var $listItem = jQuery(document.createElement("li")).addClass("ind-listitem ind-shortcut-item").append($label);
        $listItem.click($listItem, function(evt) {
          if (evt.which == 1) {
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
  resultCallback: function(results) {
    console.log(results);
  }
};

FileBrowser.prototype.DebugDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {
  allowItemSelection: true,
  allowMultipleSelection: true,
  allowDirsInResults: false,
  texts: {
    title: "Test Dialog",
  },
  visibility: {
    previewWrapper: true,
    shortcutsPanel: true,
    newFolder: true,
    delete: true,
    rename: true,
    filename: true,
    filter: true,
  },
});

FileBrowser.prototype.SaveDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {
  // This combination copies item names to the text field on selection, but doesn't
  // maintain the selection in the ui. Whatever text ends up in the text field is what 
  // we use to build the result
  allowItemSelection: false,
  allowMultipleSelection: false,
  allowDirsInResults: false,
  texts: {
    title: "Save File",
    accept: "Save",
    cancel: "Cancel",
  },
  visibility: {
    previewWrapper: false,
    shortcutsPanel: false,
    newFolder: true,
    delete: true,
    rename: true,
    filename: true
  },
});


FileBrowser.prototype.OpenDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {
  // Let the user select any number of existing items
  allowItemSelection: true,
  allowMultipleSelection: true,
  allowDirsInResults: false,
  texts: {
    title: "Open File(s)",
    accept: "Open",
    cancel: "Cancel",
  },
  visibility: {
    previewWrapper: true,
    shortcutsPanel: false,
    filter: true,
  },
});

// TODO hide the filename, and add a filter to only show folders
FileBrowser.prototype.DestinationDialogInitializer = jQuery.extend(true, {}, FileBrowser.prototype.DefaultInitializer, {
  // Let the user select one director
  allowItemSelection: false,
  allowMultipleSelection: false,
  allowDirsInResults: true,
  texts: {
    title: "Select Target Folder",
    accept: "Select",
    cancel: "Cancel",
  },
  visibility: {
    previewWrapper: false,
    shortcutsPanel: true,
    filter: false,
    delete: true,
    rename: true,
    filename: false,
    newFolder: true
  },
  // Put custom filter object here.  Must have apply & render methods.
  //   - render would be empty (don't need to show since we are only showing directories, no options there...)
  //   - apply -> if isDir, then keep, otherwise discard

  filter: {
    apply: function(items) {
      var filteredItems = items.filter(function(item) {
        return item.isDir;
      });

      return filteredItems;
    },
    render: function() {
      // Do not need to render anything.
    }
  }
});
