Block Module
============

The Block module is responsible for maintaining the set of registered block handlers and for expanding blocks.

A Block is an HTML element that, when "expanded", is either replaced by a new HTML element or instructs Lucidity to perform some action (such as notify Google Analytics of a page visit).

Blocks can be embedded within HTML templates and may be used to add predefined web components (such as video players and menus) to sites.

Every block is associated with a Block Handler which is responsible for performing the action indicated by the block and may return an HTML element to replace it. 

```javascript
/*
  The Block module is responsible for defining
  the Block feature, maintaining the set of
  registered block handlers, and for expanding
  blocks.
*/

// Declares the QUnit test module.
QUnit.module ('Block');
```

Block Handlers
--------------

Block handlers may be either strings or functions.

### Block Handler Strings 

Block Handler Strings must be URLs that reference HTML templates. When applied, the Block module will load the referenced HTML template and replace the block element with the loaded HTML document.

### Block Handler Functions

Block Handler Functions must accept three arguments:

* `context`, the block expansion context as a `block_Context`
* `done`, a function that accepts two arguments: an Error object and the expanded block element as a JQuery HTML Element
* and `expand`, a function that accepts two arguments: a JQuery HTML Element and a function that does not accept any arguments  

The handler should perform some action and may either modify or replace `element`. It should pass the modified element to `done`. If it removes `element`, it should pass null or undefined to `done`. If an error occurs, it should throw a strict error and pass an error to `done` instead. 

Any function that creates a child element within `element` or modifies `element` should call `expand` to expand on the new element to expand any blocks that the child may contain along with any continuation.

The Block Handler Store Class
-----------------------------

Registered block handlers are stored in a global `block_HandlerStore` named `block_HANDLERS`. Other modules can register block handlers using `block_HANDLERS.add ()` and `block_HANDLERS.addHandlers`.

```javascript
/*
  Block Handler Stores store the registered
  block handlers and provide a safe interface
  for registering and retrieving them.
*/
function block_HandlerStore () {
  var self = this;

  /*
    An associative array of Block Handlers keyed
    by HTML class name strings. 
  */
  var _handlers = {};

  /*
    Accepts one argument: 

    * className, an HTML class name string

    and returns the first Handler in handlers
    that is associated with className. If none of
    the handlers in handlers are associated
    with className, this function returns null
    instead.
  */
  this.get = function (className) {
    return _handlers [className];
  }

  /*
    Accepts two arguments:

    * className, a string that represents an
      HTML class name
    * and handler, a Block Handler;

    and adds handler to handlers under
    className. If another handler has already
    been added to handlers under className,
    this function throws a strictError instead.
  */
  this.add = function (className, handler) {
    if (_handlers [className]) {
      return strictError (new Error ('[block][block_HandlerStore] Error: an error occured while trying to register a block handler for "' + className + '". Another block handler has already been registered for "' + className + '"'));
    }
    _handlers [className] = handler;
  }

  /*
    Accepts one argument:

    * handlers, an associative array of Block
      Handlers keyed by HTML class name strings

    and adds handlers to this._handlers. If
    any block handlers have already been added
    to this store under a class name listed
    in handlers, this function throws a strict
    error and skips the handler associated with
    the class name.
  */
  this.addHandlers = function (handlers) {
    for (var className in handlers) {
      self.add (className, handlers [className]);
    }
  }
}

/*
  Unittests for block_HandlerStore.

  Confirms that:

  * block_HandlerStore.get can retrieve handlers
    added using block_HandlerStore.add
  * block_HandlerStore.get can retrieve handlers
    added using block_HandlerStore.addHandlers
*/
QUnit.test ('block_HandlerStore', function (assert) {
  assert.expect (2);

  var store = new block_HandlerStore ();
  store.addHandlers ({
    'a': 'A',
    'f': function () { return 5; }
  });
  assert.strictEqual (store1.get ('a'), 'A', 'block_HandlerStore.get returned the correct String Block Handler added using block_HandlerStore.addHandlers.');
  assert.strictEqual (store1.get ('f')(), 5, 'block_handlerStore.get returned the correct Function Block Handler added using block_HandlerStore.addHandlers.');
});
```

The Block Handler Store
-----------------------

```javascript
/*
  A Handler Store that stores the registered
  block handlers.
*/
var block_HANDLERS = new block_HandlerStore ();
```

The Block Expansion Context Class
---------------------------------

When the Block module expands a block that has a Block Handler Function, it passes the current Block Expansion Context to the function. The Block Expansion Context stores the block element that is being expanded and the ID of the page containing this element.

Note: pages can be nested within each other so we cannot assume that every block within an HTML document is being expanded within the same page. See the Page module for more details.

