Book Module
===========

The Book module defines the book content type which can be used to represent books, manuals, and other text-based materials divided into chapters, sections, and pages.

```javascript
/*
  The Book module defines the book content type
  which can be used to represent books, manuals,
  and other text-based materials divided into
  chapters, sections, and pages.
*/
```

Global Variables
----------------

```javascript
/*
  Specifies the database file
*/
var book_DATABASE_URL = 'modules/book/database.xml';

/*
  Creates an empty array to hold the items in the database
*/
var book_DATABASE = {};

/*
  Specifies the length of a book snippet (used in an Entry)
*/
var book_SNIPPET_LENGTH = 500;

// Load QUnit
QUnit.module ('Book');
```

The Load Event Handler
----------------------

```javascript
/*
  The module's load event handler. This function:
  * caches the Book database,
  * registers the module's templates, menu, block
  * handlers, and page handlers,
  * registers the search source,
  * and then calls done.
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
          book_link_page:    template_page,          
          book_page_page:    template_page,
          book_section_page: template_page
        });

        // VII. Register the search source.
        search_registerSource ('book_search_source', book_index);

        // VIII. Continue.
        done (null);
    });
});
```

Load the Database
-----------------

```javascript
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
  Unittests for book_loadDatabase. 

  Confirms that loadSettings can load and parse
  the book database without throwing an error.
*/

unittest ('book_loadDatabase',
  {
    globals: [
      { variableName: 'book_DATABASE', value: {} }
    ]
  },
  function (assert) {
    assert.expect (3);
    var done = assert.async ();

    book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
      assert.ok (database, 'book_loadDatabase can load the database file');
      assert.notOk (error, 'book_loadDatabase does not throw an error');
      assert.ok (database && Array.isArray(database.books), 'book_loadDatabase successfully converts the books in the database into an array');
      done ();
    })
  }
)

```

Parse the Database
------------------

```javascript
/*
  book_parseDatabase accepts two arguments:

  * url, a URL string
  * doc, a JQuery HTML Document

  and returns an array representing all the items
  in the book database file.
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

  and returns a book_Book Object representing a 
  book element and all its children.
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

  and returns a book_Section Object representing
  a section element and all its children.
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

  and returns a book_Page Object representing a
  page and all its content.
*/
function book_parsePage (parentPath, element) {
  return new book_Page (
    book_getId ('book_page_page', parentPath.concat ($('> name', element).text ())),
    $('> title', element).text (),
    $('> body', element).text ()
  );
}


/*
  book_parseLink accepts two arguments:

  * parentPath, a string array
  * element, a JQuery HTML Element
*/
function book_parseLink (parentPath, element) {
  return new book_Link (
    book_getId ('book_link_page', parentPath.concat ($('> name', element).text ())),
    $('> title', element).text (),
    $('> pageId', element).text ()
  );
}

/*
  book_parseContent accepts four arguments:

  * parentPath, a string array
  * elements, a JQuery HTML Element array

  It determines whether an element is a section
  or a page, and calls book_parseSection or 
  book_parsePage respectively. If neither case is
  true, it throws a strict error.
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
        case 'link':
          return book_parseLink (parentPath, element);  
        default:
          strictError ('[book][book_parseContent] Error: an error occured while trying to parse a Book Content element. The element\'s tag name is invalid.');
          return null;
      }
  });
}
```

Block Handlers
--------------

