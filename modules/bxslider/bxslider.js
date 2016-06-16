/*
  This module is a simple wrapper for the bxSlider
  library, which behaves similar to a block module
  in that it looks for HTML elements that have a
  certain class attribute and replaces them.  

  See the bxSlider project website for details
  about bxSlider. http://bxslider.com/.
*/

/*
  bxslider_load is the load event handler for this
  module.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load libraries.
    loadScript ('modules/bxslider/lib/jquery.bxslider/jquery.bxslider.js',
      function (error) {
        if (error) { return done (error); }

        // II. Load CSS files.
        $.getCSS ('modules/bxslider/lib/jquery.bxslider/jquery.bxslider.css');

        // III. Register the block handler.
        block_HANDLERS.add ('bxslider_block', bxslider_block);

        done (null);
      });
});

/*
  bxslider_block is a block handler that expands an
  embedded bxSlider element. This handler activates
  the bxSlider element after all of the blocks that
  have been nested within it have been expanded.
*/
function bxslider_block (context, done) {
  $('> .bxslider', context.element).bxSlider({
    auto : true,
    autoControls : true,
    pause : 10000
  });
  done (null);
}
