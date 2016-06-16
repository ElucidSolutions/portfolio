Lightbox Module
===============

This module is a simple wrapper for the Lightbox2 library (http://lokeshdhakar.com/projects/lightbox2/). The Lightbox library adds a click event handler to any image link element that has an attribute named "data-lightbox". This event handler expands the referenced image and overlays it over the current page.

This module simply loads the Lightbox2 library and its associated CSS files.

```javascript
/*
  This module is a simple
  wrapper for the Lightbox2 library
  (http://lokeshdhakar.com/projects/lightbox2/).
  When loaded, this module loads the Lightbox2
  library and its associated stylesheets.
*/

/*
  This function loads the Lightbox2 library and
  its associated stylesheets.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the Lightbox2 library.
    loadScript ('modules/lightbox/lib/lightbox2/dist/js/lightbox.js',
      function (error) {
        if (error) { return done (error); }

        // II. Load the CSS files.
        $.getCSS ('modules/lightbox/lib/lightbox2/dist/css/lightbox.css');

        // III. Set the default Lightbox settings.
        lightbox.option ({
          positionFromTop: 200
        });

        // IV. Continue.
        done (null);
    });
});
```

Generating Source Files
-----------------------

You can generate the Lightbox module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
[lightbox.js](#Lightbox Module "save:")
-->