```javascript
/*
  Accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object, and a jQuery HTML Element.

  Gets the content of the element with the ID
  found in context.element, and replaces 
  context.element with that element's HTML.
*/
function book_bodyBlock (context, done) {
  var element = book_DATABASE.getElement (context.element.text ()).getBodyElement ();
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for book_bodyBlock.

  Confirms that book_bodyBlock replaces the
  .book_body_block element with a .book_body
  element that contains the book's body text.
*/

unittest ('book_bodyBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'book_DATABASE', value: {} }
    ],
    elements: [
      $('<div class="book_body_block_container">\
        <div class="book_body_block">book_book_page/modules%2Fbook%2Fdatabase.xml.example/example_book</div>\
      </div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);
    var done = assert.async ();
    block_HANDLERS.add ('book_body_block', book_bodyBlock);
    book_loadDatabase ('modules/book/database.xml.example',
      function (error, database) {
        if (error) { return done (); }
        book_DATABASE = database;
        block_expandBlock (new block_Context (12, elements [0]),
          function () {
            assert.notOk ($('.book_body_block').length, 'book_bodyBlock removes the .book_body_block element.');
            assert.strictEqual ($('.book_body').text (), book_DATABASE.books[0].body, 'book_bodyBlock creates the .book_body element and places the book\'s body text within it.');
            done ();
          }
        );
    })
  }
)
```

Search Source
-------------

```javascript
/*
  Accepts two arguments:

  * databaseURL, a string representing the URL of
    the database
  * done, a function that accepts two arguments:
    an Error object, and a jQuery HTML Element.

  If loading the database throws an error, that
  error is passed to done. Otherwise done 
  generates a list of search entries via 
  database.index.
*/
function book_index (databaseURL, done) {
  book_loadDatabase (databaseURL,
    function (error, database) {
      if (error) { return done (error); }

      done (null, database.index ());
  });
}
```


The Entry Class
---------------

The Entry class stores Page or Book information to be displayed
as a search result.

```javascript
/*
  Defines the book_Entry class, a subclass of
  search_entry. Accepts three arguments:
  * id, a string
  * title, a string
  * body, a string
*/
function book_Entry (id, title, body) {
  search_Entry.call (this, id);
  this.title = title;
  this.body  = body;
}

/*
  Create a new prototype object for book_Entry 
  and set  search_Entry's prototype as 
  the object's prototype.
*/
book_Entry.prototype = Object.create (search_Entry.prototype);

/*
  Accepts one argument, done, a function that
  takes two arguments: an Error and a jQuery HTML
  Element. Passes to done an HTML Element
  representing a search result, and returns undefined.
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
```


The Link Class
--------------
The book_Link page represents terminal leafs in the book tree. Unlike pages, these link to pages.

```javascript
/*  
  Defines the book_Link class. Accepts three arguments:
  * id, a string
  * title, a string
  * pageId, a string that represents a page ID
*/
function book_Link (id, title, pageId) {
  this.id     = id;
  this.title  = title;
  this.pageId = pageId;
}

/*
  Accepts one argument, id, a string. Returns the 
  Page object matching that ID, if it exists.
  Returns null if no match is found.
*/
book_Link.prototype.getElement = function (id) {
  return this.id === id ? this : null;
}


/*
  Accepts no arguments, creates a book_Entry
  Object using the values of book_Page, and
  returns the object inside an array.
*/
book_Link.prototype.index = function () {
  var page = book_DATABASE.getElement (this.pageId);
  return [new book_Entry (this.id,
    book_stripHTMLTags (this.title),
    book_stripHTMLTags (page.body))];
}


/*
  Accepts no arguments, creates a template_page
  Object from the page referenced by book_Link, 
  and returns the object inside an array.
*/
book_Link.prototype.getTemplates = function () {
  var page = book_DATABASE.getElement (this.pageId);
  return [new template_Page (null, this.id, page.getRawPageTemplate, 'book_link')];
}


/*
  Accepts no arguments, creates a menu_Leaf
  Object from the values of book_Link, and
  returns the object inside an array.
*/
book_Link.prototype.getMenuElements = function () {
  return [new menu_Leaf (null, this.id, this.title, 'book_link')];
}

/*
  Accepts no arguments and returns a jQuery HTML
  Element representing the content of a book_Page
  Object.
*/
book_Link.prototype.getBodyElement = function () {
  var page = book_DATABASE.getElement (this.pageId);
  return page.getBodyElement ();
}

```

The Page Class
--------------
The book_Page class represents the terminal leafs in the book tree. They are children of book_Section objects.

