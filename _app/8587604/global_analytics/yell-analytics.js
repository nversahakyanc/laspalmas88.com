/*! Hibu Global Analytics Framework Version: 3.1.1-20130207-124122 */
/** 
 *  @author Analytics Team
 *  @fileOverview Track Integration Framework 
 *  
 **/

/** 
 * @namespace Analytics Namespace: HAF (Hibu Analytics Framework)
 * @property config Configuration for the framework instance (see {@link _global_.yellAnalyticsConfig}).   
 *
 */
HAF = window.HAF = (typeof window.HAF === "undefined") ? {} : window.HAF;

 // Internal API namespace. Do no use anything in there.  
HAF._int = {
		// Version number, derived from the build process. 
		"version" : "${parent.version}-20130207-124122",
		// Internal providers list. 
		"providers" : []
	};

/** 
 * Configuration for the framework instance.  
 **/
if(typeof HAF.config === "undefined")
	HAF.config = yellAnalyticsConfig;

// Fix for an old typo in the documentation
with(HAF.config.global) {
	this.currency = this.currency || this.currenty;
}
// jsDoc for legacy APIs
/**
* Legacy identifier, maps to {@link HAF#config}.
* <strong>Backwards compatibility only. Do not use in new projects. </strong>
* Refer to the mapped function's documentation for reference.  
*
* @memberOf _global_
* @name yellAnalyticsConfig
* @property
*  
**/

(function(){
/**
 * @class Store information locally.
 * @description Stores key/value pairs on the browser. If it supports session storage (HTML5), it
 * will be used; otherwise, cookies are used.
 */
function Storage() { 
	this.initialize();
}

Storage.prototype = {
	initialize: function() {
		this.useHTMLSessionStorage = 'sessionStorage' in window;
	},
	
	createCookie: function(name,value,secs) {
		var expires = "";
		if (secs) {
			var date = new Date();
			date.setTime(date.getTime()+(secs*1000));
			expires = "; expires=" + date.toGMTString();
		}
		document.cookie = name + "=" + value + expires + "; path=/";
	},

	readCookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') {
				c = c.substring(1,c.length);
			}
			if (c.indexOf(nameEQ) == 0) { 
				return c.substring(nameEQ.length,c.length);
			}
		}
		return null;
	},

	deleteCookie: function(name) {
		this.createCookie(name,"",-1);
	},

	read: function(key) {
		if (null == key) {
			return null;
		}
		
		if (this.useHTMLSessionStorage) {
			return sessionStorage.getItem(this.myKey(key));
		} else {
			return this.readCookie(this.myKey(key));
		}
	},
		
	write: function(value, key) {
		if ((null == key) || (null == value)) {
			return;
		}
		
		if (this.useHTMLSessionStorage) {
			sessionStorage.setItem(this.myKey(key), value);
		} else { 
			this.createCookie(this.myKey(key), value, 0);
		}
	},
	
	myKey: function(key) {
		if (this.useHTMLSessionStorage) {
			return 'yellfwjs_'+ key;
		} else { 
			return key;
		}
	}
};

