Analytics Module
================

The Analytics module loads the Google Analytics library and tracks page visits across the site.

The module is defined by analytics.js. The file defines the module's load event handler which is responsible for loading the Google Analytics library and sending a Page View event to Google Analytics when the module is loaded.

The introduction to the file reads:

```javascript
/*
  The Analytics module uses Google Analytics to
  track page visits. The module loads the Google
  Analytics library and, once loaded, the Google
  Analytics library can be used to track additional
  events.
*/
```

The module's settings are stored in a local settings.xml file. When loaded, this module instantiates a Google Analytics Property Tracker. Settings.xml specifies the Google Analytics Property ID that this property tracker will be bound to.

The path to settings.xml is stored in a global variable:

```javascript
/*
  The Analytics Settings file defines the property
  Id and other parameters needed to connect to
  Google Analytics and track page visits.
*/
var analytics_SETTINGS_URL = 'modules/analytics/settings.xml';
```

The module's load event handler performs the following actions:

1. it loads configuration settings from settings.xml
2. it loads the Google Analytics library
3. it creates a property tracker and binds it to the property id given by settings.xml
4. and, it sends a Page Visit event notification to Google Analytics.

```javascript
/*
  The module's load event handler. This function
  loads the Google Analytics library and sends a
  page visit event to Google Analytics for the
  current page.
*/
MODULE_LOAD_HANDLERS.add (
  function (done) {
    // I. Load the configuration settings.
    analytics_loadSettings (analytics_SETTINGS_URL,
      function (error, settings) {
        if (error) {
          var error = new Error ('[analytics] Error: an error occured while trying to load the Analytics module.');
          strictError (error);
          done (null);
        }

        // II. Load Google Analytics.
        // Note: This code was taken verbatim from https://developers.google.com/analytics/devguides/collection/analyticsjs/.
        (function (i,s,o,g,r,a,m) {
          i['GoogleAnalyticsObject'] = r;
          i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push (arguments)
          },
          i[r].l = 1 * new Date ();

          a = s.createElement (o),
          m = s.getElementsByTagName (o) [0];

          a.async = 1;
          a.src = g;
          m.parentNode.insertBefore (a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

        // III. Create the Property Tracker. 
        ga('create', settings.pageVisitPropertyId, 'auto');

        // IV. Update the Page Visit count.
        ga('send', 'pageview');

        // V. Register a Page Load event handler that logs page view events.
        PAGE_LOAD_HANDLERS.add (
          function (id, done) {
            var url = getContentURL (id);
            ga ('set', 'page', url);
            ga ('send', 'pageview');
            done (null);
        });

        done (null);
    });
});
```

The load event handler calls `analytics_loadSettings` to load and parse settings.xml.

```javascript
/*
  analytics_loadSettings accepts two arguments:

  * url, a URL string
  * done, a function that accepts two arguments:
    an Error object and an Analytics Settings
    object

  analytics_loadSettings loads and parses the
  Analytics Settings document referenced by url and
  passes the result to done. If an error occurs,
  it passes an error to done instead.
*/
function analytics_loadSettings (url, done) {
  $.ajax (url, {
    dataType: 'xml',
    success: function (doc) {
      done (null, analytics_parseSettings (doc));
    },
    error: function (request, status, errorMsg) {
      var error = new Error ('[analytics][analytics_loadSettings] Error: an error occured while trying to load "' + url + '".');
      strictError (error);
      done (error);
    }
  });
}
```

`analytics_loadSettings`, in turn, calls `analytics_parseSettings` to parse settings.xml.

```javascript
/*
  analytics_parseSettings accepts an XML Document
  string that represents an Analytics Settings
  Document, parses the document, and returns the
  resulting Analytics Settings object.
*/
function analytics_parseSettings (doc) {
  return {
    pageVisitPropertyId: $('settings > pageVisitPropertyId', doc).text ()
  };
}
```

Analytics Settings Document Schema
----------------------------------

Analytics Settings Documents must conform to the following XML schema. This schema can be found here: [settings.xsd](#Analytics Settings Document Schema "save:").

```xml
<?xml version="1.0" encoding="utf-8" ?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <!-- Defines the root settings element. -->
  <xs:element name="settings">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="pageVisitPropertyId" type="xs:string" minOccurs="1" maxOccurs="1"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
``` 

Example Settings.xml
--------------------

An example settings.xml file is presented below. This example can be found here: [settings.xml.example](#Example Settings.xml "save:").

```xml
<?xml version="1.0" encoding="utf-8"?>           
<settings>  
  <pageVisitPropertyId>UA-64915387-1</pageVisitPropertyId>
</settings>
```

Generating Source Files
-----------------------

You can generate the Analytics module's source files using [Literate Programming](https://github.com/jostylr/literate-programming), simply execute:
`literate-programming Readme.md`
from the command line.

<!---
[analytics.js](#Analytics Module "save:")
-->