```javascript
/*  
  Defines the book_Page class. Accepts three arguments:
  * id, a string
  * title, a string
  * body, a string
*/
function book_Page (id, title, body) {
  this.id     = id;
  this.title  = title;
  this.body   = body;
}

/*
  Accepts one argument, id, a string. Returns the 
  Page object matching that ID, if it exists.
  Returns null if no match is found.
*/
book_Page.prototype.getElement = function (id) {
  return this.id === id ? this : null;
}

/*
  Unittests for book_Page.getElement.

  Confirms that the function returns the Page
  object if it matches the given ID.
*/
QUnit.test ('book_Page.getElement', function (assert) {
  assert.expect (2);
  var done = assert.async ();
  var testBookPage = new book_Page ('test_book_id', 'Test Book', 'This is the body for a test book page.');

  assert.strictEqual (testBookPage.getElement ('test_book_id'), testBookPage, 'book_Page.getElement correctly returns a book_Page item when the given argument matches the book_Page\'s id.');
  assert.notOk (testBookPage.getElement ('fake_book_id'), 'book_Page.getElement returns null when the given argument does not matches the book_Page\'s id.');
  done ();
})

/*
  Accepts no arguments, creates a book_Entry
  Object using the values of book_Page, and
  returns the object inside an array.
*/
book_Page.prototype.index = function () {
  return [new book_Entry (this.id,
    book_stripHTMLTags (this.title),
    book_stripHTMLTags (this.body))];
}

/*
  Unitttests for book_Page.index.

  Confirms that the function generates a 
  book_Entry object with the same content as the
  provided book_Page.
*/
QUnit.test ('book_Page.index', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  var testBookPage = new book_Page ('test_book_id', 'Test Book', 'This is the body for a test book page.');
  var testBookEntry = testBookPage.index ();

  assert.strictEqual (testBookEntry [0].id, testBookPage.id, 'The ID of the book_Entry created by book_Page.index is the same as the ID of the original book_Page.');
  assert.strictEqual (testBookEntry [0].title, testBookPage.title, 'The title of the book_Entry created by book_Page.index is the same as the title of the original book_Page.');
  assert.strictEqual (testBookEntry [0].body, testBookPage.body, 'The body of the book_Entry created by book_Page.index is the same as the body of the original book_Page.');
  done ();
})

/*
  Accepts one argument, done, a function that
  takes two arguments: an Error and a jQuery HTML
  Element. Returns the raw HTML template for a 
  page object.
*/
book_Page.prototype.getRawPageTemplate = function (done) {
  getTemplate ('modules/book/templates/page_page_template.html', done);
}

/*
  Unittests for book_Page.getRawPageTemplate.

  Confirms that the function returns a template
  Object representing the HTML structure for a
  Page, and does not throw an error.
*/
QUnit.test ('book_Page.getRawPageTemplate', function (assert) {
  assert.expect (2);
  var done = assert.async ();
  var testBookPage = new book_Page ('test_book_id', 'Test Book', 'This is the body for a test book page.');
  testBookPage.getRawPageTemplate (function (error, template) {
    assert.ok (template, 'getRawPageTemplate generates a template object.');
    assert.notOk (error, 'getRawPageTemplate does not throw an error.')
    done ();
  });
})


/*
  Accepts no arguments, creates a template_page
  Object from the values of book_Page and its raw
  template, and returns the object inside an
  array.
*/
book_Page.prototype.getTemplates = function () {
  return [new template_Page (null, this.id, this.getRawPageTemplate, 'book_page')];
}


/*
  Unittests for book_Page.getTemplates.

  Confirms that the function returns an array
  with one template_Page object.
*/
QUnit.test ('book_Page.getTemplates', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  var testBookPage = new book_Page ('test_book_id', 'Test Book', 'This is the body for a test book page.');
  var testBookPageTemplates = testBookPage.getTemplates ();

  assert.ok (Array.isArray (testBookPageTemplates) && testBookPageTemplates.length === 1, 'getTemplates returns an array with one item in it.');
  assert.strictEqual (testBookPageTemplates [0].id, testBookPage.id, 'getTemplates correctly assigns the book_Page id to its template object.')
  assert.strictEqual (testBookPageTemplates [0].classes, 'book_page', 'getTemplates correctly assigns the .book_page class to its template object.')
  done ();
})

/*
  Accepts no arguments, creates a menu_Leaf
  Object from the values of book_Page, and
  returns the object inside an array.
*/
book_Page.prototype.getMenuElements = function () {
  return [new menu_Leaf (null, this.id, this.title, 'book_page')];
}

/*
  Unittests for book_Page.getMenuElements.

  Confirms that the function returns an array
  with one template_Page object.
*/
QUnit.test ('book_Page.getMenuElements', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  var testBookPage = new book_Page ('test_book_id', 'Test Book', 'This is the body for a test book page.');
  var testBookPageMenu = testBookPage.getMenuElements ();

  assert.ok (Array.isArray (testBookPageMenu) && testBookPageMenu.length === 1, 'getMenuElements returns an array with one item in it.');
  assert.strictEqual (testBookPageMenu [0].id, testBookPage.id, 'getMenuElements correctly assigns the book_Page id to its menu object.')
  assert.strictEqual (testBookPageMenu [0].classes, 'book_page', 'getMenuElements correctly assigns the .book_page class to its menu object.')
  done ();
})

/*
  Accepts no arguments and returns a jQuery HTML
  Element representing the content of a book_Page
  Object.
*/
book_Page.prototype.getBodyElement = function () {
  return $('<div></div>')
    .addClass ('book_body')
    .addClass ('book_page_body')
    .html (this.body);
}
```

