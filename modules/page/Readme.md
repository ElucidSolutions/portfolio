Page Module
===========

The Page module allows other modules to define page handlers, which create page elements, and page load event handlers, which the Page module calls whenever it loads a new page.

```javascript
/*
  The Page module allows other modules to define
  page handlers, which create page elements, and
  page load event handlers, which run whenever
  the Page module loads a new page.
*/
```

The Page Module Settings
------------------------

```javascript
/*
  The Page module stores its configuration
  settings in an XML file named
  `settings.xml`. The global `page_SETTINGS_URL`
  variable specifies the location of this file.
*/
var page_SETTINGS_URL = 'modules/page/settings.xml';

/*
  The Page module loads its configuration
  settings from an XML file named `settings.xml`
  and stores them in this Page Settings object.
*/
var page_SETTINGS = null;
```

The Page Load Handler Store Class
---------------------------------

The Page module defines the Page Load Event and allows other modules to register Page Load Event Handlers.

A Page Load Event handler is a function that accepts two arguments: `id`, a page ID that represents the page being loaded; and `done`, a function that accepts one argument, an Error object.

Whenever the Page module loads a new page, it will execute all of the registered page load event handlers and pass the ID of the page being loaded to them.

Each load event handler must call `done` when finished  executing and may pass an error to `done` to abort the page load.

Registered page load event handlers are stored in a global `PageloadHandlerStore` variable named `PAGE_LOAD_HANDLERS`.

Other modules can register page load event handlers using `PAGE_LOAD_HANDLERS.add ()`.

```javascript
/*
  Page Load Handler Stores store the registered
  Page Load Handlers and provide a safe interface
  for registering and retrieving them.
*/
function PageLoadHandlerStore () {
  // A Page Load Handler array.
  var _handlers = [];

  /*
    Accepts one argument: handler, a Page Load
    Handler; and adds handler to this store.
  */
  this.add = function (handler) { _handlers.push (handler); }

  /*
    Accepts one argument: handlers, a Page
    Load Handler array; and adds handlers to
    this store.
  */
  this.addHandlers = function (handlers) {
    Array.prototype.push (_handlers, handlers);
  }

  /*
    Accepts two arguments:

    * id, a page ID string
    * and done, a function

    calls all of the Page Load Handlers stored
    in this store on id and calls done.
  */
  this.execute = function (id, done) {
    async.applyEach (_handlers, id, done);
  }
}
```

The Page Load Handler Store
---------------------------

```javascript
/*
  A PageLoadHandlerStore that stores the
  registered Page Load Handlers.
*/
var PAGE_LOAD_HANDLERS = new PageLoadHandlerStore ();
```

The Page Handler Store Class
----------------------------

Every page handler is associated with a page type. Whenever, Lucidity tries to load a page, it determines the page's type, and passes the page ID to the page handler associated with the page's type. The page handler then either creates or references the HTML element that represents the page. 

There are two types of page handlers:

* Page Handler Strings are URL string that reference HTML templates. 

* Page Handler Functions are functions that accept two arguments: id, a page ID; and done, a function that, in turn, accepts two arguments: an Error object; and a JQuery HTML Element; and passes the HTML element that represents the referenced page to done.

Registered page handlers are stored in a global `PageHandlerStore` variable named `page_HANDLERS`.

Other modules can register page handlers by adding them to `page_HANDLERS` using `page_HANDLERS.add ()`.

```javascript
/*
  Page Handler Stores store registered Page
  Handlers which are responsible for generating
  the page HTML output.
*/
function page_HandlerStore () {
  var self = this;

  /*
    A Page Handler associative array keyed by
    page type.
  */
  var _handlers = {};

  /*
    Accepts one argument: type, a string that
    represents a page type; and returns the Page
    Handler associated with it.
  */
  this.get = function (type) {
    return _handlers [type];
  }

  /*
    Accepts two arguments:

    * type, a string that represents a page type
    * and handler, a Page Handler

    and registers handler as a Page Handler
    associated with type.
  */
  this.add = function (type, handler) {
    if (_handlers [type]) {
      return strictError (new Error ('[page][page_HandlerStore] Error: an error occured while trying to register a page handler for "' + type + '". Another handler has already been registered for "' + type + '".'));
    }
    _handlers [type] = handler;
  }

  /*
    Accepts one argument: handlers, an
    associative array of Page Handlers keyed by
    page type; and registers the page handlers
    in handlers.
  */
  this.addHandlers = function (handlers) {
    for (var type in handlers) {
      self.add (type, handlers [type]);
    } 
  }
}
```

The Page Handler Store
----------------------

```javascript
/*
  A page_HandlerStore that stores the set of
  registered page handlers.
*/
var page_HANDLERS = new page_HandlerStore ();
```

The Module Load Event Handler
-----------------------------

