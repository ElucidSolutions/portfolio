var video_library_SNIPPET_LENGTH = 500;

var video_library_DATABASE_URL = 'modules/video_library/database.xml';

var video_library_DATABASE = {};

/*
  The module's load event handler.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the Video Database.
    video_library_loadDatabase (video_library_DATABASE_URL,
      function (error, database) {
        if (error) { return done (error); }

        // II. Cache the Video Library.
        video_library_DATABASE = database;

        // III. Register the video library menu.
        menu_MENUS ['video_library'] = video_library_DATABASE.getMenu ();

        // III. Register the module's block handler.
        block_HANDLERS.addHandlers ({
          'video_library_description_block': video_library_descriptionBlock,
          'video_library_player_block':      video_library_playerBlock,
          'video_library_title_block':       video_library_titleBlock,
          'video_library_transcript_block':  video_library_transcriptBlock
        });

        // IV. Register the module's page handler.
        page_HANDLERS.add ('video_library_page', 'modules/video_library/templates/video_library_page.html');

        // V. Register the module's search source.
        search_registerSource ('video_library_search_source', video_library_searchSource);

        done (null);
    });
});

/*
  video_library_descriptionBlock accepts two
  arguments:

  * context, a Block Expansion Context
  * and done, a function that accepts two
    arguments: error, an Error object; and element,
    a JQuery HTML Element.

  context.element must be a JQuery HTML element
  that contains three DIV child elements.

  * The first must have the class name
    "video_library_player_id" and must contain a
    single text node representing a valid Video
    Library Player ID.
  * The second must have the class name
    "video_library_library_id" and must contain
    a single text node representing a valid Video
    Library Library ID.
  * and the third must have the class name
    "video_library_default_text" and must contain
    a single text node representing a default
    video description.

  video_library_descriptionBlock loads the
  description of the video currently loaded
  in the referenced player, replaces the
  context.element with a DIV element containing
  the description, and passes the element
  to done.

  If the current video does not have
  a description, this function displays the
  default text instead.

  If an error occurs, this function passes the
  error to done instead.
*/
function video_library_descriptionBlock (context, done) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true},
      {'name': 'video_library_default_text', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var defaultText = blockArguments.video_library_default_text;
      if (!defaultText) {
        defaultText = '<p><em>No description available.</em></p>';
      }
      defaultText = defaultText.trim ();

      var libraryId   = blockArguments.video_library_library_id.trim ();
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE.getLibrary (libraryName);
      if (!library) {
        var error = new Error ('[video_library][video_library_descriptionBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var playerId = blockArguments.video_library_player_id.trim ();
      var descriptionElement = library.createDescriptionElement (playerId, defaultText, videoURL);

      context.element.replaceWith (descriptionElement);
      done (null, descriptionElement);
  });
}