The Section Class
-----------------

The book_Section classes are nodes. They can be the children of a book or of another section, and can be the parent to both leafs and sections.

```javascript
/*
  Defines the book_Section class. Accepts three
  arguments:
  * id, a string
  * title, a string
  * children, an array
*/
function book_Section (id, title, children) {
  this.id       = id;
  this.title    = title;
  this.children = children;
}

/*
  Accepts no arguments and returns entries, an
  array consisting of book_Section's children.
*/
book_Section.prototype.index = function () {
  var entries = [];
  for (var i = 0; i < this.children.length; i ++) {
    Array.prototype.push.apply (entries, this.children [i].index ());
  }
  return entries;
}

/*
  Unittests for book_Section.index.

  Confirms that the function iterates through the
  book_Section's children, and adds each to the
  entries array.
*/
QUnit.test ('book_Section.index', function (assert) {
  assert.expect (4);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testSection = database.books [0].children [0];
    testSection.children.push (new book_Page('second_test_id', 'Second Example Page', 'This is another example page.'));
    var entries = testSection.index ();
    assert.strictEqual (testSection.children.length, entries.length, 'The book_Section\'s number of children matches the length of the entries array.');
    assert.strictEqual (testSection.children [0].id, entries [0].id, 'The book_Section\'s first child\'s ID is equal to that of the first item in entries.');
    assert.strictEqual (testSection.children [0].title, entries [0].title, 'The book_Section\'s first child\'s title is equal to that of the first item in entries.');
    assert.strictEqual (testSection.children [0].body, entries [0].body, 'The book_Section\'s first child\'s body is equal to that of the first item in entries.');
    done ();
  })
})


/*
  Accepts one argument, id, a string. Checks the
  section and its children looking for an object
  matching the id; returns that object if it 
  exists, and null if not.
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
  Unittests for book_Section.getElement.

  Confirms that the function returns the section
  or one of its children if they match the given
  ID, and returns null otherwise.
*/
QUnit.test ('book_Section.index', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testSection = database.books [0].children [0];
    testSection.children.push (new book_Page('second_test_id', 'Second Example Page', 'This is another example page.'));
    assert.strictEqual (testSection.getElement('book_section_page/modules%2Fbook%2Fdatabase.xml.example/example_book/example_section'), testSection, 'book_Section.index returns the section when it matches the given ID.');   
    assert.strictEqual (testSection.getElement ('second_test_id'), testSection.children [1], 'book_Section.index returns a child of the section when it matches the given ID.');
    assert.notOk (testSection.getElement ('fake_id'), 'book_Section.index returns null if nothing matches the given ID.');    
    done ();
  })
})

/*
  Accepts one argument, done, a function that
  takes two arguments: an Error and a jQuery HTML
  Element. Returns the raw HTML template for a
  Section object.
*/
book_Section.prototype.getRawSectionTemplate = function (done) {
  getTemplate ('modules/book/templates/section_section_template.html', done);
}

/*
  Unittests for book_Page.getRawSectionTemplate.

  Confirms that the function returns a template
  Object representing the HTML structure for a
  Section, and does not throw an error.
*/
QUnit.test ('book_Page.getRawSectionTemplate', function (assert) {
  assert.expect (2);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    database.books [0].children [0].getRawSectionTemplate (function (error, template) {
      assert.ok (template, 'getRawSectionTemplate generates a template object.');
      assert.notOk (error, 'getRawSectionTemplate does not throw an error.')
      done ();
    })
  })
})

/*
  Accepts no arguments. Creates a template for
  book_Section, then iterates through 
  book_Section's children, creates templates for
  them, and adds those templates to 
  sectionTemplate.children. Returns 
  sectionTemplate, a template_Section object, 
  inside an array.
*/
book_Section.prototype.getTemplates = function () {
  // I. Create the section template.
  var sectionTemplate = new template_Section (null, this.id, [], this.getRawSectionTemplate, 'book_section');

  // II. Create child templates.
  for (var i = 0; i < this.children.length; i ++) {
    templates = this.children [i].getTemplates ();
    for (var j = 0; j < templates.length; j ++) {
      var template = templates [j];
      template.parent = sectionTemplate;
      sectionTemplate.children.push (template);
    }
  }

  // III. Return templates.
  return [sectionTemplate];
}

/*
  Unittests for book_Section.getTemplates.

  Confirms that the function returns an array
  with one template_Page object.
*/
QUnit.test ('book_Section.getTemplates', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testSection = database.books [0].children [0];
    var testSectionTemplates = testSection.getTemplates ();
    assert.ok (Array.isArray (testSectionTemplates) && testSectionTemplates.length === 1, 'getTemplates returns an array with one item in it.');
    assert.strictEqual (testSectionTemplates [0].children.length, testSection.children.length, 'getTemplates returns an array whose number of children matches the section\'s number of children.');
    assert.strictEqual (testSectionTemplates [0].children [0].id, testSection.children [0].id, 'The ID of the child of template_Page object getTemplates returns matches the ID of the child of testSection.')
    done ();
  })
})


/*
  Accepts no arguments and returns an array
  consisting of a menu_Node object, which
  represent the menu elements for book_Section
  and its children.
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
  /// III. Return menu nodes.
  return [node];
}

/*
  Unittests for book_Section.getMenuElements.

  Confirms that the function returns an array
  comprised of one item, corresponding to the
  book_Section object.
*/
QUnit.test ('book_Section.getMenuElements', function (assert) {
  assert.expect (3);
  var done = assert.async ();

  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testSection = database.books [0].children [0];  
    var testSectionMenu = testSection.getMenuElements ();
    assert.ok (Array.isArray (testSectionMenu) && testSectionMenu.length === 1, 'getMenuElements returns an array with one item in it.');
    assert.strictEqual (testSectionMenu [0].children.length, testSection.children.length, 'getMenuElements returns an array whose number of children matches the section\'s number of children.');
    assert.strictEqual (testSectionMenu [0].children [0].id, testSection.children [0].id, 'The ID of the child of the menu_Node object that getMenuElements returns matches the ID of the child of testSection.')
    done ();
  })
})

```