Block Expansion Context are represented by `block_Context` objects.

```javascript
/*
  Accepts two arguments:

  * id, a string that represents a page ID
  * element, a JQuery Element that represents a block element

  and returns a Block Expansion Context.
*/
function block_Context (id, element) {
  this.getId = function () { return id; }
  this.element = element;
}
```

The Module Load Event Handler
-----------------------------

The Block module defines three Block types: ID blocks, Template blocks, and Quote blocks. These block types are described in more detail below. The Block module's Load Event Handler simply registers the ID and Template block types.

```javascript
/*
  Registers the ID and Template blocks when this
  module is loaded.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Register the core block handlers.
    block_HANDLERS.addHandlers ({
      'core_id_block':        block_IDBlock,
      'block_template_block': block_templateBlock
    });

    // II. Continue.
    done (null);
});
```

Block Expansion 
---------------

The heart of the Block module is its block expansion functions. The Block module defines two important expansion functions:

* `block_expandDocumentBlocks`
* and `block_expandBlock`.

`block_expandDocumentBlocks` recursively iterates over the current HTML document and expands any blocks that it finds embedded therein.

Significantly, `block_expandDocumentBlocks` uses an inner-outer depth-first search. This means that given a block element, B, it will expand any blocks nested within B before expanding B. This allows blocks to be composed by nesting them within each other. By doing so, we can pass the output of one block to another as its input.

Similarly, `block_expandBlock` recursively iterates over a given element passed to it within a Block Expansion Context. Like `block_expandDocumentBlocks`, `block_expandBlock` uses and inner-outer depth-first search to find and expand blocks.