```javascript
/*
  The module's load event handler. This function:

  * registers the page_block Block Handler
  * registers the page load event handler that
    outputs page HTML
  * registers an app load event handler that
    loads the default page when the app is loaded
  * and calls its continuation before returning
    undefined.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the module's settings.
    page_loadSettings (page_SETTINGS_URL,
      function (error, settings) {
        if (error) { return done (error); }

        // II. Store the page settings.
        page_SETTINGS = settings;

        // III. Register the block handlers.
        block_HANDLERS.add ('page_block', page_block);

        // IV. Register the page load event handler.
        PAGE_LOAD_HANDLERS.add (
          function (id, done) {
            block_expandDocumentBlocks (id, done);
        });

        // V. Register the app load event handler.
        APP_LOAD_HANDLERS.add (
          function (appSettings, done) {
            var url = new URI ();

            // Get the initial page ID.
            var id = getIdFromURL (url) || settings.default_page_id;

            // Call the page load event handlers.
            PAGE_LOAD_HANDLERS.execute (id, function () {
              // Fade in
              page_fadein ();

              // scroll to the top of the page after page load
              page_scroll (url);
            });
        });

        // VI. Continue.
        done (null);
    });
});
```

The Load Settings Function
--------------------------

The Load event handler calls `page_loadSettings` to load the module's settings.

```javascript
/*
  page_loadSettings accepts two arguments:

  * url, a URL string
  * done, a function that accepts an Error object
    and a Page Settings object

  page_loadSettings loads and parses the Page
  Settings document referenced by url and passes
  the result to done. If an error occurs, it
  throws a strict error and passes the error to
  done instead.
*/
function page_loadSettings (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, page_parseSettings (doc));
    },
    error: function (request, status, error) {
      var error = new Error ('[page][page_loadSettings] Error: an error occured while trying to load the Page module\'s settings.xml file from "' + url + '". ' + error);
      strictError (error);
      done (error);
    }
  });
}

/*
  page_parseSettings accepts an XML Document
  string that represents an Page Settings
  Document, parses the document, and returns an
  Page Settings object.
*/
function page_parseSettings (doc) {
  return {
    'default_page_id':     $('settings > default_page_id', doc).text (),
    'error_page_template': $('settings > error_page_template', doc).text ()
  };
}
```

The Hash Change Event Handler
-----------------------------

The Core module defines a Hash Change event handler. Whenever the browser URL hash changes, this event handler calls the registered page load event handlers.

```javascript
/*
  This function will load the referenced page
  if the browser URL hash changes.
*/
$(window).on ('hashchange', function () {
  var url = new URI ();
  PAGE_LOAD_HANDLERS.execute (getIdFromURL (url), function () {
    // scroll to the top of the page after page load
    page_scroll (url);
  });
});
```

The Page Block Handler
----------------------

```javascript
/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object; and a jQuery
    HTML Element.

  context.element may contain a single text node
  representing a page ID.

  If context.element contains a single text
  node representing a page ID, this function
  will load the page referenced by this ID,
  replace the contents of context.element with
  the loaded page element; and pass the page
  element to done.

  If context.element is empty, this function will
  load the current page ID, replace the contents
  of context.element with the loaded page
  element, and pass the page element to done.

  If context.element is empty and the current
  page ID is blank, this function will load
  the default page ID specified in the Page
  Module Settings.

  If the default page ID is blank, this function
  will simply empty context.element and call
  done.

  If a page handler returns an error while trying
  to load a page, this function will throw a
  strict error, load the Error Page template,
  replace any page_error_blocks nested within
  the template with the error message returned
  by the page handler, replace the contents of
  context.element with the resulting element,
  and call done.

  If an error occurs while trying to load the
  Error Page template, this function will pass
  the error to done.
*/
function page_block (context, done) {
  var element = context.element;
  PAGE_LOAD_HANDLERS.add (
    function (id, next) {
      if (!id) {
        id = context.getId ();
      }
      if (!id) {
        element.empty ();
        return next (null);
      }

      page_setPageElement (element, id,
        function (error, pageElement) {
          if (error) { return next (error); }

          block_expandBlock (new block_Context (id, pageElement), next); 
      });
  });

  var id = context.element.text () || context.getId ();
  if (!id) {
    element.empty ();
    return done (null);
  }

  page_setPageElement (element, id, done);
}
```

Auxiliary Functions
-------------------

