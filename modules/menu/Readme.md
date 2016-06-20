Menu Module
===========

The Menu module provides developers with a way to organize content into tree-like structures composed of nodes and leafs.

The Menu module is defined by menu.js. This file defines the module's base classes, block handlers, and load event handler. The opening to this file reads.

```javascript
/*
  The Menu module provides developers with a way
  to organize content into tree-like structures
  composed of nodes and leafs.
*/
```

The Global Variables
--------------------

```javascript
/*
  The `menu_MENUS` menu_Menu array lists the
  set of registered menus keyed by menu ID.
*/
var menu_MENUS = {};
```

The Load Event Handler
----------------------

```javascript
/*
  The Menu module's load event handler. This
  function registers the module's block handlers.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Register the block handlers.
    block_HANDLERS.addHandlers ({
      menu_contents_block:            menu_contentsBlock,
      menu_leaf_label_block:          menu_leafLabelBlock,
      menu_leaf_link_block:           menu_leafLinkBlock,
      menu_leaf_next_label_block:     menu_leafNextLabelBlock,
      menu_leaf_next_link_block:      menu_leafNextLinkBlock,
      menu_leaf_parent_label_block:   menu_leafParentLabelBlock,
      menu_leaf_parent_link_block:    menu_leafParentLinkBlock,
      menu_leaf_previous_label_block: menu_leafPreviousLabelBlock,
      menu_leaf_previous_link_block:  menu_leafPreviousLinkBlock,
      menu_node_label_block:          menu_nodeLabelBlock,
      menu_node_link_block:           menu_nodeLinkBlock,
      menu_node_next_label_block:     menu_nodeNextLabelBlock,
      menu_node_next_link_block:      menu_nodeNextLinkBlock,
      menu_node_parent_label_block:   menu_nodeParentLabelBlock,
      menu_node_parent_link_block:    menu_nodeParentLinkBlock,
      menu_node_previous_label_block: menu_nodePreviousLabelBlock,
      menu_node_previous_link_block:  menu_nodePreviousLinkBlock
    });

    done ();
});
```

The Block Handlers
------------------

The Menu module defined five block handlers. The most important of these is the Menu Contents block which returns an HTML element that represents a given menu node.