The Book Class
--------------

```javascript
/*
  Defines the book_Book class, which is a
  subclass of book_Section.
  Accepts four arguments:
  * id, a string
  * title, a string
  * body, a string
  * children, an array
*/
function book_Book (id, title, body, children) {
  book_Section.call (this, id, title, children);
  this.body = body;
}

/*
  Create a new prototype object for book_Book and
  set book_Section's prototype as the object's
  prototype.
*/
book_Book.prototype = Object.create (book_Section.prototype);

/*
  Assign the book_Book prototype's constructor
  property so that any functions that read it can
  determine which constructor function was used
  to create its instance objects.
*/
book_Book.prototype.constructor = book_Book;

/*
  Accepts no arguments and returns entries, an
  array of book_Entry Objects representing 
  book_Book's children.
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
function getNumLeafs (tree, startNum) {
  var numLeafs = startNum;
  if (tree.children.length < 1) {
    numLeafs += 1;
  }
  else {
    for (var i = 0; i < tree.children.length; i++) {
      console.log(tree.children[i].constructor.name)
      if (tree.children[i].constructor.name === 'book_Page') {
        numLeafs += 1;
      } else {
        getNumLeafs (tree.children[i], numLeafs);
      }
    }
  } else {
    numLeafs += 1;
  }
  console.log(numLeafs);
  return numLeafs;
}
*/



/*
  Unittests for book_Book.index.

  Confirms that the function iterates through the
  book_Book's page descendents, and adds them as
  well as book_Book itself to the entries array.
*/
QUnit.test ('book_Book.index', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testBook = database.books [0];
    console.log(testBook.children);
    var entries = testBook.index ();
    assert.strictEqual (testBook.id, entries [0].id, 'The book_Book\'s first child\'s ID is equal to that of the first item in entries.');
    assert.strictEqual (testBook.children [0].children[0].id, entries [1].id, 'The book_Book\'s first child\'s ID is equal to that of the second item in entries.');
    assert.strictEqual (testBook.children [0].children[0].body, entries [1].body, 'The book_Book\'s first child\'s body is equal to that of the second item in entries.');
    done ();
  })
})


/*
  Accepts one argument, done, a function that
  takes two arguments: an Error and a jQuery HTML
  Element. Returns the raw HTML template for a
  Page object.
*/
book_Book.prototype.getRawPageTemplate = function (done) {
  getTemplate ('modules/book/templates/book_page_template.html', done);
}

/*
  Unittests for book_Book.getRawPageTemplate.

  Confirms that the function returns a template
  Object representing the HTML structure for a
  page, and does not throw an error.
*/
QUnit.test ('book_Book.getRawPageTemplate', function (assert) {
  assert.expect (2);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    database.books [0].getRawPageTemplate (function (error, template) {
      assert.ok (template, 'getRawPageTemplate generates a template object.');
      assert.notOk (error, 'getRawPageTemplate does not throw an error.')
      done ();
    })
  })
})


/*
  Accepts one argument, done, a function that
  takes two arguments: an Error and a jQuery HTML
  Element. Returns the raw HTML template for a 
  Section object.
*/
book_Book.prototype.getRawSectionTemplate = function (done) {
  getTemplate ('modules/book/templates/book_section_template.html', done);
}

/*
  Unittests for book_Book.getRawSectionTemplate.

  Confirms that the function returns a template
  Object representing the HTML structure for a
  page, and does not throw an error.
*/
QUnit.test ('book_Book.getRawSectionTemplate', function (assert) {
  assert.expect (2);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    database.books [0].getRawSectionTemplate (function (error, template) {
      assert.ok (template, 'getRawSectionTemplate generates a template object.');
      assert.notOk (error, 'getRawSectionTemplate does not throw an error.')
      done ();
    })
  })
})

/*
  Accepts no arguments and returns a jQuery HTML
  Element representing the content of a book_Book
  object.
*/
book_Book.prototype.getBodyElement = function () {
  return $('<div></div>')
    .addClass ('book_body')
    .addClass ('book_book_body')
    .html (this.body);
}

/*
  Accepts no arguments and returns an array
  consisting of the template_Book object
  corresponding to the given book_Book instance,
  and its template_Section children. 
*/
book_Book.prototype.getTemplates = function () {
  var templates = book_Section.prototype.getTemplates.call (this);
  templates.push (new template_Page (null, this.id, this.getRawPageTemplate, 'book_book'));
  return templates;
}

/*
  Unittests for book_Book.getTemplates.

  Confirms that the function returns an array
  comprised of the book_Book object and all of its
  book_Section children.
*/
QUnit.test ('book_Book.getTemplates', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testBook = database.books [0];
    var testBookTemplates = testBook.getTemplates ();
    assert.ok (Array.isArray (testBookTemplates) && testBookTemplates.length > 0, 'getTemplates returns a non-empty array.');
    assert.strictEqual (testBookTemplates.length, testBook.children.length + 1, 'The number of items in the templates array that getTemplates returns is equal to the given Book plus all of its child Sections.');
    assert.strictEqual (testBookTemplates [0].children [0].id, testBook.children [0].id, 'The ID of the child of template_Book object that getTemplates returns matches the ID of the child of its child section.')
    done ();
  })
})


/*
  Accepts no arguments and returns an array that
  includes menu_Node objects for the Book and its
  Section children.
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
  Unittests for book_Book.getMenuElements.

  Confirms that .
*/
QUnit.test ('book_Book.getMenuElements', function (assert) {
  assert.expect (4);
  var done = assert.async ();

  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var testBook = database.books [0];  
    var testBookMenu = testBook.getMenuElements ();
    assert.ok (Array.isArray (testBookMenu) && testBookMenu.length > 0, 'getMenuElements returns a non-empty array.');
    assert.strictEqual (testBookMenu [0].children.length - 1, testBook.children.length, 'getMenuElements returns an array whose number of children matches the Book\'s number of children, plus 1 to account for book_Book.');
    assert.strictEqual (testBookMenu [0].children [0].id, testBook.id, 'The first child of the menu_Node object in the array created by getMenuElements is a duplicate of the book_Book instance.');
    assert.strictEqual (testBookMenu [0].children [testBookMenu [0].children.length - 1].id, testBook.children [testBook.children.length - 1].id, 'The last child of the menu_Node object in the array created by getMenuElements is the last child of the book_Book instance.');
    done ();
  })
})
```

