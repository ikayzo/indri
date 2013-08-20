/*
	Standard content renderers
*/

/*
	Displays the content items as a multi-column list with small icons
*/
function ListContentRenderer() {
	// List View
	this.name = "List";
	this.text = "&#9776;"
}
ListContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {
		_renderContainer : function() {
			return jQuery(document.createElement("ul")).addClass("ind-filelist").click(this, function(evt) { 
				if(evt.toElement == this) evt.data.callback(null, 'clear');
			});
		},

		_renderItem : function(contentItem) {
			var $icon = jQuery(document.createElement("img")).attr("src", this._getIcon(contentItem, "small"));
			var $label = jQuery(document.createElement("span")).addClass("ind-editable-name").html(contentItem.name);
			var $listItem = jQuery(document.createElement("li")).addClass("ind-listitem").append($icon).append($label);
			this._initItem($listItem, contentItem);

			return $listItem;
		},
	});


/*
	Displays content as a multi-column list with preview icons
*/
function IconContentRenderer() {
	// Icon View
	this.name = "Icon";
	this.text = "&#9871;"
}
IconContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {

		_renderContainer : function() {
			return jQuery(document.createElement("ul")).addClass("ind-filelist ind-iconlist").click(this, function(evt) {
				if(evt.toElement == this) evt.data.callback(null, 'clear');
			});
		},

		_renderItem : function(contentItem) {
			var $icon = jQuery(document.createElement("img")).attr("src", this._getIcon(contentItem));
			var $label = jQuery(document.createElement("span")).addClass("ind-editable-name").html(contentItem.name);
			var $listItem = jQuery(document.createElement("li")).addClass("ind-iconitem").append($icon).append("<br>").append($label);
			this._initItem($listItem, contentItem);

			return $listItem;
		},	
	});


/*
	Displays content in a table with sortable columns
*/
function DetailContentRenderer() {
	// Detail View
	this.name = "Detail";
	this.text = "&#57349;"
}
DetailContentRenderer.prototype = jQuery.extend({}, new ContentRenderer(), {

		_renderContainer : function() {
			var $tr = jQuery(document.createElement("tr"));
			this._fieldNames.forEach(function(field) {
				var $th = jQuery(document.createElement("th")).addClass("ind-detailheader").html(field)
					.click(this, function(evt){
						if(evt.toElement == this && evt.which == 1) {
							evt.data.browser.sorter.setSortField(field);
						}
					});

				// If this is the column we're sorting by, add the appropriate class
				if(field == this.browser.sorter.fieldName) {
					$th.addClass(this.browser.sorter.ascending ? "ind-col-sort-asc" : "ind-col-sort-desc");					
				}

				$tr.append($th);
			}, this);

			return jQuery(document.createElement("table")).addClass("ind-filelist ind-detaillist")
					.append(jQuery(document.createElement("thead"))).append($tr);
		},

		_renderItem : function(contentItem) {
			var $tr = jQuery(document.createElement("tr"));

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

		_fieldNames : [ "name", "size", "created", "modified" ],

		dateFormatString : "yyyy-MM-dd, hh:mm ",
	});
