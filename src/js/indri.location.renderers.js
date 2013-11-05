/*
	Standard location renderers
*/

function splitPath(path, delimiter) {
	var parts = [];
	path.toString().split(delimiter).forEach(function(item) {
		if(item.length) {
			parts.push(item);
		}
	});

	return parts;
}

function StringLocationRenderer() {}
StringLocationRenderer.prototype = jQuery.extend({}, {
		render : function(fsItem) {      
				fsItem = JSON.parse(fsItem.location);
			return jQuery(document.createElement("span")).html(fsItem.toString());
		},
	});


function SegmentedLocationRenderer() {}
SegmentedLocationRenderer.prototype = jQuery.extend({}, {
		render : function(fsItem, navCallback) {
			if(fsItem.location) {
				fsItem = JSON.parse(fsItem.location);
			}
			else {
				fsItem = IndriPaths.ROOT_PATH;
			}

      var $panel = jQuery(document.createElement("div"));

			var parts = splitPath(fsItem, IndriPaths.SEPARATOR);
      
			// Handle the root path case
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html("(root)").addClass('ind-location-segment');
			// Only add the click handler to the root path if there weren't any other segments
			if(!isEmptyPath) {
				$rootAnchor.click({ location: JSON.stringify(IndriPaths.ROOT_PATH)}, function(evt) {
					navCallback(evt.data);
				});
			}
			$panel.append($rootAnchor);

			// Add each other path component
			var fullPath = '';
			parts.forEach(function(segment, index) {
				$panel.append('<span class="ind-location-divider">&#62;</span>');
				fullPath += IndriPaths.SEPARATOR + segment;

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click({ location : JSON.stringify(fullPath) }, function(evt) {
						navCallback(evt.data);
					});
				}
				$panel.append($anchor);
			});

			return $panel;
		},
	});


// { bucket: bucket, key : key }

function BucketLocationRenderer() {}
BucketLocationRenderer.prototype = jQuery.extend({}, {
		render : function(fsItem, navCallback) {
			if(!fsItem || !fsItem.location) {
				return;
			}

			var bucketData = JSON.parse(fsItem.location);

			var parts = splitPath(bucketData.key, IndriPaths.SEPARATOR);
			var targetLocation = { bucket: bucketData.bucket, key : '' };
			
      var $panel = jQuery(document.createElement("div"));

			// Create root link
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html(bucketData.bucket).addClass('ind-location-segment');
			if(!isEmptyPath) {
				$rootAnchor.click({ location: JSON.stringify(targetLocation) }, function(evt) {
					navCallback(evt.data);
				});
			}
			$panel.append($rootAnchor);

			$panel.append(' : ');

			// Add all other links
			parts.forEach(function(segment, index) {
				targetLocation.key += segment + IndriPaths.SEPARATOR;

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click({ location: JSON.stringify(targetLocation) }, function(evt) {
						navCallback(evt.data);
					});
				}
				
				$panel.append($anchor);
				$panel.append(' / ');
			});

			return $panel;
		},
	});
