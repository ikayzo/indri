Indri
=====

Indri is a client-side web file dialog for selecting file or specifying a destination in a remote file repository. It can be styled to integrate with web applications, and provides full configuration through rendering and file system plugins.

### Getting Started

The Indri distribution comes with example files that show how Indri may be used with various popular frameworks. To view the files, make the `indri/examples` available via an HTTP server and browse to any of the `test-*.html` files. 

### Embedding Indri in a web page

Indri comes with standard configurations for open and save dialogs. The only additional configuration option that must be supplied is a callback for when file system items are selected or when the dialog is cancelled.

Upload the `build/indri-current.version.number` folder to a web server. In your HTML file, include the indri.min.css stylesheet and indri-min.js script. Then, given an empty `div` with the id `mydialog`, the simplest Indri setup script using jQueryUI has these components (version `0.5.0` is used in this example):

Include the javascript and CSS files:
```html
    <script type="text/javascript" src="jquery-1.10.2.js"></script>
    <script type="text/javascript" src="jquery-ui-1.10.3.min.js"></script>
    <link href="indri-0.5.0/indri.min.css" rel="stylesheet" type="text/css">
    <script type="text/javascript" src="indri-0.5.0/indri.min.js"></script>

```

Add framework specific styles (jQueryUI in this case):
```html
    <style type="text/css">
      /* jQueryUI specific styles */
      .ui-widget[role="dialog"] {  -webkit-border-radius: 0; -moz-border-radius: 0; border-radius: 0; border: 0; padding: 0; width: 80%!important; height: 80%!important;  }
      .ui-widget #indriDialog { width: 100% !important; height: 100%!important; padding:0; border: 1px solid #ddd; background: none;}
    </style>
```

Provide a function for opening the Indri dialog:
```javascript
    function showDialog() {
      jQuery('#myDialog').load('indri-0.5.0/templates/indri.html', function() {
        var initializer = jQuery.extend(true, {}, FileBrowser.prototype.OpenDialogInitializer, {

          resultCallback : function(result) { 
            jQuery('#myDialog').dialog('close');
            console.log(result);            
          }
        });

        FileBrowser.attach(jQuery("#indriui"), new FileSystemManager("http://indri-filesystem.herokuapp.com/"), initializer);
        jQuery('#myDialog').dialog(); 
      });
    }
```

You can attach the function to a button or other HTML element:
```javascript
    jQuery("#openIndriBtn").click(function() { showDialog(); });

```

This uses the default settings for an Open File dialog, and provides a callback that closes the dialog and logs the result to the javascript console.

The full documentation (https://github.com/ikayzo/indri/wiki) explains the parameters to FileBrowser.attach() in detail, and covers how to customize Indri's functionality and appearance.
