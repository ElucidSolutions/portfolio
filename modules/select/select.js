/*
  The Select module defines the Select blocks
  which can be used to selectively load and
  display other nested blocks.
*/

// Declares the QUnit test module.
QUnit.module ('Select');

// Registers the Select block handlers.
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load libraries.
    loadScript ('modules/select/lib/moment/moment.js',
      function (error) {
        if (error) { return done (error); }

        // II. Register the block handlers.
        block_HANDLERS.addHandlers ({
          'select_date_block': select_dateBlock,
          'select_random_block': select_randomBlock
        });

        // III. Continue.
        done (null);
    });
});

/*
  select_dateBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element

  context.element should include three data
  attributes: data-select-predicate, either
  "before", "on", or "after"; data-select-date,
  a date string; and data-select-granularity,
  either "year", "month", or "day".

  context.element must include one or more child
  elements.

  This function determines whether or not the
  current date satisfies the given conditions. If
  the current date does, this function replaces
  the current block element with its first child
  and calls expand on it. If the current date
  does not, this function replaces the current
  block element with its second element.

  Note: the date format supplied by the 
  data-select-date attribute must be in standard
  ISO format (YYYY-DD-MM).
*/
function select_dateBlock (context, done) {
  var predicate   = context.element.attr ('data-select-predicate');
  var date        = context.element.attr ('data-select-date');
  var granularity = context.element.attr ('data-select-granularity');

  if (!(predicate && date && granularity)) {
    select_replaceWithChild (context.element, true);
    return done (null);
  }

  var child = null;
  switch (predicate) {
    case 'before':
      child = select_replaceWithChild (context.element, moment ().isBefore (date, granularity));
      break;
    case 'after':
      child = select_replaceWithChild (context.element, moment ().isAfter (date, granularity));
      break;
    case 'on':
      child = select_replaceWithChild (context.element, moment ().isSame (date, granularity));
      break;
    default:
      strictError ('[select_dateBlock] Error: a select block has an invalid data-select-predicate attribute.');
      child = select_replaceWithChild (context.element, true);
  }
  return done (null, child);
}

/*
  Unittests for select_dateBlock.

  Confirms that the function loads the correct 
  child element, depending on whether the current
  date matches the given conditions.
*/
unittest ('select_dateBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () }
    ],
    elements: [
      $('<div class="select_date_block_parent">\
        <div class="before_parent select_date_block" data-select-predicate="before" data-select-date="2017-03-30" data-select-granularity="year">Parent\
          <div class="child_before_1">child1</div>\
          <div class="child_before_2">child2</div>\
        </div>\
      </div>'),
      $('<div class="select_date_block_parent">\
        <div class="after_parent select_date_block" data-select-predicate="after" data-select-date="2017-03-30" data-select-granularity="year">Parent\
          <div class="child_after_1">child1</div>\
          <div class="child_after_2">child2</div>\
        </div>\
      </div>'),
      $('<div class="select_date_block_parent">\
        <div class="on_parent select_date_block" data-select-predicate="on" data-select-date="2017-03-30" data-select-granularity="year">Parent\
          <div class="child_on_1">child1</div>\
          <div class="child_on_2">child2</div>\
        </div>\
      </div>')    
    ]
  },
  function (assert, elements) {
    assert.expect (6);

    block_HANDLERS.add ('select_date_block', select_dateBlock);

    var done0 = assert.async ();
    block_expandBlock (new block_Context (12, elements[0]),
      function () {   
        assert.notOk($('.select_date_block_parent > .child_before_1').length, 'select_dateBlock does not show the first child when the current year is not before the given date.');
        assert.ok($('.select_date_block_parent > .child_before_2').length, 'select_dateBlock shows the second child when the current year is not before the given date.');    
        done0 ();
      }
    );
    var done1 = assert.async ();
    block_expandBlock (new block_Context (12, elements[1]),
      function () {   
        assert.notOk($('.select_date_block_parent > .child_after_1').length, 'select_dateBlock does not show the first child when the current year is not after the given date.');
        assert.ok($('.select_date_block_parent > .child_after_2').length, 'select_dateBlock does shows the second child when the current year is not after the given date.');    
        done1 ();
      }
    );
    var done2 = assert.async ();
    block_expandBlock (new block_Context (12, elements[2]),
      function () {   
        assert.ok($('.select_date_block_parent > .child_on_1').length, 'select_dateBlock shows the first child when the current year is matches the given date.');
        assert.notOk($('.select_date_block_parent > .child_on_2').length, 'select_dateBlock does not show the second child when the current year is matches the given date.');
        done2 ();
      }
    );    
  }
)