HAF._int.Storage = Storage;
})();
(function(){
	
/**
 * Do not instantiate this class directly, use HAF.newEvent() instead.  
 * If using the legacy API, this corresponds to the {@link _global_.YellEvent} object. 
 * @class
 * @name TrackEvent 
 * @see _global_.YellEvent
 */
function TrackEvent(descriptor, eventId) {
	
	// Descriptor is an inmutable property. The getter is a closure. 
	/**
	 * Event descriptor getter
	 * 
	 * @private
	 * @return {eventDescriptor} Event desciptor object.
	 * @memberOf TrackEvent.prototype 
	 * @function 
	 */
	this.getDescriptor = function() {
		return descriptor;
	}
	
    this.setEventId(eventId || null);
    this.props = {};
    this.propsDuplicity = {};
    this.nextEvent = null;
    this.storage = new HAF._int.Storage();
}

/**
 * Event name getter
 * 
 * @private
 * @return {String} Event name
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.getEventName = function() {
	return ('name' in this.getDescriptor()) ? this.getDescriptor().name : null;
};

/**
 * EventId getter
 * 
 * @private
 * @returns {String} Unique identification for achieving data deduplication
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.getEventId = function() { 
	return this.eventId;	
};

/**
 * EventId setter
 * 
 * @private
 * @returns {TrackEvent} This
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.setEventId = function(value) { 
    this.eventId = value ? value.replace(/\s/g, "_") : value;
    return this;
};

/**
 * 
 * Properties getter
 * 
 * @private
 * @memberOf TrackEvent.prototype 
 * @function 
 * @returns {Object} All the properties that have already been added
 */
TrackEvent.prototype.getProps = function() { 
	return this.props;
};

/**
 * 
 * Properties getter. Returns an array of properties that contain only those 
 * that have defined property values for a specific plattform.  
 * 
 * @param plattform - key under which the plattform properties are defined. 
 * 
 * @returns {Array} Array of object literal containing the following attributes: 
 * 						propertyName : name of the property 
 * 						propertyDefinitions : array with the value for the plattform after splitting by '|'
 * 						hasBeenSent : Wether property has been already processed. 
 * 						value : value of the property
 * @memberOf TrackEvent.prototype 
 * @private
 * @function 
 */
TrackEvent.prototype.getPropsFor = function(plattform) { 
	var returnValue = [];
	
	for (var key in this.props) {
		// Retrieve value of the properties
		var value = this.props[key].value;
		// Retrieve properties definitions for all plattforms
		var varObj = this.props[key].varObj;
		
		// determine if it has been sent 
		var wasSent = this.propertyHasBeenSent(varObj);
		
		// If value is set and plattform variable is defined
		if(value && varObj[plattform]) {
			returnValue.push({
							'propertyName' :  varObj.name,
							'propertyDefinitions' : varObj[plattform].split('|'),
							'hasBeenSent' : wasSent,
							'value' : value
						});
		}
	}
	return returnValue;
};

/**
 * 
 * Add a property name/value pair
 * 
 * @param {propertyDescriptor} propertyDescriptor
 *            The property descriptor specifying how to set the value for enabled tracking providers. 
 * 
 * @param {String} value Property value to set. 
 * 
 * @public
 * @returns {TrackEvent}
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.setProp = function(propertyDescriptor, value) {
		var idx = HAF._int.yellIndex(propertyDescriptor.name);
		
		// Empty value is interpreted as unset operation. 
		if(null === value || typeof value == 'undefined')
			value = "";
		value += "";
		// Unset if empty. 
		if(!value || !/\S/.test(value)){
			if(this.props[idx]) {
				delete this.props[idx];
			}
			return this;
		}

		if(!this.props[idx]) {
			this.props[idx] = {};
			this.props[idx].varObj = propertyDescriptor;
		}
		this.props[idx].value = HAF._int.yellHTMLDecode(value);
	    return this;
};

/**
 * Set property duplicity control. This check is made to make sure that the property value isn't assigned again.
 *  
 * @param {String}
 *            prop The property
 * @param {String}
 *            uniqueId Unique identifier. Used to prevent multiple
 *            submits. If this parameter has a null value, no checks
 *            are made and all events will be sent.
 * 
 * @private
 * @returns {TrackEvent}
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.setPropDuplicity = function(prop, uniqueId) {
	var idx = HAF._int.yellIndex(prop.name);
	this.propsDuplicity[idx].varObj = prop;
	this.propsDuplicity[idx].uniqueId = uniqueId;
    return this;
};

/**
 *  Chain events.
 * 
 * Chained events are processed together, one after the other.
 * 
 * @public
 * @returns {TrackEvent}
 * @memberOf TrackEvent.prototype 
 * @function 
 */
TrackEvent.prototype.chain = function(event) { 
	if(null == this.nextEvent)
		this.nextEvent = event;
	else this.nextEvent.chain(event);
    return this;
};

/**
 * 
 * Checks if an event has already been sent to analytics server
 * 
 * @returns {Boolean} true if event has been sent before
 * @memberOf TrackEvent.prototype 
 * @function 
 * @private
 */
TrackEvent.prototype.hasBeenSent = function() { 
    if (null == this.getEventId()) {
        return false;
    } else {
        var uniqueid = this.getEventName() + "_" + this.getEventId();
        uniqueid = HAF._int.yellIndex(uniqueid);
        return this.storage.read(uniqueid) == 'X';
    }
};

/**
 * Mark the event as sent to the analytics server
 * @memberOf TrackEvent.prototype 
 * @function 
 * @private
 */
TrackEvent.prototype.markAsSent = function() { 
    if (null != this.getEventId()) {
        var uniqueid = this.getEventName() + "_" + this.getEventId();
        uniqueid = HAF._int.yellIndex(uniqueid);
        this.storage.write('X', uniqueid);
    }
};

/**
 * Checks if a property has already been sent [to SiteCatalyst server]
 * 
 * @param {String}
 *            prop The property to be checked
 * @returns {Boolean} true if property has been sent before
 * @memberOf TrackEvent.prototype 
 * @function 
 * @private
 */
TrackEvent.prototype.propertyHasBeenSent = function(prop) { 
    var propId = this.propsDuplicity[prop];
    if (propId) {
        var sentBefore = prop + "_" + propId;
        return this.storage.read(sentBefore) == 'X';
    } else {
        return false;
    }
};

/**
 * Mark the property as sent [to the SiteCatalyst server]
 * 
 * @param {String}
 *            prop the property to be mark as sent
 * @memberOf TrackEvent.prototype 
 * @function 
 * @private
 * 
 */
TrackEvent.prototype.propertyMarkAsSent = function(prop) { 
    var propId = this.propsDuplicity[prop];
    if (propId) {
        var sentBefore = prop + "_" + propId;
        this.storage.write('X', sentBefore);
    }
};

/**
 * This object, which would be defined by the user optionally, is a placeholder for constant 
 * {@link eventDescriptor} objects used by the site. 
 * 
 * @namespace
 * @name YellEvents
 */

/**
 * This object, which would be defined by the user optionally, is a placeholder for constant 
 * {@link propertyDescriptor} objects used by the site. 
 * 
 * @namespace
 * @name YellProps
 */

/**
 * This is the definition of an object literal to be used as a multi plattform descriptor for events.
 * Uually it wil be defined in the namespace TrackEvents but it is not required. 
 * The object must have at least a name and one of the supported tracker's configuration.  
 *   
 * <strong>There is no constructor for this class.</strong> Create as an object literal.  
 *   
* @class
* @name eventDescriptor 
* @property {String} name <strong>Required.</strong> Event name. 
* 					
* 
* @property {String} [omniture=null] Omniture event name.
* 
* 
* @property {String} [googleanalytics=null] Google Analytics event name.
* 
* 
* @property {String} [piwik=null] Piwik event name.
*  
* 
* @property {String} [comscore=null] Comscore event name.
*/ 
// eventDescriptor is a "virtual class" for documentation purposes only, 

/**
 * This is the definition of an object literal to be used as a multi plattform descriptor for event 
 * properties. 
 * Uually it wil be defined in the namespace YellProps but it is not required. 
 * The object must have at least a name and one of the supported tracker's configuration.  
 *   
 * <strong>There is no constructor for this class.</strong> Create as an object literal.  
 *   
* @class
* @name propertyDescriptor 
* @property {String} name <strong>Required.</strong> Property name. 
* 					
* 
* @property {String} [omniture=null] Omniture property definition. Contains eVar and eProp 
* 					names for the property, separated by the pipe (‘|’) character, as in "channel|eVar2".
* 
* 
* @property {String} [googleanalytics=null] Google Analytics property definition.The value contains the 
* 					following values separated by the pipe (‘|’) character: <ol> 
* 					<li>1. The slot number in which the variable is going to be stored. </li>
* 					<li>2. The custom variable name. </li>
* 					<li>3. The scope of the variable, as defined by the Google Analytics spec. 
* 							Possible values are <ol> 
* 						<li><strong>1</strong> (visitor-level).</li>
* 						<li><strong>2</strong> (session-level).</li>
* 						<li><strong>3</strong>(page-level). </ol>
* 					</li></ol>
* 
* 
* @property {String} [piwik=null] Piwik property definition. The value may contain either the 
* 						name of a Piwik specific function or a number of values separated by 
* 						the pipe (‘|’) character. In the first case, the function name may be 
* 						one of the following three: <ol> 
* 						<li>1.	<strong>setDocumentTitle</strong>: overrides the document title attribute 
* 						for the event (which is the page title by default).</li>
* 						<li>2.	<strong>setDomains</strong>: Set the comma separated list of hostnames or domains 
* 						to be treated as local.</li>
* 						<li>3.	<strong>setSiteId</strong>: overrides the siteId from the default configuration. 
* 						</ol>
* 						Otherwise, the values to write separated by pipes are: <ol> 
* 						<li>1.	The slot number in which the variable is going to be stored. </li>
* 						<li>2.	The custom variable name. </li>
* 						<li>3.	The scope of the variable, as defined by thePiwik spec. Possible 
* 						values are ‘visit’ (visitor-level), or ‘page’ (page-level). </li>
* 						</ol>
*  
* 
* @property {String} [comscore=null] Comscore property definition.  The attribute will indicate the 
* 						name of the parameter to add to the request. The ns_site value may be used 
* 						to override the default site parameter value that is set in the configuration. 
* 						Another fixed value var is name, which represents the page name. 
*/ 
// eventDescriptor is a "virtual class" for documentation purposes only, 

// Backwards compatibility

/**
* Legacy identifier, maps to {@link TrackEvent}.
* <strong>Backwards compatibility only. Do not use in new projects. </strong>
* The constructor syntax has the same parameters as the {@link HAF.newEvent} method.   
*
* @memberOf _global_
* @name YellEvent
* @property
*  
**/
HAF._int.TrackEvent = window.YellEvent = TrackEvent;

})();
(function(){

/**
 * @namespace Page Events collection. Use to add new events to the page scope, which will then be sent
 * once ready, using HAF.pg_event();
 * 
 * @name HAF.pgEvents
 * @see _global_.yellPageEvents
 * 
 * @since v1.0
 */
HAF.pgEvents = new function(){
	
var events = [];


/**
 * Checks if there are any page events
 * 
 * @returns {Boolean} true if there is at least one page event, false otherwise
 * @public
 * @function 
 * @since v1.0
 */
this.isEmpty = function() {
    return events.length === 0;
};

/**
 * Adds one event to the list of page events that will be processed and sent later
 * 
 * @param {TrackEvent} event The event to be added
 * @returns {PageEvents} this
 * 
 * @public
 * @function 
 * @since v1.0
 */
this.add = function(event) {
    events.push(event);
    return this;
};

/**
 * Gets the list of events that have been added
 * @return {TrackEvent[]}
 */
this.getEvents = function() {
	return events;
};

/**
 * Gets the list of events that have been added
 * @return {TrackEvent[]}
 * @private
 */
this.getEventByName = function(name) {
	for(var x = 0; x < events.length; x++) {
		if(events[x].getEventName() === name){
			return events[x];
		}
	}
};

/**
 *  Clear all events
 * 
 * @since v1.0
 * @public
 * @function 
 */
this.clear = function() {
    events = [];
};


}();
})();
/**
 * Core functions of the Hibu Global Analytics Framework. 
 */
