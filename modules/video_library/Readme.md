Video Library
=============

Global Variables
----------------

```javascript
var video_library_SNIPPET_LENGTH = 500;

var video_library_DATABASE_URL = 'modules/video_library/database.xml';

var video_library_DATABASE = {};
```

Load Event Handler
------------------

```javascript
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

        // III. Register the module's block handler.
        block_HANDLERS.addHandlers ({
          'video_library_description_block': video_library_descriptionBlock,
          'video_library_menu_block':        video_library_menuBlock,
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
```

Block Handlers
--------------

```javascript
function video_library_descriptionBlock (context, done) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true},
      {'name': 'video_library_default_text', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var next = function (descriptionElement) {
        context.element.replaceWith (descriptionElement);
        done (null, descriptionElement);
      }

      var defaultText = blockArguments.video_library_default_text;
      if (!defaultText) {
        defaultText = '<p><em>No description available.</em></p>';
      }

      var libraryId   = blockArguments.video_library_library_id;
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE [libraryName];
      if (!library) {
        var error = new Error ('[video_library][video_library_descriptionBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var playerId = blockArguments.video_library_player_id;
      var descriptionElement = library.createDescriptionElement (playerId, defaultText, videoURL);

      context.element.replaceWith (descriptionElement);
      done (null, descriptionElement);
  });
}

function video_library_menuBlock (context, done) {
  getBlockArguments ([
      {'name': 'video_library_player_id',  'text': true, 'required': true},
      {'name': 'video_library_library_id', 'text': true, 'required': true}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var libraryId   = blockArguments.video_library_library_id;
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE [libraryName];
      if (!library) {
        var error = new Error ('[video_library][video_library_menuBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var playerId = blockArguments.video_library_player_id;
      var menuElement = library.createMenuElement (playerId, videoURL);

      context.element.replaceWith (menuElement);
      done (null, menuElement);
  });
}

function video_library_playerBlock (context, done) {
  getBlockArguments ([
      {'name': 'video_library_player_id',        'text': true, 'required': true},
      {'name': 'video_library_default_video_id', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var playerId = blockArguments.video_library_player_id;

      var videoElement = $('<video></video>')
        .attr     ('id', playerId)
        .addClass ('video-js')
        .addClass ('vjs-default-skin')
        .attr     ('controls', 'controls')
        .attr     ('width', '100%')
        .attr     ('height', '400px');

      var playerElement = $('<div></div>')
        .addClass ('video_player_block')
        .append (videoElement);

      var videoId   = blockArguments.video_library_default_video_id;
      var videoPath = video_library_getPath (videoId);
      var videoURL  = video_library_getVideoURL (videoPath);
      if (videoURL) {
        videoElement.append ($('<source></source>').attr ('src', videoURL));
      }

      context.element.replaceWith (playerElement);
      done (null, playerElement);
  });
}

function video_library_titleBlock (context, done, expand) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var libraryId   = blockArguments.video_library_library_id;
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE [libraryName];
      if (!library) {
        var error = new Error ('[video_library][video_library_titleBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var video = videoURL ? library.getVideo (videoURL) : null;

      var title = video ? video.title : library.title;

      var titleElement = $('<span></span>').addClass ('video_library_title').html (title);

      var playerId = blockArguments.video_library_player_id;
      video_registerLoadHandler (playerId,
        function (player) {
          player.on ('loadeddata',
            function () {
              var video = library.getVideo (player.currentSrc ());
              titleElement.html (video.title);
              expand (titleElement, function () {});
          });
      });

      context.element.replaceWith (titleElement);
      done (null, titleElement);
  });
}

function video_library_transcriptBlock (context, done, expand) {
  getBlockArguments ([
      {'name': 'video_library_player_id',    'text': true, 'required': true},
      {'name': 'video_library_library_id',   'text': true, 'required': true},
      {'name': 'video_library_default_text', 'text': true, 'required': false}
    ], context.element,
    function (error, blockArguments) {
      if (error) { return done (error); }

      var next = function (transcriptElement) {
        context.element.replaceWith (transcriptElement);
        success (transcriptElement);
      }

      var defaultText = blockArguments.video_library_default_text;
      if (!defaultText) {
        defaultText = '<p><em>No transcript available.</em></p>';
      }

      var libraryId   = blockArguments.video_library_library_id;
      var libraryPath = video_library_getPath (libraryId);
      var libraryName = video_library_getLibraryName (libraryPath);
      var library = video_library_DATABASE [libraryName];
      if (!library) {
        var error = new Error ('[video_library][video_library_transcriptBlock]');
        strictError (error);
        return done (error);
      }

      var videoURL = video_library_getVideoURL (libraryPath);

      var playerId = blockArguments.video_library_player_id;
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
```

