Core Module
===========

Global Variables
----------------

The Core module defines a number of global variables. These variables can be divided into two groups: those that specify global configuration parameters and those that list registered block and page handlers. 

The Core module defines two global configuration parameters:

* `SETTINGS_URL`

  `SETTINGS_URL` specifies the location of the Configuration Settings file.

* `STRICT_ERROR_MODE`

  `STRICT_ERROR_MODE` indicates whether or not Lucidity should try to recover gracefully from errors or report them immediately. This parameter is set by the `errorMode` element in the Configuration Settings file. 

The remaining global variables store the registered block and page handlers. Whenever a module defines a block or page handler, the module's load event handler must register the block or page handler by calling `registerBlockHandler` or `registerPageHandler` respectively. These functions add entries to `BLOCK_HANDLERS` and `PAGE_HANDLERS`.

Both variables are associative arrays keyed by name. See "Page Handlers" and "Block Handlers" below for more details about page and block handlers.

```javascript
// Specifies the settings file URL. 
var SETTINGS_URL = 'settings.xml';

/*
  The global STRICT_ERROR_MODE variable indicates
  whether or not the system should exit and return
  an error message or try to recover silently from
  non-critical errors. This variable is set by the
  "errorMode" parameter in settings.xml.
*/
var STRICT_ERROR_MODE = true;

/*
*/
var currentId = 0;
```

The Module Load Handlers Store Class
------------------------------------

```javascript
/*
  Module Load Handler Stores store the loaded
  module initialization functions.
*/
function ModuleLoadHandlers () {
  // A Module Load Handler array.
  var _handlers = [];

  /*
    Accepts one argument: handler, a Module Load
    Handler; and adds handler to this store.
  */
  this.add = function (handler) { _handlers.push (handler); }

  /*
    Accepts one argument: done, a function;
    and calls all of the Module Load Handlers
    stored in this store before calling done.
  */
  this.execute = function (done) {
    async.series (_handlers, done);
  }
}
```

The Module Load Handlers Store
------------------------------

```javascript
/*
  A ModuleLoadHandlers that stores the registered
  Module Load Handlers.
*/
var MODULE_LOAD_HANDLERS = new ModuleLoadHandlers ();
```

The App Load Handlers Store Class
---------------------------------

```javascript
/*
*/
function AppLoadHandlers () {
  //
  var _handlers = [];

  /*
  */
  this.add = function (handler) { _handlers.push (handler); }

  /*
  */
  this.execute = function (settings, done) {
    async.applyEachSeries (_handlers, settings, done);
  }
}
```

The App Load Handlers Store
---------------------------

```javascript
/*
*/
var APP_LOAD_HANDLERS = new AppLoadHandlers ();
```

The Load Event Handler
----------------------

The Core module's load event handler runs when the site is loaded. This function performs five operations:

1. it loads the configuration settings specified in settings.xml
2. it loads the modules listed as enabled in settings.xml
3. and lastly, it loads the default page.

```javascript
/*
  The Document Ready event handler. This function
  loads the modules that have been enabled in
  settings.xml and initializes the user interface
  by expanding any blocks that have been embedded
  within the current page.
*/
$(document).ready (function () {
  // I. Load the configuration settings.
  loadSettings (function (settings) {
    // II. Load the enabled modules.
    loadModules (settings, function () {
      // III. Update the error mode.
      STRICT_ERROR_MODE = settings.errorMode;

      // IV. Call the module load event handlers.
      MODULE_LOAD_HANDLERS.execute (function () {
        // V. Call the app load event handlers.
        APP_LOAD_HANDLERS.execute (settings, function () {});
      });
    });
  });
});
```

Load Settings
-------------

The load event handler uses `loadSettings` to load and parse settings.xml, and return the configuration settings.

```javascript
/*
  loadSettings accepts one argument: done, a 
  function that accepts a Settings object. It 
  parses the settings.xml file and passes the 
  result to done.
*/
function loadSettings (done) {
  $.ajax (SETTINGS_URL, {
    dataType: 'xml',
    success: function (doc) {
      done (parseSettings (doc));
    },
    error: function (request, status, error) {
      throw new Error ('[core][loadSettings] Critical Error: an error occured while trying to load "settings.xml". ' + error);
    }
  });
}

/*
  parseSettings accepts one argument: doc, a JQuery
  HTML DOM Document. doc must represent a valid
  Settings document. This function parses doc and
  returns a Settings object that represents it.  
*/
function parseSettings (doc) {
  return {
    errorMode: $('errorMode', doc).text () === 'strict',
    defaultId: $('defaultId', doc).text (),
    theme:     $('theme', doc).text (),
    modules:   $('module', doc).map (function (moduleIndex, moduleElement) {
      return {
        name:    $(moduleElement).attr ('name'),
        enabled: $(moduleElement).attr ('enabled') === 'true',
        url:     $(moduleElement).attr ('url')
      };
    }).toArray ()
  };
}
```

Load Modules
------------

Once the configuration settings have been loaded from settings.xml, the load event handler uses `loadModules` to load the modules that have been listed as enabled within settings.xml.

