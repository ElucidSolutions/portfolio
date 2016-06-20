/*
  The Page module allows other modules to define
  page handlers, which create page elements, and
  page load event handlers, which run whenever
  the Page module loads a new page.
*/

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

/*
  A PageLoadHandlerStore that stores the
  registered Page Load Handlers.
*/
var PAGE_LOAD_HANDLERS = new PageLoadHandlerStore ();

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

/*
  A page_HandlerStore that stores the set of
  registered page handlers.
*/
var page_HANDLERS = new page_HandlerStore ();

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