```javascript
/*
  menu_contentsBlock accepts two arguments:

  * context, a Block Expansion Context

  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains seven child elements:

  * The first element must belong to the
    menu_id class and contain a single text node
    representing a menu ID.

  * The second element must belong to the
    menu_node_id class and contain a single text
    node representing a menu node ID.

  * The third element must belong to the
    menu_num_columns class and contain a single
    text node specifying the number of columns
    that the menu element will be divided into.

  * The fourth element must belong to the
    menu_max_level class and contain an integer
    value specifying the maximum number of menu
    levels to include in the menu element.

  * The fifth element must belong to the
    max_expand_level class and contains an
    integer value specifying the maximum number
    of menu levels to initially display in the
    menu element.

  * The sixth element must belong to the
    menu_expandable class and must contain a
    single boolean value of "true" or "false". This
    element indicates whether or not users should
    be able to expand and collapse menu items
    beyond the max_expand_level.

  * and the seventh element must belong to the
    menu_selected_element_id class and contain a
    single text node representing the initially
    selected element ID.
  

  menu_contentsBlock:

  * loads the menu node referenced by menu_id

  * creates a new HTML element that represents
    the node using the settings provided by
    context.element

  * replaces context.element with the new element

  * and passes the element to done.

  If an error occurs, menu_contentsBlock passes
  the error to done instead.
*/
function menu_contentsBlock (context, done) {
  getBlockArguments ([
      {'name': 'menu_id',                  'text': true, 'required': true},
      {'name': 'menu_node_id',             'text': true, 'required': true},
      {'name': 'menu_num_columns',         'text': true, 'required': true},
      {'name': 'menu_max_level',           'text': true, 'required': true},
      {'name': 'menu_expand_level',        'text': true, 'required': true},
      {'name': 'menu_expandable',          'text': true, 'required': true},
      {'name': 'menu_selected_element_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error ('[menu][menu_contentsBlock] Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ());
      if (!node) {
        var error = new Error ('[menu][menu_contentsBlock] Error: an error occured while trying to load node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getContentsElement (
        blockArguments.menu_num_columns.trim (),
        blockArguments.menu_max_level.trim ()
      );

      var level = parseInt (blockArguments.menu_expand_level.trim ()) + 1;
      menu_collapse (level, element);

      if (blockArguments.menu_expandable === 'true') {
        menu_makeCollapsable (level, blockArguments.menu_max_level.trim (), element);
      }

      var leaf = menu.getLeaf (blockArguments.menu_selected_element_id.trim ());
      if (leaf) {
        var line = leaf.getLine ();

        menu_select     (blockArguments.menu_selected_element_id.trim (), element);
        menu_selectLine (line, element);

        if (blockArguments.menu_expandable.trim () === 'true') {
          menu_expandLine (line, element);
        }
      }

      context.element.replaceWith (element);

      PAGE_LOAD_HANDLERS.add (
        function (id, done) {
          menu_deselect (element);
          var leaf = menu.getLeaf (id);
          if (leaf) {
            var newLine = leaf.getLine ();
            menu_select     (id, element);
            menu_selectLine (newLine, element);
            menu_expandLine (newLine, element);
          }
          done (null);
      });

      done (null, element);
  });
}

/*
  menu_leafLabelBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    element's title
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafLabelBlock passes
  the error to done instead.
*/
function menu_leafLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafLabelBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafLinkBlock:

  * loads the referenced menu element
  * creates an HTML link element that represents
    the menu element's title
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafLinkBlock passes
  the error to done instead.
*/
function menu_leafLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafNextLabelBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafNextLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    title of the next leaf in the referenced menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafNextLabelBlock
  passes the error to done instead.
*/
function menu_leafNextLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafNextLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getNextLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafNextLinkBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafNextLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the next leaf in the referenced menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafNextLinkBlock
  passes the error to done instead.
*/
function menu_leafNextLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafNextLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getNextLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafParentLabelBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafParentLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    title of the referenced leaf's parent
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafParentLabelBlock
  passes the error to done instead.
*/
function menu_leafParentLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafParentLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getParentLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafParentLinkBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafParentLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the referenced leaf's parent
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafParentLinkBlock
  passes the error to done instead.
*/
function menu_leafParentLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafParentLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getParentLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafPreviousLabelBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafPreviousLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    title of the previous leaf in the referenced
    menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafPreviousLabelBlock
  passes the error to done instead.
*/
function menu_leafPreviousLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafPreviousLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getPreviousLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_leafPreviousLinkBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_leaf_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_leafPreviousLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the previous leaf in the referenced
    menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafPreviousLabelBlock
  passes the error to done instead.
*/
function menu_leafPreviousLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafPreviousLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var leaf = menu.getLeaf (blockArguments.menu_leaf_id.trim ())
      if (!leaf) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu leaf "' + blockArguments.menu_leaf_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = leaf.getPreviousLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeLabelBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  menu_nodeLabelBlock:

  * loads the referenced menu element
  * creates an HTML label element that represents
    the menu node's title
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodeLabelBlock passes
  the error to done instead.
*/
function menu_nodeLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The leaf does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeLinkBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  menu_nodeLinkBlock:

  * loads the referenced menu element
  * creates an HTML link element that links to
    the menu node.
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodeLinkBlock passes
  the error to done instead.
*/
function menu_nodeLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeNextLabelBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_nodeNextLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    title of the next leaf in the referenced menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodeNextLabelBlock
  passes the error to done instead.
*/
function menu_nodeNextLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeNextLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getNextLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeNextLinkBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_nodeNextLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the next leaf in the referenced menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodeNextLinkBlock
  passes the error to done instead.
*/
function menu_nodeNextLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeNextLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getNextLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeParentLabelBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  menu_nodeParentLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents the
    title of the referenced node's parent
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_leafParentLabelBlock
  passes the error to done instead.
*/
function menu_nodeParentLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeParentLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getParentLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodeParentLinkBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  menu_nodeParentLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the referenced node's parent
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodeParentLinkBlock
  passes the error to done instead.
*/
function menu_nodeParentLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeParentLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getParentLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodePreviousLabelBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  menu_nodePreviousLabelBlock:

  * loads referenced menu element
  * creates an HTML element that represents
    the title of the previous leaf
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodePreviousLabelBlock
  passes the error to done instead.
*/
function menu_nodePreviousLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodePreviousLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getPreviousLabelElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}

/*
  menu_nodePreviousLinkBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must be a DIV element that
  contains two child elements.

  * The first, must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second, must belong to the menu_node_id
    class and contain a single text node
    representing a menu leaf ID.

  menu_nodePreviousLinkBlock:

  * loads referenced menu element
  * creates an HTML element that represents a
    link to the previous leaf in the referenced
    menu
  * replaces context.element with the new element
  * and passes the new element to done.

  If an error occurs, menu_nodePreviousLinkBlock
  passes the error to done instead.
*/
function menu_nodePreviousLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodePreviousLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      var menu = menu_MENUS [blockArguments.menu_id.trim ()];
      if (!menu) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu "' + blockArguments.menu_id.trim () + '". The menu does not exist.');
        strictError (error);
        return done (error);
      }

      var node = menu.getNode (blockArguments.menu_node_id.trim ())
      if (!node) {
        var error = new Error (errorPrefix + ' Error: an error occured while trying to load menu node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      var element = node.getPreviousLinkElement ();
      context.element.replaceWith (element);
      done (null, element);
  });
}
```