/*
  video_library_playerBlock accepts two arguments:

  * context, a Block Expansion Context
  * and done, a functon that accepts two
    arguments: an Error object; and a JQuery
    HTML Element.

  context.element must contain two child DIV
  elements:

  * the first, must have a class named
    "video_library_player_id" and must contain a
    single text node that represents a valid Video
    Library Player ID
  * the second, must have a class named
    "video_library_default_video_id" and must
    contain a single text node that represents a
    valid Video Library Video ID.

  video_library_playerBlock creates a VideoJS
  element using the Video module; tries to load
  the referenced video; replaces context.element
  with the VideoJS element; and passes the
  element to done.

  If an error occurs, this function passes the
  error to done.
*/
function video_library_playerBlock (context, done) {
  getBlockArguments ([
      {'name': 'video_library_player_id',        'text': true, 'required': true},
      {'name': 'video_library_default_video_id', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var playerId = blockArguments.video_library_player_id.trim ();

      var videoElement = $('<video></video>')
        .attr     ('id', playerId)
        .addClass ('video-js')
        .addClass ('vjs-default-skin')
        .attr     ('controls', 'controls')
        .attr     ('width', 'auto')
        .attr     ('height', '450px');

      var playerElement = $('<div></div>')
        .addClass ('video_player_block')
        .append (videoElement);

      var videoId   = blockArguments.video_library_default_video_id.trim ();
      var videoPath = video_library_getPath (videoId);
      var videoURL  = video_library_getVideoURL (videoPath);
      if (videoURL) {
        videoElement.append ($('<source></source>').attr ('src', videoURL));
      }

      context.element.replaceWith (playerElement);
      done (null, playerElement);
  });
}

/*
  video_library_titleBlock accepts three arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object; and a JQuery HTML Element
  * and expand, a function that accepts a JQuery
    HTML Element

  context.element must contain two child DIV elements:

  * the first, must have a class named
    "video_library_player_id" and must contain a
    single text node that represents a valid Video
    Library Player ID
  * the second, must have a class named
    "video_library_library_id" and must contain
    a single text node that represents a valid
    Video Library Library ID or a valid Video Library
    Video ID.

  video_library_titleBlock:

  * loads the referenced library/video
  * creates an HTML element that represents the
    library/video's title
  * replaces context.element with the new
    title element
  * and passes the element to done.

  video_library_titleBlock also registers
  a load event handler on the referenced
  player. Whenever the player loads a new video,
  this handler will find the video's entry in
  the referenced library, replace the title
  element's content with the new video's title,
  and pass the modified element to expand to
  expand any blocks contained within it.

  If an error occurs, this function passes the
  error to done instead.
*/
function video_library_titleBlock (context, done, expand) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var libraryId   = blockArguments.video_library_library_id.trim ();
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE.getLibrary (libraryName);
      if (!library) {
        var error = new Error ('[video_library][video_library_titleBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var video = videoURL ? library.getVideo (videoURL) : null;

      var titleElement = $('<span></span>')
        .addClass ('video_library_title')
        .html (video ? video.title : library.title);

      var playerId = blockArguments.video_library_player_id.trim ();
      video_registerLoadHandler (playerId,
        function (player) {
          player.on ('loadeddata',
            function () {
              var video = library.getVideo (player.currentSrc ());
              titleElement.html (video ? video.title : library.title);
              expand (titleElement, function () {});
          });
      });

      context.element.replaceWith (titleElement);
      done (null, titleElement);
  });
}

/*
  video_library_transcriptBlock accepts three
  arguments:

  * context, a Block Expansion Context
  * done, a function that accepts two arguments:
    an Error object; and a JQuery HTML Element
  * and expand, a function that accepts a JQuery
    HTML Element

  context.element must contain three child
  DIV elements:

  * the first, must have a class named
    "video_library_player_id" and must contain
    a single text node that represents a valid
    Video Library Player ID
  * the second, must have a class named
    "video_library_library_id" and must contain
    a single text node that represents a valid
    Video Library Library ID or a Video Library
    Video ID
  * the third, must have a class named
    "video_library_default_text" and must
    contain a single text node that represents
    the message that will be presented if the
    referenced library/video does not have
    a transcript.

  video_library_transcriptBlock:

  * loads the referenced video
  * loads the video's transcript
  * creates an HTML element that represents the
    video's transcript
  * replaces context.element with the new
    transcript element
  * and passes the transcript element to done.

  This function registers a load event handler
  with the referenced player. Whenever the player
  loads a new video, this handler will update
  the transcript element so that it displays
  either the transcript for the new video or
  the default text.

  If the video does not have a transcript,
  this function returns a transcript element
  that displays the given default text.

  If an error occurs, this function passes the
  error to done instead.
*/
function video_library_transcriptBlock (context, done, expand) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true},
      {'name': 'video_library_default_text', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var defaultText = blockArguments.video_library_default_text;
      if (!defaultText) {
        defaultText = '<p><em>No transcript available.</em></p>';
      }
      defaultText = defaultText.trim ();

      var libraryId   = blockArguments.video_library_library_id.trim ();
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE.getLibrary (libraryName);
      if (!library) {
        var error = new Error ('[video_library][video_library_transcriptBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var playerId = blockArguments.video_library_player_id.trim ();
      library.createTranscriptElement (playerId, defaultText, videoURL,
        function (error, transcriptElement) {
          if (error) { return done (error); }

          context.element.replaceWith (transcriptElement);
          done (null, transcriptElement);
        },
        expand
      );
  });
}