(function(){

// Constants definition
HAF._int.Constants = {
		OMNITURE : "YellOmniture",
		GA : "YellGoogleAnalytics",
		PIWIK : "YellPiwik",
		COMSCORE : "Comscore",
		DEBUG : "YellDebug"
		
}
	
/**
 * This is a list of the functions any provider implementation must comply with 
 * in order to fulfill the interfaces required for being used in the framework. 
 */
var plattformInterface = [
   "name", // Plattform identifier
   "process", // Event processing                      
   "send", // Send currently processed events
   "clear",// Clear current events
   "processTrackLinkEvent", // Process a custom track link event
   "afterTrackingEventProcessed", // Callback for after track link event has been sent. 
   "requiresEventTimeout" // boolean attribute. Defines if timeout is required to process events
]


/**
 * Creates an index string out from another string. It trims the string
 * and replaces internal spaces with underscore.
 * 
 * @private
 * @param str String used as source for the creation of the index string
 * @return Index string
 */
function yellIndex(str) {
	str = str.replace(/^\s+|\s+$/g, "");
	str = str.toLowerCase();
	return str.replace(/\s/g, "_");
}

/**
 * Decodes a string that may contain HTML entities into the browser native encoding.
 *  
 * @private
 * @param value The string that may contain HTML entities
 * @return String without HTML entities
 * @see <a href="http://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references">List of XML and HTML character entity references</a>
 */
function yellHTMLDecode(value) {
    var temp = document.createElement("div");
    temp.innerHTML = value;
    var result = temp.childNodes[0].nodeValue;
    temp.removeChild(temp.firstChild);
    return result;
}

/**
 * Gets the value of the query string parameter given as argument.
 * 
 * @private
 * @param url The URL to check against
 * @param name Query string parameter to look for
 * @return The value of the query string parameter or an empty string if not found
 */
function yellQueryParam(url,name)
{
  name = (''+name).replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if (results == null)
    return "";
  else
    return results[1];
}

/**
 * Creates an array with all enabled plattform object instances. 
 * @private
 */
function getAvailablePlattforms() {
	
	if(typeof HAF._int.plattformInstances === "undefined") {
		// Check what platforms are available
		var plattformInstances = [];
		
		for(var x = 0; x < HAF._int.providers.length; x++) {
			var provider = HAF._int.providers[x];
			plattformInstances.push(new provider());
		}	
		
		plattformInstances.processEvent = function(event) {
			for (var i = 0; i < this.length; i++)
				this[i].process(false,event);			
		}
		
		plattformInstances.sendAndClear = function(){
			for (var i = 0; i < this.length; i++){
				// eCommerce sometimes will need to override the default send command. 
				if(this[i].sendCallback) {
					this[i].sendCallback();
					delete this[i].sendCallback;
				}
				else this[i].send();
				this[i].clear();				
			}
		} 
		plattformInstances.requiresEventTimeout = function(){
			var forceTimeout = false;
			// Init the forceTimeout var. 
			for(var x = 0; x < this.length; x++) {
				forceTimeout = forceTimeout || this[x].requiresEventTimeout;
			}
			return forceTimeout;
		}
		HAF._int.plattformInstances = plattformInstances;
	}
	return HAF._int.plattformInstances;
	
}

/**
 * Sends to the appropriate platforms all the information stored at yellPageEvents.
 * The page view call for all the platforms will be used. 
 * 
 * @return True if there was information to be sent; false otherwise
 * @name HAF.pg_event
 * @function
 * @see _global_.yellSendPageEvents
 * 
 */
function sendPageEvents() {
	var plattforms = getAvailablePlattforms();
	
	// Loop over all events and check which need to be sent
	var events = yellPageEvents.getEvents();
	for (var i = 0; i < events.length; i++) {
		var currentEvent = events[i];
		if (!currentEvent.hasBeenSent()) {
			currentEvent.markAsSent();
			plattforms.processEvent(currentEvent);
		}
	}
	
	// Execute listeners
	HAF.listeners.beforePageTrack(HAF.listeners.trackingCallbackEvent);	

	// Send the data for the enabled platforms, which have anything to send, and clear data
	plattforms.sendAndClear();
	
	// Mark all events as sent
	yellMarkEventsAsSent(events);

	// Clear page events
	HAF.pgEvents.clear();
}


/**
 * Sends a single event, a chain of events or an array of events.
 * The track link call for all the platforms will be used. 
 * If called from an inline onclick event, the syntax must pass the 'this' reference 
 * as first parameter and return the result of the function call, as in: 
 * <code>&lt;a href="[url]" onclick="return HAF.lnk_event(this, event)" &gt;</code>
 *  
 * @param {DOM_href_objetc} obj The DOM object that was clicked
 * @param {TrackEvent} trackevent 
 * 			A TrackEvent instance (created with HAF.newEvent) with the desired properties set. 
 * @param {String} name
 * 			(Optional) Name for the event. If not set, the name attribute of the TrackEvent 
 * 			descriptor will be used. 
 * @param {boolean} immediate  
 * 			whether to send the event immediately or to wait a few millis to give 
 * 			the event some time to be sent. Defaults to false. Note that GoogleAnalytics 
 * 			will always produce wait.  * @return false always. 
 * @name HAF.lnk_event
 * @see _global_.yellSendTrackLinkEvent
 * @function
 */
function sendTrackLinkEvent(obj, trackevent, name, immediate) {
	name = name || trackevent.getEventName();
	
	var plattforms = getAvailablePlattforms();
	var forceTimeout = plattforms.requiresEventTimeout();

	// If forceTimeout is true, set immediate to false. Otherwise leave as is. 
	immediate == forceTimeout ? false : immediate; 

	// Listeners invocation	
	HAF.listeners.beforeLinkTrack(HAF.listeners.trackingCallbackEvent);
	
	// Process events on each plattform
	for(var x = 0; x < plattforms.length; x++) {
		plattforms[x].processTrackLinkEvent(obj, trackevent, name, immediate);
	}
	
	// Mark event(s) as sent
	yellMarkEventsAsSent(trackevent);

	var ref = obj.href || '';
	var navigate = true;
	var navigationTarget = window;
	
	// Handle targets for links	
	// Possible values are: _blank | _self | _parent | _top | framename
	// Should navigate on  _self _parent  _top
	if(ref && obj.target) {
		var t = obj.target;
		// If target is neither, navigation is left to the browser. 
		if('_self' !== t && '_parent' !== t && '_top' !== t) {
			navigate = false;
		}
		else {
			// In these cases it is required to set the proper target to set the url
			if('_parent' === t) {
				navigationTarget = window.parent || window;
			}
			else if('_top' === t) {
				navigationTarget = window.top || window;
			}
			// If target equals current window, treat as any link without a target
			// (probably an error in the target definition)
			navigate = (navigationTarget === window);
		}
	}
	
	// Postprocessing callback on each plattform
	for(var x = 0; x < plattforms.length; x++) {
		plattforms[x].afterTrackingEventProcessed(obj, trackevent, name, immediate);
	}
	
	if(ref && navigate) {
		function doNavigate() {
			navigationTarget.document.location = ref;
		}
		if(immediate) {
			doNavigate();
		}
		else setTimeout(doNavigate, 500);
	}
	return !navigate; // If navegation was handled here return false
}

/**
 * Mark the event, chain of events and the array of events as marked.
 * It also marks the internal properties as sent
 * 
 * @private
 * @param events Event or array of events to be marked as sent
 */
function yellMarkEventsAsSent(events) {
	// Completely mark an event and its properties as sent
	function markAsCompleteSent(event) {
		var yprops = event.getProps();
		for (var key in yprops) {
			var varObj = yprops[key].varObj;
			event.propertyMarkAsSent(varObj);
		}
		event.markAsSent();
	}
    // Handle it differently if it is an event or an array or events
    if (yellIsArray(events)) {
        // Handle array of events
        for (var i = 0; i < events.length; i++) {
        	var ev = events[i];
        	while (ev) {
        		markAsCompleteSent(ev);
        		ev = ev.nextEvent;
        	}
        }
    } 
    else {
        // Handle one event
    	var ev = events;
    	while (ev) {
    		markAsCompleteSent(ev);
    		ev = ev.nextEvent;
    	}
    }
	
}

/**
 * Check if an object is an array
 * @private
 * @param testObject Object to test
 * @return True if it is an array; false otherwise
 */
function yellIsArray(testObject) {
    return testObject && !(testObject.propertyIsEnumerable('length'))
            && typeof testObject === 'object'
            && typeof testObject.length === 'number';
}

/**
 * Creates a listener function to be applied programatically to links. 
 * The values passed are used in a call to HAF.lnk_event. 
 * The listener will cancel the click event so it should be assigned as the last one
 * 
 * @param {TrackEvent} track event object.
 * 			A TrackEvent instance (created with HAF.newEvent) with the desired properties set. 
 * @param {String} name
 * 			(Optional) Name for the event. If not set, the name attribute of the TrackEvent 
 * 			descriptor will be used. 
 * @param {boolean} immediate  
 * 			whether to send the event immediately or to wait a few millis to give 
 * 			the event some time to be sent. Defaults to false. Note that GoogleAnalytics 
 * 			will always produce wait. 
 * @name HAF.lnk_handler
 * @function
 */
function createClickListener(trackevent,name,immediate) {	
	// Function to assign to the element's onclick event
	return function(e) { 
		if (!e) var e = window.event

		// Retrieve the source of the click (the a href element) 
		// This has nothing to do with the link's target attribute
		var theLink;
		if (e.target) theLink = e.target;
		else theLink = e.srcElement;
		// Roll up the DOM tree to find the a href (source might be a text node inside the link)
		if(!theLink.href && theLink.parentNode) {
			for(var x = 0;x < 5;x++){
				theLink = theLink.parentNode;
				if(theLink.src || !theLink.parentNode)
					break;
			}			
		}
		var cancelEvent = false;
		// If the link has a target attribute it may be unneeded to cancel the event
		// Possible values are: _blank | _self | _parent | _top | framename
		// Should cancel only when value is either  _self _parent  _top (or unset)
		if(theLink.target) {
			var t = theLink.target;
			if('_self' === t || '_parent' === t || '_top' === t) {
				if('_parent' === t)
					cancelEvent = window.parent === window;
				else if ('_top' === t)
					cancelEvent = window.top === window;
				else cancelEvent = true;
			}
		}
		else cancelEvent = true;

		if(cancelEvent) {
			e.returnValue = false;
			if(e.preventDefault) e.preventDefault();
			if(e.stopPropagation) e.stopPropagation();
		}
		
		return sendTrackLinkEvent(theLink, trackevent,name,immediate); 
	}
}

/*
 * Initialization
 */
// Internal APIs, not meant for client use. 
HAF._int.yellIndex = yellIndex;
HAF._int.yellHTMLDecode = yellHTMLDecode;
HAF._int.yellQueryParam = yellQueryParam;
HAF._int.getPlattformInstances = getAvailablePlattforms; 
HAF._int.plattformInterface = plattformInterface;


/**
 * Find a registered provider (only register when activated in config)
 */
HAF._int.getProviderByName = function(name) {
	for(var x = 0; x < HAF._int.providers.length; x++){
		if(name === HAF._int.providers[x].prototype.name)
			return HAF._int.providers[x];
	}	
}

// Public API functions. The first identifier is deprecated, from older versions. 
/**
* Legacy identifier, maps to {@link HAF.pgEvents}. 
* <strong>Backwards compatibility only. Do not use in new projects. </strong>
* Refer to the mapped property documentation for reference.  
*
* @memberOf _global_
* @name yellPageEvents
* @property
*  
**/
window.yellPageEvents = HAF.pgEvents;

/**
 * @description Factory method that creates an object of type {@link TrackEvent} which 
 * allows storing of events and variables whilst preventing duplicate submits.
 * 
 * @param {eventDescriptor} descriptor 
 * 			  Event's descriptor. The object must have at least, a property with name 'name'.
 * @param {String} eventId
 *            Unique event identifier. Used to prevent multiple submits
 *            to Web Analytics platform. Only one TrackEvent per eventId and browser session 
 *            will be sent. If this parameter has a null value, the data will be sent without checks.
 * @returns {TrackEvent}
 * @since v1.0 
 * @memberOf HAF 
 * @function
 * 
 */
HAF.newEvent = function(event,eventId) {
	return new HAF._int.TrackEvent(event,eventId);
};
/**
* Legacy identifier, maps to {@link HAF.pg_event}.
* <strong>Backwards compatibility only. Do not use in new projects. </strong>
* Refer to the mapped function's documentation for reference.  
*
* @memberOf _global_
* @name yellSendPageEvents
* @function
*  
**/
HAF.pg_event = window.yellSendPageEvents = sendPageEvents;
/**
* Legacy identifier, maps to {@link HAF.lnk_event}.
* <strong>Backwards compatibility only. Do not use in new projects. </strong>
* Refer to the mapped function's documentation for reference.  
*
* @memberOf _global_
* @name yellSendTrackLinkEvent
* @function
*  
**/
HAF.lnk_event = window.yellSendTrackLinkEvent = sendTrackLinkEvent;

// New functions that only use the new namespace
HAF.lnk_handler = createClickListener;

})();
(function(){
	
var config = (typeof HAF.config.omniture === 'undefined') ? 
			{enabled:false} : 
				HAF.config.omniture;
if(!config.enabled)
	return;

/**
 * Adds a value to a list, if the value exists and it was not on the list previously. 
 * @param list a comma sepparated string.
 * @param newvalue a string to add to the list, if its not null and does not exist already.  
 */
function addToList(list, newvalue) {
	if (newvalue) {
		if (!list || list === 'None') {
			list = newvalue;
			return list;
		}
		
		// Is the value already in the list?
		var arr = list.split(',');
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] === newvalue) 
				return list; // just leave, nothing to add
		}					
		list += (',' + newvalue);
	}
	return list;
}