The Element Class
-----------------

The Element class defines a base class for both the Leaf and Node classes.

```javascript
/*
  The menu_Element class is a base class for both
  the menu_Leaf and menu_Node classes. It
  represents generic menu elements.

  The menu_Element function accepts four
  arguments:

  * parent, a menu_Element
  * id, a Menu Element ID
  * title, a string
  * and classes, a string.

  Note: If parent is not null, it must be a
  menu Node that contains this element in its
  children array.
*/
function menu_Element (parent, id, title, classes) {
  this.parent         = parent;
  this.id             = id;
  this.title          = title;
  this.classes        = classes;
}

/*
  getFirstLeaf returns the first menu_Leaf within
  the menu tree represented by this element.
*/
// menu_Element.prototype.getFirstLeaf = function () {}

/*
  getNode accepts a Menu Element ID and returns
  the first menu_Node within the menu tree
  represented by this element that has the
  given ID.
*/
// menu_Element.prototype.getNode = function (id) {}

/*
  getLeaf accepts a Menu Element ID and returns
  the first menu_Leaf within the menu tree
  represented by this element that has the
  given ID.
*/
// menu_Element.prototype.getLeaf = function (id) {}

/*
  getLinkElement returns a JQuery HTML Element that represents a link
*/
// menu_Element.prototype.getLinkElement = function () {}

/*
*/
menu_Element.prototype.getIndex = function () {
  if (!this.parent) { return null; }

  for (var i = 0; i < this.parent.children.length; i ++) {
    if (this.parent.children [i].id === this.id) { return i; }
  }
  strictError (new Error ('[menu][menu_Element.getIndex] Error: the "' + this.id + '" menu element references a parent ("' + this.parent.id + '") that does not list "' + this.id + '" as a child.'));
  return null;
}

/*
*/
menu_Element.prototype.isFirstChild = function () {
  return this.parent && this.parent.getFirstChild ().id === this.id;
}

/*
*/
menu_Element.prototype.isLastChild = function () {
  return this.parent && this.parent.getLastChild ().id === this.id;
}

/*
*/
menu_Element.prototype.getNextSibling = function () {
  if (!this.parent) { return null; }

  var i = this.getIndex () + 1;
  return this.parent.children.length > i ? this.parent.children [i] : null;
}

/*
*/
menu_Element.prototype.getPreviousSibling = function () {
  if (!this.parent) { return null; }

  var i = this.getIndex () - 1;
  return i >= 0 ? this.parent.children [i] : null;
}

/*
*/
menu_Element.prototype.getNext = function () {
  if (!this.parent) { return null; }

  var successor = this.getNextSibling ();
  if (!successor) { return this.parent; }

  while (successor instanceof menu_Node && successor.children.length > 0) {
    successor = successor.getFirstChild ();
  }
  return successor;
}

/*
*/
menu_Element.prototype.getPrevious = function () {
  if (this instanceof menu_Node && this.children.length > 0) {
    return this.getLastChild ();
  }

  if (!this.parent) { return null; }

  var element = this;
  while (element.isFirstChild ()) {
    element = element.parent;
    if (!element.parent) { return null; }
  }

  return element.getPreviousSibling ();
}

/*
*/
menu_Element.prototype.getNextLeaf = function () {
  var element = this.getNext ();
  while (element && element instanceof menu_Node) {
    element = element.getNext ();
  }
  return element;
}

/*
*/
menu_Element.prototype.getPreviousLeaf = function () {
  var element = this.getPrevious ();
  while (element && element instanceof menu_Node) {
    element = element.getPrevious ();
  }
  return element;
}

/*
*/
menu_Element.prototype.getAncestors = function () {
  return this.parent ? this.parent.getPath () : [];
}

/*
*/
menu_Element.prototype.getPath = function () {
  var ancestors = this.getAncestors ();
  ancestors.push (this);
  return ancestors;
}

/*
*/
menu_Element.prototype.getLevel = function () {
  return this.getPath ().length;
}

/*
*/
menu_Element.prototype.getLine = function () {
  var line = [];
  var path = this.getPath ();
  for (var i = 0; i < path.length; i ++) {
    line.push (path [i].id);
  };
  return line;
}

/*
*/
menu_Element.prototype.addAttributes = function (element) {
  return element
    .addClass (this.classes)
    .attr ('data-menu-id', this.id)
    .attr ('data-menu-level', this.getLevel ());
}

/*
*/
menu_Element.prototype.getLabelElement = function () {
  return this.addAttributes (
    $('<span></span>')
      .addClass ('menu_label')
      .addClass ('menu_title')
      .html (this.title));
}

/*
*/
menu_Element.prototype._getLinkElement = function (id) {
  return this.addAttributes (
    $('<a></a>')
      .addClass ('menu_link')
      .addClass ('menu_title')
      .attr ('href', getContentURL (id))
      .html (this.title));
}

/*
*/
menu_Element.prototype.getContentsItemElement = function (numColumns, depth) {
  return this.addAttributes ($('<li></li>').addClass ('menu_contents_item'));
}

/*
*/
menu_Element.prototype.getParentLabelElement = function () {
  return this.parent ? this.parent.getLabelElement () : null;
}

/*
*/
menu_Element.prototype.getParentLinkElement = function () {
  return this.parent ? this.parent.getLinkElement () : null;
}

/*
*/
menu_Element.prototype.getNextLabelElement = function () {
  var element = this.getNextLeaf ();
  return element ? element.getLabelElement () : null;
}

/*
*/
menu_Element.prototype.getNextLinkElement = function () {
  var element = this.getNextLeaf ();
  return element ? element.getLinkElement () : null;
}

/*
*/
menu_Element.prototype.getPreviousLabelElement = function () {
  var element = this.getPreviousLeaf ();
  return element ? element.getLabelElement () : null;
}

/*
*/
menu_Element.prototype.getPreviousLinkElement = function () {
  var element = this.getPreviousLeaf ();
  return element ? element.getLinkElement () : null;
}
```

