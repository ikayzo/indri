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

	_beginRender : function() {
		this.lookup = {};
	},

	_setupEditingEvents : function($listItem, contentItem) {
		var oldText, newText;
		
		var $editable = $listItem.find(".ind-editable-name");
		oldText = $editable.html().replace(/"/g, "'");  

		$input = jQuery(document.createElement("input")).addClass("ind-editbox").attr("type", "text").attr("value", oldText)
			.keypress(this, function(evt) {
				if(evt.which == 13) {
		    		newText = $(this).val().replace(/"/g, "'");  
		            
		            $editable.html(newText);
		    		$input.replaceWith($editable);
		    		evt.data._setupNormalEvents($listItem, contentItem);

		    		evt.data.callback(contentItem, "rename", newText);
                }
	    	}).blur(this, function(evt) {
	    		$input.replaceWith($editable);  
	    		evt.data._setupNormalEvents($listItem, contentItem);
	    	}).click(false).dblclick(false);

		$editable.replaceWith($input);
		$input.focus();
	},

	_setupNormalEvents : function($listItem, contentItem) {
		$listItem.off("dblclick").on("dblclick", this, function(evt) {
			if(evt.which == 1) {
				evt.data.callback(contentItem, evt);
			}
		}).off("click").on("click", this, function(evt) {
			if(evt.which == 1) {
				evt.data.callback(contentItem, evt);
			}
		});

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
	},

	_getIcon : function(contentItem, size) {
		if(!size) {
			size = "default"
		}
		var typeName = contentItem.isDir ? "folder" : "file";

		return "img/" + size + "_" + typeName + "_icon.png";
	},	
}