/**
 * Specific class that interfaces the Track Integration Framework
 * with Omniture code.
 * 
 * @description Constructor for the interface of Omniture SiteCatalyst.
 * @class Omniture interface
 */
function YellOmniture() {
	this.ss = (typeof s === 'undefined') ? s_gi(config.account) : s;
	
	var gConf = HAF.config.global;
	this.ss.charSet=gConf.charset;
	/* Conversion Config */
	this.ss.currencyCode=gConf.currency;
	
	/* Throwaway function to copy optional configuration values */
	function getCopier(source,dest) {
		return function copyAttr(name, destName) {
			destName = destName ? destName : name;
			if(typeof source[name] !== 'undefined')
				dest[destName] = source[name];
		}
	}
	/* Global non mandatory options copy to s */
	var copier = getCopier(gConf,this.ss);
	copier('trackDownloadLinks');
	copier('trackExternalLinks');
	copier('downloadFileTypes', 'linkDownloadFileTypes');
	copier('internalDomains', 'linkInternalFilters');

	/* Originally configured like this
	this.ss.trackInlineStats=true;
	this.ss.linkLeaveQueryString=false;
	*/



	/* Omniture non mandatory options copy to s */
	copier = getCopier(config,this.ss);
	/* TimeParting Config */
	copier('dstStart');
	copier('dstEnd');
	copier('currentYear');
	
	copier('serverSecure','trackingServerSecure');

	// These are non-optional
	this.ss.visitorNamespace=config.namespace;
	this.ss.trackingServer=config.server;
	
	this.clear();
};


/**
 * Assign event to SiteCatalyst data structures. Checks before if the event has
 * already been sent before. If two or more events are chained, they are processed one
 * after the other.
 * 
 * @param {Boolean} isTrackLink Process this event as if it is a track link
 * @param {YellEvent} yellEvent The YellEvent to be added
 */
YellOmniture.prototype.process = function(isTrackLink, yellEvent) {		
	var yevt = yellEvent.getDescriptor();
	
	// Only take care of the event, if it has not yet been sent and it is omniture related. 
	if (yellEvent.hasBeenSent() || !yevt.omniture) 
		return;
	
	// Append event to the event's list
	if (yevt.omniture) {
		this.ss.events =  addToList(this.ss.events, yevt.omniture);
	}
	if (isTrackLink) {
		// Append event to the linkTrackEvents list
		this.ss.linkTrackEvents = addToList(this.ss.linkTrackEvents, yevt.omniture);
		this.ss.events = this.ss.linkTrackEvents;
		this.ss.linkTrackVars = addToList(this.ss.linkTrackVars, 'events');
	}

	// Iterate through defined properties ...
	var yprops = yellEvent.getPropsFor('omniture');
	for(var x = 0; x < yprops.length; x++) {
		var property = yprops[x];		
		
		// Skip if already sent
		if (property.hasBeenSent)
			continue;

		var allProps = property.propertyDefinitions;

		for (var i = 0; i < allProps.length; i++) {
			var prop = allProps[i];

			if (isTrackLink) {
				this.ss.linkTrackVars = addToList(this.ss.linkTrackVars, prop);
			}
			this.setProp(prop,property.value);
		} // End for each in allProps
	}// end for each in yprops
	
};

/**
* Set a property value in the Omniture tracker object. Will check and optimize the 
* values for eProps that have the same value of a corresponding eVar. 
*
* @param prop {string} The property or eVar name
* @param value {string} The value to set for the property. 
*/
YellOmniture.prototype.setProp = function(prop, value) {
	this.ss[prop] = value;

	// Set shortened value for eProps, if applies.
	var isProp = (prop.indexOf('prop') === 0);
	var isEvar = (prop.indexOf('eVar') === 0);

	// If its either an evar or a prop, check if it may be possible to shorten
	if(isProp || isEvar) {
		var propIndex = prop.substring(4); // evar/prop index number
		var dyn = "D=v" + propIndex; // short value

		// Only optimize when value is longer than abbreviation
		if(value && value.toString().length > dyn.length) { 
			// check for corresponding eprop/evar to this evar/eprop
			var checkForProp = isProp ? 'eVar' + propIndex : 'prop' + propIndex;
			// If it has the same value, use shorthand 
			if(this.ss[checkForProp] === value) {
				this.ss['prop' + propIndex] = dyn; // always optimize the prop
			}
		}
	}
}

/**
 * Clears the following track config variables on the object:
 * <ul>
 * <li>events</li>
 * <li>products</li>
 * <li>campaign</li>
 * <li>props</li>
 * <li>eVars</li>
 * </ul>
 * @since v1.0.11
 */
YellOmniture.prototype.clear = function() {
	// Clear Omniture vars
	this.ss.events = null;
	this.ss.products = null;
	this.ss.campaign = null;
	this.ss.linkTrackVars = "None";
	this.ss.linkTrackEvents = "None";
	// We don't know which props or eVars have been filled
	// so we must search in the whole Omniture 'ss' object.
	var isProp = /^prop/;
	var isEVar = /^eVar/;
	for (var key in this.ss) {
		if (isProp.test(key) || isEVar.test(key)) {
			this.ss[key] = null;
		}
	}
};


/**
 * Send the information in 'ss' as a page view event.
 */
YellOmniture.prototype.send = function() {
	// Check pageName and assign document.title if not set
	if (!this.ss.pageName) {
		this.ss.pageName = document.title;
	}	
	
	// Add the campaign
	if (config.campaign) {
		this.ss.campaign = HAF._int.yellQueryParam(window.location.href,config.campaign);
	}
	
	// Finally, send the data
	this.ss.t();
};

