Embedded Video Readme
=====================

The Embedded Video module defines the Embedded Video block. Every Embedded Video block contains a video player associated with a single video and a transcript element.

Load Event Handler
------------------

```javascript
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
```

Block Handlers
--------------

```javascript
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
```

Template
--------

The Embedded Video module uses an HTML template to define the Embedded Video element. This template includes two local blocks: "embedded_video_player_id_block" and "embedded_video_video_id_block" which the Embedded Video block handler replaces during block expansion with the IDs passed to it.

The template can be found here: [templates/embedded_video_block.html.default](#Template "save:"). 

```html
<div class="embedded_video">
  <div class="embedded_video_player_section">
    <div class="video_library_player_block">
      <div class="video_library_player_id">
        <div class="embedded_video_player_id_block"/>
      </div>
      <div class="video_library_default_video_id">
        <div class="embedded_video_video_id_block"/>
      </div>
    </div>
  </div>
  <div class="embedded_video_transcript_section">
    <div class="embedded_video_transcript_section_header">
      <h3 class="embedded_video_transcript_section_header_title">Transcript</h3>
    </div>
    <div class="embedded_video_transcript_section_body">
      <div class="video_library_transcript_block">
        <div class="video_library_player_id">
          <div class="embedded_video_player_id_block"/>
        </div>
        <div class="video_library_library_id">
          <div class="embedded_video_video_id_block"/>
        </div>
      </div>
    </div>
  </div>
</div>
```

Generating Source Files
-----------------------

You can generate the Embedded Video module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Embedded_video.js
```
_"Load Event Handler"

_"Block Handlers"
```
[embedded_video.js](#Embedded_video.js "save:")
