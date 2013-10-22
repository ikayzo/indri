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
    var data = { action: "shortcuts" };
    this._doQuery(data, success, error);
  },

  getRootLocation : function(success, error) {
    var data = { action: "navigate", direction: "home" };    
    this._doQuery(data, success, error);
  },

  getRelativeLocation : function(fsItem, direction, success, error) {
    var data = { action: "navigate", direction: direction, fsItem: this._encodeFsItem(fsItem) };
    this._doQuery(data, success, error);
  },

  getContents : function(fsItem, success, error) {
    var data = { action: "browse", fsItem: this._encodeFsItem(fsItem) };
    this._doQuery(data, success, error);
  },

  deleteItems : function(fsItems, success, error) {
    var encodedFsItems = [];
    fsItems.forEach(function(fsItem) {
      encodedFsItems.push(this._encodeFsItem(fsItem));
    }, this);
    var data = { action: "delete", fsItems: JSON.stringify(encodedFsItems) };
    this._doQuery(data, success, error);
  },

  renameItem : function(fsItem, newName, success, error) {
    var data = { action: "rename", newName: newName, fsItem: this._encodeFsItem(fsItem) };
    this._doQuery(data, success, error);
  },

  createFolder : function(fsItem, name, success, error) {
    var data = { action: "makedir", name: name, fsItem: this._encodeFsItem(fsItem) };
    this._doQuery(data, success, error);
  },

  _doQuery : function(data, success, error) {

    // Disable ajax caching for IE
    jQuery.ajaxSetup({
      cache : false
    });

    jQuery.getJSON(this.rootUrl, data, function(result, textStatus, jqXHR) {
      if (result.error) {
        error(result.error);
      } else {
        success(result, textStatus);
      }
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.log("FSM Error:", textStatus);
      if (error) {
        error("FSM Error: " + textStatus);
      }
    });
  },

  _encodeFsItem : function(fsItem) {
    fsItem = fsItem || {};
    return JSON.stringify(fsItem);
  }
}
