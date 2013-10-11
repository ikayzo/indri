/*
	Constants and global stuff
*/

if (typeof KeyEvent == "undefined") {
    var KeyEvent = {
    	KEYCODE_ENTER : 13,
		KEYCODE_ESC : 27,
    KEYCODE_DELETE : 46
    };
}

var MouseButtons = {
	BUTTON_LEFT : 1,
};

var IndriIcons = {
	ICON_FOLDER : "&#128193;",
	ICON_DOCUMENT : "&#59190;",

	ICON_LIST_VIEW : "&#9776;",
	ICON_ICON_VIEW : "&#9871;",
	ICON_DETAIL_VIEW : "&#57349;",

	ICON_SORT_ASC : "&#59235;",
	ICON_SORT_DESC : "&#59232;",
}

var IndriText = {
	NEW_FOLDER_TEXT : "New Folder",

	MULTI_SELECT_ERR : "Error: Multiple selection is not allowed.",
}