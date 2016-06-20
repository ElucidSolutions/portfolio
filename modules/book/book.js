/*
  The Book module defines the book content type
  which can be used to represent books, manuals,
  and other text-based materials divided into
  chapters, sections, and pages.
*/

/*
*/
var book_DATABASE_URL = 'modules/book/database.xml';

/*
*/
var book_DATABASE = {};

/*
*/
var book_SNIPPET_LENGTH = 500;

/*
  The module's load event handler. This function
  registers this modules block and page handlers.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the Book database.
    book_loadDatabase (book_DATABASE_URL,
      function (error, database) {
        if (error) { return done (error); }

        // II. Cache the Book database.
        book_DATABASE = database;

        // III. Register the book templates.
        template_TEMPLATES.addTemplates (book_DATABASE.getTemplates ());

        // IV. Register the book menu.
        menu_MENUS ['book'] = book_DATABASE.getMenu ();

        // V. Register the block handlers.
        block_HANDLERS.addHandlers ({
          book_body_block: book_bodyBlock,
        });

        // VI. Register the page handlers.
        page_HANDLERS.addHandlers ({
          book_book_page:    template_page,
          book_page_page:    template_page,
          book_section_page: template_page
        });

        // VII. Register the search source.
        search_registerSource ('book_search_source', book_index);

        // VIII. Continue.
        done (null);
    });
});

/*
  book_loadDatabase accepts two arguments:

  * url, a URL string
  * done, a function that accepts two arguments:
    an Error object and a Book array.

  book_loadDatabase loads the books stored in the
  database referenced by url and passes them to
  done. If an error occurs book_loadDatabase
  throws a strict error and passes the error to
  done instead.
*/
function book_loadDatabase (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, book_parseDatabase (url, doc));
    },
    error: function (request, status, errorMsg) {
      var error = new Error ('[book][book_loadDatabase] Error: an error occured while trying to load "' + url + '".');
      strictError (error);
      done (error);
    }
  });
}

/*
  book_parseDatabase accepts four arguments:

  * url, a URL string
  * doc, a JQuery HTML Document
*/
function book_parseDatabase (url, doc) {
  return new book_Database (
    $('> books', doc).children ().map (
      function (i, element) {
        return book_parseBook ([url], element);
    }).toArray ()
  );
}

/*
  book_parseBook accepts two arguments:

  * databasePath, a string array
  * element, a JQuery HTML Element
*/
function book_parseBook (databasePath, element) {
  var path = databasePath.concat ($('> name', element).text ());
  return new book_Book (
    book_getId ('book_book_page', path),
    $('> title', element).text (),
    $('> body',  element).text (),
    book_parseContent (path, $('> content', element).children ().toArray ())
  );
}

/*
  book_parseSection accepts two arguments:

  * parentPath, a string array
  * element, a JQuery HTML Element
*/
function book_parseSection (parentPath, element) {
  var path = parentPath.concat ($('> name', element).text ());
  return new book_Section (
    book_getId ('book_section_page', path),
    $('> title', element).text (),
    book_parseContent (path, $('> content', element).children ().toArray ())
  );
}

/*
  book_parsePage accepts two arguments:

  * parentPath, a string array
  * element, a JQuery HTML Element
*/
function book_parsePage (parentPath, element) {
  return new book_Page (
    book_getId ('book_page_page', parentPath.concat ($('> name', element).text ())),
    $('> title', element).text (),
    $('> body', element).text ()
  );
}

/*
  book_parseContent accepts four arguments:

  * parentPath, a string array
  * elements, a JQuery HTML Element array
*/
function book_parseContent (parentPath, elements) {
  return elements.map (
    function (element) {
      var element = $(element);
      switch (element.prop ('tagName')) {
        case 'section':
          return book_parseSection (parentPath, element);
        case 'page':
          return book_parsePage (parentPath, element);
        default:
          strictError ('[book][book_parseContent] Error: an error occured while trying to parse a Book Content element. The element\'s tag name is invalid.');
          return null;
      }
  });
}

/*
*/
function book_bodyBlock (context, done) {
  var element = book_DATABASE.getElement (context.element.text ()).getBodyElement ();
  context.element.replaceWith (element);
  done (null, element);
}

/*
*/
function book_index (databaseURL, done) {
  book_loadDatabase (databaseURL,
    function (error, database) {
      if (error) { return done (error); }

      done (null, database.index ());
  });
}

/*
*/
function book_Entry (id, title, body) {
  search_Entry.call (this, id);
  this.title = title;
  this.body  = body;
}

/*
*/
book_Entry.prototype = Object.create (search_Entry.prototype);

/*
*/
book_Entry.prototype.getResultElement = function (done) {
  done (null, $('<li></li>')
    .addClass ('search_result')
    .addClass ('book_search_result')
    .addClass ('book_search_page_result')
    .append (getContentLink (this.id)
      .addClass ('search_result_link')
      .addClass ('book_search_link')
      .addClass ('book_search_page_link')
      .attr ('href', getContentURL (this.id))
      .append ($('<h3></h3>').html (this.title))
      .append ($('<p></p>').text (book_getSnippet (this.body)))));
}

/*
*/
function book_Page (id, title, body) {
  this.id     = id;
  this.title  = title;
  this.body   = body;
}

/*
*/
book_Page.prototype.getElement = function (id) {
  return this.id === id ? this : null;
}

book_Page.prototype.index = function () {
  return [new book_Entry (this.id,
    book_stripHTMLTags (this.title),
    book_stripHTMLTags (this.body))];
}

/*
*/
book_Page.prototype.getRawPageTemplate = function (done) {
  getTemplate ('modules/book/templates/page_page_template.html', done);
}

