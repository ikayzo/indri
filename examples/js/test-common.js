/*
	Dialog test page helper javascript
*/

function getDialogInitializer(defaults) {
	var initializer = jQuery.extend(true, {}, defaults);

	// Standard settings
	initializer.filter.options.push({ value: "\.(htm|html)$", text: "HTML files (*.htm, *.html)"});
	initializer.filter.options.push({ value: "\.js$", text: "Javascript files (*.js)"});
	initializer.filter.options.push({ value: "\.(jpg|png)", text: "Image files (*.jpg, *.png)"});

	initializer.viewFactory.views.push(new IconContentRenderer());
	initializer.viewFactory.views.push(new DetailContentRenderer());

	// Settings for talking to the heroku app
	initializer.locationRenderer = new SegmentedLocationRenderer();
	initializer.visibility.shortcutsPanel = true;
	initializer.previewRenderer.baseUrl = 'http://indri-filesystem.herokuapp.com/';

	console.log(initializer);
	return initializer;
}
