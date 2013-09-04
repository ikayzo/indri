indri - File browser web control
=================================

Setup
-----

Indri needs a web-based file system to talk to. To browse your local hard drive:

1. Download/install Node.js
2. Open a shell and cd to the indri/filesystems folder
3. Execute this:  `node node-filesystem.js`
4. Open indri.html in a browser.

Optionally, add a path to a config file:

	node node-filesystem.js config-nathan.json

`./config-default.json` is used if no file is specified.

