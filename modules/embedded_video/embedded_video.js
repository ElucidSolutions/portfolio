/*
  The module's load event handler.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I Register the module's block handler.
    block_HANDLERS.addHandlers ({
      'embedded_video_block': embedded_video_block
    });

    // II. Continues.
    done (null);
});

/*
  Accepts two arguments:

  * context, a Block Element Expansion Context
  * and done, a function that accepts two
    arguments: an Error object; and a JQuery
    HTML Element.

  context.element must contain two child elements.

  * The first, must have an HTML class attribute
    equal to "embedded_video_player_id" and must
    contain a single text node that represents a
    valid HTML ID.
  * The second, must have an HTML class attribute
    equal to "embedded_video_video_id" and must
    contain a single text node that represents a
    valid Video Library Video ID.

  This function replaces context.element with
  a Video Library Player and a Video Library
  Transcript block. This function will pass
  the given player and video IDs to the Video
  Library Player and Video Library Transcript
  blocks. This function will then call done
  to expand the Video Library Player and Video
  Library Transcript blocks.
*/
function embedded_video_block (context, done) {
  getBlockArguments ([
      {'name': 'embedded_video_player_id', 'text': true, 'required': true},
      {'name': 'embedded_video_video_id',  'text': true, 'required': true}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      getTemplate ('modules/embedded_video/templates/embedded_video_block.html',
        function (error, element) {
          if (error) { return done (error); }
          $('.embedded_video_player_id_block', element).replaceWith (blockArguments.embedded_video_player_id.trim ());
          $('.embedded_video_video_id_block', element).replaceWith (blockArguments.embedded_video_video_id.trim ());
          context.element.replaceWith (element);
          done (null, element);
      });
  });
}