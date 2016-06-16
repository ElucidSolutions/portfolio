/*
*/
var search_DATABASE_URL = 'modules/search/database.xml';

/*
*/
var search_DATABASE = {};

/*
*/
var search_INTERFACES = {};

/*
*/
var search_SOURCES = {};

/*
*/
var search_ENTRIES = {};

/*
*/
var search_LUNR_INDICES = {};

/*
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // II. Load libraries.
    loadScript ('modules/search/lib/lunr/lunr.js',
      function (error) {
        if (error) { return done (error); }

        // III. Load the search database.
        search_loadDatabase (search_DATABASE_URL,
          function (error, database) {
            if (error) { return done (error); }

            search_DATABASE = database;

            // IV. Register the block handlers.
            block_HANDLERS.addHandlers ({
              search_filter_block:     search_filterBlock,
              search_form_block:       search_formBlock,
              search_index_block:      search_indexBlock,
              search_interface_block:  search_interfaceBlock,
              search_link_block:       search_linkBlock,
              search_results_block:    search_resultsBlock,
              search_no_results_block: 'modules/search/templates/search_no_results_block.html'
            });

            // V. Register the page handlers.
            page_HANDLERS.add ('search_page_block', 'modules/search/templates/search_page.html');

            done (null);
        });
    });
});

/*
*/
function search_filterBlock (context, done, expand) {
  var interface = search_INTERFACES [context.element.text ()];
  if (!interface) {
    var error = new Error ('[search][search_filterBlock] Error: The "' + context.element.text () + '" search interface has not been initialized.'); 
    strictError (error);
    return done (error);
  }
  interface.getFilterElement (
    function (error, filterElement) {
      if (error) { return done (error); }

      context.element.replaceWith (filterElement);
      done (null, filterElement);
    },
    expand
  );
}

/*
  search_form_block accepts three arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  context.element must contain a single text node
  that represents a Search Interface id.

  search_form_block replaces context.element with an
  inline search form and calls done. Whenever
  a query is entered into the form, an event
  handler executes the query against the
  referenced search interface.

  If an error occurs, search_block throws a
  strict error and passes the error to done.
*/
function search_formBlock (context, done) {
  var interface = search_INTERFACES [context.element.text ()];
  if (!interface) {
    var error = new Error ('[search][search_formBlock] Error: The "' + context.element.text () + '" search interface has not been initialized.');
    strictError (error);
    return done (error);
  }
  var element = search_createFormElement (interface);
  context.element.replaceWith (element);
  done (null, element);
}

/*
*/
function search_indexBlock (context, done) {
  var indexName = context.element.text ();
  var index = search_DATABASE [indexName];
  if (!index) {
    var error = new Error ('[search][search_indexBlock] Error: The "' + indexName + '" index does not exist.');
    strictError (error);
    return done (error);
  }
  index.getLunrIndex (
    function (error, lunrIndex) {
      if (error) { done (error); }

      var element = $('<div></div>')
        .addClass ('search_index')
        .append ($('<div></div>')
          .addClass ('search_index_name')
          .text (indexName))
        .append ($('<textarea></textarea>')
          .addClass ('search_lunr_index')
          .text (JSON.stringify (lunrIndex.toJSON ())));

      context.element.replaceWith (element);
      done (null, element);
  }); 
}

/*
  search_interfaceBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  context.element must have an HTML ID attribute
  and contain a single text node that represents
  a Search ID.

  search_interfaceBlock removes context.element,
  creates a search interface linked to the index
  given by the search ID, adds the interface to
  search_INTERFACES using context.element's ID as
  the interface ID, and calls done.

  If the search ID includes a query,
  search_interfaceBlock executes it before
  calling done.

  If an error occurs, search_interfaceBlock
  throws a strict error and passes the error
  to done.
*/
function search_interfaceBlock (context, done) {
  var errorMessage = '[search][search_interfaceBlock]';

  // I. Get the interface ID
  var interfaceId = context.element.attr ('id');
  if (!interfaceId) {
    var error = new Error (errorMessage + ' Error: The Search Interface block is invalid. The HTML ID attribute is required for Search Interface blocks.');
    strictError (error);
    return done (error);
  }

  // II. Parse the search ID
  var searchId    = new URI (context.element.text ());
  var indexName   = searchId.segmentCoded (1);
  var query       = searchId.segmentCoded (2);
  var start       = parseInt (searchId.segment (3), 10);
  var num         = parseInt (searchId.segment (4), 10);

  if (isNaN (start)) {
    strictError (errorMessage + ' Error: "' + context.element.text () + '" is an invalid search id. The "start" parameter is missing or invalid.');
    start = 0;
  }
  if (isNaN (num)) {
    strictError (errorMessage + ' Error: "' + context.element.text () + '" is an invalid search id. The "num" parameter is missing or invalid.');
    num = 10;
  }

  // II. Remove the block element
  context.element.remove ();

  // III. Create and register the search interface 
  var index = search_DATABASE [indexName];
  if (!index) {
    var error = new Error (errorMessage + ' Error: The Search index "' + indexName + '" does not exist.');
    strictError (error);
    return done (error);
  }

  var interface = new search_Interface (index, start, num);

  search_INTERFACES [interfaceId] = interface;

  query ? interface.search (query, function () {
    done (null);
  }) : done (null);
}