```javascript
/*
  Accepts three arguments:

  * containerElement, a jQuery HTML Element
  * id, a Page ID
  * and done, a function that accepts two
    arguments: an Error object; and a jQuery
    HTML Element

  loads the page referenced by ID, replaces the
  contents of containerElement with the page
  element, and passes the page element to done.

  If the page handler called on id returns
  an error, this function throws a strict error,
  loads the Error Page template, replaces any
  page_error_blocks nested within the template
  with the error message, and replaces the
  contents of containerElement with this element
  instead.

  If an error occurs while trying to load the
  error page template, this function throws
  a strict error and passes the error to done
  instead.
*/
function page_setPageElement (containerElement, id, done) {
  page_getPageElement (id,
    function (error, pageElement) {
      if (error) {
        error = new Error ('[page][page_setPageElement] Error: an error occured while trying to load a page element. ' + error.message);
        strictError (error);

        return page_getErrorPageElement (error,
          function (errorPageError, errorPageElement) {
            if (errorPageError) { return done (errorPageError); }

            containerElement.empty ();
            containerElement.append (errorPageElement);
            done (error);
        });
      }
      
      containerElement.empty ();
      containerElement.append (pageElement);
      done (null, pageElement);
  });
}

/*
  page_getPageElement accepts three arguments:

  * id, a Resource ID string
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element

  page_getPageElement passess done the page
  of the resource referenced by id without
  expanding any blocks that may be embedded
  within it.

  If none of the page handlers can handle the
  give ID, page_getPageElement passes null
  to done.

  If an error occurs, page_getPageElement passes 
  the error to done.
*/
function page_getPageElement (id, done) {
  var handler = page_HANDLERS.get (getContentType (id));
  handler ? page_applyPageHandler (handler, id, done) : done (null, null);
}

/*
  page_applyPageHandler accepts four arguments:

  * handler, a Page Handler
  * id, a resource id
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  page_applyPageHandler applies handler to id and
  passes the returned element to done.

  If an error occurs, page_applyPageHandler
  throws a strict error and passes the error
  to done.
*/
function page_applyPageHandler (handler, id, done) {
  switch ($.type (handler)) {
    case 'function':
      return handler (id, done);
    case 'string':
      return getTemplate (handler, done);
    default:
      var error = new Error ('[page][page_applyPageHandler] Error: invalid page handler type. Page handlers must be either a string or a function.'); 
      strictError (error);
      done (error);
  }
}

/*
  Accepts two arguments:

  * error, an Error object
  * and done, a function that accepts two
    arguments: an Error object; and a JQuery
    HTML Element

  loads the Error Page template referenced by
  the Page Module's configuration settings,
  replaces the local Page Error blocks in the
  template with the given error's message;
  and passes the resulting element to done.

  If an error occurs, this function passes the
  error to done instead.
*/
function page_getErrorPageElement (error, done) {
  getTemplate (page_SETTINGS.error_page_template,
    function (errorPageError, template) {
      if (errorPageError) {
        return done (new Error ('[page][page_getErrorPageElement] Error: an error occured while trying to load the Error Page template. ' + errorPageError.message), null);
      }

      $('.page_error_block', template).replaceWith (error.message);
      done (null, template);
  });
} 

/*
*/
function page_fadeout () {
  $('#overlay').fadeIn (250, function () {});
}

/*
*/
function page_fadein () {
  $('#overlay').fadeOut (250, function () {});
}

/*
  Accepts one argument: url, a URI object that
  represents the current page URL; and scrolls
  the viewport to either the top of the page or
  the element referenced by the nested fragment
  identifier (if any).
*/
function page_scroll (url) {
  var fragmentId = getFragmentFromURL (url) || 'top';
  var fragmentElement = $('#' + fragmentId);

  fragmentElement.length === 0 ?
    strictError (new Error ('[page][page_scroll] Warning: This page does not have an element whose ID equals "' + fragmentId + '".')) :
    $('html, body').animate ({
      scrollTop: fragmentElement.offset ().top
    });
}
```

The Page Module Settings File
-----------------------------

The Page module's settings file is named settings.xml. The default settings can be found here: [settings.xml.default](#The Page Module Settings File "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<settings>
  <!--
    The default_page_id element specifies the
    default page ID. When the Page module loads
    a page and the page's URL does not include a
    page ID, the Page module will load the page
    referenced here.

    If this parameter is left blank, the Page
    module will simply return index.html without
    loading anything and call the Page Load
    event handlers.
  -->
  <default_page_id></default_page_id>

  <!--
    If a page handler returns an error while
    trying to render a page, the Page module
    will load the HTML template referenced by
    the error_page_template element, replace
    any page_error_blocks embedded within the
    template with the error message, and return
    it instead.

    This parameter should be a relative URL that
    references an HTML template.
  -->
  <error_page_template>modules/page/templates/error_page.html</error_page_template>
</settings>
```

The Page Module Settings File Schema
------------------------------------

The Page module's settings file must conform to the following XML schema. This schema can be found in [settings.xsd](#The Page Module Settings File Schema "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- Define the root element -->
  <xs:element name="settings">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="default_page_id" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <xs:element name="error_page_template" type="xs:anyURI" minOccurs="1" maxOccurs="1"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

The Error Page Template
-----------------------

If a page handler returns an error while trying to render a page, the Page module will load the HTML template referenced by the error_page_template element, replace any page_error_blocks embedded within the template with the error message, and return it instead.

The default error page template can be found here: [templates/error_page.html.default](#The Error Page Template "save:").

```html
<div class="error_page">
  <h1>Oops...</h1>
  <p>An error occured while we were trying to load the page.</p>
  <div class="error_details">
    <h2>Details</h2>
    <div class="page_error_block"/>
  </div>
</div>
```

Generating Source Files
-----------------------

You can generate the Page module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Page.js
```
_"Page Module"

_"The Page Module Settings"

_"The Page Load Handler Store Class"

_"The Page Load Handler Store"

_"The Page Handler Store Class"

_"The Page Handler Store"

_"The Module Load Event Handler"

_"The Load Settings Function"

_"The Hash Change Event Handler"

_"The Page Block Handler"

_"Auxiliary Functions"
```
[page.js](#Page.js "save:")
-->
