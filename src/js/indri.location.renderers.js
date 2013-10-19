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
		render : function(elem, location) {
			if(location.serverData) {
				location = JSON.parse(location.serverData);
			}

			elem.html(location.toString());
		},
	});


function SegmentedLocationRenderer() {}
SegmentedLocationRenderer.prototype = jQuery.extend({}, {
		render : function($elem, location, callback) {
			if(location.location) {
				location = JSON.parse(location.location).replace(/\\/g, "/");
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
				$rootAnchor.click({ location: JSON.stringify('/')}, function(evt) {
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