/*
  search_linkBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that does not accept
    any arguments.

  context.element must contain a single text node
  that represents a Search ID. 

  search_linkBlock replaces context.element with
  a search form linked to the referenced search
  index and calls done. Whenever a user enters
  a query into the form, the Search module will
  redirect them to the search results page.
*/
function search_linkBlock (context, done) {
  var searchId = new URI (context.element.text ());
  var element = search_createLinkElement (searchId);
  context.element.replaceWith (element);
  done (element);
}

/*
  search_resultsBlock accepts three arguments:
  
  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element
  * and expand, a function that accepts a JQuery
    HTML Element.

  context.element must contain a single text node
  that represents a Search Interface ID.

  search_resultsElement replaces context.element
  with a search results element that lists the
  results returned by the last query executed
  against the referenced interface and then calls
  done. Whenever the interface executes a
  new query, an event handler updates this list.

  If an error occurs, search_resultsBlock throws
  a strict error and passes the error to done.
*/
function search_resultsBlock (context, done, expand) {
  var interface = search_INTERFACES [context.element.text ()];
  if (!interface) {
    var error = new Error ('[search][search_resultsBlock] Error: The "' + context.element.text () + '" search interface has not been initialized.');
    strictError (error);
    return done (error);
  }

  var loadingElement = $('<div></div>').addClass ('search_loading');
  context.element.replaceWith (loadingElement);

  interface.getResultsElement (
    function (error, resultsElement) {
      if (error) { return done (error); }

      loadingElement.replaceWith (resultsElement);
      done (null, resultsElement);
    },
    expand
  );
} 

/*
*/
function search_registerSource (name, source) {
  if (search_SOURCES [name]) {
    return strictError ();
  }
  search_SOURCES [name] = source;
}

/*
*/
function search_loadDatabase (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, search_parseDatabase (doc));
    },
    error: function (request, status, errorMsg) {
      var error = '[search][search_loadDatabase] Error: an error occured while trying to load the database at "' + url + '".';
      strictError (error);
      done (error); 
    }
  });
}

/*
*/
function search_parseDatabase (databaseElement) {
  var database = {};
  $('> database > index', databaseElement).each (
    function (i, indexElement) {
      database [$('> name', indexElement).text ()]
        = new search_Index (
            $('> lunrIndexURL', indexElement).text (),
            $('> setIds > setId', indexElement).map (
              function (i, setElement) {
                return $(setElement).text ();
              }).toArray ());
  });
  return database;
}

/*
*/
function search_Index (lunrIndexURL, setIds) {
  this.lunrIndexURL = lunrIndexURL;
  this.setIds = setIds;
}

/*
*/
search_Index.prototype.getLunrIndex = function (done) {
  if (this.lunrIndex) {
    return done (null, this.lunrIndex);
  } 
  if (this.lunrIndexURL) {
    var self = this;
    return search_loadLunrIndex (this.lunrIndexURL,
      function (error, lunrIndex) {
        if (error) { return done (error); }

        self.lunrIndex = lunrIndex;
        done (null, lunrIndex);
    });
  }
  this.createLunrIndex (done);
}

/*
*/
search_Index.prototype.createLunrIndex = function (done) {
  var self = this;
  this.getEntries (
    function (error, entries) {
      if (error) { return done (error); }

      self.lunrIndex = search_createLunrIndex (entries);
      done (null, self.lunrIndex);
  });
}

/*
*/
search_Index.prototype.getEntries = function (done) {
  if (this.entries) {
    return done (null, this.entries);
  }
  var self = this;
  search_getSetsEntries (this.setIds,
    function (error, entries) {
      if (error) { return done (error); }

      self.entries = entries;
      done (null, entries);
  });
}

