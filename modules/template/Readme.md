Template Module
===============

The Template module allows other modules to define and nested templates.

```javascript
/*
  The Template module allows other modules to define and nested templates.
*/
```

The Template Class
------------------

```javascript
/*
  Defines the template_Template class. Accepts 
  four arguments: 
  * parent, a template_Template object
  * id, a Menu Element ID string
  * getRawElement, a function that accepts one
    argument, another function
  * classes, an array of strings
*/
function template_Template (parent, id, getRawElement, classes) {
  this.parent        = parent;
  this.id            = id;
  this.getRawElement = getRawElement;
  this.classes       = classes;
}

/*
  Accepts no arguments. Returns the parent path
  of the template_Template object if it exists,
  and an empty array if not.
*/
template_Template.prototype.getAncestors = function () {
  return this.parent ? this.parent.getPath () : [];
}

/*
  Accepts no arguments, and returns ancestors, an
  array consisting of the paths of 
  template_Template's ancestors as well as the 
  template_Template instance itself.
*/
template_Template.prototype.getPath = function () {
  var ancestors = this.getAncestors ();
  ancestors.push (this);
  return ancestors;
}

/*
  Accepts no arguments, and returns line, an
  array consisting of the IDs of the items that
  make up template_Template's path.
*/
template_Template.prototype.getLine = function () {
  var line = [];
  var path = this.getPath ();
  for (var i = 0; i < path.length; i ++) {
    line.push (path [i].id);
  }
  return line;
}

/*
  Accepts no arguments and returns an integer
  representing the level of the template, as
  determined by its path.
*/
template_Template.prototype.getLevel = function () {
  return this.getPath ().length;
}

/*
  Accepts one argument, a function; applies that
  function to the template_Template object; and
  returns undefined.
*/
template_Template.prototype.iterate = function (templateFunction) {
  templateFunction (this);
}

/*
  Accepts one argument, done, a function; sends
  the raw template of the template_Template 
  element to done; and returns undefined.
*/
template_Template.prototype.getElement = function (done) {
  var self = this;
  this.getRawElement (
    function (error, rawTemplate) {
      if (error) { return done (error); }

      done (null, rawTemplate
        .addClass (self.classes)
        .attr ('data-template-id', self.id)
        .attr ('data-template-level', self.getLevel ()));
  });
}
```

The Page Template Class
-----------------------

```javascript
/*
  Defines the template_Page class, a subclass
  of template_Template. Accepts four arguments:
  * parent, a template_Template instance
  * id, a Menu Element ID string
  * getRawElement, a function that accepts one
    argument, another function
  * classes, an array of strings
*/
function template_Page (parent, id, getRawElement, classes) {
  template_Template.call (this, parent, id, getRawElement, classes);
}

/*
  Create a new prototype object for template_Page
  and set template_Template's prototype as the
  object's prototype.
*/
template_Page.prototype = Object.create (template_Template.prototype);

/*
  Assign the template_Page prototype's constructor
  property so that any functions that read it can
  determine which constructor function was used
  to create its instance objects.
*/
template_Page.prototype.constructor = template_Page;

/*
  Accepts one argument, id, a Menu Element ID 
  string. Returns the page template matching that
  ID, or null if no match is found.
*/
template_Page.prototype.getPageTemplate = function (id) {
  return this.id === id ? this : null;
}

/*
  Accepts one argument, id, a template ID string.
  Returns the section within it with the target
  ID, but because pages do not have children, it
  returns null.
*/
template_Page.prototype.getSectionTemplate = function (id) {
  return null;
}

/*
  Accepts one argument, done, a function; 
  generates a template for the template_Page 
  Object by calling template_Template's getElement
  method; and passes this new template to done.
  Returns undefined.
*/
template_Page.prototype.getElement = function (done) {
  template_Template.prototype.getElement.call (this,
    function (error, template) {
      if (error) { return done (error); }

      done (null, template.addClass ('template_page'));
  });
}

/*
  Accepts one argument, done, a function.
  Places the HTML for the appropriate section
  into the .template_hold_block element, and
  passes it to next. Calls done.
*/
template_Page.prototype.getPageElement = function (done) {
  var templates = this.getPath ().reverse ();
  var pageTemplate = templates.shift ();
  pageTemplate.getElement (
    function (error, pageElement) {
      if (error) { return done (error); }

      async.reduce (
        templates,
        pageElement,
        function (element, sectionTemplate, next) {
          sectionTemplate.getElement (
            function (error, sectionElement) {
              if (error) { return next (error); }

              $('.template_id_block', sectionElement).replaceWith (sectionTemplate.id);
              $('.template_hole_block', sectionElement).replaceWith (element);
              next (null, sectionElement);
          });
        },
        done
      );
  });
}
```

The Section Template Class
--------------------------