```javascript
/*
  loadModules accepts two arguments: settings, a
  Settings object; and done, a function. It
  loads the modules declared in settings, and 
  calls done after they have all been loaded If
  an error occurs while trying to load one of the
  modules, this function will throw a strict error
  and continue on to the next one.
*/
function loadModules (settings, done) {
  // I. Add the main module to the modules list.
  settings.modules.push ({
    name:    'main',
    enabled: true,
    url:     'index.js'
  });

  // II. Load the module files in the modules list.
  async.eachSeries (settings.modules,
    function (module, next) {
      module.enabled ? loadScript (module.url, next) : next ();
    },
    done
  );
}

/*
  loadScript accepts two arguments:

  * url, a URL string
  * and done, a function that accepts one
    argument: error, an Error.

  It loads the script referenced by url and calls
  done. If an error occurs, this function throws
  a strict error and calls done.
*/
function loadScript (url, done) {
  $.getScript (url)
    .done (function () { done (null); })
    .fail (function (jqxhr, settings, exception) {
        var error = new Error ('[core][loadScript] Error: an error occured while trying to load "' + url + '".');
        strictError (error);
        done (error);
      });
}

/*
  loadScripts accepts two arguments:

  * urls, an array of URL strings
  * and done, a function that accepts one
    argument: error, an Error

  loads the scripts referenced by urls and calls
  done. If any of these scripts fails to load,
  this function throws a strict error and calls
  done without loading the remaining scripts.
*/
function loadScripts (urls, done) {
  async.eachSeries (urls, loadScript,
    function (error) {
      if (error) {
        strictError (new Error ('[core][loadScripts] Error: an error occured while trying to load one or more scripts. ' + error.message));
        done (error);
      }
      done (null);
  });
}
```

Auxiliary Functions
-------------------

```javascript
/*
  replaceWithTemplate accepts four arguments:

  * url, a URL string
  * element, a JQuery HTML Element
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element

  replaceWithTemplate replaces element with
  the HTML element referenced by url and passes
  referenced element to done.

  If an error occurs, replaceWithTemplate passes
  an Error object to done instead.
*/
function replaceWithTemplate (url, element, done) {
  getTemplate (url,
    function (error, template) {
      if (error) { return done (error); }

      element.replaceWith (template);
      done (null, template);
  });
}

/*
  getTemplate accepts three arguments:

  * url, a URL string
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element

  getTemplate loads the HTML template element
  referenced by url and passes it to done.

  If an error occurs, getTemplate throws a strict
  error and passes an error to done instead.
*/
function getTemplate (url, done) {
  $.get (url,
    function (html) {
      var template = $(html);
      done (null, template);
    },
    'html'
    ).fail (function () {
      var error = new Error ('[core][getTemplate] Error: an error occured while trying to load a template from "' + url + '".');
      strictError (error);
      done (error);
    });
}

/*
  strictError accepts one argument: error, an Error
  object. If the error mode has been set to strict,
  this function throws an exception with the given
  error. Note: the error mode is set by setting
  the "errorMode" parameter in settings.xml.
*/
function strictError (error) {
  if (STRICT_ERROR_MODE) {
    throw (error);
  } else {
    console.log (error.message);
  }
}

/*
  loadPage accepts three arguments:

  * id, a Page ID string

  loadPage triggers a Page Load Event using id
  as the page ID.
*/
function loadPage (id) {
  // I. Load the referenced page.
  // Note: The hashchange event handler is
  // responsible for actually loading the page
  // at this point.
  document.location.href = getContentURL (id);
}

/*
  getContentLink accepts two arguments:

  * id, a Resource ID String 
  * and label, an optional JQuery HTML Element.

  getContentLink returns a JQuery HTML Element
  that represents an HTML link to the resource
  referenced by id.

  getContentLink adds a click event handler to
  the link element that replaces Main Content
  element with the resource referenced by id.
*/
function getContentLink (id, label) {
  var link = $('<a></a>').attr ('href', getContentURL (id));
  return label ? link.html (label) : link;
}

/*
  getContentURL accepts a URI string, id, and
  returns a URL string that references the entry
  referenced by id.

  Note: Every valid id must be a URI string. The
  host must equal the name of the module that
  defined the content type and the first query
  parameter must equal the content type.
*/
function getContentURL (id) {
  return new URI ('').hash (id).toString ();
}

/*
  getIdFromURL accepts a Content URL as a URI and
  returns its ID parameter.
*/
function getIdFromURL (url) {
  return (url.fragment ().split ('#'))[0];
}

/*
  Accepts a Content URL as a URI object and
  returns the nested fragment identifier as
  a string.

  Note: ID's may contain nested fragment
  identifiers which can be used to create
  fragment links within pages.
*/
function getFragmentFromURL (url) {
  return (url.fragment ().split ('#'))[1];
}

/*
  getContentType accepts an Id string and returns
  the content type associated with the resource
  referenced by the id string.
*/
function getContentType (id) {
  var type = new URI (id).segmentCoded (0);
  if (!type) {
    strictError (new Error ('[core][getContentType] Error: "' + id + '" is an invalid id. The "type" path parameter is missing.'));
    return null;
  }
  return type;
}

/*
  getUniqueId returns an HTML id that is unique
  w.r.t the current document.
*/
function getUniqueId () {
  while ($('#id' + currentId).length > 0) {
    currentId ++;
  }
  return 'id' + (currentId ++);
}
```

### Generating Source Files

You can generate the Core module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Core.js
```
_"Global Variables"

_"The Module Load Handlers Store Class"

_"The Module Load Handlers Store"

_"The App Load Handlers Store Class"

_"The App Load Handlers Store"

_"The Load Event Handler"

_"Load Settings"

_"Load Modules"

_"Auxiliary Functions"
```
[core.js](#Core.js "save:")
-->