/*
  video_library_searchSource accepts two
  arguments:

  * libraryName, a string that represents a
    library name
  * and done, a function that accepts two
    arguments: an Error object and an array of
    Search Entries.

  video_library_searchSource:

  * loads the referenced library
  * loads every video within the referenced
    library
  * creates a Search Entry for every video
  * and passes the entries to done.

  If an error occurs this function passes the
  error to done instead.
*/
function video_library_searchSource (libraryName, done) {
  var set = [];
  var library = video_library_DATABASE.getLibrary (libraryName);
  if (!library) {
    var error = new Error ('[video_library][video_library_searchSource]');
    strictError (error);
    return done (error);
  }
  library.getAllVideos ().forEach (
    function (video) {
      set.push (new video_library_VideoEntry (
        video.id,
        video_library_stripHTMLTags (video.title),
        video_library_stripHTMLTags (video.description)
      ));
  });
  done (null, set);
}

/*
  Accepts three arguments:

  * id, a Video Library Video ID string
  * title, a video title string
  * and body, a plain text string

  and returns a Video Library Video Search Entry.
*/
function video_library_VideoEntry (id, title, body) {
  search_Entry.call (this, id);
  this.title = title;
  this.body  = body;
}

/*
*/
video_library_VideoEntry.prototype = Object.create (video_library_VideoEntry.prototype);

/*
  Accepts one argument: done, a function that
  accepts two arguments: an error object; and
  a JQuery HTML Element.

  This function creates an HTML element that
  represents this Video Library Video Search
  Entry and passes the element to done.
*/
video_library_VideoEntry.prototype.getResultElement = function (done) {
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
      .append ($('<p></p>').text (video_library_getSnippet (this.body)))));
}

/*
  Accepts six arguments:

  * id, a video ID string
  * url, a video URL string
  * title, a string
  * description, a string
  * duration, an integer representing a video
    duration in seconds
  * and transcriptURL, a URL string

  and returns a video_library_Video object.
*/
function video_library_Video (id, url, title, description, duration, transcriptURL) {
  this.id            = id;
  this.url           = url;
  this.title         = title;
  this.description   = description;
  this.duration      = duration;
  this.transcriptURL = transcriptURL;
}

video_library_Video.prototype.getMenuElements = function () {
  return [new menu_Leaf (
    null,
    this.id,
    this.title + '<span class="video_library_time">' + video_library_timeToString (this.duration) + '</span>',
    'video_library_video'
  )];
}

video_library_Video.prototype.createDescriptionContent = function () {
  return '<div><div>' + this.title + '</div><div>' + this.description + '</div></div>';
}

function video_library_parseVideo (collectionPath, videoElement) {
  var url  = $('> url', videoElement).text ();
  var path = collectionPath.concat (url);
  return new video_library_Video (
    video_library_createId (path),
    video_library_toAbsoluteURL (url),
    $('> title', videoElement).text (),
    $('> description', videoElement).text (),
    video_library_convertToSeconds ($('> duration', videoElement).text ()),
    video_library_toAbsoluteURL ($('> transcript', videoElement).text ())
  );
}

function video_library_Collection (id, name, title, description, collections, videos) {
  this.id          = id;
  this.name        = name;
  this.title       = title;
  this.description = description;
  this.collections = collections;
  this.videos      = videos;
}

video_library_Collection.prototype.getMenuElements = function () {
  var node = new menu_Node (
    null,
    this.id,
    this.title + '<span class="video_library_time">' + video_library_timeToString (this.getDuration ()) + '</span>',
    [],
    'video_library_collection'
  );

  for (var collectionId in this.collections) {
    var collection = this.collections [collectionId];
    var elements = collection.getMenuElements ();
    for (var i = 0; i < elements.length; i ++) {
      elements [i].parent = node;
      node.children.push (elements [i]);
    }
  }

  for (var videoId in this.videos) {
    var video = this.videos [videoId];
    var elements = video.getMenuElements ();
    for (var i = 0; i < elements.length; i ++) {
      elements [i].parent = node;
      node.children.push (elements [i]);
    }
  }

  return [node];
}

