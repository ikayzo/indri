/*
	Dialog test page helper javascript
*/

function getDialogInitializer(defaults) {
	var initializer = jQuery.extend(true, {}, defaults);
	initStandardExtensions(initializer);

	var fsLookup = {
		local : initLocalFileSystem,
		ikayzo : initAwsFileSystem,
		civilbeat : initCivilBeatFileSystem,
	};

	var fs = jQuery('#fileSystem').find('option:selected').val();
	fsLookup[fs](initializer);

	console.log(initializer);
	return initializer;

	function initStandardExtensions(initializer) {
		initializer.filter.options.push({ value: "\.(htm|html)$", text: "HTML files (*.htm, *.html)"});
		initializer.filter.options.push({ value: "\.js$", text: "Javascript files (*.js)"});
		initializer.filter.options.push({ value: "\.(jpg|png)", text: "Image files (*.jpg, *.png)"});

		initializer.viewFactory.views.push(new IconContentRenderer());
		initializer.viewFactory.views.push(new DetailContentRenderer());
	}

	function initLocalFileSystem(initializer) {
		initializer.locationRenderer = new SegmentedLocationRenderer();
		initializer.visibility.shortcutsPanel = true;
		initializer.previewRenderer.baseUrl = 'http://indri-filesystem.herokuapp.com/';
	}

	function initAwsFileSystem(initializer) {
		initializer.visibility.shortcutsPanel = true;

		initializer.locationRenderer = new BucketLocationRenderer();

	}

	function initCivilBeatFileSystem(initializer) {
		initializer.visibility.shortcutsPanel = true;

		initializer.locationRenderer = new BucketLocationRenderer();

		initializer.previewRenderer.baseUrl = 'http://civilbeat_production.s3.amazonaws.com/';
	}
}