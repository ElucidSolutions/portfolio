/*
  The Accordion module can be used to easily
  display content within accordion elements.
*/

// Declares the QUnit test module.
QUnit.module ('Accordion');

// Registers the block handlers.
MODULE_LOAD_HANDLERS.add (
  function (done) {
    block_HANDLERS.addHandlers ({
      accordion_block:      accordion_block,
      accordion_item_block: accordion_itemBlock
    });
    done (null);
});

/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element

  replaces context.element with a UL element
  containing any Accordion Item Blocks nested
  within it; and passes the resulting element
  to done.
*/
function accordion_block (context, done) {
  context.element.addClass ('accordion');
  done (null);
}

/*
  Unittests for accordion_block.

  Confirms that the function adds the accordion
  class to context.element.
*/
unittest ('accordion_block',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () }
    ],
    elements: [$('<div class="accordion_block_container"><div class="accordion_block"></div></div>')]
  },
  function (assert, elements) {
    assert.expect (1);
    block_HANDLERS.add ('accordion_block', accordion_block);
    var done = assert.async ();

    block_expandBlock (new block_Context (12, elements [0]),
      function () { 
        assert.ok ($('.accordion_block_container .accordion').length > 0, 'accordion_block added the .accordion class to context.element'); 
        done ();
      }
    ); 
  }
)

/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element.

  context.element must be a DIV element that
  has three child DIVs:

  * the first, must belong to the
    "accordion_item_number" class and contain a
    single text node
  * the second, must belong to the
    "accordion_item_title" class
  * and the third, must belong to the
    "accordion_item_body" class.

  This function replaces context.element
  with a LI that has a header and body
  element. The header will display the string
  given in the accordion_item_number and the
  accordion_item_title elements. The body will
  display the content in the accordion_item_body
  element.

  This function will then pass the resulting
  element to done.

  Note: Item blocks will expand any blocks
  nested within their body elements. As a result,
  content editors can wrap content within Quote
  blocks to load content on demand.
*/
function accordion_itemBlock (context, done, expand) {
  getBlockArguments ([
      {'name': 'accordion_item_number', 'text': true,  'required': true},
      {'name': 'accordion_item_title',  'text': false, 'required': true},
      {'name': 'accordion_item_body',   'text': false, 'required': true}
    ],
    context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var expanded = false;
      var element = $('<div></div>')
        .addClass ('accordion_item')
        .append ($('<div></div>')
          .addClass ('accordion_item_header')
          .append ($('<div></div>')
            .addClass ('accordion_item_header_left')
            .text (blockArguments.accordion_item_number.trim ()))
          .append ($('<div></div>')
            .addClass ('accordion_item_header_middle')
            .append (blockArguments.accordion_item_title))
          .append ($('<div></div>')
            .addClass ('accordion_item_header_right'))
          .click (function () {
              if (expanded) {
                element.toggleClass ('accordion_expanded');
                return blockArguments.accordion_item_body.slideToggle ();
              }
              expand (blockArguments.accordion_item_body,
                function () {
                  element.toggleClass ('accordion_expanded');
                  blockArguments.accordion_item_body.slideToggle ();
                  expanded = true;
              });
            }))
        .append (blockArguments.accordion_item_body.hide ());

      context.element.replaceWith (element);
      done (null, null);
  });
}

/*
  Unitttests for accordion_itemBlock.

  Confirms that the function created the
  .accordion_item element, and that the 
  item's number, title, and body are correctly
  displayed.
*/
unittest ('accordion_itemBlock',
  {
    globals: [{variableName: 'block_HANDLERS', value: new block_HandlerStore ()}],
    elements: [$('<div class="accordion_item_block_container">\
      <div class="accordion_item_block">\
        <div class="accordion_item_number">8</div>\
        <div class="accordion_item_title">Sample Title</div>\
        <div class="accordion_item_body">Sample Body</div>\
      </div>\
    </div>')]
  },
  function (assert, elements) {
    assert.expect (4);
    var done = assert.async ();
    block_HANDLERS.add ('accordion_item_block', accordion_itemBlock);

    /* 
      Store the contents of accordion_item_number
      in a variable before that element is
      replaced
    */
    var accordion_item_number = $('.accordion_item_number', elements [0]).text ().trim ();

    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.ok ($('.accordion_item_block_container .accordion_item').length > 0, 'accordion_itemBlock created the .accordion_item');
        assert.strictEqual ($('.accordion_item_block_container .accordion_item_header_left').text ().trim (), accordion_item_number, 'accordion_itemBlock has placed the item number  into the left header')
        assert.strictEqual ( $('.accordion_item_block_container .accordion_item_title').text ().trim (), $('.accordion_item_title', elements [0]).text ().trim (), 'accordion_itemBlock correctly outputs the item title.')
        assert.strictEqual ( $('.accordion_item_block_container .accordion_item_body').text ().trim (), $('.accordion_item_body', elements [0]).text ().trim (), 'accordion_itemBlock correctly outputs the item body.')
        done ();
      }
    ); 
  }
)