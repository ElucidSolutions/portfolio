/*
*/

/*
*/
function template_Template (parent, id, getRawElement, classes) {
  this.parent        = parent;
  this.id            = id;
  this.getRawElement = getRawElement;
  this.classes       = classes;

}

/*
*/
// template_Template.prototype.getPageTemplate = function (id) {}

/*
*/
// template_Template.prototype.getSectionTemplate = function (id) {}

/*
*/
template_Template.prototype.getAncestors = function () {
  return this.parent ? this.parent.getPath () : [];
}

/*
*/
template_Template.prototype.getPath = function () {
  var ancestors = this.getAncestors ();
  ancestors.push (this);
  return ancestors;
}

/*
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
*/
template_Template.prototype.getLevel = function () {
  return this.getPath ().length;
}

/*
*/
template_Template.prototype.iterate = function (templateFunction) {
  templateFunction (this);
}

/*
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

/*
*/
function template_Page (parent, id, getRawElement, classes) {
  template_Template.call (this, parent, id, getRawElement, classes);
}

/*
*/
template_Page.prototype = Object.create (template_Template.prototype);

/*
*/
template_Page.prototype.constructor = template_Page;

/*
*/
template_Page.prototype.getPageTemplate = function (id) {
  return this.id === id ? this : null;
}

/*
*/
template_Page.prototype.getSectionTemplate = function (id) {
  return null;
}

/*
*/
template_Page.prototype.getElement = function (done) {
  template_Template.prototype.getElement.call (this,
    function (error, template) {
      if (error) { return done (error); }

      done (null, template.addClass ('template_page'));
  });
}

/*
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

/*
*/
function template_Section (parent, id, children, getRawElement, classes) {
  template_Template.call (this, parent, id, getRawElement, classes);
  this.children = children;
}

/*
*/
template_Section.prototype = Object.create (template_Template.prototype);

/*
*/
template_Section.prototype.constructor = template_Section;

/*
*/
template_Section.prototype.getPageTemplate = function (id) {
  return template_findPageTemplate (id, this.children);
}

/*
*/
template_Section.prototype.getSectionTemplate = function (id) {
  return this.id === id ? this : template_findSectionTemplate (id, this.children);
}

/*
*/
template_Section.prototype.iterate = function (templateFunction) {
  templateFunction (this);
  for (var i = 0; i < this.children.length; i ++) {
    this.children [i].iterate (templateFunction);
  }
}

/*
*/
template_Section.prototype.getElement = function (done) {
  template_Template.prototype.getElement.call (this,
    function (error, template) {
      if (error) { return done (error); }

      done (null, template.addClass ('template_section'));
  });
}

/*
  Template Stores store registered templates.
*/
function template_TemplateStore () {
  var self = this;

  /*
  */
  var _templates = [];

  /*
  */
  var _templateFunctions = {};

  /*
  */
  var addTemplateFunction = function (id, templateFunction) {
    if (!_templateFunctions [id]) { _templateFunctions [id] = []; }
    _templateFunctions [id].push (templateFunction);
  }

  /*
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
  */
  this.addTemplates = function (templates) {
    for (var i = 0; i < templates.length; i ++) {
      self.add (templates [i]);
    }
  }

  /*
  */
  this.getPageTemplate = function (id, templateFunction) {
    var template = template_findPageTemplate (id, _templates);
    template ? templateFunction (template) : addTemplateFunction (id, templateFunction);
  }

  /*
  */
  this.getSectionTemplate = function (id, templateFunction) {
    var template = template_findSectionTemplate (id, _templates);
    template ? templateFunction (template) : addTemplateFunction (id, templateFunction);
  }
}

/*
  A template_TemplateStore that stores all of
  the registered templates.
*/
var template_TEMPLATES = new template_TemplateStore ();

/*
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Register the Page Handler.
    page_HANDLERS.add ('template_page', template_page);

    // II. Continue.
    done (null);
});

/*
*/
function template_page (id, done) {
  template_TEMPLATES.getPageTemplate (id,
    function (template) {
      template.getPageElement (done);
  });
}

/*
*/
function template_findPageTemplate (id, templates) {
  for (var i = 0; i < templates.length; i ++) {
    var template = templates [i].getPageTemplate (id);
    if (template) { return template; }
  }
  return null;
} 

/*
*/
function template_findSectionTemplate (id, templates) {
  for (var i = 0; i < templates.length; i ++) {
    var template = templates [i].getSectionTemplate (id);
    if (template) { return template; }
  }
  return null;
}