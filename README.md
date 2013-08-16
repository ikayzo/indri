indri - File browser web control
=================================

Setup
-----

Indri needs a web-based file system to talk to. To browse your local hard drive:

# Download/install Node.js
# Open a shell and cd to the indri folder
# Excecute
> node node-filesystem.js
# Open filebrowser.html in a browser.

Change this line and the top of node-filesystem.js to point at a different folder on your hard drive:

> var rootDir = '/Users';

At the bottom of filebrowser.html, you can change the initial display state of the various panels by modifying these lines:

>	multiSelect : true,
>	showPreview : false,
>	showShortcuts : false,