video_library_Collection.prototype.getDuration = function () {
  var duration = 0;
  for (var i = 0; i < this.videos.length; i ++) {
    duration += this.videos [i].duration;
  }
  return duration;
}

video_library_Collection.prototype.getVideo = function (videoURL) {
  for (var i = 0; i < this.videos.length; i ++) {
    if (this.videos [i].url === videoURL) {
      return this.videos [i];
    }
  }
  for (var i = 0; i < this.collections.length; i ++) {
    var collection = this.collections [i];
    var video = collection.getVideo (videoURL);
    if (video) {
      return video;
    }
  }
  return null;
}

video_library_Collection.prototype.getAllVideos = function () {
  var videos = [];
  Array.prototype.push.apply (videos, this.videos);
  for (var i = 0; i < this.collections.length; i ++) {
    Array.prototype.push.apply (videos, this.collections [i].getAllVideos ());
  }
  return videos;
}

function video_library_parseCollection (libraryPath, collectionElement) {
  var name = $('> name', collectionElement).text ();
  var path = libraryPath.concat (name);
  return new video_library_Collection (
    video_library_createId (path),
    name,
    $('> title', collectionElement).text (),
    $('> description', collectionElement).text (),
    $('> collection', collectionElement).map (
      function (i, collectionElement) {
        return video_library_parseCollection (path, collectionElement);
    }).toArray (),
    $('> video', collectionElement).map (
      function (i, videoElement) {
        return video_library_parseVideo (path, videoElement);
    }).toArray ()
  );
}

function video_library_Library (id, name, title, description, collections, videos) {
  video_library_Collection.call (this, id, name, title, description, collections, videos);
}

video_library_Library.prototype = Object.create (video_library_Collection.prototype);

video_library_Library.prototype.getMenuElements = function () {
  var node = new menu_Node (
    null,
    this.id,
    this.title + '<span class="video_library_time">' + video_library_timeToString (this.getDuration ()) + '</span>',
    [],
    'video_library_menu'
  );

  for (var collectionId in this.collections) {
    var collection = this.collections [collectionId];
    var elements = collection.getMenuElements ();
    for (var i = 0; i < elements.length; i ++) {
      elements [i].parent = node;
      node.children.push (elements [i]);
    }
  }

  for (var videoId in this.videos) {
    var video = this.videos [videoId];
    var elements = video.getMenuElements ();
    for (var i = 0; i < elements.length; i ++) {
      elements [i].parent = node;
      node.children.push (elements [i]);
    }
  }

  return [node];
}

video_library_Library.prototype.createDescriptionElement = function (playerId, defaultText, videoURL) {
  var video = videoURL ? this.getVideo (videoURL) : null;

  var descriptionElement = $('<div></div>')
    .addClass ('video_library_description')
    .addClass ('video_library_video_description')
    .html (video ? video.createDescriptionContent () : defaultText);

  var self = this;
  video_registerLoadHandler (playerId,
    function (player) {
      player.on ('loadeddata',
        function () { 
          var video = self.getVideo (player.currentSrc ());
          descriptionElement.empty ().html (video ? video.createDescriptionContent () : defaultText);
      });
  });

  return descriptionElement;
}

