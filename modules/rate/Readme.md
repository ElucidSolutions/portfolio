Rate Module
===========

### Introduction

The Rate module defines a simple page rating block that expands into two buttons, an up-vote and a down-vote button. When users click on these buttons, the rate module sends an Up Vote/Down Vote Event notification to Google Analytics. This feature allows site administrators to determine how useful users find pages on their site.

The module is defined by rate.js which opens with:

```javascript
/*
  The Rate module defines a simple page rating
  system. This module creates two blocks that
  expand into up-vote/down-vote buttons. When users
  click on these buttons, they trigger a Google
  Analytics hit event.

  This module depends on the Analytics module.
*/
```

### The Load Event Handler

The module's load event handler simply registers the module's block handlers. The module defines three block handlers:

1. the Rate block handler
2. the Up Vote block handler
3. and, the Down Vote block hander. 

```javascript
/*
  The module's load event handler. This function
  registers the module's block handlers.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Register the block handlers.
    block_HANDLERS.addHandlers ({
      rate_block:           'modules/rate/templates/rate_block.html',
      rate_up_vote_block:   rate_upVoteBlock,
      rate_down_vote_block: rate_downVoteBlock
    });

    done (null);
});
```

### The Rate Block Handler

The Rate block handler replaces Rate blocks with the HTML element defined in **templates/rate_block.html**. By default, this element prompts the user to rate the current page and presents the user with two buttons, an up-vote and a down-vote button.

The default Rate block template is presented below:

```html
<div class="rate">
  <script>
    function rate_replaceParentWithMessage (element) {
      $(element).parent ().fadeOut ('slow',
        function () {
          $(this).html ('<em>Thank you for your feedback!</em>').fadeIn ('slow');
      });
    }
  </script>
  <p>
    <em>Was the information in this section helpful?</em>
    <span class="rate_up_vote_block rate_up_vote" onclick="rate_replaceParentWithMessage (this);">Yes</span>/
    <span class="rate_down_vote_block rate_down_vote" onclick="rate_replaceParentWithMessage (this);">No</span>
  </p>
</div>
```
<!--- [templates/rate_block.html.default](#The Rate Block Handler "save:") -->

### The Up Vote/Down Vote Block Handlers

The rest of the rate.js consists of just two functions, `rate_upVoteBlock` and `rate_downVoteBlock`. These two functions define the Up Vote and Down Vote block handlers.

These handlers add an on-click event handler to their block elements that sends either an up-vote or a down-vote event notification to Google Analytics when their element is clicked. 

```javascript
/*
  rate_upVoteBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts a JQuery HTML
    Element

  rate_upVoteBlock will add an on-click event
  handler to blockElement that will send Google
  analytics an "Up Vote" event notification
  whenever a user clicks on the element.
  rate_upVoteBlock then calls done.
*/
function rate_upVoteBlock (context, done) {
  // I. Register the on-click event handler.
  var element = context.element;
  element.click (
    function () {
      element.addClass ('rate_clicked');

      // Send an "Up Vote" event notification to Google Analytics.
      ga ('send', 'event', 'Up Vote', 'clicked');
  });

  // II. Continue.
  done (null);
}

/*
  rate_downVoteBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts a JQuery HTML
    Element

  rate_downVoteBlock will add an on-click event
  handler to blockElement that will send Google
  analytics a "Down Vote" event notification
  whenever a user clicks on the element.
  rate_downVoteBlock then calls done.
*/
function rate_downVoteBlock (context, done) {
  // I. Register the on-click event handler.
  var element = context.element;
  element.click (
    function () {
      element.addClass ('rate_clicked');

      // Send an "Down Vote" event notification to Google Analytics.
      ga ('send', 'event', 'Down Vote', 'clicked');
  });

  // II. Continue.
  done (null);
}
```

### Generating Source Files

The Rate module's source files can be generated from this article using [Literate Programming](https://github.com/jostylr/literate-programming). To generate these source files, simply execute: `literate-programming Readme.md` from the command line.

<!--
#### Rate.js
```
_"Introduction"

_"The Load Event Handler"

_"The Up Vote/Down Vote Block Handlers"
```
[rate.js](#Rate.js "save:")
-->
