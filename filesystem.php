<?php 

$rootdir = ".";

$action = isset($_GET['action']) ? $_GET['action'] : "browse";
$location = isset($_GET['loc']) && ($_GET['loc'] != "") ? $_GET['loc'] : ".";

function isValidFile($file) {
	return $file[0] != '.';
}

function makepath($dir, $file) {
	return $dir . "/" . $file;
}


$result = array();

if($action == "parent") {
	$result['loc'] = $location == "." ?  "." : dirname($location);
}
else if($action == "browse") {
	$result['loc'] = $location;
	$result['realloc'] = makepath($rootdir, $location);
	$contents = array();


	if($dh = opendir(makepath($rootdir, $location))) {
		while(($file = readdir($dh)) !== false) {
			if(isValidFile($file)) {
				$fullPath = makepath($location, $file);

				$actualPath = makepath($rootdir, $fullPath);
				$contents[] =  array( "name" => $file, "location" => $fullPath, "isDir" => is_dir($actualPath), 
					"size" => filesize($actualPath), "created" => filectime($actualPath), "modified" => filemtime($actualPath));
			}
		}
		closedir($dh);
 	}


	$result['contents'] = $contents;
}

header('Content-type: application/json');
echo json_encode($result);


?>