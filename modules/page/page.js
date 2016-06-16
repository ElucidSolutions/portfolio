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
  */
  var _handlers = {};

  /*
  */
  this.get = function (type) {
    return _handlers [type];
  }

  /*
  */
  this.add = function (type, handler) {
    _handlers [type] = handler;
  }

  /*
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
    // I. Register the block handlers.
    block_HANDLERS.add ('page_block', page_block);

    // II. Register the page load event handler.
    PAGE_LOAD_HANDLERS.add (
      function (id, done) {
        block_expandDocumentBlocks (id, done);
    });

    // III. Register the app load event handler.
    APP_LOAD_HANDLERS.add (
      function (settings, done) {
        // Get the initial page ID.
        var id = getIdFromURL (new URI ()) || settings.defaultId;

        // Call the page load event handlers.
        PAGE_LOAD_HANDLERS.execute (id, function () { page_fadein (); });
    });

    // IV. Continue.
    done (null);
});

/*
  This function will load the referenced page
  if the browser URL hash changes.
*/
$(window).on ('hashchange', function () {
  PAGE_LOAD_HANDLERS.execute (new URI ().fragment (), function () {
    // scroll to the top of the page after page load
    $('html, body').animate ({
      scrollTop: $('#top').offset ().top
    });
  });
});

/*
  Note: page_block does not load the page
  referenced by the current context. Instead it
  registers a page load handler that replaces the
  block element when a page load event occurs.
*/
function page_block (context, done) {
  var errorMsg = '[page][page_block] Error: an error occured while trying to load a page block.';

  var element = context.element;
  PAGE_LOAD_HANDLERS.add (
    function (id, next) {
      if (!id) {
        id = context.getId ();
      }

      page_getPageElement (id,
        function (error, newElement) {
          if (error || !newElement) {
            error = new Error (error ? errorMsg + error.message : errorMsg);
            strictError (error);
            return next (error);
          }
          element.empty ();
          element.append (newElement);
          block_expandBlock (
            new block_Context (id, newElement),
            next
          );
      });
  });

  var id = context.element.text () || context.getId ();
  page_getPageElement (id,
    function (error, pageElement) {
      if (error || !pageElement) {
        error = new Error (error ? errorMsg + error.message : errorMsg);
        strictError (error);
        return done (error);
      }
      element.empty ();
      element.append (pageElement);
      block_expandBlock (
        new block_Context (id, pageElement),
        done
      );
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
      var error = new Error ('[page][page_applyPageHandler] Error: invalid page template type. Page templates must be either a string or a function.'); 
      strictError (error);
      done (error);
  }
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