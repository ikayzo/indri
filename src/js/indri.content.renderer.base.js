function ContentRenderer() {
}

ContentRenderer.prototype = {

	render : function(contents) {
		this._beginRender();

		$list = this._renderContainer();
		contents.forEach(function(contentItem) { 
			$list.append(this._renderItem(contentItem));
		}, this);

		return $list;
	},
	
	updateSelection : function(newSelection) {
		for(id in this.lookup) {
			this.lookup[id].removeClass("ind-content-selected");
		}

		newSelection.forEach(function(selectedItem) {
			this.lookup[selectedItem.id].addClass("ind-content-selected");
		}, this);
	},

	editItem : function(contentItem) {
		var $listItem = this.lookup[contentItem.id];
		if($listItem) {
			this._setupEditingEvents($listItem, contentItem);
		}
	},

	_beginRender : function() {
		this.lookup = {};
	},

	_initItem : function($listItem, contentItem) {
		this.lookup[contentItem.id] = $listItem;
		this._setupNormalEvents($listItem, contentItem);
	},

	_setupEditingEvents : function($listItem, contentItem) {
		var oldText, newText;
		
		var $editable = $listItem.find(".ind-editable-name");
		oldText = $editable.html().replace(/"/g, "'");  

		var endEditing = function(renderer) {
    		$input.replaceWith($editable);  
    		renderer._setupNormalEvents($listItem, contentItem);                	
		};

		$input = jQuery(document.createElement("input")).addClass("ind-editbox").attr("type", "text").attr("value", oldText)
			.keyup(this, function(evt) {
				if(evt.which == KeyEvent.KEYCODE_ENTER) {
		    		newText = $(this).val().replace(/"/g, "'");  
		            
		            $editable.html(newText);
		    		$input.replaceWith($editable);
		    		evt.data._setupNormalEvents($listItem, contentItem);

		    		evt.data.callback(contentItem, "rename", newText);
                }
                else if(evt.which == KeyEvent.KEYCODE_ESC) {
		    		endEditing(evt.data);               	
                }
	    	}).blur(this, function(evt) {
	    		endEditing(evt.data);               	
	    	}).click(false).dblclick(false);

		$editable.replaceWith($input);
		$input.focus();
	},

	_setupNormalEvents : function($listItem, contentItem) {
		$listItem.off("click").on("click", this, function(evt) {
			if(evt.which == MouseButtons.BUTTON_LEFT) {
				evt.data.callback(contentItem, evt);
			}
		});

		if(!contentItem.isDir) {
			$listItem.off("dblclick").on("dblclick", this, function(evt) {
				if(evt.which == MouseButtons.BUTTON_LEFT) {
					evt.data.callback(contentItem, evt);
				}
			});
		}

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

	_getIcon : function(contentItem) {
		$icon = jQuery(document.createElement("span")).addClass("entypo");
		if(contentItem.isDir) {
			$icon.addClass('icon-folder').html(IndriIcons.ICON_FOLDER);
		}
		else {
			$icon.addClass('icon-file').html(IndriIcons.ICON_DOCUMENT);
		}
		
		return $icon;
	}	
}