The Leaf Class
--------------

The Leaf class defines the basic block elements and functions for leaves.

```javascript
/*
*/
function menu_Leaf (parent, id, title, classes) {
  menu_Element.call (this, parent, id, title, classes);
}

/*
*/
menu_Leaf.prototype = Object.create (menu_Element.prototype);

/*
*/
menu_Leaf.prototype.constructor = menu_Leaf;

/*
*/
menu_Leaf.prototype.getFirstLeaf = function () {
  return this;
}

/*
*/
menu_Leaf.prototype.getLeaf = function (id) {
  return this.id === id ? this : null;
}

/*
*/
menu_Leaf.prototype.getNode = function (id) {
  return null;
}

/*
*/
menu_Leaf.prototype.getLabelElement = function () {
  return menu_Element.prototype.getLabelElement.call (this).addClass ('menu_leaf_label');
}

/*
*/
menu_Leaf.prototype.getLinkElement = function () {
  return menu_Element.prototype._getLinkElement.call (this, this.id).addClass ('menu_leaf_link');
}

/*
*/
menu_Leaf.prototype.getContentsItemElement = function (numColumns, depth) {
  return menu_Element.prototype.getContentsItemElement.call (this, numColumns, depth)
    .addClass ('menu_contents_leaf_item')
    .append (this.getLinkElement ());
}
```

The Node Class
-----------------

Nodes are elements that may contain other elements.