/*
*/
function search_loadLunrIndex (url, done) {
  $.get (url,
    function (json) {
      index = lunr.Index.load (json);
      done (null, index);
    },
    'json'
  ).fail (function () {
    var error = new Error ('[search][search_loadLunrIndex] Error: An error occured while trying to load the Lunr index "' + url + '".');
    strictError (error);
    done (error);
  });
}

/*
*/
function search_Entry (id) {
  this.id = id;
}

/*
*/
search_Entry.prototype.getResultElement = function (done) {
  done (null, $('<li></li>')
    .addClass ('search_result')
    .addClass ('search_' + getContentType (this.id) + '_result')
    .append ($('<div></div>')
      .addClass ('search_result_id')
      .append (getContentLink (this.id, this.id))));
}

/*
*/
function search_getEntriesResultElements (entries, done) {
  async.mapSeries (entries,
    function (entry, next) {
      entry.getResultElement (next);
    },
    done
  );
}

/*
*/
function search_Interface (index, start, num) {
  this.index               = index;
  this.query               = ''; 
  this.start               = start;
  this.num                 = num;
  this.results             = []; 
  this.searchEventHandlers = [];
}

/*
*/
search_Interface.prototype.search = function (query, done) {
  this.query = query;
  var self = this;
  this.index.getLunrIndex (
    function (error, lunrIndex) {
      if (error) { done (error); }

      self.results = lunrIndex.search (query);
      self.callSearchEventHandlers (done);
  });
}

/*
*/
search_Interface.prototype.callSearchEventHandlers = function (done) {
  async.series (this.searchEventHandlers, done);
}

/*
*/
search_Interface.prototype.getFilterElement = function (done, expand) {
  var filterElement = $('<ol></ol>').addClass ('search_filter');

  var self = this;
  this.getFilterElements (
    function (error, filterElements) {
      if (error) { return done (error); }

      self.searchEventHandlers.push (
	function (done) {
	  self.getFilterElements (
	    function (error, filterElements) {
              if (error) { return done (error); }

	      expand (filterElement.empty ().append (resultElements), done);
	  });
      });

      done (null, filterElement.append (resultElements));
  });
}

/*
*/
search_Interface.prototype.getFilterElements = function (done) {
  if (!this.query) {
    return this.index.getEntries (
      function (error, entries) {
        if (error) { return done (error); }

        search_getEntriesResultElements (entries, done);
    });
  }
  this.getResultElements (done);
}

/*
  Accepts two arguments:

  * done, a function that accepts a JQuery
    HTML Element
  * and expand, a function that accepts a JQuery
    HTML Element and expands any blocks embedded
    within the element

  creates an JQuery HTML Element that represents
  this interface's search results and passes the
  element to done. This function also registers
  a search event handler that updates the search
  results element whenever a search is executed
  against the interface.
*/
search_Interface.prototype.getResultsElement = function (done, expand) {
  var self = this;
  this.getResultElements (
    function (error, resultElements) {
      var resultsElement = $('<ol></ol>')
        .addClass ('search_results')
        .append (resultElements && resultElements.length > 0 ?
            resultElements :
            $('<div class="search_no_results_block"></div>')
          );

      self.searchEventHandlers.push (
        function (done) {
          resultsElement
            .empty ()
            .append ($('<div></div>').addClass ('search_loading'));

          self.getResultElements (
            function (error, resultElements) {
              if (error) { return done (error); }

              expand (
                resultsElement.append (
                  resultElements && resultElements.length > 0 ?
                    resultElements :
                    $('<div class="search_no_results_block"></div>')),
                function (error) {
                  $('.search_loading', resultsElement).remove ();
                  done (error);
              });
          });
      });
      done (null, resultsElement);
  });
}

/*
  Accepts on argument:

  * done, a function that accepts a single JQuery
    HTML Element

  gets the current search results, creates
  elements that represent these search results,
  and passes those results to done.
*/
search_Interface.prototype.getResultElements = function (done) {
  var self = this;
  this.getResultEntries (
    function (error, entries) {
      if (error) { return done (error); }

      search_getEntriesResultElements (entries, done);
  });
}

/*
*/
search_Interface.prototype.getResultEntries = function (done) {
  var self = this;
  this.index.getEntries (
    function (error, entries) {
      if (error) { return done (error); }

      done (null, self.getResults ().map (
        function (result) {
          var entry = search_getEntry (entries, result.ref);
          if (!entry) {
            strictError (new Error ('[search][search_Interface.getResultEntries] Error: no search entry exists for "' + result.ref + '".'));
            return null;
          }
          return entry;
      }));
  });
}