/**
 * Sends a single event, a chain of events or an array of events.
 * The track link call will be used. 
 * 
 * @param obj The DOM object that was clicked
 * @param event The event, chain of events or array of events to be sent.
 * @param name Name for the event. Defaults to the event.name property of the 'event' param. 
 * @param immediate Boolean: whether to send the event immediately or to wait a few millis to give 
 * 						the event some time to be sent. Defaults to false. 
 * @return false always. 
 */
YellOmniture.prototype.processTrackLinkEvent = function(obj, event, name, immediate) {
	var ev = event;
	while (ev) {
		this.process(true,ev);
		ev = ev.nextEvent;
	}

	// Check pageName and assign document.title if not set; may not be needed here
	if (!this.ss.pageName) {
		this.ss.pageName = document.title;
	}

	// Send the data and clear 'ss'
	name = name ? name : "None";
	this.ss.tl(immediate || obj, 'o', name);

	// clear data
	this.clear();	
}
/**
 * Callback function for after tracking events have been processed. 
 */
YellOmniture.prototype.afterTrackingEventProcessed = function(obj, event, delay, name) {
	if(obj.href && "" != obj.href && obj.href.indexOf('#') != 1) {
		if(this.ss.linkInternalFilters) {
			var values = this.ss.linkInternalFilters.split(',');
			values.push(obj.href);
			this.ss.linkInternalFilters = values.join(',');
		}
		else this.ss.linkInternalFilters = obj.href;
	}
}
/**
 * Property to define whether this analytics framework requires a wait time before leaving a page
 * in order to send events.  
 */
