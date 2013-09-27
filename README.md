Indri
=====

Indri is a client-side web file dialog for selecting file or specifying a destination in a remote file repository. It can be styled to integrate with web applications, and provides full configuration through rendering and file system plugins.

### Getting Started

The Indri distribution comes with example files that show how Indri may be used with various popular frameworks. To view the files, make the `indri/examples` available via an HTTP server and browse to any of the `test-*.html` files. 

### Embedding Indri in a web page

Indri comes with standard configurations for open and save dialogs. The only additional configuration option that must be supplied is a callback for when file system items are selected or when the dialog is cancelled.

The web page needs to have the `build/indri-current.version.number` folder uploaded to it, then include the indri.min.css stylesheet and indri-min.js script. Then, given an empty `div` with the id `mydialog`, the simplest Indri setup script using jQueryUI looks like this (version `0.5.0` is used in this example):

```html
<script type="text/javascript" src="jquery-1.10.2.js"></script>
<script type="text/javascript" src="jquery-ui-1.10.3.min.js"></script>
<link href="indri-0.5.0/indri.min.css" rel="stylesheet" type="text/css">
<script type="text/javascript" src="indri-0.5.0/indri.min.js"></script>

```
```javascript
	var fileSystemManager = new FileSystemManager("http://localhost:1337/");

    jQuery('#myDialog').load('indri-0.5.0/templates/indri.html', function() {
		var initializer = jQuery.extend(true, {}, FileBrowser.prototype.OpenDialogInitializer, {

			resultCallback : function(result) { 
				jQuery('#myDialog').dialog('close');
				console.log(result);						
			}
		});

		FileBrowser.attach(jQuery("#indriui"), fileSystemManager, initializer);
		jQuery('#myDialog').dialog(); 
	});
```

This uses the default settings for an Open File dialog, and provides a callback that closes the dialog and logs the result to the javascript console.

The full documentation (https://github.com/ikayzo/indri/wiki) explains the parameters to FileBrowser.attach() in detail, and covers how to customize Indri's functionality and appearance.