```javascript
/*
  block_expandDocumentBlocks accepts two
  arguments:

  * id, a Resource ID string
  * and done, a function that does not accept
    any arguments.

  block_expandDocumentBlocks expands the blocks
  contained within the current page and calls
  done.

  Note: block_expandDocumentBlocks sets the
  initial block expansion context's id to id.
*/
function block_expandDocumentBlocks (id, done) {
  block_expandBlock (new block_Context (id, $(document.body)), done);
}

/*
  Unittests for block_expandDocumentBlocks.

  Confirms that block_expandDocumentBlocks:

  * will expand any blocks embedded within
    the document.
  * will expand any blocks nested within other
    blocks.
  * will expand blocks in the correct order
    (inner-outer depth-first).
*/
unittest ('block_expandDocumentBlocks',
  {
    globals: [{variableName: 'block_HANDLERS', value: new block_HandlerStore ()}],
    elements: [
      $('<div>\
         <div class="block_2">\
           <div class="block_0">7</div>\
           <div class="block_1">3</div>\
         </div>\
       </div>')
    ]
  },
  function (assert, elements) {
    assert.expect (1);

    block_HANDLERS.addHandlers ({
      block_0: function (context, done) {
        context.element.replaceWith (
          parseInt (context.element.text ().trim ()) +
          parseInt (context.getId ()));

        done (null);
      },
      block_1: function (context, done) {
        context.element.replaceWith (
          parseInt (context.element.text ().trim ()) * 2);

        done (null);
      },
      block_2: function (context, done) {
        var result = context.element.text ().trim ()
          .split (/\s+/g)
          .map (function (value) { 
              return parseInt (value.trim ());
            })
          .reduceRight (function (result, value) {
              return value / result;
            }, 1);

        context.element.replaceWith (result);
        done (null);
      }
    });

    var done = assert.async ();
    block_expandDocumentBlocks ('5', function (error) {
      assert.strictEqual (elements [0].text ().trim (), '2', 'block_expandDocumentBlock correctly expanded all of the embedded test blocks (including those that were nested) in the correct order.');
      done ();
    });
})

/*
  block_expandBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that does not accept
    any arguments.

  block_expandBlock recursively expands
  context.element and any blocks nested within
  context.element.

  If either context or context.element is undefined
  or null, block_expandBlock calls done.

  If context.element is a Quote block
  (i.e. context.element has a block_quote_block
  class attribute), this function removes the
  block_quote_block class attribute and calls
  done without expanding any blocks nested
  within context.element.

  If none of the handlers can be applied to
  context.element, block_expandPageBlock simply
  calls done.

  If an error occurs, block_expandPageBlock
  calls done.

  Note: Block handlers must pass null or undefined
  to their continuations when they remove their
  block element.

  Note: Whenever a block handler replaces a block
  element, they must pass the replacement element
  to their successful continuations.

  Note: In rare circumstances, a block handler may
  intentionally prevent the block system from
  recursing into its expanded block element
  by intentionally passing null or undefined to
  its successful continuation. This should only be
  done when the expanded block element needs to be
  parsed by an external library.
*/
function block_expandBlock (context, done) {
  if (!context || !context.element) { return done (); }

  var id = context.getId ();

  // Handle Quote blocks.
  if (context.element.hasClass ('block_quote_block')) {
    context.element.removeClass ('block_quote_block');
    return done ();
  }

  block_expandBlocks (id,
    block_getBlockElementsInElements (block_HANDLERS, context.element.children ()), 
    function () {
      var blockHandler = block_getHandler (block_HANDLERS, context.element);
      if (blockHandler) {
        // Remove the block handler's class.
        context.element.removeClass (blockHandler.name);

        // Apply the block handler.
        return block_applyBlockHandler (blockHandler.handler, context,
          function (error, expandedElement) {
            if (error) { return done (error); }

            block_expandBlock (new block_Context (id, expandedElement), done);
        });
      }
      done ();
  });
}

/*
  block_expandBlocks accepts three arguments:

  * id, an Id string
  * elements, a JQuery HTML Element array
  * and done, a function that does not accept any
    arguments.

  expandBlocks expands the blocks within elements
  and calls done.
*/
function block_expandBlocks (id, elements, done) {
  _block_expandBlocks (0, id, elements, done);
}

/*
  _block_expandBlocks accepts four arguments:

  * elementIndex, a positive integer
  * id, an Id string
  * elements, JQuery HTML Element array
  * and done, a function that does not accept any
    arguments.

  _expandBlocks starts at elementIndex and
  iterates over the remaining elements in elements
  expanding any blocks contained within each. Once
  done, _expandBlocks calls done.
*/
function _block_expandBlocks (elementIndex, id, elements, done) {
  // I. Call done when all of the elements have been expanded.
  if (elementIndex >= elements.length) {
    return done ();
  }
  // II. Expand the current element.
  block_expandBlock (new block_Context (id, elements [elementIndex]),
    function () {
      // III. Expand the remaining elements.
      _block_expandBlocks (elementIndex + 1, id, elements, done);
  });
}

/*
  Accepts two arguments:

  * handlers, a Handler Store
  * and elements, a JQuery HTML Element Set.

  and returns the block elements nested within
  elements as a JQuery HTML Element array.
*/
function block_getBlockElementsInElements (handlers, elements) {
  var blockElements = [];
  for (var i = 0; i < elements.length; i ++) {
    Array.prototype.push.apply (blockElements, block_getBlockElements (handlers, $(elements.get (i))));
  }
  return blockElements;
}

/*
  Accepts two arguments:

  * handlers, a Handler Store
  * and element, a JQuery HTML Element.

  If element is a block element, this
  function returns a singleton array containing
  element. Otherwise, this function returns
  the block elements nested within element as
  a JQuery HTML Element array.

  Note: this function does not recurse over
  block elements.
*/
function block_getBlockElements (handlers, element) {
  var handler = block_getHandler (handlers, element);
  return block_isBlockElement (handlers, element) ? [element] : block_getBlockElementsInElements (handlers, element.children ());
}

/*
  block_isBlockElement accepts two arguments:

  * handlers, a Handler Store
  * and element, a JQuery Element.

  and returns true if element is a block element
  and false otherwise.
*/
function block_isBlockElement (handlers, element) {
  var handler = block_getHandler (handlers, element);
  return handler || element.hasClass ('block_quote_block');
}

/*
  block_getHandler accepts two arguments:

  * handlers, a Handler Store
  * and element, a JQuery Element.

  block_getHandler returns the first handler
  in handlers that is associated with one of
  element's classes and returns the associated
  class in an associative array that has two
  properties:

  * handler, the handler
  * and name, the class name.

  If none of the handlers are associated
  with any of element's classes, this function
  returns null.
*/
function block_getHandler (handlers, element) {
  // I. Get the set of possible block names.
  var names = getClassNames (element);

  // II. Find the first handler in handlers associated with one of the names.
  for (var nameIndex = 0; nameIndex < names.length; nameIndex ++) {
    var name = names [nameIndex];
    var handler = handlers.get (name);
    if (handler) {
      return {handler: handler, name: name};
    }
  }

  // III. Return null if none of the handlers in handlers are associated with any of the names.
  return null;
}

/*
  block_applyBlockHandler accepts four arguments:

  * handler, a Block Handler
  * context, a Block Expansion Context
  * done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element

  block_applyBlockHandler applies handler to
  context.element and passes the result to done.
*/
function block_applyBlockHandler (handler, context, done) {
  switch ($.type (handler)) {
    case 'function':
      return handler (context, done,
        function (element, done) {
          block_expandBlock (new block_Context (context.getId (), element), done);
      });
    case 'string':
      return replaceWithTemplate (handler, context.element, done);
    default:
      var error = new Error ('[block][block_applyBlockHandler] Error: Invalid block handler. Block handlers must be either template URL strings or block handler functions.');
      strictError (error);
      return done (error);
  }
}
```