/*
  select_randomBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery
    HTML Element.

  This function replaces context.element with
  one of its randomly selected children and
  calls done.

  If context.element is empty, this function
  removes context.element and calls done.
*/
function select_randomBlock (context, done) {
  // randomly select a child element.
  var children = context.element.children ();
  var num = children.length;
  var child = num > 0 ? children.eq (getRandomInt (0, num)) : null;

  // replace/remove the block element.
  child ? context.element.replaceWith (child) :
          context.element.remove ();

  // continue.
  done (null, child);
}

/*
  Unittests for select_randomBlock.

  Confirms that the function removes the original
  context.element div, and replaces it with one
  of its children, chosen randomly.
*/
unittest ('select_randomBlock',
  { 
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () }    
    ],
    elements: [   
      $('<div class="select_random_block_container"></div>'),
      $('<div class="select_random_block_container_2">\
        <div class="select_random_block">\
          <div class="child"></div>\
          <div class="child"></div>\
        </div>\
      </div>')
    ]
  },
  function (assert, elements) {
    assert.expect (3);
    block_HANDLERS.add ('select_random_block', select_randomBlock);

    var numChild1 = 0;
    var numChild2 = 0;
    var done0 = assert.async ();

    async.times (100,
      function (n, next) {
        // I. Create test block element 
        elements[0]
          .empty ()
          .append ('<div class="select_random_block">\
            <div class="child1"></div>\
            <div class="child2"></div>\
          </div>');

        // II. Expand block
        block_expandBlock (new block_Context (17, elements[0]),
          function () {
            // III. Update counters
            $('.child1', elements[0]).length && numChild1 ++;
            $('.child2', elements[0]).length && numChild2 ++;

            // IV. Call next
            next ();
        });
      },
      function (error) {
        assert.ok (numChild1 && numChild2, 'select_randomBlock randomly selected both children.');
        done0 ();
      }
    )

    var done1 = assert.async ();

    block_expandBlock (new block_Context (17, elements[1]),
      function () {   
        assert.notOk($('.select_random_block_container_2 > .select_random_block').length, 'select_randomBlock replaced the parent element.');
        assert.ok ($('.select_random_block_container_2 > .child').length === 1, 'select_randomBlock inserted one and only one child of the .select_random_block element directly inside the container div.'); 
        done1 ();
      }
    );
  }
)

/*
  Accepts two arguments:

  * element, a jQuey HTML Element
  * and proposition, a boolean.

  If element has no children, this function
  removes element.

  If element has one child, this function
  replaces element with the child.

  If element has two or more children and
  proposition is true, this function replaces
  element with its first child. If proposition
  is false, this function replaces element with
  its second child.

  This function returns the child used to replace
  element as a jQuery HTML Element or null if
  element does not contain any children.
*/
function select_replaceWithChild (element, proposition) {
  var child = null;
  var children = element.children ();
  var num = children.length;
  switch (num) {
    case 0:
      element.remove ();
      break;
    case 1:
      child = children.eq (0);
      element.replaceWith (child);
      break;
    default:
      child = proposition ? children.eq (0) : children.eq (1);
      element.replaceWith (child);
  }
  return child;
}

/*
  Accepts two integer arguments, min and max,
  and returns a random integer that is greater
  than or equal to min and less than max.
*/
function getRandomInt (min, max) {
  min = Math.ceil (min);
  max = Math.floor (max);
  return Math.floor (Math.random () * (max - min)) + min;
}