The Database Class
------------------

```javascript
/*
  Defines the book_Database class. Accepts one 
  argument, books, an array.
*/
function book_Database (books) {
  this.books = books;
}

/*
  Accepts no arguments and returns entries, an
  array of search_Entry objects consisting of 
  all of book_Database's descendants.
*/
book_Database.prototype.index = function () {
  var entries = [];
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (entries, this.books [i].index ());
  }
  return entries;
}

/*
  Unittests for book_Database'sindex.

  Confirms that the function iterates through the
  book_Database's book children, and adds each to
  the entries array.
*/
QUnit.test ('book_Database.index', function (assert) {
  assert.expect (1);
  var done = assert.async ();
  book_loadDatabase ('modules/book/database.xml.example', function (error, database) {
    var entries = database.index ();
    assert.strictEqual (database.books [0].id, entries [0].id, 'The book_Book\'s first child\'s ID is equal to that of the first item in entries.');
    done ();
  })
})


/*
  Accepts one argument, id, a string. Iterates
  through the values in book_Database's books
  property, and returns the child matching that
  ID if it exists. If no match is found, a strict
  error is thrown and returns null.
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
  Accepts no arguments and returns an array,
  templates, which represents the templates for
  the objects in book_Database's books property.
*/
book_Database.prototype.getTemplates = function () {
  var templates = [];
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (templates, this.books [i].getTemplates ());
  }
  return templates;
}

/*
  Accept no arguments and returns menu, a 
  menu_Menu object whose children value is an
  array of menu_Node objects corresponding to
  book_Database's children.
*/
book_Database.prototype.getMenu = function () {
  var menu = new menu_Menu ([]);
  for (var i = 0; i < this.books.length; i ++) {
    Array.prototype.push.apply (menu.children, this.books [i].getMenuElements ());
  }
  return menu;
}
```

