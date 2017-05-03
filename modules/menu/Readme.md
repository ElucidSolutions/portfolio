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

  If an error occurs in menu_contentsBlock, it 
  passes the error to done.

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

      // I. Load the menu node referenced by menu_id
      var node = menu.getNode (blockArguments.menu_node_id.trim ());
      if (!node) {
        var error = new Error ('[menu][menu_contentsBlock] Error: an error occured while trying to load node "' + blockArguments.menu_node_id.trim () + '". The node does not exist.');
        strictError (error);
        return done (error);
      }

      /*
        II. Create a new HTML element that 
        represents the node using the settings
        provided by context.element
      */
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

      /*
        III. Replace context.element with the new
        element
      */
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

      // IV. Pass the element to done
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

  If an error occurs, menu_leafLabelBlock passes
  the error to done and returns done. Otherwise
  it passes the element to done.
*/
function menu_leafLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafLabelBlock]';

  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /*
        II. Create an HTML element that represents
        the element's title
      */
      var element = leaf.getLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
      done (null, element);
  });
}

/*
  menu_leafLinkBlock accepts two arguments:

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

  If an error occurs, menu_leafLinkBlock passes
  the error to done and returns done. Otherwise
  it passes the element to done.
*/
function menu_leafLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafLinkBlock]';

  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load the references menu element
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

      /* 
        II. Creates an HTML link element that 
        represents the menu element's title
      */
      var element = leaf.getLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_leafNextLabelBlock passes
  the error to done and returns done. Otherwise
  it passes the element to done.
*/
function menu_leafNextLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafNextLabelBlock]';

  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        the title of the next leaf in the 
        referenced menu
      */
      var element = leaf.getNextLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_leafNextLabelBlock passes
  the error to done and returns done. Otherwise
  it passes the element to done.
*/
function menu_leafNextLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafNextLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        a link to the next leaf in the referenced
        menu
      */
      var element = leaf.getNextLinkElement ();

      /* 
        II. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_leafParentLabelBlock 
  passes the error to done and returns done. 
  Otherwise it passes the element to done.
*/
function menu_leafParentLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafParentLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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
      /* 
        II. Create an HTML element that represents
        the title of the referenced leaf's parent
      */
      var element = leaf.getParentLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_leafParentLinkBlock 
  passes the error to done and returns done. 
  Otherwise it passes the element to done.
*/
function menu_leafParentLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafParentLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        a link to the referenced leaf's parent
      */
      var element = leaf.getParentLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_leafPreviousLabelBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done.  
*/
function menu_leafPreviousLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_leafPreviousLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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
      /* 
        II. Create an HTML element that represents
        the title of the previous leaf in the
        referenced menu
      */      
      var element = leaf.getPreviousLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done      
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

  If an error occurs, menu_leafPreviousLinkBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done. 
*/
function menu_leafPreviousLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_leafPreviousLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_leaf_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        a link to the previous leaf in the 
        referenced menu
      */
      var element = leaf.getPreviousLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */      
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_nodeLabelBlock passes
  the error to done and returns done. Otherwise
  it passes the element to done. 
*/
function menu_nodeLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        the menu node's title
      */
      var element = node.getLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */      
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_nodeLinkBlock passes 
  the error to done and returns done. Otherwise
  it passes the element to done. 
*/
function menu_nodeLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that links to
        the menu node
      */
      var element = node.getLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_nodeNextLabelBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done.
*/
function menu_nodeNextLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeNextLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        the title of the next leaf in the
        referenced menu
      */
      var element = node.getNextLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  If an error occurs, menu_nodeNextLinkBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done. 
*/
function menu_nodeNextLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeNextLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        a link to the next leaf in the referenced
        menu
      */
      var element = node.getNextLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */      
      context.element.replaceWith (element);


// IV. Pass the new element to done
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

  If an error occurs, menu_nodeParentLabelBlock
  passes the error to done and returns done.
  Otherwise it passes the element to done. 
*/
function menu_nodeParentLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeParentLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        the title of the referenced node's parent
      */
      var element = node.getParentLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);
      
      // IV. Pass the new element to done
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

  If an error occurs, menu_nodeParentLinkBlock
  passes the error to done and returns done.
  Otherwise it passes the element to done. 