/*
*/
book_Page.prototype.getTemplates = function () {
  return [new template_Page (null, this.id, this.getRawPageTemplate, 'book_page')];
}

/*
*/
book_Page.prototype.getMenuElements = function () {
  return [new menu_Leaf (null, this.id, this.title, 'book_page')];
}

/*
*/
book_Page.prototype.getBodyElement = function () {
  return $('<div></div>')
    .addClass ('book_body')
    .addClass ('book_page_body')
    .html (this.body);
}

/*
*/
function book_Section (id, title, children) {
  this.id       = id;
  this.title    = title;
  this.children = children;
}

/*
*/
book_Section.prototype.index = function () {
  var entries = [];
  for (var i = 0; i < this.children.length; i ++) {
    Array.prototype.push.apply (entries, this.children [i].index ());
  }
  return entries;
}

/*
*/
book_Section.prototype.getElement = function (id) {
  if (this.id === id) { return this; }

  for (var i = 0; i < this.children.length; i ++) {
    var element = this.children [i].getElement (id);
    if (element) { return element; }
  }
  return null;
}

/*
*/
book_Section.prototype.getRawSectionTemplate = function (done) {
  getTemplate ('modules/book/templates/section_section_template.html', done);
}

/*
*/
book_Section.prototype.getTemplates = function () {
  // I. Create the section template.
  var sectionTemplate = new template_Section (null, this.id, [], this.getRawSectionTemplate, 'book_section');

  // III. Create child templates.
  for (var i = 0; i < this.children.length; i ++) {
    templates = this.children [i].getTemplates ();
    for (var j = 0; j < templates.length; j ++) {
      var template = templates [j];
      template.parent = sectionTemplate;
      sectionTemplate.children.push (template);
    }
  }

  // IV. Return templates.
  return [sectionTemplate];
}

/*
*/
book_Section.prototype.getMenuElements = function () {
  // I. Create node element.
  var node = new menu_Node (null, this.id, this.title, [], 'book_section');

  // II. Create children elements.
  for (var i = 0; i < this.children.length; i ++) {
    elements = this.children [i].getMenuElements ();
    for (var j = 0; j < elements.length; j ++) {
      elements [j].parent = node;
      node.children.push (elements [j]);
    }
  }
  return [node];
}

/*
*/
function book_Book (id, title, body, children) {
  book_Section.call (this, id, title, children);
  this.body = body;
}

/*
*/
book_Book.prototype = Object.create (book_Section.prototype);

/*
*/
book_Book.prototype.constructor = book_Book;

/*
*/
book_Book.prototype.index = function () {
  var entries = [new book_Entry (this.id,
    book_stripHTMLTags (this.title),
    book_stripHTMLTags (this.body))];

  for (var i = 0; i < this.children.length; i ++) {
    Array.prototype.push.apply (entries, this.children [i].index ());
  }
  return entries;
}

/*
*/
book_Book.prototype.getRawPageTemplate = function (done) {
  getTemplate ('modules/book/templates/book_page_template.html', done);
}

/*
*/
book_Book.prototype.getRawSectionTemplate = function (done) {
  getTemplate ('modules/book/templates/book_section_template.html', done);
}

/*
*/
book_Book.prototype.getBodyElement = function () {
  return $('<div></div>')
    .addClass ('book_body')
    .addClass ('book_book_body')
    .html (this.body);
}

/*
*/
book_Book.prototype.getTemplates = function () {
  var templates = book_Section.prototype.getTemplates.call (this);
  templates.push (new template_Page (null, this.id, this.getRawPageTemplate, 'book_book'));
  return templates;
}

/*
*/
book_Book.prototype.getMenuElements = function () {
  // I. Create node element.
  var node = new menu_Node (null, this.id, this.title, [], 'book_book');

  // II. Create the leaf element.
  node.children.push (new menu_Leaf (node, this.id, this.title, 'book_book'));

  // II. Create children elements.
  for (var i = 0; i < this.children.length; i ++) {
    elements = this.children [i].getMenuElements ();
    for (var j = 0; j < elements.length; j ++) {
      elements [j].parent = node;
      node.children.push (elements [j]);
    }
  }
  return [node];
}

/*
*/
function book_Database (books) {
  this.books = books;
}

/*
*/
book_Database.prototype.index = function () {
  var entries = [];
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (entries, this.books [i].index ());
  }
  return entries;
}

/*
*/
book_Database.prototype.getElement = function (id) {
  for (var i = 0; i < this.books.length; i ++) {
    var element = this.books [i].getElement (id);
    if (element) { return element; }
  }
  strictError (new Error ('[book][book_Database.getElement] Error: The referenced element does not exist.'));
  return null;
}

/*
*/
book_Database.prototype.getTemplates = function () {
  var templates = [];
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (templates, this.books [i].getTemplates ());
  }
  return templates;
}

/*
*/
book_Database.prototype.getMenu = function () {
  var menu = new menu_Menu ([]);
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (menu.children, this.books [i].getMenuElements ());
  }
  return menu;
}

/*
*/
function book_getId (type, path) {
  var uri = new URI ('').segmentCoded (type);
  path.forEach (
    function (name) {
      uri.segmentCoded (name);
  });
  return uri.toString ();
}

/*
  getSnippet accepts an HTML string and returns a
  snippet of the text contained within the given
  HTML as a string.
*/
function book_getSnippet (text) {
  return text.length <= book_SNIPPET_LENGTH ? text :
    text.substr (0, book_SNIPPET_LENGTH) + '...';
}

/*
  Accepts one argument: html, an HTML string;
  and returns a new string in which all HTML
  tags have been removed.
*/
function book_stripHTMLTags (html) {
  return html.replace (/<[^>]*>/g, '');
}