video_library_Library.prototype.createTranscriptElement = function (playerId, defaultText, videoURL, done, expand) {
  var errorPrefix = '[video_library][video_library_Library.createTranscriptElement]';

  var transcriptElement = $('<div></div>').addClass ('video_library_transcript');

  var self = this;

  video_registerLoadHandler (playerId,
    function (player) {
      player.on ('loadeddata',
        function () {
          transcriptElement.empty ();

          var displayDefaultText = function () {
            transcriptElement.html (defaultText);
          }

          var video = self.getVideo (player.currentSrc ());
          if (video.transcriptURL) {
            return video_library_loadTranscript (video.transcriptURL,
              function (error, captions) {
                if (error) {
                  return strictError (errorPrefix + ' Error: an error occured while trying to update a video transcript element.');
                }
                expand (transcriptElement.append (video_library_createCaptionElements (captions, playerId)),
                  function () {});
              },
              displayDefaultText
            );
          }
          displayDefaultText ();
      });

      player.on ('timeupdate',
        function () {
          // TODO: Can I use a "this" reference here?
          video_library_highlightTranscriptElement (transcriptElement, player.currentTime ());
      });
  });

  if (videoURL) {
    var video = this.getVideo (videoURL);
    if (!video) {
      var error = new Error (errorPrefix + ' Error: an error occured while trying to create a video transcript element.');
      strictError (error);
      return done (error);
    }
    if (!video.transcriptURL) {
      return done (null, transcriptElement);
    }
    return video_library_loadTranscript (video.transcriptURL,
      function (error, captions) {
        if (error) { return done (error); }
        done (null, transcriptElement.append (video_library_createCaptionElements (captions, playerId)));
    });
  }
  done (null, transcriptElement);
}

function video_library_parseLibrary (libraryElement) {
  var name = $('library > name', libraryElement).text ();
  var path = [name];
  return new video_library_Library (
    video_library_createId (path),
    name,
    $('library > title', libraryElement).text (),
    $('library > description', libraryElement).text (),
    $('library > collection', libraryElement).map (
      function (i, collectionElement) {
        return video_library_parseCollection (path, collectionElement);
    }).toArray (),
    $('> video', libraryElement).map (
      function (i, videoElement) {
        return video_library_parseVideo (path, videoElement);
    }).toArray ()
  );
}

/*
  Accepts one argument: libraries: an associative
  array of video_library_Library objects keyed
  by name; and returns a video_library_Database.
*/
function video_library_Database (libraries) {
  this.libraries = libraries;
}

/*
  Accepts one argument: libraryName, a string;
  and returns the library named libraryName as
  a video_library_Library.
*/
video_library_Database.prototype.getLibrary = function (libraryName) {
  return this.libraries [libraryName];
}

/*
  Accepts no arguments and returns a menu_Menu
  object listing all of the libraries and videos
  in this database.
*/
video_library_Database.prototype.getMenu = function () {
  var menu = new menu_Menu ([]);
  for (var libraryName in this.libraries) {
    var library = this.libraries [libraryName];
    Array.prototype.push.apply (menu.children, library.getMenuElements ());
  }
  return menu;
}

/*
  Accepts two arguments:

  * databaseURL, a URL string
  * and done, a function that accepts
    two arguments: an Error object; and a
    video_library_Database

  loads the database document at databaseURL,
  parses the document, and passes the resulting
  database object to done.

  If an error occurs, this function passes the
  error to done instead.
*/
function video_library_loadDatabase (databaseURL, done) {
  $.get (databaseURL,
    function (databaseElement) {
      done (null, video_library_parseDatabase (databaseElement));
    },
    'xml'
  )
  .fail (function () {
    var error = new Error ('[video_library][video_library_loadDatabase] Error: an error occured while trying to load "' + databaseURL + '".');
    strictError (error);
    done (error);
  });
}

/*
  Accepts one argument: databaseElement, a
  JQuery XML Document that represents a Video
  Library Database Document; and returns the
  database represented by the document as a
  video_library_Database object.
*/
function video_library_parseDatabase (databaseElement) {
  var database = new video_library_Database ([]);
  $('database > library', databaseElement).each (
    function (i, libraryElement) {
      var library = video_library_parseLibrary (libraryElement);
      database.libraries [library.name] = library;
  });
  return database;
}

function video_library_Caption (start, end, text) {
  this.start = start;
  this.end   = end;
  this.text  = text;
}

video_library_Caption.prototype.createElement = function (playerId) {
  var captionElement = $('<span></span>')
    .addClass ('video_library_caption')
    .attr ('data-start', this.start)
    .attr ('data-end', this.end)
    .text (this.text);

  if (playerId) {
    var self = this;
    captionElement.click (
      function () {
        video_registerLoadHandler (playerId,
          function (player) {
            player.currentTime (self.start);
            player.play ();
        });
    });
  }

  return captionElement;
}