The Core Block Handlers
-----------------------

The Block module defines three core block types:

* ID blocks
  The Block module will replace any ID blocks with a text node representing the current block expansion context's page ID.

* Template blocks
  Whenever the Block module encounters a Template block, it will load the HTML template referenced by block and replace the block with the loaded template.

* Quote Blocks
  Quote blocks can be used to override the default eager evaluation strategy used by the Block Expansion algorithm. Whenever the Block module encounters a Quote block, it will remove the `block_quote_block` class attribute from the block and refrain from expanding any blocks nested within the block element until invoked again.


```javascript
/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element

  and replaces context.element with the current
  context page ID.
*/
function block_IDBlock (context, done) {
  context.element.replaceWith (context.getId ());
  done (null);
}

/*
  Unittests for block_IDBlock.

  Confirms that block_IDBlock replaces blocks
  with page IDs.
*/
unittest ('block_IDBlock',
  {
    globals: [
      {variableName: 'block_HANDLERS', value: new block_HandlerStore ()}
    ],
    elements: [
      $('<div><div class="core_id_block"></div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (1);

    block_HANDLERS.add ('core_id_block', block_IDBlock);

    var done = assert.async ();
    block_expandBlock (new block_Context (5, elements [0]),
      function (error) {
        assert.strictEqual (elements [0].text ().trim (), '5', 'block_IDBlock correctly replaced the ID block with the given page ID.');
        done ();
    });
});

/*
  block_templateBlock accepts three arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element

  context.element must contain a single text node that 
  represents an HTML document URL.

  block_templateBlock will load the referenced document, 
  replace context.element with the loaded content, and
  passes the content to done. If an error occurs,
  it will pass an error to done instead. 
*/
function block_templateBlock (context, done) {
  replaceWithTemplate (context.element.text (), context.element, done);
}

/*
  Unittests for block_templateBlock.

  Confirms that the block_templateBlock replaces
  template blocks with their given templates.
*/
unittest ('block_templateBlock',
  {
    globals: [
      {variableName: 'block_HANDLERS', value: new block_HandlerStore ()}
    ],
    elements: [
      $('<div><div class="block_template_block">modules/example/templates/block.html</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (1);

    block_HANDLERS.add ('block_template_block', block_templateBlock);

    var done = assert.async ();
    block_expandBlock (new block_Context (5, elements [0]),
      function (error) {
        assert.strictEqual ($('h2', elements [0]).text (), 'Example Block', 'block_templateBlock correctly replaced the template block with the given template.');
        done ();
    });
});
```

Auxiliary Functions
-------------------

```javascript
/*
  getBlockArguments accepts three arguments:

  * schema, an array of Block Schema objects
  * rootElement, a JQuery HTML Element
  * and done, a function that accepts two
    arguments: an Error object and a Block
    Arguments object.

  getBlockArguments finds the child elements of
  rootElement that have the argument class names
  given in schema, stores them in an associative
  array keyed by the names given in schema, and
  passes the resulting object to done.

  If any of the argument elements are listed as 
  required but none of the child elements have the
  given argument class name, this function throws a
  strict error and passes the error to done.
*/
function getBlockArguments (schema, rootElement, done) {
  var elements = {};
  for (var i = 0; i < schema.length; i ++) {
    var scheme  = schema [i];
    var element = $('> .' + scheme.name, rootElement);
    if (element.length > 0) {
      elements [scheme.name] = scheme.text ? element.text () : element;
    } else if (scheme.required) {
      var error = new Error ('[core][getBlockArguments] Error: an error occured while trying to get a required element. The "' + scheme.name + '" element is required.');
      strictError (error);
      return done (error);
    }
  }
  done (null, elements);
}

/*
  getClassNames accepts a JQuery HTML Element,
  element, and returns a string array listing
  element's class names.
*/
function getClassNames (element) {
  var classNames = element.attr ('class');
  return classNames ? classNames.split (/\s+/) : [];
}
```

Generating Source Files
-----------------------

You can generate the Block module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
### Block.js
```
_"Block Module"

_"The Block Handler Store Class"

_"The Block Handler Store"

_"The Block Expansion Context Class"

_"The Module Load Event Handler"

_"Block Expansion"

_"The Core Block Handlers"

_"Auxiliary Functions"
```
[block.js](#Block.js "save:")
-->
