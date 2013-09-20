Indri
=====

Indri is a client-side web file dialog for selecting file or specifying a destination in a remote file repository. It can be styled to integrate with web applications, and provides full configuration through rendering and file system plugins.

Getting Started
---------------

First, Indri needs a web-based file system to talk to. The distribution provides a few sample implementations. To set up a file system for a local hard drive:

1. Download/install Node.js
2. Open a shell and cd to the indri/filesystems folder
3. Execute this:  `node node-filesystem.js`

Optionally, you can provide a path to a config file, use the `.example`
files in `filesystems/` as an template:
```bash
node node-filesystem.js config-nathan.json
```
If no file is specified, `node-filesystem.js` defaults to loading `./config-default.json`, which is configured to host the filesystem at `http://localhost:1337/`. You can view this location in a web browser to make sure it's set up correctly.

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

      jQuery('#myDialog').load('indri-0.5.0/templates/indri.html #browserui', function() {
	var initializer = jQuery.extend(true, {}, FileBrowser.prototype.OpenDialogInitializer, {

		resultCallback : function(result) { 
			jQuery('#myDialog').dialog('close');
			console.log(result);						
		}
	});

	FileBrowser.attach(jQuery("#browserui"), fileSystemManager, initializer);
	jQuery('#myDialog').dialog(); 
});
```

This uses the default settings for an Open File dialog, and provides a callback that closes the dialog and logs the result to the javascript console.

The full documentation (https://github.com/ikayzo/indri/wiki) explains the parameters to FileBrowser.attach() in detail, and covers how to customize Indri's functionality and appearance.