*/
function menu_nodeParentLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodeParentLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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


      /* 
        II. Create an HTML element that represents
        a link to the referenced node's parent
      */
      var element = node.getParentLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  * The first must belong to the menu_id class
    and contain a single text node representing
    a menu ID.
  * The second must belong to the menu_node_id
    class and contain a single text node
    representing a menu node ID.

  If an error occurs, menu_nodePreviousLabelBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done. 
*/
function menu_nodePreviousLabelBlock (context, done) {
  var errorPrefix = '[menu][menu_nodePreviousLabelBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        the title of the previous leaf
      */
      var element = node.getPreviousLabelElement ();

      /* 
        III. Replace context.element with the new
        element
      */      
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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
    representing a menu leaf ID.

  If an error occurs, menu_nodePreviousLabelBlock
  passes the error to done and returns done. 
  Otherwise it passes the element to done.
*/
function menu_nodePreviousLinkBlock (context, done) {
  var errorPrefix = '[menu][menu_nodePreviousLinkBlock]';
  getBlockArguments ([
      {'name': 'menu_id',      'text': true, 'required': true},
      {'name': 'menu_node_id', 'text': true, 'required': true}
    ],
    context.element,

    // I. Load referenced menu element
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

      /* 
        II. Create an HTML element that represents
        a link to the previous leaf in the 
        referenced menu
      */
      var element = node.getPreviousLinkElement ();

      /* 
        III. Replace context.element with the new
        element
      */
      context.element.replaceWith (element);

      // IV. Pass the new element to done
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

  * parent, a menu_Element instance
  * id, a Menu Element ID string
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
  Accepts no arguments and returns an integer
  representing the index of the menu_Element
  instance among it siblings.
*/
menu_Element.prototype.getIndex = function () {
  if (!this.parent) { return null; }

  for (var i = 0; i < this.parent.children.length; i ++) {
    if (this.parent.children [i].id === this.id) { return i; }
  }

  /* 
    If the menu_Element instance is not found,
    throw a strict error and return null
  */
  strictError (new Error ('[menu][menu_Element.getIndex] Error: the "' + this.id + '" menu element references a parent ("' + this.parent.id + '") that does not list "' + this.id + '" as a child.'));
  return null;
}

/*
  Accepts no arguments and returns a boolean
  representing whether or not the menu_Element
  instance is the first child of its parent.
*/
menu_Element.prototype.isFirstChild = function () {
  return this.parent && this.parent.getFirstChild ().id === this.id;
}

/*
  Accepts no arguments and returns a boolean
  representing whether or not the menu_Element
  instance is the last child of its parent.
*/
menu_Element.prototype.isLastChild = function () {
  return this.parent && this.parent.getLastChild ().id === this.id;
}

/*
  Accepts no arguments and returns a menu_Element 
  instance representing the next sibling of the
  object, if it exists. 
*/
menu_Element.prototype.getNextSibling = function () {
  // Return null if no parent exists
  if (!this.parent) { return null; }

  var i = this.getIndex () + 1;

  // Return null if no next sibling exists
  return this.parent.children.length > i ? this.parent.children [i] : null;
}

/*
  Accepts no arguments and returns a menu_Element 
  instance representing the previous sibling of
  the object.
*/
menu_Element.prototype.getPreviousSibling = function () {
  // Return null if no parent exists
  if (!this.parent) { return null; }

  var i = this.getIndex () - 1;
  // Return null if no previous sibling exists
  return i >= 0 ? this.parent.children [i] : null;
}

/*
  Accepts no arguments. Returns the next
  menu_Element if it exists, and null if not.
*/
menu_Element.prototype.getNext = function () {

  // I. If the object has no parent, return null
  if (!this.parent) { return null; }

  // II. If no next sibling, return its parent
  var successor = this.getNextSibling ();
  if (!successor) { return this.parent; }

  /*
    III. If next item is a menu_Node with 
    children, return the first child of menu_Node
  */
  while (successor instanceof menu_Node && successor.children.length > 0) {
    successor = successor.getFirstChild ();
  }

  // IV. Otherwise return next sibling
  return successor;
}

/*
  Accepts no arguments. Returns the preceding
  menu_Element if it exists, and null if not.
*/
menu_Element.prototype.getPrevious = function () {
  /*
    I. If the object is a menu_Node and has
    children, return its last child
  */
  if (this instanceof menu_Node && this.children.length > 0) {
    return this.getLastChild ();
  }

  // II. If it has no parent, return null
  if (!this.parent) { return null; }

  /*
    III. Recurse up the tree until it finds
    first ancestor of this element with a 
    previous sibling, and returns that sibling.
  */
  var element = this;
  while (element.isFirstChild ()) {
    element = element.parent;
    if (!element.parent) { return null; }
  }
  return element.getPreviousSibling ();
}

/*
  Accepts no arguments. Returns the closest
  following instance of menu_Element.
*/
menu_Element.prototype.getNextLeaf = function () {
  var element = this.getNext ();
  while (element && element instanceof menu_Node) {
    element = element.getNext ();
  }
  return element;
}

/*
  Accepts no arguments. Returns the closest
  preceding instance of menu_Element.
*/
menu_Element.prototype.getPreviousLeaf = function () {
  var element = this.getPrevious ();
  while (element && element instanceof menu_Node) {
    element = element.getPrevious ();
  }
  return element;
}

/*
  Accepts no arguments. Returns a an array 
  representing the parent's path if the 
  menu_Element has a parent, and an empty array
  if not.
*/
menu_Element.prototype.getAncestors = function () {
  return this.parent ? this.parent.getPath () : [];
}

/*
  Accepts no arguments. Returns an array
  representing the menu_Element's ancestors
  as well as the menu_Element instance itself.
*/
menu_Element.prototype.getPath = function () {
  var ancestors = this.getAncestors ();
  ancestors.push (this);
  return ancestors;
}

/* 
  Accepts no arguments. Returns an integer
  representing the level of the menu_Element
  instance as determined by the length of its 
  path.
*/
menu_Element.prototype.getLevel = function () {
  return this.getPath ().length;
}

/*
  Accepts no arguments, and returns an array
  consisting of the IDs of the items that make up
  the menu_Element instance's path.
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
  Accepts one argument, element, a jQuery HTML 
  Element. Returns that element with additional
  HTML attributes.
*/
menu_Element.prototype.addAttributes = function (element) {
  return element
    .addClass (this.classes)
    .attr ('data-menu-id', this.id)
    .attr ('data-menu-level', this.getLevel ());
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML 
  structure of an instance of menu_Element.
*/
menu_Element.prototype.getLabelElement = function () {
  return this.addAttributes (
    $('<span></span>')
      .addClass ('menu_label')
      .addClass ('menu_title')
      .html (this.title));
}

/*
  Accepts one argument, id, a Menu Element ID 
  string. Generates and returns a jQuery HTML
  Element representing the HTML structure of the
  instance of menu_Element.
*/
menu_Element.prototype.getLinkElement = function (id) {
  return this.addAttributes (
    $('<a></a>')
      .addClass ('menu_link')
      .addClass ('menu_title')
      .attr ('href', getContentURL (id))
      .html (this.title));
}

/*
  Accepts two arguments:
  * numColumns, an integer
  * depth, an integer

  Generates and returns a jQuery HTML Element 
  representing the HTML structure of an instance
  of menu_Element.
*/
menu_Element.prototype.getContentsItemElement = function (numColumns, depth) {
  return this.addAttributes ($('<li></li>').addClass ('menu_contents_item'));
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML text
  structure of the parent of menu_Element if it
  exists, and null if not.
*/
menu_Element.prototype.getParentLabelElement = function () {
  return this.parent ? this.parent.getLabelElement () : null;
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML link
  structure of the parent of menu_Element if it
  exists, and null if not.
*/
menu_Element.prototype.getParentLinkElement = function () {
  return this.parent ? this.parent.getLinkElement () : null;
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML text
  structure of the next sibling of menu_Element
  if it exists, and null if not.
*/
menu_Element.prototype.getNextLabelElement = function () {
  var element = this.getNextLeaf ();
  return element ? element.getLabelElement () : null;
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML link
  structure of the next sibling of menu_Element 
  if it exists, and null if not.
*/
menu_Element.prototype.getNextLinkElement = function () {
  var element = this.getNextLeaf ();
  return element ? element.getLinkElement () : null;
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML text
  structure of the previous sibling of 
  menu_Element if it exists, and null if not.
*/
menu_Element.prototype.getPreviousLabelElement = function () {
  var element = this.getPreviousLeaf ();
  return element ? element.getLabelElement () : null;
}

/*
  Accepts no arguments. Generates and returns a
  jQuery HTML Element representing the HTML link
  structure of the previous sibling of 
  menu_Element if it exists, and null if not.
*/
menu_Element.prototype.getPreviousLinkElement = function () {
  var element = this.getPreviousLeaf ();
  return element ? element.getLinkElement () : null;
}
```

The Leaf Class
--------------

The Leaf class defines the basic block elements and functions for leaves. They are the final descendants of their parent elements and have no children.

```javascript
/*
  Accepts three arguments:
  * parent, a menu_Element instance
  * id, a Menu Element ID string
  * title, a string
  * classes, an array of strings

  and returns a menu_Leaf object.
*/
function menu_Leaf (parent, id, title, classes) {
  menu_Element.call (this, parent, id, title, classes);
}

/*
  Create a new prototype object for menu_Leaf and
  set menu_Element's prototype as the object's
  prototype.
*/
menu_Leaf.prototype = Object.create (menu_Element.prototype);

/*
  Assign the menu_Leaf prototype's constructor
  property so that any functions that read it can
  determine which constructor function was used 
  to create its instance objects.
*/
menu_Leaf.prototype.constructor = menu_Leaf;

/*
  Accepts no arguments and returns the menu_Leaf
  instance.
*/
menu_Leaf.prototype.getFirstLeaf = function () {
  return this;
}

/*
  Accepts one argument, id, a Menu Element ID
  string. Returns the menu_Leaf instance if it
  matches the id, and null if not.
*/
menu_Leaf.prototype.getLeaf = function (id) {
  return this.id === id ? this : null;
}

/*
  Accepts one argument, id, a Menu Element ID
  string. Returns null, to indicate that the object
  instance is not a node.
*/
menu_Leaf.prototype.getNode = function (id) {
  return null;
}

/*
  Accepts no arguments, and returns a jQuery HTML
  Element representing the HTML text structure of
  the menu_Leaf instance.
*/
menu_Leaf.prototype.getLabelElement = function () {
  return menu_Element.prototype.getLabelElement.call (this).addClass ('menu_leaf_label');
}

/*
  Accepts no arguments, and returns a jQuery HTML
  Element representing the HTML link structure of
  the menu_Leaf instance.
*/
menu_Leaf.prototype.getLinkElement = function () {
  return menu_Element.prototype._getLinkElement.call (this, this.id).addClass ('menu_leaf_link');
}

/*
  Accepts two arguments:
  * numColumns, an integer
  * depth, an integer

  Generates and returns a jQuery HTML Element 
  representing the HTML structure of an instance
  of menu_Leaf.
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
  Accepts three arguments:
  * parent, a menu_Element instance
  * id, a Menu Element ID string
  * title, a string
  * children, an array of menu_Element instances
  * classes, an array of strings

  and returns an instance of the menu_Node class,
  a subclass of menu_Element.
*/
function menu_Node (parent, id, title, children, classes) {
  menu_Element.call (this, parent, id, title, classes);
  this.children = children;
}

/*
  Create a new prototype object for menu_Node and
  set menu_Element's prototype as the object's
  prototype.
*/
menu_Node.prototype = Object.create (menu_Element.prototype);

/*
  Assign the menu_Node prototype's constructor
  property so that functions that any functions
  that read it can determine which constructor
  function was used to create its instance
  objects.
*/
menu_Node.prototype.constructor = menu_Node;

/*
  Accepts one argument, id. Iterates through
  menu_Node's children and returns an instance
  of menu_Leaf who matches the given id if it
  exists, and null if none is found.
*/
menu_Node.prototype.getLeaf = function (id) {
  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getLeaf (id);
    if (element) { return element; }
  }
  return null;
}

/*
  Accepts one argument, id. Returns the menu_Node
  instance if it matches the id; otherwise, 
  iterates through its children and returns an
  instance of menu_Leaf who matches the given id
  if it exists. If no child has the id either,
  returns null.
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
  Accepts no arguments. Iterates through
  menu_Node's children and returns the first leaf
  found. If none is found, returns null.
*/
menu_Node.prototype.getFirstLeaf = function () {
  for (var i = 0; i < this.children.length; i ++) {
    var leaf = this.children [i].getFirstLeaf ();
    if (leaf) { return leaf; }
  }
  return null;
}

/*
  Accepts no arguments. Returns menu_Node's first
  child, or null if no child exists.
*/
menu_Node.prototype.getFirstChild = function () {
  return this.children.length > 0 ? this.children [0] : null;
}

/*
  Accepts no arguments. Returns menu_Node's last
  child, or null if no child exists.
*/
menu_Node.prototype.getLastChild = function () {
  return this.children.length > 0 ? this.children [this.children.length - 1] : null;
}

/*
  Accepts no arguments, and returns a jQuery HTML
  Element representing the HTML text structure of
  the menu_Node instance.
*/
menu_Node.prototype.getLabelElement = function () {
  return menu_Element.prototype.getLabelElement.call (this).addClass ('menu_node_label');
}

/*
  Accepts no arguments, and returns a jQuery HTML
  Element representing the HTML link structure of
  the menu_Node instance.
*/
menu_Node.prototype.getLinkElement = function () {
  var leaf = this.getFirstLeaf ();
  return leaf ? this._getLinkElement (leaf.id) :
                this.getLabelElement ();
}

/*
  Accepts two arguments:
  * numColumns, an integer
  * depth, an integer

  Returns a jQuery HTML Element representing the
  the structure of menu_Node, plus its children if
  the depth is 1 or greater.
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
  Accepts two arguments:
  * numColumns, an integer
  * depth, an integer

  Returns a jQuery HTML Element representing the
  the structure of menu_Node, plus generations of
  its descendants equal to the given depth (e.g.
  just children if depth is 1, children and 
  grandchildren if it is 2, etc.).
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
  Accepts one argument, children, an array of
  menu_Elementinstances. Returns a menu_Menu
  object. 
*/
function menu_Menu (children) {
  this.children = children;
}

/*
  Accepts one argument, id. Iterates through
  menu_Menu's children and returns an instance
  of menu_Leaf who matches the given id if it
  exists, and null if none is found.
*/
menu_Menu.prototype.getLeaf = function (id) {
  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getLeaf (id);
    if (element) { return element; }
  }
  return null;
}

/*
  Accepts one argument, id. Iterates through
  menu_Menu's children and returns an instance
  of menu_Node who matches the given id if it
  exists, and null if none is found.
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
  Accepts two arguments:
  * numColumns, an integer
  * elements, an array of menu_Element instances

  Returns an array of jQuery HTML Objects, equal
  in length to the given numColumns, with the
  number of elements divided evenly among them.
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
  Accepts two arguments:
  * id, a Menu Element ID string
  * element, a menu_Element instance

  Generates the HTML structure for that element
  for display in the menu. Returns undefined.
*/
function menu_select (id, element) {
  $('.menu_contents_item[data-menu-id="' + id + '"]', element)
    .addClass ('menu_selected');
}

/*
  Accepts one argument, element, a menu_Element
  instance. Alters element's HTML structure to
  adopt the classes for an unselected menu item
  and returns undefined.
*/
function menu_deselect (element) {
  $('.menu_selected', element).removeClass ('menu_selected');
  $('.menu_selected_line', element).removeClass ('menu_selected_line');
}

/*
  Accepts two arguments:
  * level, an integer
  * element, a menu_Element instance

  Closes any menu items within element that are
  deeper than the level given. Returns undefined.
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
  Accepts two arguments:
  * line, an array of strings
  * element, a menu_Element instance

  Displays the children of any menu items with 
  IDs identical to a value within line. Returns
  undefined.
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
  Accepts two arguments:
  * line, an array of strings
  * element, a menu_Element instance

  Adds the selected class to any menu items with 
  IDs identical to a value within line. Returns
  undefined.
*/
function menu_selectLine (line, element) {
  for (var i = 0; i < line.length; i ++) {
   $('.menu_contents_item[data-menu-id="' + line [i] + '"]', element)
     .addClass ('menu_selected_line'); 
  }
}

/*
  Accepts three arguments:
  * expandLevel, an integer
  * maxLevel, an integer
  * element, a menu_Element instance

  For every menu item in element with a level
  tha is both greater than expandLevel and less
  than maxLevel, adds a click event that toggles
  its collapse.
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
