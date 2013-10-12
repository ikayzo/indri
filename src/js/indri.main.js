

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

    // Using both meta (Mac command key) and ctrl key (Windows) as a temporary solution.
    // How do you get the meta key to fire on Windows?
    var multipleSelectKey = evt.metaKey || evt.ctrlKey;

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
        this._applySelectionToItem(contentItem, multipleSelectKey);
        this._returnResults(true);
      }
    }
    else if (evt.type == "click") {

      this._applySelectionToItem(contentItem, multipleSelectKey);
    }
  },
  _handleKeyEvent: function(evt) {
    // catch "delete" evt
    if (evt == "delete") {

      // fire deleteSelected
      this.deleteSelected();
    }

    // catch "enter" evt
    else if (evt == "enter") {
      var contentItem = this.currentSelection[0];
      if (contentItem) {
        
        // Navigate to the directory if directories cannot be in the results
        if (!this.allowDirsInResults && contentItem.isDir) {
          this.navigateToLocation(contentItem.location);
        }
        else {
          this._returnResults(true);
        }
      }
      else if(this.selectCurrentDir) {
        this._returnResults(true);
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
    if (!this.selectCurrentDir) {
      this._setEnabled(this.uiNames.accept, (this._getResults().length != 0) || unincludedItem);
    }

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
  _getDirResults: function(returnValue) {
    var results = this._getResults();
    if (results.length == 0) {
      this._getCurrentDir(returnValue);
    }
    else {
      this.resultCallback({
        success: returnValue,
        location: this.currentLocation,
        selection: results,
        filename: this._getUiElem(this.uiNames.filename).val()
      });
    }
  },
  _getCurrentDir: function(returnValue) {
    var indriMain = this;
    var currentDir = this.currentLocation.replace(/\//g, "\\\\");
    var results = [];
    var pushCurrentDir = function(location) {
      var success = indriMain._makeCallback(function(contents, status) {
        contents.forEach(function(element) {
          if (element.location == currentDir) {
            results.push(element);
          }
        });

        indriMain.resultCallback({
          success: returnValue,
          location: indriMain.currentLocation,
          selection: results,
          filename: indriMain._getUiElem(this.uiNames.filename).val()
        });
      });

      indriMain.fsm.getContents(location, success, null);
    };
    this.fsm.getRelativeLocation(this.currentLocation, "parent", this._makeCallback(pushCurrentDir));
    return results;
  },
  _returnResults: function(returnValue) {
    
    // If the current directory can be selected, we need to use the special callback
    // based version of the getResults method.
    if (this.selectCurrentDir) {
      this._getDirResults(returnValue);
    }
    else {
      this.resultCallback({
        success: returnValue,
        location: this.currentLocation,
        selection: this._getResults(),
        filename: this._getUiElem(this.uiNames.filename).val()
      });
    }
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
    this.selectCurrentDir = initializer.selectCurrentDir;

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

    // Leave the accept button active if the user can select directories
    if (this.allowDirsInResults) {
      fileBrowser._setEnabled(fileBrowser.uiNames.accept, true);
    }
    else {
      // Update the accept button enabled state when the user types in the filename field
      this._getUiElem(this.uiNames.filename).keyup(function() {
        console.log(jQuery(this).val());
        fileBrowser._setEnabled(fileBrowser.uiNames.accept, (fileBrowser._getResults().length != 0) || (jQuery(this).val() != ''));
      });
    }

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
    jQuery("#indriui").on("keydown", this, initializer.viewFactory.views[0].keyHandler);

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
  
  // If the file browser will allow the user to select
  // the current directory as the default (nothing selected).
  selectCurrentDir: false,
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
  // Let the user select one directory
  allowItemSelection: false,
  allowMultipleSelection: false,
  allowDirsInResults: true,
  selectCurrentDir: true,
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
