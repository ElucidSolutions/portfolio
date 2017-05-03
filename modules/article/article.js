/*
  The Article module displays articles stored
  within an XML database file.
*/

// Declares the QUnit test module.
QUnit.module ('Article');

/*
  The global article_SETTINGS_URL variable
  specifies the location of the module settings
  file.
*/
var article_SETTINGS_URL = 'modules/article/settings.xml';

/*
  The global article_ARTICLES variable is an
  associative array that stores the loaded articles
  keyed by id.
*/
var article_ARTICLES = {};

// The module's load event handler.
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the module settings.
    article_loadSettings (article_SETTINGS_URL,
      function (error, settings) {
        if (error) { return done (error); }

        // II. Load the articles.
        article_loadArticles (settings.articles,
          function (error, articles) {
            if (error) { return done (error); }

            // III. Cache the loaded articles.
            article_ARTICLES = articles;

            // IV. Register the block handlers.
            block_HANDLERS.addHandlers ({
              article_article_list_block: article_articleListBlock,
              article_article_block:      article_articleBlock,
              article_author_block:       article_authorBlock,
              article_body_block:         article_bodyBlock,
              article_date_block:         article_dateBlock,
              article_summary_block:      article_summaryBlock,
              article_title_block:        article_titleBlock
            });

            // V. Register the page handlers.
            page_HANDLERS.add ('article_article_page', 'modules/article/templates/article_page.html');

            // VI. Continue.
            done (null);
        });
    });
});

/*
  article_loadSettings accepts two arguments:

  * url, a URL string
  * done, a function that accepts an Error object
    and an Article Settings object

  article_loadSettings loads and parses the Article
  Settings document referenced by url and passes
  the result to done. If an error occurs, it
  throws a strict error and passes the error to
  done instead.
*/
function article_loadSettings (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, article_parseSettings (doc));
    },
    error: function (request, status, error) {
      var error = new Error ('[article][article_loadSettings] Error: an error occured while trying to load the Article module\'s settings.xml file from "' + url + '". ' + error);
      strictError (error);
      done (error);
    }
  });
}

/* 
  Unittests for article_loadSettings. 

  Confirms that loadSettings can load and parse
  a settings file without throwing an error.
*/
QUnit.test ('article_loadSettings', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  article_loadSettings ('modules/article/settings.xml.default', function (error, settings) {
    assert.ok (settings, 'article_loadSettings can load the current settings file');
    assert.notOk (error, 'article_loadSettings does not throw an error');    
    assert.strictEqual (settings && settings.articles, 'modules/article/database.xml', 'article_parseSettings correctly parsed the articles parameter');
    done ();
  })
})

/*
  article_parseSettings accepts an XML Document
  string that represents an Article Settings
  Document, parses the document, and returns an
  Article Settings object.
*/
function article_parseSettings (doc) {
  return {
    articles: $('settings > articles', doc).text ()
  };
}

/*
  article_loadArticles accepts three arguments:

  * url, a URL string
  * done, a function that accepts two arguments:
    an Error object and an associative array of
    Articles keyed by article id.

  article_loadArticles loads the Articles Database
  XML Document referenced by url, parses the
  document, and passes the parsed articles to
  done.

  If an error occurs, article_loadArticles throws a
  strict error and passes the error to done instead.
*/
function article_loadArticles (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, article_parseArticles (doc));
    },
    error: function (request, status, errorMsg) {
      var error = new Error ('[article][article_loadArticles] Error: an error occured while trying to load the articles database "' + url + '". ' + errorMsg);
      strictError (error);
      done (error);
    }
  });
}

/* 
  Unittests for article_loadArticles.

  Confirm that loadArticles can load and parse
  the article database without error.
*/
QUnit.test ('article_loadArticles', function (assert) {
  assert.expect (3);
  var done = assert.async ();
  article_loadArticles ('modules/article/database.xml.default', function (error, articles) {
    assert.ok (articles, 'article_loadArticles can load the current database');
    assert.notOk (error, 'article_loadArticles does not throw an error'); 
    var articleId = 'article_article_page/example-article';
    var article = articles && articles [articleId];

    assert.ok (article &&
      article.id === articleId &&
      article.title === 'Example Article' &&
      article.date === '2014-02-27' &&
      article.author === 'Larry D. Lee Jr.' &&
      article.summary === 'This is an example article' &&
      article.body === 'This is a simple example.',          
      'article_loadArticles correctly parses entry');
    done ();
  })
})

