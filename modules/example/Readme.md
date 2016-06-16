Example Module
==============

The Example module provides a simple example module for Lucidity. This module defines a simple block handler and a simple page handler. 

### Initialization

The Example module is defined by [example.js](#Initialization "save:") which consists of a single function call:

```javascript
/*
  The module load event handler. This function
  registers the module's block and page handlers.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Register the block handler.
    block_HANDLERS.add ('example_block', 'modules/example/templates/block.html');

    // II. Register the page handler.
    page_HANDLERS.add ('example_page', 'modules/example/templates/page.html');

    done (null);
});
```

This code is executed when the module is loaded and is responsible for registering the module's page and block handlers.

### Block Handler

Both the block and page handlers use template files. The block handler template is located here: [templates/block.html](#Block Handler "save:"), and consists of an HTML Div element that contains a link to the Example page.

```html
<div>
  <h2>Example Block</h2>
  <p>This element was inserted by the Example block handler.</p>
  <a href="index.html#example_page">Example Page</a>
</div>
```

### Page Handler

Similary, the page handler is located here: [templates/page.html](#Page Handler "save:"), and displays returns the standard "header", and "body" elements nested within a "main-content" element. The body element includes an example block.

```html
<div id="main-content">
  <div id="header"></div>
  <div id="body">
    <div class="example_block"></div>
  </div>
</div>
```

### Generating the Example module.

The Example module's source files can be generated from this article using [Literate Programming](https://github.com/jostylr/literate-programming). To generate these source files, simply execute: `literate-programming 'Readme.md'` from the command line.