/*
*/
search_Interface.prototype.getResults = function () {
  return this.results.slice (this.start, this.start + this.num);
}

/*
*/
function search_createLunrIndex (entries) {
  var index = lunr (
    function () {
      var names = search_getFieldNames (entries);
      var numNames = names.length;
      for (var i = 0; i < numNames; i ++) {
        this.field (names [i]);
      }
  });
  var numEntries = entries.length;
  for (var i = 0; i < numEntries; i ++) {
    index.add (entries [i]);
  }
  return index;
}

/*
*/
function search_getFieldNames (entries) {
  var names = [];
  var numEntries = entries.length;
  for (var i = 0; i < numEntries; i ++) {
    var entry = entries [i];
    var entryNames = Object.keys (entry);
    var numEntryNames = entryNames.length;
    for (var j = 0; j < numEntryNames; j ++) {
      var entryName = entryNames [j];
      if (names.indexOf (entryName) === -1) {
        names.push (entryName);
      }
    }
  }
  return names;
}

/*
*/
function search_getSetsEntries (setIds, done) {
  async.reduce (setIds, [],
    function (entries, setId, next) {
      search_getSetEntries (setId,
        function (error, setEntries) {
          if (error) { return next (error); }

          Array.prototype.push.apply (entries, setEntries);
          next (null, entries);
      });
    },
    done
  );
}

/*
*/
function search_getSetEntries (setId, done) {
  var errorMsg = '[search][search_getSetEntries] Error: an error occured while trying get entries from search set "' + setId + '".';

  if (search_ENTRIES [setId]) {
    return done (null, search_ENTRIES [setId]);
  }

  var path = new URI (setId).segmentCoded ();
  if (path.length < 1) {
    var error = new Error (errorMsg);
    strictError (error);
    return done (error);
  }

  var sourceName = path [0];
  var source = search_SOURCES [sourceName];
  if (!source) {
    var error = new Error (errorMsg);
    strictError (error);
    return done (error);
  }

  var setName = path.length > 1 ? path [1] : null;
  source (setName, done);
}

/*
*/
function search_getEntry (entries, id) {
  for (var i = 0; i < entries.length; i ++) {
    if (entries [i].id === id) {
      return entries [i];
    }
  }
  return null;
}

/*
  search_createFormElement accepts one argument:
  interface, a Search Interface; and returns a
  search form element linked to interface as a
  JQuery HTML Element.
*/
function search_createFormElement (interface) {
  var inputElement = $('<input></input>')
    .addClass ('search_input')
    .addClass ('search_form_input')
    .attr ('type', 'text')
    .attr ('placeholder', 'Search')
    .val (interface.query)
    .on ('input', function () {
       interface.search ($(this).val (), function () {});
     });

  interface.searchEventHandlers.push (
    function (done) {
      inputElement.val (interface.query);
      done (null);
  });

  return $('<div></div>')
    .addClass ('search_form')
    .append (inputElement)
    .append ($('<div></div>')
      .addClass ('search_button')
      .addClass ('search_form_button')
      .click (function () {
          interface.search (inputElement.val (), function () {});
        }));
}

/*
  search_createLinkElement accepts one argument:
  searchId, a Search Id; and returns a search
  form as a JQuery HTML Element.

  If a user enters a query in the form, the
  Search module will redirect the user to the
  search results page with the query.
*/
function search_createLinkElement (searchId) {
  var inputElement = $('<input></input>')
    .addClass ('search_input')
    .addClass ('search_link_input')
    .attr ('type', 'text')
    .attr ('placeholder', 'Search')
    .val (searchId.segmentCoded (2))
    .keypress (function (event) {
        if (event.which === 13) {
          loadPage (search_getSearchURL (searchId, $(this).val ()));
        }
      });

  return $('<div></div>')
    .addClass ('search_link')
    .append (inputElement)
    .append ($('<div></div>')
      .addClass ('search_button')
      .addClass ('search_link_button')
      .click (function () {
          loadPage (search_getSearchURL (searchId, $(inputElement).val ()));
        }));
}

/*
  search_getSearchURL accepts two arguments:

  * searchId, a Search Id
  * and keywords, a string that represents a
    collection of search terms

  and returns a URL string that represents a
  query for keywords against searchId.
*/
function search_getSearchURL (searchId, keywords) {
  return new URI ('')
    .segmentCoded ('search_page_block')
    .segmentCoded (searchId.segmentCoded (1))
    .segmentCoded (keywords ? keywords : ' ')
    .segment (searchId.segment (3))
    .segment (searchId.segment (4))
    .toString ();
}