/*
  article_parseArticles accepts one argument, doc,
  an Articles Database XML Document string and
  returns an associative array of Articles, keyed
  by article ID. 
*/
function article_parseArticles (doc) {
  var articles = {};
  $('article', doc).each (
    function (articleIndex, articleElement) {
      var article = article_parseArticle (articleElement);
      articles [article.id] = article;
  });
  return articles;
}

/*
  article_parseArticle accepts an Article XML
  Element string and returns an Article that
  represents the article described by the string.
*/
function article_parseArticle (articleElement) {
  var id = new URI ('article_article_page')
    .segmentCoded ($('> id', articleElement).text ())
    .toString ();

  return {
    id:      id,
    title:   $('> title', articleElement).text (),
    date:    $('> date', articleElement).text (),
    author:  $('> author', articleElement).text (),
    summary: $('> summary', articleElement).text (),
    body:    $('> body', articleElement).text ()
  };  
}

/*
  article_articleListBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  article_articleListBlock replaces context.element
  with a new HTML element that lists the articles
  stored in the articles database and passes the
  new element to done.
*/
function article_articleListBlock (context, done) {
  var element = article_createArticleListElement ();
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_articleListBlock. 

  Confirms that the function loads the available
  article objects and creates an 
  .article_list_item list element for each.
*/
unittest ('article_articleListBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div class="article_article_list_block_container"><div class="article_article_list_block"></div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (3);
    block_HANDLERS.add ('article_article_list_block', article_articleListBlock);
    var done = assert.async ();
    var numArticles = Object.keys(article_ARTICLES).length;
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.ok (numArticles, 'article_articleListBlock accesses article_ARTICLES.');
        assert.ok (numArticles === $('.article_article_list_block_container li.article_list_item').length, 'article_articleListBlock creates an .article_list_item element for each item in article_ARTICLES.');
        assert.ok ( $('.article_article_list_block_container li.article_list_item').first ().find('.article_title').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].title, 'article_articleListBlock inserts the first article\'s title property into the correct list item\'s .article_title element.');
        done ();
      }
    );    
  }
)

/*
  article_articleBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element

  context.element must contain a single text node
  representing a valid article id.

  article_articleBlock replaces context.element with a
  new HTML element that represents the referenced
  article and passes the new element to done. If
  an error occurs, article_articleBlock throws
  a strict error and passes the error to done
  instead.
*/
function article_articleBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_articleBlock] Error: an error occured while trying to expand an article block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  element = article_createArticleElement (article);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_articleBlock.

  Confirms that the function replaces
  context.element with an HTML element
  referencing the appropriate article.
*/
unittest ('article_articleBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div class="article_article_block_container"><div class="article_article_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);
    block_HANDLERS.add ('article_article_block', article_articleBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_article_block_container .article_article_block').length, 'article_articleBlock removes the article_article_block element.');
        assert.ok ( $('.article_article_block_container .article_title').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].title, 'article_articleBlock inserts the article\'s title property into its .article_title element.');
        done ();
    });    
  }
)

/*
  article_authorBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  context.element must contain a single text node
  representing a valid article id.

  article_authorBlock replaces context.element with a
  new HTML element that represents the referenced
  article's author and passes the new element to
  done. If an error occurs, article_authorBlock
  throws a strict error and passes the error to
  done instead.
*/
function article_authorBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_authorBlock] Error: an error occured while trying to expand an article author block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  var element = article_createAuthorElement (article.author);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_authorBlock. 

  Confirms that the function replaces the 
  .article_author_block element with a new
  element representing the article author.
*/
unittest ('article_authorBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div><div class="article_author_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);

    block_HANDLERS.add ('article_author_block', article_authorBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_author_block').length, 'article_authorBlock removes the article_author_block element.');        
        assert.ok ($('.article_author').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].author, 'article_authorBlock creates an .article_author element containing the name of the article\'s author.');
        done ();
      }
    );    
  }
)

