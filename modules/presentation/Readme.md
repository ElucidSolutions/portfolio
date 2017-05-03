Presentation Module
===================

The Presentation module defines the Presentation block type which expand into interactive presentations.

Presentations are designed to teach users how to use new software by walking them step by step through a series of screenshots.

Every presentation consists of a sequence of steps which, in turn, consist of a screenshot, a focus element, and some text.

Each step highlights a region on its screenshot and presents the user with information or instructions. 

There are several different types of steps which allow users to simulate interactions with the software system being introduced. For example, users can click on highlighted buttons in button steps and enter text in input steps.

Presentations are stored as elements within an XML database. When loaded, this database is represented by a <code>presentation_Database</code> object. Presentations themselves are represented by <code>presentation_Presentation</code> objects and their steps are represented by <code>presentation_Step</code> objects.

Every presentation block expands into a presentation "instance". Multiple presentation blocks may represent the same presentation at the same time and be in different states of completion.

For example, the database may define a presentation, Example Presentation, and we may have two presentation blocks that both display instances of Example Presentation. In the first we may complete the first step, while the second may still be waiting for input.

Presentation instances are represented by <code>presentation_PresentationInstance</code> objects while step instances are represented by <code>presentation_StepInstance</code> objects which include state information.

This module relies on IntroJS (http://introjs.com/) to highlight and transition between the steps in each presentation.

Global Variables
----------------

The presentation module defines four global variables:

* <code>presentation_DATABASE_URL</code>, which specifies the location of the database file

* <code>presentation_DATABASE</code>, which holds the `presentation_Database` object that represents the loaded database

* <code>presentation_AUDIO</code>, which indicates whether or not audio narration is enabled or disabled.

* and <code>presentation_INSTANCES</code>, an associative array of `presentation_PresentationInstance` objects representing the active presentation instances keyed by Presentation Instance ID.

```javascript
/*
  A URL string that represents the presentation
  database URL.
*/
var presentation_DATABASE_URL = 'modules/presentation/database.xml';

/*
  A presentation_Database object that represents
  the current presentation database.
*/
var presentation_DATABASE = {};

/*
  A boolean variable indicating whether or not
  audio narration is enabled.
*/
var presentation_AUDIO = false;

/*
  An associative array of
  presentation_PresentationInstance objects
  representing the active presentation instances
  keyed by Presentation Instance ID.
*/
var presentation_INSTANCES = {};
```

The Load Event Handler
----------------------

The module's load event handler is called by the Core module to initialize the module. It performs three main tasks:

1. It loads the external libraries that this module depends on

2. It loads the Presentation Database

3. It registers the Presentation Block handler.

```javascript
// The module's load event handler.
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the external libraries.
    loadScripts ([
        'modules/presentation/lib/intro/intro.js-2.0.0/intro.js',
        'modules/presentation/lib/materialize/materialize-0.97.6/js/bin/materialize.js'
      ],
      function (error) {
        if (error) { return done (error); }

        loadScripts ([
            'https://code.responsivevoice.org/responsivevoice.js'
          ],
          function (error) {
            if (error) {
              strictError (new Error ('[presentation] Error: an error occured while trying to load the responsive voice module.'));
            }

            // II. Load the Materialize stylesheet.
            $.getCSS ('modules/presentation/lib/materialize/materialize-0.97.6/css/materialize.css');

            // III. Load the Presentation database.
            presentation_loadDatabase (
              presentation_DATABASE_URL,
              function (error, database) {
                if (error) { return done (error); }

                // IV. Cache the Presentation database.
                presentation_DATABASE = database;

                // V. Register the block handlers.
                block_HANDLERS.add ('presentation_block', presentation_block);

                // VI. Cancel text to speech playback and empty the presentation_INSTANCES array on page load.
                PAGE_LOAD_HANDLERS.add (
                  function (id, done) {
                    responsiveVoice && responsiveVoice.cancel ();
                    presentation_INSTANCES = {};
                    done ();
                });

                // VII. Wait for Responsive Voice and continue.
                if (responsiveVoice) {
                  var responsiveVoiceTimedOut = null;
                  setTimeout (
                    function () {
                      if (responsiveVoiceTimedOut === null) {
                        responsiveVoiceTimedOut = true;
                        responsiveVoice = null;
                        console.log ('Warning: The Responsive Voice library failed to load before the timeout. Audio playback has been disabled.');
                        done (null);
                      }
                    }, 500
                  );

                  responsiveVoice.addEventListener ('OnLoad',
                    function () {
                      if (responsiveVoiceTimedOut === null) {
                        responsiveVoiceTimedOut = false;
                        done (null);
                      }
                   });
                } else {
                  done (null);
                }
            });      
      });
  });
});
```

The Block Handlers
------------------

The Presentation module only defines one block handler, Presentation block (<code>presentation_block</code>). Every Presentation block accepts a Presentation ID and expands into a instance of the referenced presentation.

```javascript
/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts one
    argument: error, an Error

  context.element must contain a single text
  node representing a presentation ID.

  Replaces context.element with a JQuery
  HTML Element that represents the referenced
  presentation and calls done.
*/
function presentation_block (context, done) {
  var presentationInstanceId = context.element.text ();
  var presentation = presentation_DATABASE.getPresentation (presentationInstanceId);
  if (!presentation) { return done (null, null); }

  presentationInstance = new presentation_PresentationInstance (presentation);

  presentation_INSTANCES [presentationInstanceId] = presentationInstance;

  PAGE_LOAD_HANDLERS.add (
    function (id, done) {
      presentationInstance.exit ();
      done (null);
  });

  var element = presentationInstance.getElement ();
  context.element.replaceWith (element);
  done (null, null);
}
```

The Previous Input View Class
-----------------------------

The Presentation module allows users to enter input into Input steps. This input can be displayed in other steps using Previous Input View elements. Every Input View element is associated with two step instances, the step on which the view is displayed and the input step whose value it shows.

The abstract information about Previous Input View elements is represented by <code>presentation_PreviousInputView</code> classes.

```javascript
/*
  Accepts five arguments:

  * inputStepId, a Presentation Step ID string
  * top, a CSS Dimension string
  * left, a CSS Dimension string
  * width, a CSS Dimension string
  * and height, a CSS Dimension string

  and returns a presentation_PreviousInputView
  object.
*/
function presentation_PreviousInputView (inputStepId, top, left, width, height) {
  this.inputStepId = inputStepId;
  this.top         = top;
  this.left        = left;
  this.width       = width;
  this.height      = height;
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must be a Previous Input View XML
  Element.

  presentationPath must be a path giving this
  view's presentation's location within the
  database.

  This function returns the Previous Input View
  represented by element.
*/
function presentation_parsePreviousInputView (presentationPath, element) {
  return new presentation_PreviousInputView (
    presentation_getId ('presentation_input_step_page', presentationPath.concat ($('> inputStepName', element).text ())),
    $('> top',      element).text (),
    $('> left',     element).text (),
    $('> width',    element).text (),
    $('> height',   element).text ()
  );
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element that
    represents a Previous Input Views XML
    Element

  and returns the Previous Input Views
  represented in element as a
  presentation_PreviousInputView array.
*/
function presentation_parsePreviousInputViews (presentationPath, element) {
  return $('> previousInputView', element).map (
    function (i, viewElement) {
      return presentation_parsePreviousInputView (presentationPath, viewElement);
  }).toArray ();
}
```

The Step Class
--------------

The <code>presentation_Step</code> class defines the abstract base class for the step classes. As described above, every step has a screenshot, a focus element, and some text. When presented, this module will load the screenshot, highlight the focus element, and display the step's text. 

```javascript
/*
  Accepts nine arguments:

  * id, an Presentation Step ID string
  * image, a URL string
  * text, an HTML string
  * position, a string equal to either "top",
    "bottom", "left", "right", or other positions
    defined by IntroJS.
  * top, a CSS Dimension string
  * left, a CSS Dimension string
  * width, a CSS Dimension string
  * height, a CSS Dimension string
  * and previousInputViews, a
    presentation_PreviousInputView array

  and returns a presentation_Step whose
  background image is given by image, main prompt
  equals text, whose focus element is positioned
  by top and left, whose dimensions are given
  by width and height, and whose main prompt is
  positioned near the focus element according
  to position.
*/
function presentation_Step (id, image, text, position, top, left, width, height, previousInputViews) {
  this.id                 = id;
  this.image              = image;
  this.text               = text;
  this.position           = position;
  this.top                = top;      
  this.left               = left;
  this.width              = width;
  this.height             = height;
  this.previousInputViews = previousInputViews;
}

/*
  Accepts no arguments and reads this step's
  text aloud. Returns undefined.
*/
presentation_Step.prototype.speak = function () {
  presentation_speak (this.text);
}

/*
  Accepts one argument: presentationInstance,
  a presentation_PresentationInstance; creates an
  instance of this step, associates the instance
  with presentationInstance, and returns the
  step instance as a presentation_StepInstance.
*/
presentation_Step.prototype.createInstance = function (presentationInstance) {
  return presentation_StepInstance (this, presentationInstance);
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation Step
  Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the step represented by
  element as a presentation_Step.
*/
function presentation_parseStep (presentationPath, element) {}
```

The Blank Step Class
--------------------

The <code>presentation_BlankStep</code> class is the simplest step class. It simply represents those steps in which a region of their screenshot is highlighted and some text is displayed.

```javascript
/*
  Accepts nine arguments:

  * id, an Presentation Step ID string
  * image, a URL string
  * text, an HTML string
  * position, a string equal to either "top",
    "bottom", "left", "right", or other positions
    defined by IntroJS.
  * top, a CSS Dimension string
  * left, a CSS Dimension string
  * width, a CSS Dimension string
  * height, a CSS Dimension string
  * and previousInputViews, a
    presentation_PreviousInputView array

  and returns a presentation_BlankStep. See
  presentation_Step for more details.
*/
function presentation_BlankStep (id, image, text, position, top, left, width, height, previousInputViews) {
  presentation_Step.call (this, id, image, text, position, top, left, width, height, previousInputViews);
}

/*
  Create a new prototype object for
  presentation_BlankStep and set 
  presentation_Step's prototype as the object's
  prototype.
*/
presentation_BlankStep.prototype = Object.create (presentation_Step.prototype);

/*
  Assign the presentation_BlankStep prototype's
  constructor property so that any functions that
  read it can determine which constructor
  function was used to create its instance
  objects.
*/
presentation_BlankStep.prototype.constructor = presentation_BlankStep;

/*
  Accepts one argument: presentationInstance,
  a presentation_PresentationInstance; creates an
  instance of this step, associates the instance
  with presentationInstance, and returns the step
  instance as a presentation_BlankStepInstance.
*/
presentation_BlankStep.prototype.createInstance = function (presentationInstance) {
  return new presentation_BlankStepInstance (this, presentationInstance);
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation Blank
  Step Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the step represented by
  element as a presentation_BlankStep.
*/
function presentation_parseBlankStep (presentationPath, element) {
  var path = presentationPath.concat ($('> name', element).text ());
  return new presentation_BlankStep (
    presentation_getId ('presentation_step_page', path),
    $('> image',    element).text (),
    $('> text',     element).text (),
    $('> position', element).text (),
    $('> top',      element).text (),
    $('> left',     element).text (),
    $('> width',    element).text (),
    $('> height',   element).text (),
    presentation_parsePreviousInputViews (presentationPath, $('> previousInputViews', element))
  );
}
```

The Button Step Class
---------------------

<code>presentation_ButtonStep</code> objects represent steps in which a user must click on the step's focus element before moving on to the next step.

```javascript
/*
  Accepts nine arguments:

  * id, an Presentation Step ID string
  * image, a URL string
  * text, an HTML string
  * position, a string equal to either "top",
    "bottom", "left", "right", or other positions
    defined by IntroJS.
  * top, a CSS Dimension string
  * left, a CSS Dimension string
  * width, a CSS Dimension string
  * height, a CSS Dimension string
  * and previousInputViews, a
    presentation_PreviousInputView array

  and returns a presentation_ButtonStep. See
  presentation_Step for more details.
*/
function presentation_ButtonStep (id, image, text, position, top, left, width, height, previousInputViews) {
  presentation_Step.call (this, id, image, text, position, top, left, width, height, previousInputViews);
}

/*
  Create a new prototype object for 
  presentation_ButtonStep and set 
  presentation_Step's prototype as the object's
  prototype.
*/
presentation_ButtonStep.prototype = Object.create (presentation_Step.prototype);

/*
  Assign the presentation_ButtonStep prototype's
  constructor property so that any functions
  that read it can determine which constructor
  function was used to create its instance 
  objects.
*/
presentation_ButtonStep.prototype.constructor = presentation_ButtonStep;

/*
  Accepts one argument: presentationInstance,
  a presentation_PresentationInstance; creates an
  instance of this step, associates the instance
  with presentationInstance, and returns the step
  instance as a presentation_ButtonStepInstance.
*/
presentation_ButtonStep.prototype.createInstance = function (presentationInstance) {
  return new presentation_ButtonStepInstance (this, presentationInstance);
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation Button
  Step Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the step represented by
  element as a presentation_ButtonStep.
*/
function presentation_parseButtonStep (presentationPath, element) {
  var path = presentationPath.concat ($('> name', element).text ());
  return new presentation_ButtonStep (
    presentation_getId ('presentation_step_page', path),
    $('> image',    element).text (),
    $('> text',     element).text (),
    $('> position', element).text (),
    $('> top',      element).text (),
    $('> left',     element).text (),
    $('> width',    element).text (),
    $('> height',   element).text (),
    presentation_parsePreviousInputViews (presentationPath, $('> previousInputViews', element))
  );
}
```

The Input Step Class
--------------------

<code>presentation_InputStep</code> objects prompt the user to input some text into the step's focus element. This text is then compared against a regular expression. If the text matches the regular expression, this module allows the user to move to the next step. Otherwise, this module displays an error message.

```javascript
/*
  Accepts eleven arguments:

  * id, an Presentation Step ID string
  * image, a URL string
  * text, an HTML string
  * position, a string equal to either "top",
    "bottom", "left", "right", or other positions
    defined by IntroJS.
  * top, a CSS Dimension string
  * left, a CSS Dimension string
  * width, a CSS Dimension string
  * height, a CSS Dimension string
  * and previousInputViews, a
    presentation_PreviousInputView array
  * expression, a RegEx string
  * errorAlert, an HTML string

  and returns a presentation_InputStep where
  expression defines the pattern that an input
  value submitted by the user must match to
  complete this step and errorAlert is the
  message that will be displayed to the user
  when they submit invalid input. See
  presentation_Step for more details.
*/
function presentation_InputStep (id, image, text, position, top, left, width, height, previousInputViews, expression, errorAlert) {
  presentation_Step.call (this, id, image, text, position, top, left, width, height, previousInputViews);
  this.expression = expression;
  this.errorAlert = errorAlert;
}

/*
  Create a new prototype object for 
  presentation_InputStep and set 
  presentation_Step's prototype as the object's
  prototype.
*/
presentation_InputStep.prototype = Object.create (presentation_Step.prototype);

/*
  Assign the presentation_InputStep prototype's
  constructor property so that any functions
  that read it can determine which constructor
  function was used to create its instance 
  objects.
*/
presentation_InputStep.prototype.constructor = presentation_InputStep;

/*
  Accepts one argument: presentationInstance,
  a presentation_PresentationInstance; creates an
  instance of this step, associates the instance
  with presentationInstance, and returns the step
  instance as a presentation_InputStepInstance.
*/
presentation_InputStep.prototype.createInstance = function (presentationInstance) {
  return new presentation_InputStepInstance (this, presentationInstance);
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation Input
  Step Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the step represented by
  element as a presentation_InputStep.
*/
function presentation_parseInputStep (presentationPath, element) {
  var path = presentationPath.concat ($('> name', element).text ());
  return new presentation_InputStep (
    presentation_getId ('presentation_input_step_page', path),
    $('> image',        element).text (),
    $('> text',         element).text (),
    $('> position',     element).text (),
    $('> top',          element).text (),
    $('> left',         element).text (),
    $('> width',        element).text (),
    $('> height',       element).text (),
    presentation_parsePreviousInputViews (presentationPath, $('> previousInputViews', element)),
    $('> expression',   element).text (),
    $('> errorAlert',   element).text ()
  );
}
```

The Quiz Step Class
-------------------

<code>presentation_QuizStep</code> objects represent steps in which the user is presented with a multiple-choice quiz. When presented, this module requires the user to select the correct option before moving on to the next step.

```javascript
/*
  presentation_QuizStep accepts nine arguments:

  * id, an HTML ID string
  * text, an HTML string
  * position, either 'top', 'bottom', 'left', or 'right'
  * top, a CSS Length string
  * left, a CSS Length string
  * width, a CSS Length string
  * height, a CSS Length string
  * previousInputViews, a
    presentation_PreviousInputView array
  * and options an Options array

  and returns a new presentation_QuizStep object.

  Note: Every Option element must have the following stucture:

    {label: <string>, isCorrect: <bool>, onSelect: <string>}
*/
function presentation_QuizStep (id, image, text, position, top, left, width, height, previousInputViews, options) {
  presentation_Step.call (this, id, image, text, position, top, left, width, height, previousInputViews);
  this.options = options;
}

/*
  Create a new prototype object for 
  presentation_QuizStep and set 
  presentation_Step's prototype as the object's
  prototype.
*/
presentation_QuizStep.prototype = Object.create (presentation_Step.prototype);

/*
  Assign the presentation_QuizStep prototype's
  constructor property so that any functions
  that read it can determine which constructor
  function was used to create its instance 
  objects.
*/
presentation_QuizStep.prototype.constructor = presentation_QuizStep;

/*
  Accepts one argument: presentationInstance,
  a presentation_PresentationInstance; creates an
  instance of this step, associates the instance
  with presentationInstance, and returns the step
  instance as a presentation_QuizStepInstance.
*/
presentation_QuizStep.prototype.createInstance = function (presentationInstance) {
  return new presentation_QuizStepInstance (this, presentationInstance);
}

/*
  Accepts no arguments and reads this step's
  text and answer options aloud. Returns
  undefined.
*/
presentation_QuizStep.prototype.speak = function () {
  presentation_speak ($('<p></p>')
    .append (this.text)
    .append ($('<p>options.</p>')
      .append (this.options.map (
        function (option) {
          return option.label;
        })))
  );
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation Quiz
  Step Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the step represented by
  element as a presentation_QuizStep.
*/
function presentation_parseQuizStep (presentationPath, element) {
  var path = presentationPath.concat ($('> name', element).text ());
  return new presentation_QuizStep (
    presentation_getId ('presentation_test_step_page', path),
    $('> image',        element).text (),
    $('> text',         element).text (),
    $('> position',     element).text (),
    $('> top',          element).text (),
    $('> left',         element).text (),
    $('> width',        element).text (),
    $('> height',       element).text (),
    presentation_parsePreviousInputViews (presentationPath, $('> previousInputViews', element)),
    $('> options', element).children ('option').map (
      function (i, optionElement) {
        return {
          label:     $('label', optionElement).text (),
          isCorrect: $('isCorrect', optionElement).text () === 'true',
          onSelect:  $('onSelect', optionElement).text ()
        };
    }).toArray ()
  );
}
```

The Presentation Class
----------------------

The <code>presentation_Presentation</code> class represents Presentations. Every presentation consists of a sequence of steps and a default image.

```javascript
/*
  Accepts five arguments:

  * id, a Presentation ID string
  * image, a URL string
  * width, a CSS Dimension string
  * height, a CSS Dimension string
  * steps, a presentation_Step array

  and returns a presentation_Presentation.
*/
function presentation_Presentation (id, image, width, height, steps) {
  this.getId     = function () { return id; }
  this.getImage  = function () { return image; }
  this.getWidth  = function () { return width; }
  this.getHeight = function () { return height; }
  this.getSteps  = function () { return steps; }
}

/*
  Accepts no arguments and returns an
  instance of this presentation as a
  presentation_PresentationInstance.
*/
presentation_Presentation.prototype.createInstance = function () {
  return new presentation_PresentationInstance (this);
}

/*
  Accepts two arguments:

  * presentationPath, a string array
  * and element, a JQuery HTML Element.

  element must represent a Presentation
  Presentation Database Entry element.

  presentationPath must be a path giving this
  presentation's location within the database
  containing element.

  This function returns the presentation
  represented by element as a
  presentation_Presentation.
*/
function presentation_parsePresentation (presentationPath, element) {
  var path = presentationPath.concat ($('> name', element).text ());
  return new presentation_Presentation (
    presentation_getId ('presentation', path),
    $('> image', element).text (),
    $('> width', element).text (),
    $('> height', element).text (),
    $('> steps', element).children ().map (
      function (i, stepElement) {
        var tagName = $(stepElement).prop ('tagName');
        switch (tagName) {
          case 'blankStep':
            return presentation_parseBlankStep (path, stepElement); 
          case 'buttonStep':
            return presentation_parseButtonStep (path, stepElement);
          case 'inputStep':
            return presentation_parseInputStep (path, stepElement);
          case 'testStep':
            return presentation_parseQuizStep (path, stepElement);
          default:
            strictError ('[presentation][presentation_parsePresentation] Error: an error occured while parsing a presentation element. "' + type + '" is an invalid presentation type.');
            return null;
        }
    }).toArray () 
  );
}
```

The Database Class
------------------

The <code>presentation_Database</code> class represents presentation databases. Each database consists of a collection of presentations.

```javascript
/*
  Accepts one argument: presentations, a
  presentation_Presentation array; and returns
  a presentation_Database.
*/
function presentation_Database (presentations) {
  this.presentations = presentations;
}

/*
  Accepts one argument: id, a Presentation ID
  string; and returns the presentation in this
  database that has id.
*/
presentation_Database.prototype.getPresentation = function (id) {
  for (var i = 0; i < this.presentations.length; i ++) {
    var presentation = this.presentations [i];
    if (presentation.getId () === id) { return presentation; }
  }
  return null;
}

/*
  Accepts one argument: element, a JQuery
  HTML Element that represents a Presentation
  Database and returns the presentation_Database
  represented by element.
*/
function presentation_parseDatabase (element) {
  return new presentation_Database (
    $('presentation', element).map (
      function (i, presentationElement) {
        return presentation_parsePresentation ([], presentationElement);
    }).toArray ()
  );
}

/*
  Accepts two arguments:

  * url, a URL string
  * and done, a function that accepts two
    arguments: error, an Error object; and
    database, a presentation_Database object.

  loads the presentation database referenced by
  url and passes the database to done.

  If an error occurs, this function passes an
  error to done instead.
*/
function presentation_loadDatabase (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, presentation_parseDatabase (doc));
    },
    error: function (request, status, errorMsg) {
      var error = new Error ('[presentation][presentation_loadDatabase] Error: an error occured while trying the load a presentation database from "' + url + '".');
      strictError (error);
      done (error);
    }
  });
}
```

The Previous Input View Instance Class
--------------------------------------

The <code>presentation_PreviousInputViewInstance</code> class represent Previous Input Views that are actually represented by HTML elements in a presentation. These class objects act as interfaces to these views tracking thier states and controlling their representations.

```javascript
/*
  Accepts two arguments:

  * stepInstance, a presentation_StepInstance
  * and previousInputView, a
  presentation_PreviousInputView

  and returns a
  presentation_PreviousInputViewInstance that
  represents an instance of previousInputView
  tied to stepInstance.
*/
function presentation_PreviousInputViewInstance (stepInstance, previousInputView) {
  this.stepInstance       = stepInstance;
  this.previousInputView  = previousInputView;
  this._element           = null;
  this._inputStepInstance = null;
}

/*
  Accepts no arguments and returns the
  Presentation Input Step associated with this
  view as a presentation_InputStepInstance.

  If the referenced Input Step Instance does
  not exist, this function returns null.
*/
presentation_PreviousInputViewInstance.prototype.getInputStepInstance = function () {
  if (this._inputStepInstance) { return this._inputStepInstance; }

  var stepInstance = this.stepInstance.presentationInstance.getStepInstance (this.previousInputView.inputStepId);
  this._inputStepInstance = stepInstance && stepInstance instanceof presentation_InputStepInstance ?
    stepInstance : null;

  return this._inputStepInstance;
}

/*
  Accepts no arguments and returns the value
  entered into the Presentation Input Step
  associated with this view as a string.
*/
presentation_PreviousInputViewInstance.prototype.getInputStepInstanceValue = function () {
  var inputStepInstance = this.getInputStepInstance ();
  return inputStepInstance ?
    $('> input', inputStepInstance.getFocusElement ()).val () :
    null;
}

/*
  Accepts no arguments and returns a HTML
  element that represents this view as a JQuery
  HTML Element.

  Note: the element returned by this function
  does not display the input entered into the
  Presentation Input Step associated with this
  view. Use the `show ()` function to update
  the display.
*/
presentation_PreviousInputViewInstance.prototype._createElement = function () {
  var inputStepInstance = this.getInputStepInstance ();
  return inputStepInstance ?
    $('<div></div>')
      .addClass ('presentation_previous_input_view')
      .attr ('data-presentation-step', this.stepInstance.step.id)
      .attr ('data-presentation-input-step', inputStepInstance.step.id)
      .attr ('tabindex', -1)
      .css ('position', 'absolute')
      .css ('top',      this.previousInputView.top)
      .css ('left',     this.previousInputView.left)
      .css ('width',    this.previousInputView.width)
      .css ('height',   this.previousInputView.height)
    : null;
}

/*
  Accepts no arguments and returns the HTML
  element that represents this view as a JQuery
  HTML Element.

  Note: the element returned by this function
  may no display the input entered into the
  Presentation Input Step associated with this
  view. Use the `show ()` function to update
  the element.
*/
presentation_PreviousInputViewInstance.prototype.getElement = function () {
  this._element = this._element || this._createElement ();
  return this._element;
}

/*
  Accepts no arguments and displays and updates
  this view instance's element. 
  Returns undefined.
*/
presentation_PreviousInputViewInstance.prototype.show = function () {
  var element = this.getElement ();
  if (!element) { return; }

  var value = this.getInputStepInstanceValue ();
  if (value === null) { return; }

  element.text (value).addClass ('presentation_visible').show ();
}

/*
  Accepts no arguments and hides this view
  instance's element. Returns undefined.
*/
presentation_PreviousInputViewInstance.prototype.hide = function () {
  var element = this.getElement ();
  element && element.removeClass ('presentation_visible').hide ();
}
```

The Step Instance Class
-----------------------

The <code>presentation_StepInstance</code> class represents the abstract base class for the step instance classes. Every step instance is a concrete representation of a step described in the Presentation Database.

```javascript
/*
  Accepts two arguments:

  * step, a presentation_Step
  * and presentationInstance, a
    presentation_PresentationInstance

  and returns a presentation_StepInstance
  that is an instance of presentation_Step.

  Note: step must be one of
  presentationInstance's presentation's steps.
*/
function presentation_StepInstance (step, presentationInstance) {
  this.step                        = step;
  this.presentationInstance        = presentationInstance;
  this.completed                   = false;
  this.spoken                      = false;
  this.message                     = null;
  this._previousInputViewInstances = null;
}

/*
  Accepts no arguments and reads this instance's
  step's text aloud and marks this instance as
  having been read. Returns undefined.
*/
presentation_StepInstance.prototype.speak = function () {
  this.step.speak ();
  this.spoken = true;
}


/*
  Accepts no arguments, marks this step instance
  as having been completed, and updates the
  nav element associated with this instance's
  presentation instance. Returns undefined.

  This function is called when a user
  completes stepElement.
*/
presentation_StepInstance.prototype.onComplete = function () {
  this.completed = true;
  this.presentationInstance.updateNavElement ();
}

/*
  Accepts no arguments and updates this step
  instance and its presentation instance. 
  Returns undefined.

  This function is be called when IntroJS
  highlights this step instance.
*/
presentation_StepInstance.prototype.onHighlight = function () {
  this.showPreviousInputViewInstances ();
}

/*
  Accepts no arguments and updates this step
  instance and its presentation instance.
  Returns undefined.

  This function is called when IntroJS
  unhighlights this step instance.
*/
presentation_StepInstance.prototype.onUnhighlight = function () {
  this.hidePreviousInputViewInstances ();
}

/*
  Accepts no arguments and returns a JQuery HTML
  Element that represents this step instance's
  focus element.
*/
presentation_StepInstance.prototype._createFocusElement = function () {
  return $('<div></div>')
    .addClass ('presentation_step')
    .attr ('data-presentation-step', this.step.id)
    .attr ('id',                     getUniqueId ())
    .css ('position',                'absolute')
    .css ('top',                     this.step.top)
    .css ('left',                    this.step.left)
    .css ('width',                   this.step.width)
    .css ('height',                  this.step.height);
}

/*
  Accepts no arguments and returns this step
  instance's focus element as a JQuery HTML
  Element.
*/
presentation_StepInstance.prototype.getFocusElement = function () {
  this._focusElement = this._focusElement || this._createFocusElement ();
  return this._focusElement;
}

/*
  Accepts no arguments and returns a set of
  Previous Input View Instances that instantiate
  the views associated with this step instance's
  step as a presentation_PreviousInputViewInstance
  array.
*/
presentation_StepInstance.prototype._createPreviousInputViewInstances = function () {
  var previousInputViewInstances = [];
  for (var i = 0; i < this.step.previousInputViews.length; i ++) {
    var previousInputView = this.step.previousInputViews [i];
    previousInputViewInstances.push (new presentation_PreviousInputViewInstance (this, previousInputView));
  }
  return previousInputViewInstances;
}

/*
  Accepts no arguments and returns the set of
  Previous Input View Instances associated
  with this step instance as an array of
  presentation_StepInstances.
*/
presentation_StepInstance.prototype.getPreviousInputViewInstances = function () {
  this._previousInputViewInstances = this._previousInputViewInstances || this._createPreviousInputViewInstances ();
  return this._previousInputViewInstances;
}

/*
  Accepts no arguments and updates and shows the
  Previous Input View Instances associated with
  this step instance. Returns undefined.
*/
presentation_StepInstance.prototype.showPreviousInputViewInstances = function () {
  var previousInputViewInstances = this.getPreviousInputViewInstances ();
  for (var i = 0; i < previousInputViewInstances.length; i ++) {
    var previousInputViewInstance = previousInputViewInstances [i];
    previousInputViewInstance.show ();
  }
}

/*
  Accepts no arguments and hides the Previous
  Input View Instances associated with this
  step instance. Returns undefined.
*/
presentation_StepInstance.prototype.hidePreviousInputViewInstances = function () {
  var previousInputViewInstances = this.getPreviousInputViewInstances ();
  for (var i = 0; i < previousInputViewInstances.length; i ++) {
    var previousInputViewInstance = previousInputViewInstances [i];
    previousInputViewInstance.hide ();
  }
}
```

The Blank Step Instance Class
-----------------------------

<code>presentation_BlankStepInstance</code> objects represents concrete instances of blank steps.

```javascript
/*
  Accepts two arguments:

  * blankStep, a presentation_BlankStep
  * and presentationInstance, a
    presentation_PresentationInstance

  and returns a presentation_BlankStepInstance
  that is an instance of presentation_BlankStep.

  Note: blankStep must be one of
  presentationInstance's presentation's steps.
*/
function presentation_BlankStepInstance (blankStep, presentationInstance) {
  presentation_StepInstance.call (this, blankStep, presentationInstance);
}

/*
  Create a new prototype object for 
  presentation_BlankStepInstance and set 
  presentation_StepInstance's prototype as the
  object's prototype.
*/
presentation_BlankStepInstance.prototype = Object.create (presentation_StepInstance.prototype);

/*
  Assign the presentation_BlankStepInstance 
  prototype's constructor property so that any
  functions that read it can determine which 
  constructor function was used to create its
  instance objects.
*/
presentation_BlankStepInstance.prototype.constructor = presentation_BlankStepInstance;

/*
  Accepts no arguments and marks this blank step
  instance as complete. Returns undefined.

  This function is called when IntroJS highlights
  this step instance.
*/
presentation_BlankStepInstance.prototype.onHighlight = function () {
  presentation_StepInstance.prototype.onHighlight.call (this);
  this.onComplete ();
}

/*
  Accepts no arguments and returns a JQuery HTML
  Element that represents this step instance's
  focus element.
*/
presentation_BlankStepInstance.prototype._createFocusElement = function () {
  return presentation_StepInstance.prototype._createFocusElement.call (this).addClass ('presentation_blank_step');
}
```

The Button Step Instance Class
------------------------------

The <code>presentation_ButtonStepInstance</code> objects represent concrete instances of button steps.

```javascript
/*
  Accepts two arguments:

  * buttonStep, a presentation_ButtonStep
  * and presentationInstance, a
    presentation_PresentationInstance

  and returns a presentation_ButtonStepInstance
  that is an instance of presentation_Step.

  Note: buttonStep must be one of
  presentationInstance's presentation's steps.
*/
function presentation_ButtonStepInstance (buttonStep, presentationInstance) {
  presentation_StepInstance.call (this, buttonStep, presentationInstance);
}

/*
  Create a new prototype object for 
  presentation_ButtonStepInstance and set 
  presentation_StepInstance's prototype as the
  object's prototype.
*/
presentation_ButtonStepInstance.prototype = Object.create (presentation_StepInstance.prototype);

/*
  Assign the presentation_ButtonStepInstance
  prototype's constructor property so that any
  functions that read it can determine which
  constructor function was used to create its
  instance objects.  
*/
presentation_ButtonStepInstance.prototype.constructor = presentation_ButtonStepInstance;


/*
  Accepts no arguments, marks this step instance
  as having been completed, updates the
  nav element associated with this instance's
  presentation instance, and highlights the next
  step. Returns undefined.

  This function is called when a user
  completes this step instance. 
*/
presentation_ButtonStepInstance.prototype.onComplete = function () {
  presentation_StepInstance.prototype.onComplete.call (this);
  this.presentationInstance.nextStep ();
}

/*
  Accepts no arguments and enables tab focus on
  this step instance's focus element. Returns
  undefined.

  This function is be called when IntroJS
  highlights this step instance.
*/
presentation_ButtonStepInstance.prototype.onHighlight = function () {
  presentation_StepInstance.prototype.onHighlight.call (this);
  this.getFocusElement ().attr ('tabindex', 0);
}

/*
  Accepts no arguments and disables tab focus
  on this step instance's focus element. Returns
  undefined.

  This function is called when IntroJS
  unhighlights this step instance.
*/
presentation_ButtonStepInstance.prototype.onUnhighlight = function () {
  presentation_StepInstance.prototype.onUnhighlight.call (this);
  this.getFocusElement ().attr ('tabindex', -1);
}

/*
  Accepts no arguments and returns a JQuery
  HTML Element that represents this button step
  instance's focus element.
*/
presentation_ButtonStepInstance.prototype._createFocusElement = function () {
  var self = this;
  return presentation_StepInstance.prototype._createFocusElement.call (this)
    .addClass ('presentation_button_step')
    .keydown (function (event) {
        event.keyCode === 13 && self.onComplete ();
      })
    .click (function (event) {
        event.stopPropagation ();
        self.onComplete ();
     });
}
```

The Input Step Instance Class
-----------------------------

<code>presentation_InputStepInstance</code> objects represent concrete instances of input steps.

```javascript
/*
  Accepts two arguments:

  * inputStep, a presentation_InputStep
  * and presentationInstance, a
    presentation_PresentationInstance

  and returns a presentation_InputStepInstance
  that is an instance of presentation_Step.

  Note: inputStep must be one of
  presentationInstance's presentation's steps.
*/
function presentation_InputStepInstance (inputStep, presentationInstance) {
  presentation_StepInstance.call (this, inputStep, presentationInstance);
}

/*
  Create a new prototype object for 
  presentation_InputStepInstance and set 
  presentation_StepInstance's prototype as the 
  object's prototype.
*/
presentation_InputStepInstance.prototype = Object.create (presentation_StepInstance.prototype);

/*
  Assign the presentation_InputStep prototype's
  constructor property so that any functions
  that read it can determine which constructor
  function was used to create its instance 
  objects.
*/
presentation_InputStepInstance.prototype.constructor = presentation_InputStepInstance;

/*
  Accepts no arguments and enables tab focus
  on the input element in this step instance's
  focus element. Returns undefined.

  This function is be called when IntroJS
  highlights this step instance.
*/
presentation_InputStepInstance.prototype.onHighlight = function () {
  presentation_StepInstance.prototype.onHighlight.call (this);
  var input = $('input', this.getFocusElement ()).attr ('tabindex', 0).val ();
  input && (this.checkInput (input) || $('.presentation_error_message', this.presentationInstance.element).html (this.step.errorAlert).show ());
}

/*
  Accepts no arguments and disables tab focus
  on the input element in this step instance's
  focus element. Returns undefined.

  This function is called when IntroJS
  unhighlights this step instance.
*/
presentation_InputStepInstance.prototype.onUnhighlight = function () {
  presentation_StepInstance.prototype.onUnhighlight.call (this);
  var input = $('input', this.getFocusElement ()).attr ('tabindex', -1).val ();
}

/*
  Accepts one argument: input, a string; and
  returns a true iff input matches this step's
  expression.
*/
presentation_InputStepInstance.prototype.checkInput = function (input) {
  var expression = new RegExp (this.step.expression);
  return expression.test (input);
}

/*
  Accepts no arguments and returns a JQuery
  HTML Element that represents this input step
  instance's focus element.
*/
presentation_InputStepInstance.prototype._createFocusElement = function () {
  var self = this;
  var focusElement = presentation_StepInstance.prototype._createFocusElement.call (this)
    .addClass ('presentation_input_step')
    .append ($('<input></input>')
      .attr ('type', 'text')
      .attr ('tabindex', -1)
      .keyup (
        function (event) {
          if (event.keyCode === 13) {
            if (self.checkInput ($(this).val ())) {
              focusElement
                .addClass ('presentation_valid')
                .removeClass ('presentation_invalid');

              self.message = null;
              $('.presentation_error_message', self.presentationInstance.element).hide ().empty ();

              presentation_AUDIO && presentation_speak ('correct');

              $(this).attr ('tabindex', -1);
              self.onComplete ();
            } else {
              focusElement
                .removeClass ('presentation_valid')
                .addClass ('presentation_invalid');

              self.message = self.step.errorAlert;
              $('.presentation_error_message', presentationInstance.element).html (self.step.errorAlert).show ();

              presentation_AUDIO && presentation_speak ($('<p>incorrect.</p>').append (self.step.errorAlert).text ());
            }
          }
      }));
  return focusElement;
}
```

The Quiz Step Instance Class
----------------------------

Lastly, <code>presentation_QuizStepInstance</code> objects represent concrete instances of quiz steps.

```javascript
/*
  Accepts two arguments:

  * quizStep, a presentation_QuizStep
  * and presentationInstance, a
    presentation_PresentationInstance

  and returns a presentation_QuizStepInstance
  that is an instance of presentation_QuizStep.

  Note: quizStep must be one of
  presentationInstance's presentation's steps.
*/
function presentation_QuizStepInstance (quizStep, presentationInstance) {
  presentation_StepInstance.call (this, quizStep, presentationInstance);
}

/*
  Create a new prototype object for 
  presentation_QuizStepInstance and set 
  presentation_StepInstance's prototype as the 
  object's prototype.
*/
presentation_QuizStepInstance.prototype = Object.create (presentation_StepInstance.prototype);

/*
  Assign the presentation_QuizStepInstance 
  prototype's constructor property so that any
  functions that read it can determine which
  constructor function was used to create its
  instance objects.
*/
presentation_QuizStepInstance.prototype.constructor = presentation_QuizStepInstance;

/*
  Accepts no arguments and returns the correct
  answer to this quiz step as an Option Element.
*/
presentation_QuizStepInstance.prototype.getCorrectOption = function () {
  for (var i = 0; i < this.step.options.length; i ++) {
    var option = this.step.options [i];
    if (option.isCorrect) {
      return option;
    }
  }
  strictError ('[presentation][getCorrectOption] Error: an error occured while trying to retrieve the correct value for a presentation test step. The test does not have a correct value.');
  return null;
}

/*
  Accepts one argument: optionsElement, a JQuery
  HTML Element that represents this instances's
  options element; and returns the selected value
  as a string.
*/
presentation_QuizStepInstance.prototype.getSelectedValue = function (optionsElement) {
  return $('input[name="' + this.step.id + '"]:checked', optionsElement).val ();
}

/*
  Accepts one argument: optionsElement, a JQuery
  HTML Element that represents this instance's
  options element; and returns the selected
  option as an Option Element.
*/
presentation_QuizStepInstance.prototype.getSelectedOption = function (optionsElement) {
  var selectedValue = this.getSelectedValue (optionsElement);
  for (var i = 0; i < this.step.options.length; i ++) {
    var option = this.step.options [i];
    if (option.label === selectedValue) {
      return option;
    }
  }
  return null;
}

/*
  Accepts one argument: optionsElement, a JQuery
  HTML Element that represents this instance's
  options element; and returns true iff the
  currently selected option is the correct one.
*/
presentation_QuizStepInstance.prototype.checkInput = function (optionsElement) {
  var correctOption = this.getCorrectOption ();
  return correctOption && correctOption.label === this.getSelectedValue (optionsElement);
}

/*
  Accepts one argument: focusElement, a JQuery
  HTML Element that represents this instance's
  focus element; and handles click events for
  the focus element.
*/
presentation_QuizStepInstance.prototype.onClick = function (focusElement) {
  var optionsElement = $('.presentation_options', focusElement);

  var selectedOption = this.getSelectedOption (optionsElement);
  $('.presentation_message', focusElement).text (selectedOption.onSelect);

  if (this.checkInput (optionsElement)) {
    focusElement
      .addClass ('presentation_valid')
      .removeClass ('presentation_invalid');

    presentation_AUDIO && presentation_speak ('correct.')

    this.onComplete ();
  } else {
    focusElement
      .removeClass ('presentation_valid')
      .addClass ('presentation_invalid');

    presentation_AUDIO && presentation_speak ('incorrect.')
  }
}

/*
  Accepts no arguments and returns a JQuery
  HTML Element that represents this instance's
  focus element.
*/
presentation_QuizStepInstance.prototype._createFocusElement = function () {
  var element = presentation_StepInstance.prototype._createFocusElement.call (this)
    .addClass ('presentation_quiz_step');

  var testElement = $('<div></div>')
    .addClass ('presentation_test')
    .append ($('<div></div>').addClass ('presentation_message'));

  element.append (testElement);

  var optionsElement = $('<div></div>').addClass ('presentation_options');
  testElement.append (optionsElement);

  var self = this;
  for (var i = 0; i < this.step.options.length; i ++) {
    var option = this.step.options [i];
    optionsElement.append (
      $('<div></div>')
        .addClass ('presentation_option')
        .append ($('<input></input>')
          .attr ('type', 'radio')
          .attr ('name', this.step.id)
          .attr ('value', option.label)
          .addClass ('presentation_option_input')
          .click (
            function () {
              self.onClick (element);
          }))
        .append ($('<label></label>')
          .addClass ('presentation_option_label')
          .text (option.label)));
  }
  return element;
}
```

The Presentation Instance Class
-------------------------------

The <code>presentation_PresentationInstance</code> objects represent concrete instances of presentations and are somewhat complex.

Every presentation instance has a collection of HTML elements that may have multiple states (for example, the navigation element) and it has to interface with an IntroJS object to request and respond to state transitions (for example, starting/stopping a presentation and moving between steps).

```javascript
/*
  Accepts one argument: presentation, a
  presentation_Presentation; and returns
  an instance of presentation as a
  presentation_PresentationInstance.
*/
function presentation_PresentationInstance (presentation) {
  this.presentation        = presentation;
  this._stepInstances      = null;
  this._messageElement     = null;
  this._audioToggleElement = null;
  this._navElement         = null;
  this._element            = null;
  this._intro              = null;
}

/*
  Accepts no arguments and returns a
  presentation_StepInstance containing a step
  instance for each step associated with this
  instance's presentation.
*/
presentation_PresentationInstance.prototype._createStepInstances = function () {
  var self = this;
  return this.presentation.getSteps ().map (
    function (step) {
      return step.createInstance (self);
  });
}

/*
  Accepts no arguments and returns a
  presentation_StepInstance array listing this
  presentation instance's step instances.
*/
presentation_PresentationInstance.prototype.getStepInstances = function () {
  this._stepInstances = this._stepInstances || this._createStepInstances ();
  return this._stepInstances;
}

/*
  Accepts one argument: stepId, a Presentation
  Step ID string; and returns the Presentation
  Step Instance that instantiates the referenced
  step in this presentation instance as a
  presentation_StepInstance.
*/
presentation_PresentationInstance.prototype.getStepInstance = function (stepId) {
  var stepInstances = this.getStepInstances ();
  for (var i = 0; i < stepInstances.length; i ++) {
    var stepInstance = stepInstances [i];
    if (stepInstance.step.id === stepId) {
      return stepInstance;
    }
  }
  return null;
}

/*
  Accepts no arguments and returns an HTML
  element that represents this presentation as
  a JQuery HTML Element.
*/
presentation_PresentationInstance.prototype._createElement = function () {
  var self = this;
  var icon = 'modules/presentation/images/play-circle-outline.png';
  var label = 'PLAY LESSON';
  var presentationElement = $('<div></div>')
    .addClass ('presentation_presentation')
    .attr ('data-presentation-presentation', this.presentation.getId ())
    .css ('background-image',  'url(' + this.presentation.getImage () + ')')
    .css ('background-size',   this.presentation.getWidth () + ', ' + this.presentation.getHeight ())
    .css ('background-repeat', 'no-repeat')
    .css ('width',             this.presentation.getWidth ())
    .css ('height',            this.presentation.getHeight ())
    .css ('position',          'relative')
    .append (presentation_createOverlayInsetElement (label, icon))
    .append (presentation_createOverlayElement ())
    .click (
        function () {
          if (!self.running ()) {
            // Stop all other instances and remove their introJS elements.
            // Note: IntroJS does not support multiple concurrent introJS instances. We need to remove any introJS elements associated with other instances before starting ours.
            for (presentationInstanceId in presentation_INSTANCES) {
              presentation_INSTANCES [presentationInstanceId] && presentation_INSTANCES [presentationInstanceId].exit ();
            }

            // Start this presentation instance.
            self.start ();
            presentationElement.addClass ('presentation_active');
            $('.presentation_overlay_inset', presentationElement).remove ();
            $('.presentation_overlay', presentationElement).remove ();
          }
      });

  this.getStepInstances ().forEach (
    function (stepInstance) {
      presentationElement.append (
        stepInstance.getFocusElement ()
          .css ('background-image',    'url(' + stepInstance.step.image + ')')
          .css ('background-position', '-' + stepInstance.step.left + ' -' + stepInstance.step.top)
          .css ('background-size',     self.presentation.getWidth () + ', ' + self.presentation.getHeight ())
          .css ('background-repeat',   'no-repeat')
      );

      presentationElement.append (
        stepInstance.getPreviousInputViewInstances ().map (
          function (previousInputViewInstance) {
            return previousInputViewInstance.getElement ();
      }));
  });

  return presentationElement;
}

/*
  Accepts no arguments and returns the JQuery
  HTML Element that represents this presentation.
*/
presentation_PresentationInstance.prototype.getElement = function () {
  this._element = this._element || this._createElement ();
  return this._element;
}

/*
  Accepts no arguments and returns a JQuery HTML
  Element that represents an exit button that
  when pressed ends this presentation instance.
*/
presentation_PresentationInstance.prototype.createExitButton = function () {
  var self = this;
  return $('<div class="presentation_exit"></div>')
    .click (function (event) {
        event.stopPropagation ();
        self.exit ();
      });
}

/*
  Accepts no arguments and returns a message
  element as a JQuery HTML Element.
*/
presentation_PresentationInstance.prototype._createMessageElement = function () {
  return $('<div></div>').addClass ('presentation_error_message');
}

/*
  Accepts no arguments and returns this
  presentation instance's message element as a
  JQuery HTML Element.
*/
presentation_PresentationInstance.prototype.getMessageElement = function () {
  this._messageElement = this._messageElement || this._createMessageElement ();
  return this._messageElement;
}

/*
  Accepts no arguments and returns an audio
  narration toggle as a JQuery HTML Element.
*/
presentation_PresentationInstance.prototype._createAudioToggleElement = function () {
  var self = this;
  var inputElement = $('<input></input>')
    .addClass ('presentation_audio_toggle_input')
    .attr ('type', 'checkbox')
    .prop ('checked', presentation_AUDIO)
    .change (function (event) {
        var checked = $(this).prop ('checked');
        presentation_AUDIO = checked

        checked || (responsiveVoice && responsiveVoice.cancel ());

        var stepInstance = self.getCurrentStepInstance ();
        if (stepInstance) {
          if (checked) {
            stepInstance.spoken || stepInstance.speak ();
          } else { // !checked
            stepInstance.spoken = false;
          }
        }
      });

  return $('<div></div>')
    .addClass ('presentation_audio_toggle')
    .addClass ('materialize')
    .attr ('tabindex', 0)
    .append ($('<div></div>')
      .addClass ('switch')
      .append ($('<span></span>')
        .addClass ('presentation_audio_toggle_label')
        .text ('AUDIO NARRATION'))
      .append ($('<label></label>')
        .append ('OFF')
        .append (inputElement)
        .append ($('<span></span>')
          .addClass ('lever'))
        .append ($('<span></span>')
          .addClass ('presentation_audio_toggle_on')
          .text ('ON'))))
    .keydown (function (event) {
        if (event.keyCode === 13) {
          inputElement.prop ('checked', !inputElement.prop ('checked'));
          inputElement.change ();
        }
      });
}

/*
  Accepts no arguments and returns this
  presentation instance's audio narration toggle
  as a JQuery HTML Element.
*/
presentation_PresentationInstance.prototype.getAudioToggleElement = function () {
  this._audioToggleElement = this._audioToggleElement || this._createAudioToggleElement ();
  return this._audioToggleElement;
}

/*
  Accepts no arguments and returns a nav element
  that is associated with this presentation
  instance as a JQuery HTML Element.
*/
presentation_PresentationInstance.prototype._createNavElement = function () {
  var self = this;
  var stepInstances = this.getStepInstances ();
  return $('<table></table>')
    .addClass ('presentation_nav')
    .append ($('<tbody></tbody>')
      .append ($('<tr></tr>')
        .append ($('<td>BACK</td>')
            .attr ('tabindex', 0)
            .addClass ('presentation_nav_back')
            .addClass ('presentation_disabled')
            .keydown (function (event) {
                event.keyCode === 13 && self.previousStep ();
              })
            .click (function (event) {
                event.stopPropagation ();
                self.previousStep ();
              }))
        .append ($('<td>Step <span class="presentation_nav_step">1</span> of <span class="presentation_nav_total">' + stepInstances.length + '</span></td>'))
        .append ($('<td>NEXT</td>')
            .attr ('tabindex', 0)
            .addClass ('presentation_nav_next')
            .addClass (stepInstances.length === 0 || stepInstances [0].completed ? '' : 'presentation_disabled')
            .hover (function () {
                if (!self.currentStepInstanceCompleted ()) {
                  $(this).attr ('title', 'You must complete this step before continuing.');
                }
              })
            .keydown (function (event) {
                event.keyCode === 13 && self.nextStep ();
              })
            .click (function (event) {
                event.stopPropagation ();
                self.nextStep ();
              }))));
}

/*
  Accepts no arguments and returns this
  presentation instance's nav element as a JQuery
  HTML Element.
*/
presentation_PresentationInstance.prototype.getNavElement = function () {
  this._navElement = this._navElement || this._createNavElement ();
  return this._navElement;
}

/*
  Accepts no arguments and updates this
  presentation instance's nav element to
  represent this instance's current state.
  Returns undefined.
*/
presentation_PresentationInstance.prototype.updateNavElement = function () {
  var stepInstances = this.getStepInstances ();
  var intro         = this.getIntro ();
  var navElement    = this.getNavElement ();
  
  // I. Enable/disable the Back button.
  var backElement = $('.presentation_nav_back', navElement);
  intro._currentStep === 0 ?
    backElement.addClass    ('presentation_disabled'):
    backElement.removeClass ('presentation_disabled');

  // II. Enable/disable the step buttons.
  $('.presentation_nav_step', navElement).text (intro._currentStep + 1);

  // III. Highlight the current step button.
  $('.presentation_nav_step', navElement).removeClass ('presentation_current_step');
  $('[data-presentation-nav-step="' + intro._currentStep + '"]', navElement).addClass ('presentation_current_step');

  // IV. Enable/disable the Next button.
  var nextElement = $('.presentation_nav_next', navElement);
  stepInstances [intro._currentStep].completed ?
    nextElement.removeClass ('presentation_disabled'):
    nextElement.addClass    ('presentation_disabled');

  // V. Label the Next button.
  intro._currentStep < stepInstances.length - 1 ?
    nextElement.text ('NEXT').removeClass ('presentation_complete'):
    nextElement.text ('DONE').addClass ('presentation_complete');
}

/*
  Accepts no arguments and returns an
  IntroJS object that will step through this
  presentation instance's steps.
*/
presentation_PresentationInstance.prototype._createIntro = function () {
  var self = this;
  var presentationElement = this.getElement ();
  return introJs (presentationElement.get (0))
    // Set introJs options and prepare steps
    .setOptions ({
        keyboardNavigation: false,
        exitOnOverlayClick: false,
        showStepNumbers: true,
        showButtons: false,
        showBullets: false,
        overlayOpacity: 0.4,
        steps: self.getStepInstances ().map (
            function (stepInstance) {
              return {
                element:  '#' + stepInstance.getFocusElement ().attr ('id'),
                intro:    stepInstance.step.text,
                position: stepInstance.step.position
              };
          })
      })
    // When moving between steps  
    .onafterchange (
        function () {
          if ($('.presentation_nav', presentationElement).length === 0) {
            $('.introjs-tooltip', presentationElement)
              .prepend (self.createExitButton ())
              .append (self.getMessageElement ())
              .append (responsiveVoice ? self.getAudioToggleElement () : null)
              .append (self.getNavElement ());
          }

          if (this._direction === 'forward') {
            var previousStepInstance = self.getPreviousStepInstance ();
            previousStepInstance && previousStepInstance.onUnhighlight ();
          } else { // this._direction === 'backward'
            var nextStepInstance = self.getNextStepInstance ();
            nextStepInstance && nextStepInstance.onUnhighlight ();
          }

          self.updateNavElement ();
          self.getMessageElement ().hide ().empty ();

          var stepInstance = self.getCurrentStepInstance ();

          presentationElement.css ('background-image', 'url(' + stepInstance.step.image + ')');

          stepInstance.onHighlight ();

          stepInstance.spoken = false;
          presentation_AUDIO && stepInstance.speak ();
      })
    // When last step is finished  
    .onexit (
        function () {
          responsiveVoice && responsiveVoice.cancel ();

          presentationElement.css ('background-image', 'url(' + self.presentation.getImage () + ')');
          presentationElement.removeClass ('presentation_active');
          $('.presentation_visible').removeClass ('presentation_visible');
          $('.introjs-tooltip').remove ();

          presentationElement
            .append (presentation_createOverlayInsetElement ('REPLAY LESSON', 'modules/presentation/images/replay-icon.png'))
            .append (presentation_createOverlayElement ());
      });
}

/*
  Accepts no arguments and returns the IntroJS
  object that steps through this presentation
  instance's steps
*/
presentation_PresentationInstance.prototype.getIntro = function () {
  this._intro = this._intro || this._createIntro ();
  return this._intro;
}

/*
  Accepts no arguments and returns an integer
  representing this presentation instance's
  current step instance's index.
*/
presentation_PresentationInstance.prototype.getCurrentStepInstanceIndex = function () {
  return this.getIntro ()._currentStep;
}

/*
  Accepts no arguments and returns this
  presentation instance's current step instance
  as a presentation_StepInstance.
*/
presentation_PresentationInstance.prototype.getCurrentStepInstance = function () {
  return (this.getStepInstances ()) [this.getCurrentStepInstanceIndex ()];
}

/*
  Accepts no arguments and returns this
  presentation instance's previous step instance
  as a presentation_StepInstance.

  If this presentation instance does not have
  a previous step instance, this function
  returns null.
*/
presentation_PresentationInstance.prototype.getPreviousStepInstance = function () {
  var index = this.getCurrentStepInstanceIndex ();
  var stepInstances = this.getStepInstances ();
  return stepInstances.length > 0 && index > 0 ? stepInstances [index - 1] : null;
}

/*
  Accepts no arguments and returns this
  presentation instance's next step instance as
  a presentation_StepInstance.

  If this presentation instance does not have a
  next step instance, this function returns null.
*/
presentation_PresentationInstance.prototype.getNextStepInstance = function () {
  var index = this.getCurrentStepInstanceIndex ();
  var stepInstances = this.getStepInstances ();
  return stepInstances.length > 0 && index < stepInstances.length ? stepInstances [index + 1] : null;
}

/*
  Accepts no arguments and returns true iff this
  presentation instance's current step instance
  has been completed.
*/
presentation_PresentationInstance.prototype.currentStepInstanceCompleted = function () {
  return this.getCurrentStepInstance ().completed;
}

/*
  Accepts no arguments and starts this
  presentation instance. Returns undefined.
*/
presentation_PresentationInstance.prototype.start = function () {
  this.getIntro ().start ();
}

/*
  Accepts no arguments and exits this
  presentation instance. Returns undefined.
*/
presentation_PresentationInstance.prototype.exit = function () {
  this.getIntro ().exit ();
}

/*
  Accepts no arguments and returns true iff this
  presentation instance is currently running.
*/
presentation_PresentationInstance.prototype.running = function () {
  return this.getIntro ().running;
}

/*
  Accepts no arguments and highlights the next
  step instance in this presentation instance.
  Returns true if the current step is finished,
  and a following one exists.
*/
presentation_PresentationInstance.prototype.nextStep = function () {
  return this.currentStepInstanceCompleted () && this.getIntro ().nextStep ();
}

/*
  Accepts no arguments and highlights the
  previous step instance in this presentation
  instance. Returns true if the current step is
  not the first, and a previous step exists.
*/
presentation_PresentationInstance.prototype.previousStep = function () {
  return this.getCurrentStepInstanceIndex () > 0 && this.getIntro ().previousStep ();
}

/*
  Accepts two arguments:

  * label, either an HTML string or a JQuery
    HTML Element
  * and icon, a URL string

  and returns an overlay inset element displaying
  the given label and icon as a JQuery HTML
  Element.
*/
function presentation_createOverlayInsetElement (label, icon) {
  return $('<div></div>')
    .addClass ('presentation_overlay_inset')
    .css ({
      'cursor':   'pointer',
      'height':   '168px',
      'left':     '416px',
      'opacity':  '1',
      'position': 'absolute',
      'top':      '165px',
      'width':    '168px',
      'z-index':  '1011'
    })
    .append ($('<div></div>')
      .addClass ('presentation_overlay_inset_icon')
      .css ({
        'background-image':    'url(' + icon + ')',
        'background-repeat':   'no-repeat',
        'background-position': '50%',
        'height':              '100px',
        'width':               '100%'
      }))
    .append ($('<div></div>')
      .addClass ('presentation_overlay_inset_text')
      .css ({
        'height':     '68px',
        'text-align': 'center',
        'width':      '100%'
      })
      .append ($('<p></p>').text (label).css ('color', 'white'))
    );
}

/*
  Accepts no arguments and returns an overylay
  element as a JQuery HTML Element.
*/
function presentation_createOverlayElement () {
  return $('<div></div>')
    .addClass ('presentation_overlay')
    .css ({
        'background-color':    'black',
        'height':              '100%',
        'cursor':               'pointer',
        'opacity':             '0.4',
        'position':            'absolute',
        'top':                 '0px',
        'width':               '100%',
        'z-index':             '1010'
      });
}
```

Auxiliary Functions
-------------------

The following are miscellaneous functions shared by the classes defined above.

```javascript
/*
  Accepts two arguments:

  * type, a content type string
  * and path, a string array

  and returns a resource ID string that
  references the content referenced by path.
*/
function presentation_getId (type, path) {
  var uri = new URI ('').segmentCoded (type);
  path.forEach (
    function (name) {
      uri.segmentCoded (name);
  });
  return uri.toString ();
}

/*
  Accepts one argument: htmlTranscript, an HTML
  string or JQuery HTML Element; that represents
  a speech transcript and returns a punctuated
  version of htmlTranscript with HTML tags
  removed as a string.
*/
presentation_punctuate = function (htmlTranscript) {
  // I. Append punctuation to paragraphs and headers.
  var transcript = $('<div></div>').html (htmlTranscript);
  $('h1,h2,h3,h4,h5,p', transcript).map (
    function (i, element) {
      if (!$(element).text ().match (/[!?.]$/)) {
        $(element).append ('.');
      }
  });

  // II. Remove ending and internal whitespace.
  return transcript.text ().trim ().replace (/\s+/g, ' ');
} 

/*
  Accepts on argument: htmlTranscript, an HTML
  string or JQuary HTML Element that represents a
  speech transcript; punctuates the transcript,
  and reads it aloud using a text to speech
  synthesizer.
*/
presentation_speak = function (htmlTranscript) {
  responsiveVoice && responsiveVoice.speak (presentation_punctuate (htmlTranscript), 'UK English Male');
}
```

The Presentation Database Schema
--------------------------------

To be considered valid, the Presentation Database XML file must conform to the following XML schema, which can be found in [database.xsd](#The Presentation Database Schema "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- Defines the root element. -->
  <xs:element name="database">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="presentation" type="presentationType" minOccurs="0" maxOccurs="unbounded">
          <xs:key name="uniquePresentationName">
            <xs:selector xpath="presentation"/>
            <xs:field xpath="@name"/>
          </xs:key>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>

  <!-- Defines the Presentation element type. -->
  <xs:complexType name="presentationType">
    <xs:all>
      <xs:element name="name"  type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="image" type="xs:anyURI" minOccurs="1" maxOccurs="1"/>
      <xs:element name="width" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="height" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="steps" type="stepsType" minOccurs="1" maxOccurs="1">
        <xs:key name="uniqueStepName">
          <xs:selector xpath="blankStep|buttonStep|inputStep|testStep"/>
          <xs:field xpath="name"/>
        </xs:key>
      </xs:element>
    </xs:all>
  </xs:complexType>

  <!-- Defines the Steps element type. -->
  <xs:complexType name="stepsType">
    <xs:choice maxOccurs="unbounded">
      <xs:element name="blankStep"  type="blankStepType" minOccurs="0"/>
      <xs:element name="buttonStep" type="blankStepType" minOccurs="0"/>
      <xs:element name="inputStep"  type="inputStepType" minOccurs="0"/>
      <xs:element name="testStep"   type="testStepType"  minOccurs="0"/>
    </xs:choice>
  </xs:complexType>

  <!-- Defines the Blank Step element type. -->
  <xs:complexType name="blankStepType">
    <xs:sequence>
      <xs:element name="name" type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="image" type="xs:anyURI" minOccurs="1" maxOccurs="1"/>
      <xs:element name="text" type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="position" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:enumeration value="bottom"/>
            <xs:enumeration value="floating"/>
            <xs:enumeration value="left"/>
            <xs:enumeration value="right"/>
            <xs:enumeration value="top"/>
            <xs:enumeration value="top-middle-aligned"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="top" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="left" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="width" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="height" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="previousInputViews" minOccurs="1" maxOccurs="1">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="previousInputView" type="previousInputViewType" minOccurs="0" maxOccurs="unbounded">
              <xs:keyref name="previousInputViewInputStepId" refer="uniqueStepName">
                <xs:selector xpath="inputStep"/>
                <xs:field xpath="@name"/>
              </xs:keyref>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:sequence>
  </xs:complexType>

  <!-- Defines the Input Step element type. -->
  <xs:complexType name="inputStepType">
    <xs:complexContent>
      <xs:extension base="blankStepType">
        <xs:sequence>
          <xs:element name="expression" type="xs:string" minOccurs="1" maxOccurs="1"/>
          <xs:element name="errorAlert" type="xs:string" minOccurs="1" maxOccurs="1"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <!-- Defines the Test Step element type. -->
  <xs:complexType name="testStepType">
    <xs:complexContent>
      <xs:extension base="blankStepType">
        <xs:sequence>
          <xs:element name="options" type="optionsType" minOccurs="1" maxOccurs="1"/>
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>

  <!-- Defines the Options element type. -->
  <xs:complexType name="optionsType">
    <xs:sequence>
      <xs:element name="option" minOccurs="0" maxOccurs="unbounded">
        <xs:complexType>
          <xs:sequence>
            <xs:element name="label" type="xs:string" minOccurs="1" maxOccurs="1"/>
            <xs:element name="isCorrect" minOccurs="1" maxOccurs="1">
              <xs:simpleType>
                <xs:restriction base="xs:string">
                  <xs:enumeration value="true"/>
                  <xs:enumeration value="false"/>
                </xs:restriction>
              </xs:simpleType>
            </xs:element>
            <xs:element name="onSelect" type="xs:string" minOccurs="1" maxOccurs="1"/>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:sequence>
  </xs:complexType>

  <!-- Defines the Previous Input View element type. -->
  <xs:complexType name="previousInputViewType">
    <xs:sequence>
      <xs:element name="inputStepName" type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="top" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="left" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="width" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
      <xs:element name="height" minOccurs="1" maxOccurs="1">
        <xs:simpleType>
          <xs:restriction base="xs:string">
            <xs:pattern value="[0-9]+px"/>
          </xs:restriction>
        </xs:simpleType>
      </xs:element>
    </xs:sequence>
  </xs:complexType>
</xs:schema>
```

An Example Presentation Database
--------------------------------

An example Presentation Database can be found in [database.xml.example](#An Example Presentation Database "save:") and is presented below:

```xml
<?xml version="1.0" encoding="utf-8"?>
<database>
  <presentation>
    <name>get_started_tab_lesson</name>
    <image>modules/presentation/images/getting_started_tab_lesson/001-get-started-mpn.jpg</image>
    <width>1000px</width>
    <height>500px</height>
    <steps>
      <blankStep>
        <name>1_introduction_to_the_get_started_tab</name>
        <image>modules/presentation/images/getting_started_tab_lesson/001-get-started-mpn.jpg</image>
        <text><![CDATA[
          <p><strong>Introduction to the Get Started tab</strong></p>
          <p>The <em>Get Started</em> tab is the first step in the On-Screen Data Entry process. This is where you will enter the Manufacturer Part Number and Name, as well as indicate whether you are offering a Product or Accessory. The information you enter here will be automatically transferred to subsequent tabs.</p>
        ]]></text>
        <position>floating</position>
        <top>400px</top>
        <left>500px</left>
        <width>0px</width>
        <height>0px</height>
        <previousInputViews/>
      </blankStep>
      <inputStep>
        <name>3_type_a_manufacturer_part_number</name>
        <image>modules/presentation/images/getting_started_tab_lesson/001-get-started-mpn.jpg</image>
        <text><![CDATA[
          <p><strong>Type a Manufacturer Part Number.</strong></p>
          <p><em>Example: HSC0424PP</em></p>
          <p>This field should be entered exactly as provided by the manufacturer, and should not be edited in any way. You can enter up to 40 characters. Type in a Manufacturer Part Number below and hit <strong>Enter</strong>.</p>
        ]]></text>
        <position>top</position>
        <top>232px</top>
        <left>128px</left>
        <width>160px</width>
        <height>21px</height>
        <previousInputViews/>
        <expression><![CDATA[^[a-zA-Z0-9]{1,40}$]]></expression>
        <errorAlert>ERROR: There is a 40 character limit and only alphanumeric characters are allowed.</errorAlert>
      </inputStep>
      <buttonStep>
        <name>5_open_the_drop-down_menu</name>
        <image>modules/presentation/images/getting_started_tab_lesson/001-get-started-mpn.jpg</image>
        <text><![CDATA[
          <p><strong>Open the drop-down menu.</strong></p>
          <p>Click in the text box to reveal the drop-down menu.</p>
        ]]></text>
        <position>top-middle-aligned</position>
        <top>232px</top>
        <left>414px</left>
        <width>147px</width>
        <height>21px</height>
        <previousInputViews>
          <previousInputView>
            <inputStepName>3_type_a_manufacturer_part_number</inputStepName>
            <top>232px</top>
            <left>128px</left>
            <width>160px</width>
            <height>21px</height>
          </previousInputView>
        </previousInputViews>
      </buttonStep>
      <testStep>
        <name>12_test_your_knowledge</name>
        <image>modules/presentation/images/getting_started_tab_lesson/006-all-filled-out.jpg</image>
        <text><![CDATA[
          <p class="red"><strong>Test Your Knowledge</strong></p>
          <p><strong>If you click onto the next tab without saving your information first, your data will be lost.</strong><br/>Select an answer in the window below.</p>
        ]]></text>
        <position>top</position>
        <top>195px</top>
        <left>327px</left>
        <width>330px</width>
        <height>134px</height>
        <previousInputViews/>
        <options>
          <option>
            <label><![CDATA[True]]></label>
            <isCorrect>true</isCorrect>
            <onSelect><![CDATA[Correct!]]></onSelect>
          </option>
          <option>
            <label><![CDATA[False]]></label>
            <isCorrect>false</isCorrect>
            <onSelect><![CDATA[Incorrect!]]></onSelect>
          </option>
        </options>
      </testStep>
    </steps>
  </presentation>
</database>
```

The Default Presentation Database
---------------------------------

The default Presentation Database contains an empty database and can be found in [database.xml.default](#The Default Presentation Database "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<database></database>
```

Generating Source Files
-----------------------

You can generate the Book module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
Presentation.js
----------------
```
_"Global Variables"

_"The Load Event Handler"

_"The Block Handlers"

_"The Previous Input View Class"

_"The Step Class"

_"The Blank Step Class"

_"The Button Step Class"

_"The Input Step Class"

_"The Quiz Step Class"

_"The Presentation Class"

_"The Database Class"

_"The Previous Input View Instance Class"

_"The Step Instance Class"

_"The Blank Step Instance Class"

_"The Button Step Instance Class"

_"The Input Step Instance Class"

_"The Quiz Step Instance Class"

_"The Presentation Instance Class"

_"Auxiliary Functions"
```
[presentation.js](#Presentation.js "save:")
-->
