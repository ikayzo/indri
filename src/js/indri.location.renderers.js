/*
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
		render : function(elem, fsItem) {      
      fsItem = JSON.parse(fsItem.location);
			elem.html(fsItem.toString());
		},
	});


function SegmentedLocationRenderer() {}
SegmentedLocationRenderer.prototype = jQuery.extend({}, {
		render : function($elem, fsItem, callback) {
			if(fsItem.location) {
				fsItem = JSON.parse(fsItem.location);
			}
			else {
				fsItem = IndriPaths.ROOT_PATH;
			}

			var parts = splitPath(fsItem, IndriPaths.SEPARATOR);
      
			$elem.empty();

			// Handle the root path case
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html("(root)").addClass('ind-location-segment');
			// Only add the click handler to the root path if there weren't any other segments
			if(!isEmptyPath) {
				$rootAnchor.click({ location: JSON.stringify(IndriPaths.ROOT_PATH)}, function(evt) {
					callback(evt.data);
				});
			}
			$elem.append($rootAnchor);

			// Add each other path component
			var fullPath = '';
			parts.forEach(function(segment, index) {
				$elem.append('<span class="ind-location-divider">&#62;</span>');
				fullPath += IndriPaths.SEPARATOR + segment;

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click({ location : JSON.stringify(fullPath) }, function(evt) {
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
		render : function($elem, fsItem, callback) {
			if(!fsItem || !fsItem.location) {
				return;
			}

			var bucketData = JSON.parse(fsItem.location);

			var parts = splitPath(bucketData.key, IndriPaths.SEPARATOR);
			var targetLocation = { bucket: bucketData.bucket, key : '' };
			
			$elem.empty();

			// Create root link
			var isEmptyPath = (parts.length == 0);
			var $rootAnchor = jQuery(document.createElement(isEmptyPath ? "span" : "a")).html(bucketData.bucket).addClass('ind-location-segment');
			if(!isEmptyPath) {
				$rootAnchor.click({ location: JSON.stringify(targetLocation) }, function(evt) {
					callback(evt.data);
				});
			}
			$elem.append($rootAnchor);

			$elem.append(' : ');

			// Add all other links
			parts.forEach(function(segment, index) {
				targetLocation.key += segment + IndriPaths.SEPARATOR;

				var isLastSegment = (index == parts.length - 1);
				var $anchor = jQuery(document.createElement(isLastSegment ? "span" : "a")).html(segment).addClass('ind-location-segment');

				// Only add a click handler if this isn't the last segment
				if(!isLastSegment) {
					$anchor.click({ location: JSON.stringify(targetLocation) }, function(evt) {
						callback(evt.data);
					});
				}
				
				$elem.append($anchor);
				$elem.append(' / ');
			});
		},
	});