```javascript
/*
  Defines the template_Section class, a 
  subclass of template_Template. 

  Accepts five arguments: 
  * parent, a template_Template object
  * id, a Menu Element ID string
  * children, an array of page template objects
  * getRawElement, a function 
    * which accepts one argument, another function
  * classes, an array of strings

  Returns undefined.
*/
function template_Section (parent, id, children, getRawElement, classes) {
  template_Template.call (this, parent, id, getRawElement, classes);
  this.children = children;
}

/*
  Create a new prototype object for 
  template_Section and set template_Template's
  prototype as the object's prototype.
*/
template_Section.prototype = Object.create (template_Template.prototype);

/*
  Assign the template_Section prototype's
  constructor property so that any functions that
  read it can determine which constructor 
  function was used to create its instance 
  objects.
*/
template_Section.prototype.constructor = template_Section;

/*
  Accepts one argument, id, a Menu Element ID 
  string; returns the child of the 
  template_Section object that has a matching id.
*/
template_Section.prototype.getPageTemplate = function (id) {
  return template_findPageTemplate (id, this.children);
}

/*
  Accepts one argument, id, a Menu Element ID 
  string. Searches template_Section and its
  children, and returns the object that matches
  the ID.
*/
template_Section.prototype.getSectionTemplate = function (id) {
  return this.id === id ? this : template_findSectionTemplate (id, this.children);
}

/*
  Accepts one argument, templateFunction, a
  function; applies that function to the
  template_Section object, all of its children,
  all of those children's children, etc. until
  there are no further children; and returns 
  undefined.
*/
template_Section.prototype.iterate = function (templateFunction) {
  templateFunction (this);
  for (var i = 0; i < this.children.length; i ++) {
    this.children [i].iterate (templateFunction);
  }
}

/*
  Accepts one argument, done, a function; 
  generates the the section template for the 
  template_Section instance and sends it to done;
  returns undefined.
*/
template_Section.prototype.getElement = function (done) {
  template_Template.prototype.getElement.call (this,
    function (error, template) {
      if (error) { return done (error); }

      done (null, template.addClass ('template_section'));
  });
}
```

The Template Store Class
------------------------

```javascript
/*
  Template Stores store registered templates.
*/
function template_TemplateStore () {
  var self = this;

  // An array of registered templates
  var _templates = [];

  /* 
    An associative array of template functions,
    keyed by ID 
  */
  var _templateFunctions = {};

  /*
    Accepts two arguments: 
    * id, a Menu Element ID string
    * templateFunction, a function

    Adds templateFunction to _templateFunctions,
    keying it by id.
  */
  var addTemplateFunction = function (id, templateFunction) {
    if (!_templateFunctions [id]) { _templateFunctions [id] = []; }
    _templateFunctions [id].push (templateFunction);
  }

  /*
    Accepts one argument, template; adds it to
    the store; applies template function(s) 
    matching the template's ID and then does the
    same to the template's children, children's
    children, etc. Returns undefined. 
  */
  this.add = function (template) {
    // I. Add the template to the store.
    _templates.push (template);

    // II. Call template functions on the added templates.
    template.iterate (
      function (template) {
        var id = template.id;
        var templateFunctions = _templateFunctions [id];
        if (templateFunctions) {
          for (var i = 0; i < templateFunctions.length; i ++) {
            (templateFunctions [i]) (template);
          }
        }
    });
  }

  /*
    Accepts one argument, templates, an array of
    template instance objects, adds each of the
    templates to the template store; returns
    undefined.
  */
  this.addTemplates = function (templates) {
    for (var i = 0; i < templates.length; i ++) {
      self.add (templates [i]);
    }
  }

  /*
    Accepts two arguments:
      * id, a Menu Element ID string
      * templateFunction, a function

    Finds the page template with the id submitted
    and applies the template functions associated
    with that ID to it. If no template matching
    the ID is found, adds templateFunction to 
    _templateFunctions, with the ID as its key.
  */
  this.getPageTemplate = function (id, templateFunction) {
    var template = template_findPageTemplate (id, _templates);
    template ? templateFunction (template) : addTemplateFunction (id, templateFunction);
  }

  /*
    Accepts two arguments:
      * id, a Menu Element ID string
      * templateFunction, a function

    Finds the section template with the id
    submitted and applies the template functions
    associated with that ID to it. If no template
    matching the ID is found, adds
    templateFunction to _templateFunctions, with
    the ID as its key.
  */
  this.getSectionTemplate = function (id, templateFunction) {
    var template = template_findSectionTemplate (id, _templates);
    template ? templateFunction (template) : addTemplateFunction (id, templateFunction);
  }
}
```

The Template Store
------------------

```javascript
/*
  A template_TemplateStore that stores all of the
  registered templates.
*/
var template_TEMPLATES = new template_TemplateStore ();
```

The Load Event Handler
----------------------

```javascript
/*
  Registers the Page Handler with the load event
  handler.
*/

MODULE_LOAD_HANDLERS.add (
  function (done) {
    page_HANDLERS.add ('template_page', template_page);
    done (null);
});
```

The Page Handler
----------------

```javascript
/*
  Accepts two arguments:
  * id, a Menu Element ID string
  * done, a function

  Gets the page template associated with id and
  generates the HTML code for that template. 
  Returns undefined.
*/
function template_page (id, done) {
  template_TEMPLATES.getPageTemplate (id,
    function (template) {
      template.getPageElement (done);
  });
}
```

Auxiliary Functions
-------------------

```javascript
/*
  Accepts two arguments:
  * id, a Menu Element ID string
  * templates, an array of page template objects

  Iterates through templates and returns the
  template that matches id. If no match found,
  returns null.
*/
function template_findPageTemplate (id, templates) {
  for (var i = 0; i < templates.length; i ++) {
    var template = templates [i].getPageTemplate (id);
    if (template) { return template; }
  }
  return null;
} 

/*
  Accepts two arguments:
  * id, a Menu Element ID string
  * templates, an array of section template 
    instances

  Iterates through templates and returns the
  template that matches id. If no match found,
  returns null.
*/
function template_findSectionTemplate (id, templates) {
  for (var i = 0; i < templates.length; i ++) {
    var template = templates [i].getSectionTemplate (id);
    if (template) { return template; }
  }
  return null;
}
```

Generating Source Files
-----------------------

You can generate the Template module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Template.js
```
_"Template Module"

_"The Template Class"

_"The Page Template Class"

_"The Section Template Class"

_"The Template Store Class"

_"The Template Store"

_"The Load Event Handler"

_"The Page Handler"

_"Auxiliary Functions"
```
[template.js](#Template.js "save:")
-->
