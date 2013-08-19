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

			var fullPath = '';

			$elem.empty();

			// Handle the root path case
			$elem.append(jQuery(document.createElement("a")).html("(root)").addClass('ind-location-segment').click(JSON.stringify('/'), function(evt) {
				callback(evt.data);
			}));

			// Add each other path component
			location.split('/').forEach(function(segment) {
				if(segment.length) {
					$elem.append(' / ');

					fullPath += '/' + segment;
					$elem.append(jQuery(document.createElement("a")).html(segment).addClass('ind-location-segment').click(JSON.stringify(fullPath), function(evt) {
						callback(evt.data);
					}));
				}
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
			
			$elem.empty();

			// Create root link
			var targetLocation = { bucket: bucketData.bucket, key : '' };
			$elem.append(jQuery(document.createElement("a")).html(targetLocation.bucket).addClass('ind-location-bucket').click(JSON.stringify(targetLocation), function(evt) {
				callback(evt.data);
			}));
			$elem.append(' : ');

			// Add all other links
			bucketData.key.split('/').forEach(function(segment) {
				if(segment.length) {
					targetLocation.key += segment + '/';
					$elem.append(jQuery(document.createElement("a")).html(segment).addClass('ind-location-segment').click(JSON.stringify(targetLocation), function(evt) {
						callback(evt.data);
					}));
				
					$elem.append(' / ');
				}
			});
		},
	});