/*
  article_bodyBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  context.element must contain a single text node
  representing a valid article id.

  article_bodyBlock replaces context.element with a
  new HTML element that represents the referenced
  article's body and passes the new element to
  done. If an error occurs, article_bodyBlock
  throws a strict error and passes the error to
  done instead.
*/
function article_bodyBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_bodyBlock] Error: an error occured while trying to expand an article body block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  var element = article_createBodyElement (article.body);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_bodyBlock. 

  Confirms that the function replaces the 
  .article_body_block element with a new
  element containing the article's body.
*/
unittest ('article_bodyBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes',
          body: 'This is more body text',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is another summary',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div><div class="article_body_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);

    block_HANDLERS.add ('article_body_block', article_bodyBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_body_block').length, 'article_bodyBlock removes the article_body_block element.');
        assert.ok ($('.article_body').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].body, 'article_bodyBlock creates an .article_body element with the text of the article\'s body.');
        done ();
      }
    );    
  }
)

/*
  article_dateBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must contain a single text node
  representing a valid article id.

  article_dateBlock replaces context.element with a
  new HTML element that represents the referenced
  article's date and passes the new element to
  done. If an error occurs, article_dateBlock
  throws a strict error and passes the error to
  done instead.
*/
function article_dateBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_dateBlock] Error: an error occured while trying to expand an article date block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  var element = article_createDateElement (article.date);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_dateBlock. 

  Confirms that the function replaces the 
  .article_date_block element with a new element
  containing the article's date.
*/
unittest ('article_dateBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div class="article_date_block_container"><div class="article_date_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);

    block_HANDLERS.add ('article_date_block', article_dateBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_date_block_container .article_date_block').length, 'article_dateBlock removes the article_date_block element.');        
        assert.ok ($('.article_date_block_container .article_date').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].date, 'article_dateBlock creates an .article_date element containing the article\'s date.');
        done ();
      }
    );    
  }
)

/*
  article_summaryBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object and a JQuery HTML Element.

  context.element must contain a single text node
  representing a valid article id.

  article_summaryBlock replaces context.element with a
  new HTML element that represents the referenced
  article's summary and passes the new element to
  done. If an error occurs, article_summaryBlock
  throws a strict error and passes the error to
  done instead.
*/
function article_summaryBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_summaryBlock] Error: an error occured while trying to expand an article summary block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  var element = article_createSummaryElement (article.summary);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_summaryBlock. 

  Confirms that the function replaces the 
  .article_summary_block element with a new
  element containing the article's summary.
*/
unittest ('article_summaryBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div class="article_summary_block_container"><div class="article_summary_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);

    block_HANDLERS.add ('article_summary_block', article_summaryBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_summary_block_container .article_summary_block').length, 'article_summaryBlock removes the article_summary_block element.');        
        assert.ok ($('.article_summary_block_container .article_summary').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].summary, 'article_summaryBlock creates an .article_summary element containing the article summary.');
        done ();
      }
    );    
  }
)

/*
  article_titleBlock accepts two arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two
    arguments: an Error object and a JQuery HTML
    Element.

  context.element must contain a single text node
  representing a valid article id.

  article_titleBlock replaces context.element with a
  new HTML element that represents the referenced
  article's title and passes the new element to
  done. If an error occurs, article_titleBlock
  throws a strict error and passes the error to
  done instead.
*/
function article_titleBlock (context, done) {
  var articleId = context.element.text ();
  var article = article_ARTICLES [articleId];
  if (!article) {
    var error = new Error ('[article][article_titleBlock] Error: an error occured while trying to expand an article title block. The referenced article does not exist.');
    strictError (error);
    return done (error);
  }
  var element = article_createTitleElement (article.title);
  context.element.replaceWith (element);
  done (null, element);
}

