var YellEvents = {         
    'PAGE_VIEW' : {
           'name': 'Page view',
           'omniture' : "page_view"
    }
}
           
           
var YellProps = {  
    'PROD_SKU' : {
          'name' : 'Product SKU',
          'omniture' : 'prop1'
    },    
    'CUSTOMER_ID' : {
           'name': 'Customer ID' ,
           'omniture': 'prop2'
    },    
    'GEO_LOCATION' : {
           'name': 'GEO location' ,
           'omniture': 'prop3'
    },    
    'SITE_TYPE' : {
           'name': 'Site type' ,
           'omniture': 'prop4'
    },
    'ASSET_ID' : {
           'name': 'Asset ID' ,
           'omniture': 'prop5'
    },
    'PAGE_NOT_FOUND': { // Use INSTEAD of pageName for 404 pages.
        'name' : '404 - Page Not Found',
        'omniture' : 'pageType'
    }
}
HAF.listeners = HAF.listeners || [];
HAF.listeners.push({
	'init' : function(trackingEvent) {
		var s = trackingEvent.getOmnitureTracker();
		var conf = HAF.config.global;
		var sConf = HAF.config.omniture;

		s.trackInlineStats=true;
		s.linkLeaveQueryString=false;
		s.linkTrackVars="None";
		s.linkTrackEvents="None";

		s.usePlugins=true;  // Set to 'true' if s_doPlugins(s) needs to be called
		/************** doPlugins Script **************/
		s.doPlugins = function(s) {		

			// Values that take a default value. 
			s.pageName = document.location.href;
			s.channel = document.domain;

			s.events = null;
		}
	}
});