YellOmniture.prototype.requiresEventTimeout = false;
YellOmniture.prototype.name = HAF._int.Constants.OMNITURE;
HAF._int.providers.push(YellOmniture);
})();
(function(){

	var conf = HAF.config.global;
	var gaConf = (typeof HAF.config.googleanalytics === 'undefined') ? 
															{enabled:false} : 
																HAF.config.googleanalytics;
	// If disabled, no need to eval everything else.  
	if(!gaConf.enabled)
		return;

	// constants
	var MAX_CUSTOM_VARS = gaConf.maxCustomVars || 5;
	//Separator character for properties values.
	var PROP_SEPARATOR = '|';
	//Separator character between event name and property name.
	var EVNT_SEPARATOR = ':';
	
	// Name of the property of an event prop, that defines the opt_pageURL 
	// value for page views. 
	// Given a prop as :
	// GA_OPTPAGEURL: {name:'opt page', googleanalytics: 'opt_pageURL'}, 
	// -> event.setProp(GA_OPTPAGEURL, '/Home/MyValue');
	// Will cause a call as: tracker._trackPageview('/Home/MyValue');
	var OPT_PAGE_URL_PROPNAME = "opt_pageURL";
	
/**
 * pageTracker wrapper
 * Allows to use asynchronous or synchronous GA method calls. 
 * The class initializes methods according to the status of the gaConf.useSynchronousAPI
 * configuration property. By default, asynchronous API will be used. 
 * 
 * 
 */
function gtw(){
		
	// Async API initialization. 
	if(!gaConf.useSynchronousAPI) {
		// random var name for the account alias used in calls
		var pfx = this.accountPrefix = "haf" +  Math.floor(Math.random()*100) + "."; 
		// Utility function for prefixing function calls with the account alias. 
		function p(fnName) {
			return pfx + fnName;
		}
		
		window._gaq = window._gaq || [];
		
		// Get the account
		_gaq.push([p('_setAccount'), gaConf.account]);		
		
		// Initialization methods are called through this. 
		this.setInit = function(fn, val) {
			_gaq.push([p(fn),val]);
		}
		
		this.setCustomVar = function(index, name, value, opt_scope){
			_gaq.push([p('_setCustomVar'),index, name, value, opt_scope]);
		}
		
		this.deleteCustomVar= function (index){
			_gaq.push([p('_deleteCustomVar'),index]);
		}

		this.trackEvent = function(category, action, opt_label) {
			_gaq.push([p('_trackEvent'),category, action, opt_label]);
			return true;
		}
		
		this.trackPageview = function (opt_pageURL){
			var data = [p('_trackPageview')];
			if(opt_pageURL)
				data.push(opt_pageURL);
			_gaq.push(data);
		}
		
	}
	// Sync API initialization. 
	else {
		// Get the account
		var tracker = _gat._getTracker(gaConf.account);

		// Initialization methods are called through this. 
		this.setInit = function(fn, val) {
			tracker[fn](val);
		}

		this.setCustomVar = function(index, name, value, opt_scope){
			tracker._setCustomVar(index, name, value, opt_scope);
		}
		
		this.deleteCustomVar= function (index){
			tracker._deleteCustomVar(index);
		}
		
		this.trackEvent = function(category, action, opt_label) {
			return tracker._trackEvent(category, action, opt_label);
		}

		this.trackPageview = function (opt_pageURL){
			tracker._trackPageview(opt_pageURL);
		}
		
	}
	
	// Initial values and settings
	if (gaConf.domainName)
		this.setInit('_setDomainName', gaConf.domainName);		

	// allowHash is true by default, must look for the false value. 
	var allowHash = true;
	if (!(typeof gaConf.allowHash === 'undefined')) {
		allowHash = (gaConf.allowHash != "false");		
	}
	
	// allowHash is true by default, only set to false if applies. 
	if(!allowHash)
		this.setInit('_setAllowHash', allowHash);
	
	if(gaConf.allowLinker)
		this.setInit('_setAllowLinker', gaConf.allowLinker);
	
	if (gaConf.campaignCookieTimeout && !isNaN(gaConf.campaignCookieTimeout))
		this.setInit('_setCampaignCookieTimeout', gaConf.campaignCookieTimeout);
	
	if (gaConf.sessionCookieTimeout && !isNaN(gaConf.sessionCookieTimeout))
		this.setInit('_setSessionCookieTimeout', gaConf.sessionCookieTimeout);
	
	if (gaConf.visitorCookieTimeout && !isNaN(gaConf.visitorCookieTimeout))
		this.setInit('_setVisitorCookieTimeout', gaConf.visitorCookieTimeout);
	
}
	
/**
 * Specific class that interfaces the Track Integration Framework
 * with Google Analytics code.
 * 
 * @description Constructor for the interface of Google Analytics.
 * @class Google Analytics interface
 */
function YellGoogleAnalytics() {	

	// propsKey is the set of labels to send with track link events
	this.propsKey = "";
	// propsValue is the set of values (linked to labels in propsKey)
	this.propsValue = "";
	// Event category for track links
	this.categoryEvent = null;

	// Optional pare URL parameter, if set will be used as 
	// the  _trackPageview 'opt_pageURL' parameter. 
	this.opt_pageURL = null;

	// Tracker wrapper
	this.gtw = new gtw();

	this.clear();
};

// 
YellGoogleAnalytics.trackingWrapper = gtw;

/**
 * Assign event to Google Analytics data structures. Checks before if the event has
 * already been sent before.
 * 
 * @param {Boolean} isTrackLink Process this event as if it is a track link
 * @param {YellEvent} yellEvent The YellEvent to be added
 */
YellGoogleAnalytics.prototype.process = function(isTrackLink, yellEvent) {
	
	// Process all events in the chain 
	// (while yellEvent = yellEvent.nextEvent is not null)
	do {		
		// Append event to the event's list
		var yevt = yellEvent.getDescriptor();
		var category = null;
		if (yevt != null && yevt.googleanalytics) {
			category = yevt.googleanalytics;
			this.categoryEvent = category;
		}
	
		// Iterate through defined properties ...
		var yprops = yellEvent.getPropsFor('googleanalytics');
		// yprops contains an array of objects with:
		/*
		 * propertyName : name of the property 
		 * propertyDefinitions : array with the value for the plattform after splitting by '|'
		 * hasBeenSent : Wether property has been already processed. 
		 * value : value of the property
		 * (see TrackEvent#getPropsFor)
		*/ 
		if(yprops.length > 0) {
			if (isTrackLink) {
				processTrackLinkProps(this,yprops);
			}
			else {
				processPageViewProps(this,yprops,category);
			}
		}
		// Next event in chain
		yellEvent = yellEvent.nextEvent;
	
	} while(null != yellEvent);
	
};

/**
*	Used in the send() method to process tracklink event properties. 
* 	Sends an event per call. 
*	@param providerInstance: the instance of the YellGoogleAnalytics object
* 	@param yprops[] Array of properties bound to the event
*/
function processTrackLinkProps(providerInstance, yprops) {	
	var propsKeysArray = [];
	var propsValuesArray = [];
	for(var x = 0; x < yprops.length; x++) {
		var property = yprops[x];
		// defs is an array of the property definition value split by '|'
		var defs = property.propertyDefinitions;
		// For links the definition must be composed, e.g. '1|pageName|3' 
		// , so we look for sizes over 1
		if (defs.length > 1) {
			// Use the 2nd value as key, e.g. '1|pageName|3' -> 'pageName'
			propsKeysArray.push(defs[1]); 
			propsValuesArray.push(property.value);
		}
		else if(0 in defs && defs[0] === OPT_PAGE_URL_PROPNAME) {
			// This is legacy support for sites that used page URL and page event to track in page events. 
			propsKeysArray.push(defs[0]); 
			propsValuesArray.push(property.value);
		}
	}
	// Set properties for track link and send the info
	providerInstance.propsKey = propsKeysArray.join(PROP_SEPARATOR);
	providerInstance.propsValue = propsValuesArray.join(PROP_SEPARATOR);
	providerInstance.sendTrackLink();
}

/**
*	Used in the send() method to process page view event properties
*	@param providerInstance: the instance of the YellGoogleAnalytics object
* 	@param yprops[] Array of properties bound to the event
*/
function processPageViewProps(providerInstance, yprops, category) {
	
	for(var x = 0; x < yprops.length; x++) {
		var property = yprops[x];
		// defs is an array of the property definition value split by '|'
		var defs = property.propertyDefinitions;

		// If the definition is the opt_pageUrl constant, assign it
		if(defs.length == 1 && defs[0] === OPT_PAGE_URL_PROPNAME) {
			providerInstance.opt_pageURL = property.value;
		}
		else {
			// concat category with first property def using separator .
			// example: 
			// default event name='Event' and the property value is 2|search|3
			// Result is 'Event:search'
			var nameCustomVar = category ? category + EVNT_SEPARATOR : "";
			nameCustomVar += defs[1];

			// Trim the value if it's too long, as specified by google.
			property.value = providerInstance.adjustVarLength(nameCustomVar, property.value);
				
			//Saves event in custom variables 
			var opt_scope = (2 in defs) ? defs[2] : null;
			providerInstance.gtw.setCustomVar(defs[0], 
											  nameCustomVar, 
											  property.value, 
											  opt_scope);		
		}

	}
}

/**
 * Adjusts the length of a custom variable value so that the combined length 
 * of varName+variable value length does not exceed 128, as per Google specification 
 * of their API
 * 
 * @param varName
 * @param varValue
 */
YellGoogleAnalytics.prototype.adjustVarLength = function(varName, varValue) {	
	var cont = varName + varValue;
	//for google custom var , (length name custom var + length value custom var) <= 128 character 
	if (cont.length > 128) {
		var trimDistance = varValue.length - (cont.length - 128);
		varValue = varValue.substr(0,trimDistance);
	}
	return varValue;
}

/**
 * Clears the following track config variables on the object:
 * <ul>
 * <li>custom var of pageTracker</li>
 * <li>propsKey</li>
 * <li>propsValue</li>
 * <li>categoryEvent</li>
 * </ul>
 * @since v1.0.11
 */
YellGoogleAnalytics.prototype.clear = function() {
	
	for (var i = 1; i <= MAX_CUSTOM_VARS; i++) {
		this.gtw.deleteCustomVar(i);
	}
	this.propsKey = "";
	this.propsValue = "";
	this.categoryEvent = null;
	this.opt_pageURL = null;
};

/**
 * Send the event as a track link event. 
 * @returns {Boolean} true if the event has been sent
 */
YellGoogleAnalytics.prototype.sendTrackLink = function(){

	if (this.categoryEvent == null) {		
		this.categoryEvent = gaConf.defaultEventName;
	}
					
	var sendTrack = false;

	// In case of sites migrated from urchin or older GA, they may use pageview with the
	// page URL value instead of using standard
	if(gaConf.sendTrackLinksAsPageView && this.propsKey == OPT_PAGE_URL_PROPNAME) {
		sendTrack = this.gtw.trackPageview(this.propsValue);
	}
	else {
		// parameters: _trackEvent(Event name, properties names, properties values) 
		sendTrack = this.gtw.trackEvent(this.categoryEvent, this.propsKey, this.propsValue);
	}

	this.propsKey = "";
	this.propsValue = "";
	this.categoryEvent = null;
	return sendTrack;
};

/**
 * Sends the information as a page view event.
 */
YellGoogleAnalytics.prototype.send = function() {	
	this.gtw.trackPageview(this.opt_pageURL);
};

/**
 * Send the information of a outbound link as a track event.
 */
YellGoogleAnalytics.prototype.recordOutboundLink = function(action) {
	this.gtw.trackEvent(gaConf.externalLinks, action);	
};

/**
 * Send the information of a file download link as a track event.
 */
YellGoogleAnalytics.prototype.recordDownloadFileLink = function(fileType, linkFile) {
	return this.gtw.trackEvent(gaConf.downloadLinks, fileType, linkFile);		
};

/**
 * Separator character for items list in string format.
 */
var PARAM_SEPARATOR = ',';

/**
 * Allows the registration of event listeners on the event target
 * @param element 
 * 			Event target.
 * @param event 
 * 			A string representing the event type to listen for.
 * @param functionClick 
 * 			The object that receives a notification when an event of the specified type occurs. 
 */
function eventClick(element, event, functionClick) {
	if (element.addEventListener) {
        element.addEventListener(event, functionClick, false);
	} else {
        element.attachEvent("on"+event, functionClick);
	}
}

/**
 * Adds a listener to each link of the window.
 * If the link corresponds to an external domain or a file download link, tracks the corresponding event.
 */
function processLinks() {
	
	//Indicates internal domains
	var internalDomains = (conf.trackExternalLinks && conf.internalDomains) ? conf.internalDomains.split(PARAM_SEPARATOR) : null;
	//Indicates the types of file to be downloaded
	var downloadFileTypes = (conf.trackDownloadLinks && conf.downloadFileTypes) ? conf.downloadFileTypes.split(PARAM_SEPARATOR) : null;
	
	// Get the current GA instance
	var plattforms = HAF._int.getPlattformInstances();
	var gaRef = null; 
	for(var x = 0; x < plattforms.length; x++) {
		if(plattforms[x].name === HAF._int.Constants.GA ){
			gaRef = plattforms[x];
			break;
		}
	}
	
	function createOnclickHandler(link){
		// this complex syntax creates a closure around the href property of the link
		var href = link.href;			
		return function(){
			//checks if link corresponds to a external link.
			if (internalDomains != null) {
				var findInternalDomain = false;
				for (var j = 0; j < internalDomains.length; j++) {				
					var patter = new RegExp(internalDomains[j], "i");
					if (href.match(patter) != null) {
						findInternalDomain = true;
						break;
					}
				}
				if (!findInternalDomain) {
					gaRef.recordOutboundLink(href);
				}
			}
			//checks if link corresponds to a file download link.
			if (downloadFileTypes != null) {
				var findFileType = false;
				var fileType = "";
				for (var j = 0; j < downloadFileTypes.length; j++) {				
					var patter = new RegExp("[\x2E]" + downloadFileTypes[j], "i");
					if (href.match(patter) != null) {
						findFileType = true;
						fileType = downloadFileTypes[j];
						break;
					}
				}
				if (findFileType) {
					gaRef.recordDownloadFileLink(fileType, href);
				}
			}
		}
	}
	
	var links = window.document.getElementsByTagName("a");
	//for earch link on the page.
	for ( var i = 0; i < links.length; i++) {
		var inlineOnclick = links[i].onclick || '';
		inlineOnclick = inlineOnclick ?  ''+inlineOnclick : ''; 
		if(inlineOnclick && inlineOnclick.indexOf('yellSendTrackLinkEvent') != -1)
			continue;
		if(inlineOnclick && inlineOnclick.indexOf('HAF.lnk_event') != -1)
			continue;
		// Event was changed to mousedown, since it happens around 50ms before onclick thus avoids need to 
		// create some bogus sleep method to block the 
		eventClick(links[i], "mousedown", createOnclickHandler(links[i]));	
	}	
}

if (conf.trackExternalLinks || conf.trackDownloadLinks) {

	if (typeof window.addEventListener != "undefined") {
	    window.addEventListener("load", processLinks, false );
	} else if (typeof window.attachEvent != "undefined" ) {
		window.attachEvent( "onload", processLinks );	
	} else {
		if (window.onload != null) {
			var oldOnload = window.onload;
			window.onload = function (e) {
				oldOnload( e );
				window[processLinks]();
			};
	    } else {
	      window.onload = processLinks;
	    }
  	}		
}

/**
 * Sends a single event, a chain of events or an array of events.
 * The track link call will be used. 
 * 
 * @param obj The DOM object that was clicked
 * @param event The event, chain of events or array of events to be sent.
 * @param name Name for the event. ignored here. 
 * @param immediate Boolean: always ignore, a delay is required. 
 * @return false always. 
 */
YellGoogleAnalytics.prototype.processTrackLinkEvent = function(obj, event, name, immediate) {
	var ev = event;
	var specificEventsInChain = false;
	// verify wether any of the events has specific properties for GA. 
	do {
		specificEventsInChain = ev.getPropsFor('googleanalytics').length > 0;
		
		if(specificEventsInChain)
			break;
		ev = ev.nextEvent;		
	} while (ev != null);
	
	// If no specific properties are set, a generick click event is sent. 
	if(!specificEventsInChain) {
		this.recordOutboundLink(obj.getAttribute('href'));
	}
	else {// Otherwise, process normally
		this.process(true, ev);
	}
}

/**
 * Callback function for after tracking events have been processed. 
 */
YellGoogleAnalytics.prototype.afterTrackingEventProcessed = function(obj, event, delay, name) {}


/**
 * Property to define whether this analytics framework requires a wait time before leaving a page
 * in order to send events.  
 */
YellGoogleAnalytics.prototype.requiresEventTimeout = true;
YellGoogleAnalytics.prototype.name = HAF._int.Constants.GA;
HAF._int.providers.push(YellGoogleAnalytics);
})();
(function(){
	
var conf = HAF.config.global;
var pwConf = (typeof HAF.config.piwik === 'undefined') ? 
										{enabled:false} : 
											HAF.config.piwik;

// If disabled, no need to eval everything else.  
if(!pwConf.enabled)
	return;

var SEPARATOR = '|';
var MAX_CUSTOM_VARS = 5;

/**
 * Specific class that interfaces the Track Integration Framework
 * with Piwik code.
 * 
 * @description Constructor for the interface of Piwik.
 * @class Piwik interface
 */
function YellPiwik() {
	this.pageTracker = null;
	this.category = '';
	this.propsKey = '';
	this.propsValue = '';
	
	if(pwConf.listenerSecure){
		this.pageTracker = Piwik.getTracker(pwConf.listenerSecure, pwConf.siteId);
	} else {
		this.pageTracker = Piwik.getTracker(pwConf.listener, pwConf.siteId);
	}
	if (conf.trackDownloadLinks && conf.downloadFileTypes) {
		var piwikExtensions = conf.downloadFileTypes.split(',').join('|');
		this.pageTracker.setDownloadExtensions(piwikExtensions);
		this.pageTracker.enableLinkTracking();
	}
	if (conf.trackExternalLinks && conf.internalDomains) {
		var piwikDomains = conf.internalDomains.split(',');
		this.pageTracker.setDomains(piwikDomains);
		this.pageTracker.enableLinkTracking();
	}
	this.clear();
};

/**
 * Assign event to piwik data structures. Checks before if the event has
 * already been sent before. If two or more events are chained, they are processed one
 * after the other.
 * 
 * @param {Boolean} isTrackLink Process this event as if it is a track link
 * @param {YellEvent} yellEvent The YellEvent to be added
 */
YellPiwik.prototype.process = function(isTrackLink, yellEvent) {
	// Append event to the event's list
	var yevt = yellEvent.getDescriptor();
	var categoryProcess = yevt.piwik;

	
	var allProps = yellEvent.getPropsFor('piwik');
	var propsKeysArray = [];
	var propsValuesArray = [];
	for(var x = 0; x < allProps.length; x++) {
		var property = allProps[x];

		
		// Skip if already sent 
		if (property.hasBeenSent)
			continue;
		
		var props = property.propertyDefinitions;
		var slot = props[0];
		var varName = props[1];
		var scope = props[2];


		if(isTrackLink) {
			// If the first property is a number take the second one
			var propKey = isNaN(slot) ? slot : varName;
			propsKeysArray.push(propKey);
			propsValuesArray.push(property.value);
		}
		else {
			// If the property is no number, then it's the name of a piwik method to call
			if(isNaN(slot)){
				this.pageTracker[slot].call(this.pageTracker,property.value);										
			} else {

				// If piwik event exists, append its name to the property (category:property_name)
				varName = categoryProcess ? categoryProcess + ':' + varName : varName;
				this.pageTracker.setCustomVariable(slot, 
													varName, 
													property.value, 
													scope);				
			}
		}		
	}
	
	if(isTrackLink) {
		this.category = categoryProcess;
		this.propsKey = propsKeysArray.join(SEPARATOR);
		this.propsValue = propsValuesArray.join(SEPARATOR);
	}
};

/**
 * Clears the track config variables on the object
 */
YellPiwik.prototype.clear = function() {
	// Delete all custom variables of scope "visit" and "page"
	for (var i = 1; i <= MAX_CUSTOM_VARS; i++) {
		this.pageTracker.deleteCustomVariable(i,"visit");
		this.pageTracker.deleteCustomVariable(i,"page");
	}
};

/**
 * Send the information as a page view event.
 */
YellPiwik.prototype.send = function() {	
	this.pageTracker.trackPageView();
};

/**
 * Sends a single event, a chain of events or an array of events.
 * The track link call will be used. 
 * 
 * @param obj The DOM object that was clicked. Ignored here, can be null. 
 * @param event The event, chain of events or array of events to be sent.
 * @param name ignored here.  
 * @param immediate Boolean: ignored here. 
 * @return false always. 
 */
YellPiwik.prototype.processTrackLinkEvent = function(obj, event, name, immediate) {
	var ev = event;
	while (ev) {
		this.process(true,ev);
		ev = ev.nextEvent;
	}

	// fields of trackGoal(goal number, values)
	var trackData = this.propsKey + ":" + this.propsValue;
	trackData = this.category ? this.category + ":" + trackData : trackData;
	this.pageTracker.trackGoal(0, trackData );
	this.category = '';	

	this.clear();
}

/**
 * Callback function for after tracking events have been processed. 
 */
YellPiwik.prototype.afterTrackingEventProcessed = function(obj, event, delay, name) {
	// Apparently unnecesary. Uncomment if issues do arise with double events being sent upon click
	/*var constPwik = 'piwik_ignore' ;
	if(obj.href && "" != obj.href && obj.href.indexOf('#') != 1) {
		var className = obj.className;
		if(className.indexOf(constPwik) == -1){
			className += ' ' + constPwik;
			obj.className = className;
		}
	}*/
}

/**
 * Property to define whether this analytics framework requires a wait time before leaving a page
 * in order to send events.  
 */
YellPiwik.prototype.requiresEventTimeout = false;
YellPiwik.prototype.name = HAF._int.Constants.PIWIK;
HAF._int.providers.push(YellPiwik);

})();