Search Source
-------------

```javascript
/*
*/
function video_library_searchSource (libraryName, done) {
  var set = [];
  var library = video_library_DATABASE [libraryName];
  if (!library) {
    var error = new Error ('[video_library][video_library_searchSource]');
    strictError (error);
    return done (error);
  }
  library.getAllVideos ().forEach (
    function (video) {
      set.push (new video_library_VideoEntry (
          video.id,
          $('<div>' + video.title + '</div>').text (),
          $('<div>' + video.description + '</div>').text ()
      ));
  });
  done (null, set);
}

/*
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
```

Videos
------

```javascript
function video_library_Video (id, url, title, description, duration, transcriptURL) {
  this.id            = id;
  this.url           = url;
  this.title         = title;
  this.description   = description;
  this.duration      = duration;
  this.transcriptURL = transcriptURL;
}

video_library_Video.prototype.createMenuItemElement = function (playerId, videoURL, libraryName, libraryMenuElement) {
  var element = $('<li></li>')
    .addClass ('video_library_video')
    .append ($('<a></a>')
      .attr ('href', '#' + this.id)
      .append ($('<h4></h4>')
        .addClass ('video_library_title')
        .addClass ('video_library_video_title')
        .html (this.title + '<span class="video_library_time">' + video_library_timeToString (this.duration) + '</span>')));

  if (this.url === videoURL) {
    element.addClass ('video_library_selected');
  }

  // var self = this;
  element.click (
    function (event) {
      // Prevent the parent element's onclick event handler from firing.
      event.stopPropagation ();

      // Deselect the currently selected element.
      $('.video_library_selected', libraryMenuElement).removeClass ('video_library_selected');

      // Select the current element.
      element.addClass ('video_library_selected');

      video_registerLoadHandler (playerId,
        function (player) {
          if (player) {
            // Play the video URL in the player.
            // player.pause ();
            // player.src (self.url);
          };
      });
  });

  return element;
}

video_library_Video.prototype.createDescriptionContent = function () {
  return '<div><div>' + this.title + '</div><div>' + this.description + '</div></div>';
}

function video_library_parseVideo (collectionPath, videoElement) {
  var url  = $('> url', videoElement).text ();
  var path = collectionPath.concat (url);
  return new video_library_Video (
    video_library_createId (path),
    url,
    $('> title', videoElement).text (),
    $('> description', videoElement).text (),
    video_library_convertToSeconds ($('> duration', videoElement).text ()),
    $('> transcript', videoElement).text ()
  );
}

function video_library_videosMenuItemElements (playerId, videoURL, libraryName, libraryMenuElement, videos) {
  return videos.map (
    function (video) {
      return video.createMenuItemElement (playerId, videoURL, libraryName, libraryMenuElement)
  });
}
```

Collections
-----------

```javascript
function video_library_Collection (id, name, title, description, collections, videos) {
  this.id          = id;
  this.name        = name;
  this.title       = title;
  this.description = description;
  this.collections = collections;
  this.videos      = videos;
}

video_library_Collection.prototype.createMenuItemElement = function (playerId, videoURL, libraryName, libraryMenuElement) {
  var item = $('<li></li>')
    .addClass ('video_library_collection')
    .addClass ('video_library_expanded')
    .append ($('<h3></h3>')
      .addClass ('video_library_title')
      .addClass ('video_library_collection_title')
      .html (this.title + '<span class="video_library_time">' + video_library_timeToString (this.getDuration ()) + '</span>'))
    .append ($('<div></div>')
      .addClass ('video_library_description')
      .addClass ('video_library_collection_description')
      .html (this.description));

  var contents = $('<ol></ol>')
    .append (video_library_collectionsMenuItemElements (playerId, videoURL, libraryName, libraryMenuElement, this.collections))
    .append (video_library_videosMenuItemElements (playerId, videoURL, libraryName, libraryMenuElement, this.videos));

  item.append (contents);

  item.click (
    function (event) {
      item.toggleClass ('video_library_expanded');
      contents.slideToggle ();
  });

  return item;
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

function video_library_collectionsMenuItemElements (playerId, videoURL, libraryName, libraryMenuElement, collections) {
  return collections.map (
    function (collection) {
      return collection.createMenuItemElement (playerId, videoURL, libraryName, libraryMenuElement);
  });
}
```

Video Libraries
---------------