```javascript
/*
*/
function menu_Node (parent, id, title, children, classes) {
  menu_Element.call (this, parent, id, title, classes);
  this.children = children;
}

/*
*/
menu_Node.prototype = Object.create (menu_Element.prototype);

/*
*/
menu_Node.prototype.constructor = menu_Node;

/*
*/
menu_Node.prototype.getLeaf = function (id) {
  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getLeaf (id);
    if (element) { return element; }
  }
  return null;
}

/*
*/
menu_Node.prototype.getNode = function (id) {
  if (this.id === id) { return this; }

  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getNode (id);
    if (element) { return element; }
  }
  return null;
}

/*
*/
menu_Node.prototype.getFirstLeaf = function () {
  for (var i = 0; i < this.children.length; i ++) {
    var leaf = this.children [i].getFirstLeaf ();
    if (leaf) { return leaf; }
  }
  return null;
}

/*
*/
menu_Node.prototype.getFirstChild = function () {
  return this.children.length > 0 ? this.children [0] : null;
}

/*
*/
menu_Node.prototype.getLastChild = function () {
  return this.children.length > 0 ? this.children [this.children.length - 1] : null;
}

/*
*/
menu_Node.prototype.getLabelElement = function () {
  return menu_Element.prototype.getLabelElement.call (this).addClass ('menu_node_label');
}

/*
*/
menu_Node.prototype.getLinkElement = function () {
  var leaf = this.getFirstLeaf ();
  return leaf ? this._getLinkElement (leaf.id) :
                this.getLabelElement ();
}

/*
*/
menu_Node.prototype.getContentsItemElement = function (numColumns, depth) {
  var element = menu_Element.prototype.getContentsItemElement.call (this, numColumns, depth)
    .addClass ('menu_node_contents_item');

  return depth === 0 ? 
    element.append (this.getLinkElement ()) :
    element
      .append (this.getLabelElement ())
      .append (this.getContentsElement (numColumns, depth));
}

/*
*/
menu_Node.prototype.getContentsElement = function (numColumns, depth) {
  var element = this.addAttributes ($('<ol></ol>').addClass ('menu_contents'));
  if (depth === 0) { return element; }

  for (var i = 0; i < this.children.length; i ++) {
    element.append (this.children [i].getContentsItemElement (numColumns, depth - 1));
  }
  return element;
}
```

The Menu Class
--------------

```javascript
/*
*/
function menu_Menu (children) {
  this.children = children;
}

/*
*/
menu_Menu.prototype.getLeaf = function (id) {
  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getLeaf (id);
    if (element) { return element; }
  }
  return null;
}

/*
*/
menu_Menu.prototype.getNode = function (id) {
  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getNode (id);
    if (element) { return element; }
  }
  return null;
}
```

Auxiliary Functions
-------------------

```javascript
/*
*/
function menu_columnate (numColumns, elements) {
  var columns = [];
  var numElements = elements.length / numColumns;
  for (var i = 0; i < numColumns; i ++) {
    columns.push (
      $('<div></div>')
        .addClass ('menu_column')
        .append (elements.slice (i * numElements, (i + 1) * numElements)));
  }
  return columns;
}

/*
*/
function menu_select (id, element) {
  $('.menu_contents_item[data-menu-id="' + id + '"]', element)
    .addClass ('menu_selected');
}

/*
*/
function menu_deselect (element) {
  $('.menu_selected', element).removeClass ('menu_selected');
  $('.menu_selected_line', element).removeClass ('menu_selected_line');
}

/*
*/
function menu_collapse (level, element) {
  $('.menu_contents_item', element).each (
    function (itemElementIndex, itemElement) {
      itemElement = $(itemElement);
      if (itemElement.attr ('data-menu-level') >= level) {
        itemElement.addClass ('menu_collapsed');
        $('> .menu_contents', itemElement).hide ();
      }
  });
}

/*
*/
function menu_expandLine (line, element) {
  for (var i = 0; i < line.length; i ++) {
    $('.menu_contents_item[data-menu-id="' + line [i] + '"]', element)
      .removeClass ('menu_collapsed')
      .children ('.menu_contents')
        .show ();
  }
}

/*
*/
function menu_selectLine (line, element) {
  for (var i = 0; i < line.length; i ++) {
   $('.menu_contents_item[data-menu-id="' + line [i] + '"]', element)
     .addClass ('menu_selected_line'); 
  }
}

/*
*/
function menu_makeCollapsable (expandLevel, maxLevel, element) {
  $('.menu_contents_item', element).each (
    function (itemElementIndex, itemElement) {
      itemElement = $(itemElement);
      var level = parseInt (itemElement.attr ('data-menu-level'));
      if (level >= expandLevel && level <= maxLevel) {
        var linkElement = $('> .menu_node_label', itemElement);
        linkElement.click (
          function (event) {
            event.preventDefault ();
            itemElement.toggleClass ('menu_collapsed');
            $('> .menu_contents', itemElement).slideToggle ();
        });
      }
  });
}
```

Generating Source Files
-----------------------

You can generate the Menu module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Menu.js
```
_"Menu Module"

_"The Global Variables"

_"The Load Event Handler"

_"The Block Handlers"

_"The Element Class"

_"The Leaf Class"

_"The Node Class"

_"The Menu Class"

_"Auxiliary Functions"
```
[menu.js](#Menu.js "save:")
-->