function video_library_parseCaption (captionElement) {
  return new video_library_Caption (
    video_library_convertToSeconds (captionElement.attr ('begin')),
    video_library_convertToSeconds (captionElement.attr ('end')),
    captionElement.text ()
  );
}

function video_library_createCaptionElements (captions, playerId) {
  return captions.map (function (caption) { return caption.createElement (playerId); });
}

function video_library_loadTranscript (transcriptURL, done) {
  $.get (transcriptURL,
    function (transcriptElement) {
      done (null, video_library_parseTranscript (transcriptElement));
    },
    'xml'
  )
  .fail (function () {
    var error = new Error ('[video_library][video_library_loadTranscript] Error: an error occured while trying to load a Video Transcript "' + transcriptURL + '".');
    strictError (error);
    done (error);
  });
}

function video_library_parseTranscript (transcriptElement) {
  return $('p', transcriptElement).map (
    function (i, captionElement) {
      return video_library_parseCaption ($(captionElement));
  }).toArray ();
}

function video_library_highlightTranscriptElement (transcriptElement, time) {
  $('> .video_library_caption', transcriptElement).each (
    function (captionElementIndex, captionElement) {
      if ($(captionElement).attr ('data-start') < time && time < $(captionElement).attr ('data-end')) {
        $(captionElement).addClass ('video_library_caption_active');
      } else {
        $(captionElement).removeClass ('video_library_caption_active');
      }    
  });
}

function video_library_createId (videoPath) {
  var uri = new URI ('').segmentCoded ('video_library_page');
  for (var i = 0; i < videoPath.length; i ++) {
    uri.segmentCoded (videoPath [i]);
  }
  return uri.toString ();
}

function video_library_getPath (videoId) {
  var path = new URI (videoId).segmentCoded ();
  if (path.length < 2) {
    strictError ('[video_library][video_library_getPath] Error: "' + videoId + '" is an invalid video ID.');
    return null;
  }
  path.shift ();
  return path;
}


function video_library_getLibraryName (videoPath) {
  return videoPath [0];
}

function video_library_getVideoURL (videoPath) {
  return video_library_toAbsoluteURL (videoPath.length < 2 ? null : videoPath [videoPath.length - 1]);
}

/*
  video_library_convertToSeconds accepts
  one argument: time, a string that represents
  a duration; and returns an integer that
  represents time as the number of seconds.
*/
function video_library_convertToSeconds (time) {
  var xs = time.split (':');
  var seconds = 0;
  for (var i = 0; i < xs.length; i ++) {
    seconds += Number (xs [i]) * Math.pow (60, (xs.length - 1) - i);
  }
  return seconds;
}

/*
  video_library_timeToString accepts one
  argument: time, a number that represents a
  duration; and returns a string that represents
  the duration.
*/
function video_library_timeToString (time) {
  var hours = parseInt (time / 3600);
  var minutes = parseInt ((time - (hours * 3600)) / 60);
  var seconds = time - (hours * 3600) - (minutes * 60);

  var timeString = '';
  if (hours)   { timeString += hours + 'h'; }
  if (minutes) { timeString += (timeString ? ' ' : '') + minutes + 'm'; }
  if (seconds) { timeString += (timeString ? ' ' : '') + seconds + 's'; }
  return timeString;
}

/*
  video_library_getSnippet accepts an
  HTML string and returns a snippet of the
  text contained within the given HTML as a
  string.
*/
function video_library_getSnippet (text) {
  return text.length <= video_library_SNIPPET_LENGTH ? text :
    text.substr (0, video_library_SNIPPET_LENGTH) + '...';
}

/*
  Accepts one argument: html, an HTML string;
  and returns a new string in which all HTML
  tags have been removed.
*/
function video_library_stripHTMLTags (html) {
  return html.replace (/<[^>]*>/g, '');
}

/*
  Accepts one argument: url, a absolute or
  relative URL string; and returns a url if it
  is an absolute URL or an absolute version of
  URL relative to the current URL.
*/
function video_library_toAbsoluteURL (url) {
  return new URI (url).absoluteTo (new URI ()).toString ();
}
