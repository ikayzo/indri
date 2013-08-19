indri - File browser web control
=================================

Setup
-----

Indri needs a web-based file system to talk to. To browse your local hard drive:

1. Download/install Node.js
2. Open a shell and cd to the indri folder
3. Execute this:  `node node-filesystem.js`
4. Open filebrowser.html in a browser.

Optionally, add the target path to the end of step 3 above:

	`node node-filesystem.js \Users\nathan\projects`

At the bottom of filebrowser.html, you can change the initial display state of the various panels by modifying these lines:

	multiSelect : true,
	showPreview : false,
	showShortcuts : false,
