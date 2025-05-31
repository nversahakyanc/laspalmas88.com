//no check needed atm as we believe selenium does the onload check
var readyForScreenshot = false;
function siteRenderReadyCheck() { return readyForScreenshot; }

$(document).ready(function(){
	
	//check the document and see if parameter is = 1
	try {
		var searchPath = window.document.location.search;
		if (searchPath.match("for_screenshot=1")) {

			//change the pageAlignment to flash content 
			var elmPageContent = $("#pageAlignment").attr("id","flash_content");
			
			//change the page alignment
			elmPageContent.css({
				"position"	: "absolute",
				"top"		: 0,
				"left"		: 0,
				"padding"	: 0,
				"margin"	: 0,
				"border"	: 0
			});
			
		}
	}
	catch (e){}
	finally {
		readyForScreenshot = true;
	}
	
});