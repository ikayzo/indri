function ContentRenderer() {
}

ContentRenderer.prototype = {

	updateSelection : function(newSelection) {
		for(name in this.lookup) {
			this.lookup[name].removeClass("fb-content-selected");
		}

		newSelection.forEach(function(selectedItem) {
			this.lookup[selectedItem.name].addClass("fb-content-selected");
		}, this);
	},

	_setupEditingEvents : function($listItem, contentItem) {
		var oldText, newText;
		
		var $editable = $listItem.find(".fb-editable-name");
		oldText = $editable.html().replace(/"/g, "'");  

		$input = jQuery(document.createElement("input")).addClass("fb-editbox").attr("type", "text").attr("value", oldText)
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
		$listItem.one("dblclick", this, function(evt) {
			if(evt.which == 1) {
				evt.data.callback(contentItem, evt);
			}
		}).one("click", this, function(evt) {
			if(evt.which == 1) {
				evt.data.callback(contentItem, evt);
			}
		});

		var pressTimer;
		$listItem.find(".fb-editable-name")
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