/*
  This module is a simple wrapper for the Sidr
  library (http://www.berriart.com/sidr). The Sidr
  library behaves similar to a block module in that
  it expands any HTML Div element named "sidr" into
  a floating menu panel.

  This module simply loads the library and its CSS
  files.

  There are several ways to create a sidr panel.
  The simplest way is to create a link element, l,
  whose href attribute points to a div element that
  contains a list and call "l.sidr ()" on the link
  element. Sidr will then toggle the referenced
  div element as a side panel whenever l is clicked
  on.
*/

/*
  sidr_load is the load event handler for this
  module.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
  // I. Load libraries.
  loadScript ('modules/sidr/lib/sidr-2.2.1/dist/jquery.sidr.js',
    function (error) {
      if (error) { return done (error); }

      // II. Register the block handlers.
      block_HANDLERS.add ('sidr_block', sidr_block);

      // III. Continue.
      done (null);
  });
});

/*
  sidr_block accepts two arguments:

  * context, a Block Expansion Context
  * done, a function.

  context.element must be a link element that is
  linked to an HTML div element that contains a
  list. 

  sidr_block modifies context.element so that when
  clicked, the div element referenced by
  blockElement will appear/disappear as a side
  panel. sidr_block then calls done.
*/
function sidr_block (context, done) {
  context.element.sidr ({
    displace: false,
    speed: 300
  });
  done (null);
}