```javascript
function video_library_Library (id, name, title, description, collections, videos) {
  video_library_Collection.call (this, id, name, title, description, collections, videos);
}

video_library_Library.prototype = Object.create (video_library_Collection.prototype);

video_library_Library.prototype.createMenuElement = function (playerId, videoURL) {
  var libraryMenuElement = $('<div></div>')
    .addClass ('video_library_menu')
    .append ($('<h2></h2>')
      .addClass ('video_library_title')
      .addClass ('video_library_library_title')
      .html (this.title))
    .append ($('<div></div>')
      .addClass ('video_library_description')
      .addClass ('video_library_library_description')
      .html (this.description));

  libraryMenuElement.append ($('<ol></ol>')
    .append (video_library_collectionsMenuItemElements (playerId, videoURL, this.name, libraryMenuElement, this.collections))
    .append (video_library_videosMenuItemElements (playerId, videoURL, this.name, libraryMenuElement, this.videos)));

  return libraryMenuElement;
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
              function (captions) {
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
      var error = new Error ('[video_library][video_library_Library.createTranscriptElement]');
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
```

Video Library Database
----------------------

```javascript
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

function video_library_parseDatabase (databaseElement) {
  var database = {};
  $('database > library', databaseElement).each (
    function (i, libraryElement) {
      var library = video_library_parseLibrary (libraryElement);
      database [library.name] = library;
  });

  return database;
}
```

Captions
--------

```javascript
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
```

Transcripts
-----------

```javascript

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
```

Example Video Library Database
------------------------------

Video libraries are defined using XML documents. These documents list the videos contained within a library hierarchically. An example library document can be found here: [database.xml.example](#Example Video Library Database "save:").

```xml
<?xml version="1.0" encoding="utf-8" ?>
<!--
  Navigate to: #video_library_page/example_library/example_collection/http:%2F%2Fvjs.zencdn.net%2Fv%2Foceans.mp4
  to view the example video.
-->
<database>
  <library>
    <name>example_library</name>
    <title>Example Library</title>
    <description>This is an example library.</description>
    <collection>
      <name>example_collection</name>
      <title>Example Collection</title>
      <description>This is an example collection.</description>
      <video>
	<title>Example Video</title>
	<description><![CDATA[This is an example video.]]></description>
	<duration>00:00:00</duration>
        <url>http://vjs.zencdn.net/v/oceans.mp4</url>
        <transcript>example/transcript.xml</transcript>
      </video>
    </collection>
  </library>
</database>
```

The Video Library Database Schema
---------------------------------

Video Library Documents must conform to the following XML schema. The schema can be found here: [database.xsd](#The Video Library Database Schema "save:").

```xml
<?xml version="1.0" encoding="utf-8" ?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- Defines the root library element. -->
  <xs:element name="library">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="name" type="xs:string" minOccurs="1" maxOccurs="1" />
        <xs:element name="title" type="xs:string" minOccurs="1" maxOccurs="1" />
        <xs:element name="description" type="xs:string" minOccurs="0" maxOccurs="1"/>
        <xs:element name="collection" type="collectionType" minOccurs="0" maxOccurs="unbounded" />
        <xs:element name="video" type="videoType" minOccurs="0" maxOccurs="unbounded" />
      </xs:sequence>
    </xs:complexType>
  </xs:element>

  <!-- Defines the collection type. -->
  <xs:complexType name="collectionType">
    <xs:sequence>
      <xs:element name="title" type="xs:string" minOccurs="1" maxOccurs="1" />
      <xs:element name="description" type="xs:string" minOccurs="0" maxOccurs="1"/>
      <xs:element name="collection" type="collectionType" minOccurs="0" maxOccurs="unbounded" />
      <xs:element name="video" type="videoType" minOccurs="0" maxOccurs="unbounded" />
    </xs:sequence>
  </xs:complexType>

  <!-- Defines the video type. -->
  <xs:complexType name="videoType">
    <xs:sequence>
      <xs:element name="title" type="xs:string" minOccurs="1" maxOccurs="1" />
      <xs:element name="description" type="xs:string" minOccurs="0" maxOccurs="1"/>
      <xs:element name="duration" type="xs:time"/>
      <xs:element name="url" type="xs:anyURI" />
    </xs:sequence>
  </xs:complexType>
</xs:schema>
```

Video & Library ID Functions
----------------------------

```javascript
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
  return videoPath.length < 2 ? null : videoPath [videoPath.length - 1];
}
```

Auxiliary Functions
-------------------

```javascript
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
```

Generating Source Files
-----------------------

You can generate this module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming "Readme.md"`
from the command line.

<!---
### video_library.js
```
_"Global Variables"

_"Load Event Handler"

_"Block Handlers"

_"Search Source"

_"Videos"

_"Collections"

_"Video Libraries"

_"Video Library Database"

_"Captions"

_"Transcripts"

_"Video & Library ID Functions"

_"Auxiliary Functions"

```
[video_library.js](#video_library.js "save:")
-->
