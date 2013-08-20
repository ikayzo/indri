/*
	Standard location renderers
*/

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

			$elem.empty();

			// Handle the root path case
			var $rootAnchor = jQuery(document.createElement("a")).html("(root)").addClass('ind-location-segment');
			$elem.append($rootAnchor);

			// Add each other path component
			var fullPath = '';
			location.split('/').forEach(function(segment, index, segments) {
				if(segment.length) {
					$elem.append(' / ');
					fullPath += '/' + segment;

					var $anchor = jQuery(document.createElement("a")).html(segment).addClass('ind-location-segment');

					// Only add a click handler if this isn't the last segment
					if(index != segments.length - 1) {
						$anchor.click(JSON.stringify(fullPath), function(evt) {
							callback(evt.data);
						});
					}
					$elem.append($anchor);
				}
			});

			// Only add the click handler to the root path if there weren't any other segments
			if(fullPath != '') {
				$rootAnchor.click(JSON.stringify('/'), function(evt) {
					callback(evt.data);
				});
			}
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
			
			$elem.empty();

			// Create root link
			var $rootAnchor = jQuery(document.createElement("a")).html(bucketData.bucket).addClass('ind-location-segment');
			$elem.append($rootAnchor);

			$elem.append(' : ');

			// Add all other links
			var targetLocation = { bucket: bucketData.bucket, key : '' };
			bucketData.key.split('/').forEach(function(segment, index, segments) {
				if(segment.length) {
					targetLocation.key += segment + '/';

					var $anchor = jQuery(document.createElement("a")).html(segment).addClass('ind-location-segment');

					// Only add a click handler if this isn't the last segment
					if(index != segments.length - 1) {
						$anchor.click(JSON.stringify(targetLocation), function(evt) {
							callback(evt.data);
						});
					}
					
					$elem.append($anchor);
					$elem.append(' / ');
				}
			});

			if(targetLocation.key != '') {
				targetLocation = { bucket: bucketData.bucket, key : '' } 
				$rootAnchor.click(JSON.stringify(targetLocation), function(evt) {
					callback(evt.data);
				});
			}
		},
	});