/*
  Unittests for article_titleBlock. 

  Confirms that the function replaces the 
  .article_title block element with a new element
  containing the article's title.
*/
unittest ('article_titleBlock',
  {
    globals: [
      { variableName: 'block_HANDLERS', value: new block_HandlerStore () },
      { variableName: 'article_ARTICLES', value: { 
        'article_article_page/testing-article-1': {
          author: 'Rebecca Estes',
          body: 'This is the body text',
          date: '2016-03-21',
          id: 'article_article_page/testing-article-1',
          summary: 'This is the summary',
          title: 'Article 1'
        },
        'article_article_page/testing-article-2': {
          author: 'Rebecca Estes 2',
          body: 'This is the body text 2',
          date: '2017-03-21',
          id: 'article_article_page/testing-article-2',
          summary: 'This is the summary 2',
          title: 'Article 2'
        }
      }}
    ],
    elements: [
      $('<div class="article_title_block_container"><div class="article_title_block">article_article_page/testing-article-1</div></div>')
    ]
  },
  function (assert, elements) {
    assert.expect (2);

    block_HANDLERS.add ('article_title_block', article_titleBlock);
    var done = assert.async ();
    block_expandBlock (new block_Context (12, elements [0]),
      function () {   
        assert.notOk ($('.article_title_block_container .article_title_block').length, 'article_titleBlock removes the article_title_block element.');        
        assert.ok ($('.article_title_block_container .article_title').text ().trim () === article_ARTICLES['article_article_page/testing-article-1'].title, 'article_titleBlock creates an .article_title element containing the article title.');
        done ();
      }
    );    
  }
)

/*
  article_createArticleListElement returns a JQuery
  HTML element that lists the articles stored in
  the articles database.
*/
function article_createArticleListElement () {
  var articleListElement = $('<ul></ul>').addClass ('article_list');
  for (var articleId in article_ARTICLES) {
    var article = article_ARTICLES [articleId];
    articleListElement.append (
      $('<li></li>')
        .addClass ('article_list_item')
        .append (article_createArticleSummaryElement (article)));
  }
  return articleListElement;
}

/*
  article_createArticleElement accepts an Article
  and returns a JQuery HTML Element that represents
  the article.
*/
function article_createArticleElement (article) {
  return $('<div></div>')
    .addClass ('article_article')
    .append ($('<div></div>')
      .addClass ('article_header')
      .append ($('<h2></h2>')
        .addClass ('article_header_title')
        .append (article_createTitleElement (article.title))))
    .append (
      $('<div></div>')
        .addClass ('article_byline')
        .append (
          article_createDateElement (article.date),
          article_createAuthorElement (article.author)),
      article_createBodyElement (article.body));
}

/*
  article_createArticleSummaryElement accepts an
  Article and returns a JQuery HTML Element that
  represents a summary of the article.
*/
function article_createArticleSummaryElement (article) {
  return $('<div></div>')
    .addClass ('article_article_summary')
    .append ($('<div></div>')
      .addClass ('article_header')
      .append (
        $('<h2></h2>')
          .addClass ('article_header_title')
          .append (article_createLinkElement (article))))
    .append (
      $('<div></div>')
        .addClass ('article_byline')
        .append (
          article_createDateElement   (article.date),
          article_createAuthorElement (article.author)),
      article_createSummaryElement (article.summary));
}

/*
  article_createAuthorElement accepts an HTML
  string that represents an author's name and
  returns a JQuery HTML element that represents
  the author's name.
*/
function article_createAuthorElement (author) {
  return $('<span></span>').addClass ('article_author').html (author);
}

/*
  article_createBodyElement accepts an HTML string
  that represents an article's body and returns a
  JQuery HTML Element that represents the body.
*/
function article_createBodyElement (body) {
  return $('<div></div>').addClass ('article_body').html (body);
}

/*
  article_createDateElement accepts a string that
  represents an article's publication date and
  returns a JQuery HTML Element that represents the
  date.
*/
function article_createDateElement (date) {
  return $('<span></span>').addClass ('article_date').text (date); 
}

/*
  article_createSummaryElement accepts an HTML
  string that represents an article's summary and
  returns a JQuery HTML Element that represents the
  summary.
*/
function article_createSummaryElement (summary) {
  return $('<div></div>').addClass ('article_summary').html (summary);
}

/*
  article_createLinkElement accepts an Article and
  returns a JQuery HTML Element that represents a
  link to the article.
*/
function article_createLinkElement (article) {
  return getContentLink (article.id, article_createTitleElement (article.title)).addClass ('article_link');
}

/*
  article_createTitleElement accepts an HTML string
  that represents an article's title and returns a
  JQuery HTML Element that represents the title.
*/
function article_createTitleElement (title) {
  return $('<span></span>').addClass ('article_title').html (title);
}