(function(){

	var config = (typeof HAF.config.comscore === 'undefined') ? 
			{enabled:false} : 
				HAF.config.comscore;
	
	// If disabled, no need to eval everything else.  
	if(!config.enabled)
		return;

	// Protocol distinction, set up a static prefix for URLs that call comscore
	var urlPrefix = 'http' + (document.location.href.charAt(4) == 's' ? 's://sb' : '://b');

	// Default click event name 
	var defaultEventCategory = config.defaultEventCategory || 'click';
	
	
	/**
	 * Main object, implementation of the providers interface
	 */
	function CS (){
		// configuration
		this.accountId = config.accountId;
		this.siteNS = config.siteNS;		
		this.customVars = {};
	}
	
	/**
	 * Process event list prior to sending. 
	 * @param isTrackLink
	 * @param yellEvent
	 */
	CS.prototype.process = function(isTrackLink, yellEvent) {
		
		// Grab the full chain of events. 
		var allEvents = [yellEvent]; // Create an array and add the event as 1st item
		while(yellEvent.nextEvent){
			yellEvent = yellEvent.nextEvent; // Grab next event 
			allEvents.push(yellEvent);	// push it into the array
		}
			
		// Grab all the comscore properties from all the events.
		for(var x = 0; x < allEvents.length; x++) {
			var evt = allEvents[x];
			var items = evt.getPropsFor("comscore"); // Gets the CS props in an easy to use format
			for(var y = 0; y < items.length; y ++) {
				var property = items[y];
				// Properties are split by pipe char (not useful in CS but it is for other providers)
				for(var z = 0; z < property.propertyDefinitions.length; z ++) {
					// Add the property to the custom vars obj. 
					this.customVars[property.propertyDefinitions[z]] = property.value;
				}
			}
		}
	}
	
	/**
	 * Clear event list. 
	 */
	CS.prototype.clear = function() {
		this.customVars = {};
	}
	
	/**
	 * Link tracking request is sent here. 
	 */
	CS.prototype.send = function() {
		
		var link = [urlPrefix];
		link.push('.scorecardresearch.com/p?c1=2&c2=')
		link.push(this.accountId); // Account Id is C2 parameter

		// Site is overridable
		if(!this.customVars["ns_site"]) {
			link.push('&ns_site=');
			link.push(this.siteNS); 
		}
		
		for(e in this.customVars) {
			link.push("&" + e + "=");
			link.push(encodeURIComponent(this.customVars[e]));
		}
		udm_(link.join(""));
		
	}



	// track link handler. 
	CS.prototype.processTrackLinkEvent = function(obj, trackevent, name, immediate){

		// If event tracking for CS is disabled, do nothing here. 
		if(config.ignoreInPageEvents){
			return;
		}

		// Name aka Id ('button.1', etc...)
		var eventName = null;

		// Find a property in the event that has the attribute 'comscore' set to 'eventId'
		var props = trackevent.getPropsFor('comscore');
		for(var x = 0; x < props.length; x++) {
			if(props[x].propertyDefinitions[0] === 'eventId') {
				// This is the value for the category. 
				eventName = props[x].value;
			}
		}

		// Category ('click', etc) is one of: 
		// - the event descriptor's 'comscore' attribute or 
		// - the 'name' param or 
		// - the default category (either 'click' or the one defined in config)
		var eventCategory = trackevent.getDescriptor().comscore || name || defaultEventCategory;

		// Call uid_call(a, b), where:
		//  a is the event name ('button.1'), 
		//  b is the category ('click', etc)
		uid_call(eventName, eventCategory);
	};

	// Flag that determines if the comscore js has been appended to the page. static member. 
	var jsAppended = false;

	// Function that adds the requied Comscore js, it should be added after page events are sent, 
	// according to the documentation. 
	function appendJSref() {
		if(!jsAppended) {
			var url = urlPrefix + '.scorecardresearch.com/c2/' + config.accountId + '/ct.js';
			var newScript = document.createElement("script");
			newScript.type = 'text/javascript';
			newScript.src = url;
			document.body.appendChild(newScript);
			jsAppended = true;
		}
	}

	// Add the appendJSref function as an event handler in the onload event
	// This will load the comscore js after page events are sent, just as 
	// specified by the provider. 
	if (window.addEventListener) // W3C DOM
		window.addEventListener('load',appendJSref,false);
	else if (window.attachEvent)  // IE DOM
		window.attachEvent('onload', appendJSref);	
	

	
	// Required interface attribute.
	CS.prototype.requiresEventTimeout = false;
	CS.prototype.name = HAF._int.Constants.COMSCORE;
	CS.prototype.afterTrackingEventProcessed = function(){};

	// Add to the providers list. 
	HAF._int.providers.push(CS);

	/**
	 * Comscore code, as passed in by provider. Do not edit unless provider specifies so. 
	 * Note that uid_call needs some configuration, so it is slightly modified to 
	 * use config.accountId, config.siteNS and urlPrefix. 
	 * @param a event name ('button.1'), 
	 * @param b category ('click', etc)
	 */
	function udm_(a){
		var b="comScore=",c=document,d=c.cookie,e="",f="indexOf",g="substring",h="length",i=2048,j,k="&ns_",l="&",m,n,o,p,q=window,r=q.encodeURIComponent||escape;if(d[f](b)+1)for(o=0,n=d.split(";"),p=n[h];o<p;o++)m=n[o][f](b),m+1&&(e=l+unescape(n[o][g](m+b[h])));a+=k+"_t="+ +(new Date)+k+"c="+(c.characterSet||c.defaultCharset||"")+"&c8="+r(c.title)+e+"&c7="+r(c.URL)+"&c9="+r(c.referrer),a[h]>i&&a[f](l)>0&&(j=a[g](0,i-8).lastIndexOf(l),a=(a[g](0,j)+k+"cut="+r(a[g](j+1)))[g](0,i)),c.images?(m=new Image,q.ns_p||(ns_p=m),m.src=a):c.write("<p><img src='",a,"' height='1' width='1' alt='*'></p>");
	}
	function uid_call(a, b){
		ui_c2 = config.accountId; // your corporate c2 client value
		ui_ns_site = config.siteNS; // your sites identifier
		window.b_ui_event = window.c_ui_event != null ? window.c_ui_event:"",window.c_ui_event = a;
		var ui_pixel_url = urlPrefix + '.scorecardresearch.com/p?c1=2&c2='+ui_c2+'&ns_site='+ui_ns_site+'&name='+a+'&ns_type=hidden&type=hidden&ns_ui_type='+b;
		var b="comScore=",c=document,d=c.cookie,e="",f="indexOf",g="substring",h="length",i=2048,j,k="&ns_",l="&",m,n,o,p,q=window,r=q.encodeURIComponent||escape;if(d[f](b)+1)for(o=0,n=d.split(";"),p=n[h];o<p;o++)m=n[o][f](b),m+1&&(e=l+unescape(n[o][g](m+b[h])));ui_pixel_url+=k+"_t="+ +(new Date)+k+"c="+(c.characterSet||c.defaultCharset||"")+"&c8="+r(c.title)+e+"&c7="+r(c.URL)+"&c9="+r(c.referrer)+"&b_ui_event="+b_ui_event+"&c_ui_event="+c_ui_event,ui_pixel_url[h]>i&&ui_pixel_url[f](l)>0&&(j=ui_pixel_url[g](0,i-8).lastIndexOf(l),ui_pixel_url=(ui_pixel_url[g](0,j)+k+"cut="+r(ui_pixel_url[g](j+1)))[g](0,i)),c.images?(m=new Image,q.ns_p||(ns_p=m),m.src=ui_pixel_url):c.write("<p><img src='",ui_pixel_url,"' height='1' width='1' alt='*'></p>");
	}
	// End of Comscore code

})();
(function(){
	
	// This allows to define listeners before or after framework loads
	var registeredListeners;
	// If set, it should be an array of listeners
	if('listeners' in HAF && 0 in HAF.listeners) {
		registeredListeners = HAF.listeners[0];
	}

	// A default empty operation to assign as listener operation
	var noop = function(){};

	/**
	 * Listeners that may be registered to listen for tracking events lifecycle. 
	 * Users may add callbacks by creating this namespace and filling in the callback function 
	 * attributes described in this documentation. 
	 * 
	 * @namespace HAF.listeners
	 */
	HAF.listeners = {
			/**
			 * Add an event listener object to the page, implementing any of the 
			 * other methods described in this object members documentation. 
			 * 
			 * @memberOf HAF.listeners
			 * @function
			 * @name push
			 * @param {Object} listenerObj implementing any of the methods in this API. 
			 */
			push : function(listenerObj) {
				for(var e in listenerObj){
					HAF.listeners[e] = listenerObj[e];
				}
				HAF.listeners.init(HAF.listeners.trackingCallbackEvent);				
			},
			/**
			 * Callback that will execute immediately when framework is set up.
			 * 
			 * @memberOf HAF.listeners
			 * @function
			 * @name init
			 * @param {trackingCallbackEvent}
			 * @returns {boolean} Return true if the callback must be excuted more than once. 
			 */
			init : noop,
			/**
			 * Callback that will execute before page events are sent. 
			 * 
			 * @memberOf HAF.listeners
			 * @function
			 * @name beforePageTrack
			 * @param {trackingCallbackEvent}
			*/
			beforePageTrack : noop,

			/**
			 * Callback that will execute before click events are sent. 
			 * 
			 * @memberOf HAF.listeners
			 * @function
			 * @name beforeLinkTrack
			 * @param {trackingCallbackEvent}
			 */
			beforeLinkTrack : noop			
	}
	
	/**
	 *  Listeners Event Object. Will be passed in as a parameter for listener callbacks. 
	 *  @class
	 *  @name trackingCallbackEvent
	 *  @see HAF.listeners
	 */	
	HAF.listeners.trackingCallbackEvent = {
			/**
			 *  Getter for plattform wrapper instances.  
			 *  
			 *  @memberOf trackingCallbackEvent
			 *  @name getProviders
			 *  @function
			 *  @return {Object[]} Array with all plattform handler instances. 
			 */
			getProviders : function(){ 
				return HAF._int.getPlattformInstances();
			},
			/**
			 *  Getter for the omniture tracker instance (commonly referred to as 's'). 
			 *  @memberOf trackingCallbackEvent
			 *  @name getOmnitureTracker
			 *  @function
			 *  @return {Object} Omniture tracker instance. 
			 */
			getOmnitureTracker : function() {
				var items = HAF._int.getPlattformInstances();
				for(var x = 0; x < items.length; x++) {
					if(items[x].name === HAF._int.Constants.OMNITURE)
						return items[x].ss;
				}
			}
	}

	// If listeners were registered before loading the framework they are set here. 
	if(registeredListeners)
		HAF.listeners.push(registeredListeners);
	
})();