Auxiliary Functions
-------------------

```javascript
/*
  Accepts two arguments:
  * type, a string
  * path, a string array

  Returns a string representing the ID of a book
  item.
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
  Accepts one argument, text, an HTML string, and
  returns a string representing a snippet of the
  text contained within the given HTML.
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
```

The Book Database
-----------------

The Book module stores all of its books in a central XML database called the Book Database. By default, this database is stored in a file named database.xml.

The Book Database Schema
------------------------

To be considered valid, the Book Database XML file must conform to the following XML schema, which can be found in [database.xsd](#The Book Database Schema "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<!--
  This file defines the Books Database schema.
-->
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- Define the root element -->
  <xs:element name="books">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="book" type="bookType" minOccurs="0" maxOccurs="unbounded">
          <xs:unique name="uniqueBookName">
            <xs:selector xpath="book"/>
            <xs:field xpath="@name"/>
          </xs:unique>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>

  <!-- Define the book element type -->
  <xs:complexType name="bookType">
    <xs:all>
      <xs:element name="name"    type="xs:string"   minOccurs="1" maxOccurs="1"/>
      <xs:element name="title"   type="xs:string"   minOccurs="1" maxOccurs="1"/>
      <xs:element name="body"    type="xs:string"   minOccurs="1" maxOccurs="1"/>
      <xs:element name="content" type="contentType" minOccurs="1" maxOccurs="1"/>
    </xs:all>
  </xs:complexType>

  <!-- Define the content element type -->
  <xs:complexType name="contentType">
    <xs:choice maxOccurs="unbounded">
      <xs:element name="section" type="sectionType" minOccurs="0"/>
      <xs:element name="page" type="pageType" minOccurs="0"/>
      <xs:element name="link" type="linkType" minOccurs="0"/>      
    </xs:choice>
  </xs:complexType>

  <!-- Define the section element type -->
  <xs:complexType name="sectionType">
    <xs:all>
      <xs:element name="name"    type="xs:string"   minOccurs="1" maxOccurs="1"/>
      <xs:element name="title"   type="xs:string"   minOccurs="1" maxOccurs="1"/>
      <xs:element name="content" type="contentType" minOccurs="1" maxOccurs="1"/>
    </xs:all> 
  </xs:complexType>

  <!-- Define the page element type -->
  <xs:complexType name="pageType">
    <xs:all>
      <xs:element name="name"  type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="title" type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="body"  type="xs:string" minOccurs="1" maxOccurs="1"/>
    </xs:all>
  </xs:complexType>

  <!-- Define the link element type -->
  <xs:complexType name="linkType">
    <xs:all>
      <xs:element name="name"  type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="title" type="xs:string" minOccurs="1" maxOccurs="1"/>
      <xs:element name="pageId"  type="xs:anyURI" minOccurs="1" maxOccurs="1"/>
    </xs:all>
  </xs:complexType>  
</xs:schema>

```

Database Example
----------------

The Book module includes an example database in [database.xml.example](#Database Example "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>
<books>
  <book>
    <name>example_book</name>
    <title><![CDATA[Example Book]]></title>
    <body><![CDATA[This is an example book]]></body>
    <content>
      <section>
        <name>example_section</name>
        <title><![CDATA[Example Section]]></title>
        <content>
          <page>
            <name>example_page</name>
            <title><![CDATA[Example Page]]></title>
            <body><![CDATA[This is an example page.]]></body>
          </page>
          <link>
            <name>example_link</name>
            <title><![CDATA[Example Link]]></title>
            <pageId>book_page_page/modules%2Fbook%2Fdatabase.xml.example/example_book/example_section/example_page</pageId>
          </link>          
        </content>
      </section>
    </content>
  </book>
</books>
```

Generating Source Files
-----------------------

You can generate the Book module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
#### Book.js
```
_"Book Module"

_"Global Variables"

_"The Load Event Handler"

_"Load the Database"

_"Parse the Database"

_"Block Handlers"

_"Search Source"

_"The Entry Class"

_"The Link Class"

_"The Page Class"

_"The Section Class"

_"The Book Class"

_"The Database Class"

_"Auxiliary Functions"
```
[book.js](#Book.js "save:")
-->
