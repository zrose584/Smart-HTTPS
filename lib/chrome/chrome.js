/*
 * Copyright 2019 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var app = {};

var onBeforeRequest, onHeadersReceived, onCompleted;

app.XMLHttpRequest = function () {return new XMLHttpRequest()};
app.version = function () {return chrome.runtime.getManifest().version};
app.homepage = function () {return chrome.runtime.getManifest().homepage_url};
chrome.runtime.setUninstallURL(app.homepage() + "?v=" + app.version() + "&type=uninstall", function () {});

app.button = {
  set icon (o) {chrome.browserAction.setIcon(o)},
  set label (e) {chrome.browserAction.setTitle({"title": e})}
};

app.tab = {
  "open": function (url) {chrome.tabs.create({"url": url, "active": true})},
  "openOptions": function () {chrome.runtime.openOptionsPage(function () {})},
  "update": function (tab, url, flag) {chrome.tabs.update(tab.id, {"url": url}, function () {})},
  "getActive": function (callback) {
    chrome.tabs.query({"currentWindow": true, "active": true}, function (tabs) {
      if (tabs && tabs.length) callback(tabs[0]);
    });
  }
};

chrome.runtime.onInstalled.addListener(function (e) {
  window.setTimeout(function () {
    if (e.reason === "install") {
      app.tab.open(app.homepage() + '?v=' + app.version() + "&type=" + e.reason);
    }
  }, 3000);
});

app.storage = (function () {
  var objs = {};
  window.setTimeout(function () {
    chrome.storage.local.get(null, function (o) {
      objs = o;
      var script = document.createElement("script");
      script.src = "../common.js";
      document.body.appendChild(script);
    });
  }, 300);
  /*  */
  return {
    "read": function (id) {return objs[id]},
    "write": function (id, data) {
      var tmp = {};
      tmp[id] = data;
      objs[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  }
})();

app.toHostname = function (url) {
  var s = url.indexOf("//") + 2;
  if (s > 1) {
    var o = url.indexOf('/', s);
    if (o > 0) return url.substring(s, o);
    else {
      o = url.indexOf('?', s);
      if (o > 0) return url.substring(s, o);
      else return url.substring(s);
    }
  } else return url;
};

app.tabQuery = function (details, callback) {
  if (details && details.tabId) {
    try {
      chrome.tabs.get(details.tabId, function (tab) {
        var _error = chrome.runtime.lastError;
        tab ? callback(tab) : callback(null);
      });
    } catch (e) {callback(null)}
  } else callback(null);
};

app.onBeforeRequest = function (callback) {
  onBeforeRequest = function (details) {
    if (details.type === 'main_frame') {
      return callback(details);
    }
  };
};

app.onHeadersReceived = function (callback) {
  var _domain = {};
  onHeadersReceived = function (details) {
    var id = details.tabId;
    if (details.type === 'main_frame') {
      _domain[id] = app.toHostname(details.url);
    }
    return callback(_domain[id], details);
  };
};

app.onCompleted = function (callback) {
  var _error = {}, _complete = {};
  onCompleted = function (details) {
    if (details.type === 'main_frame') {
      _complete[details.url] = true;
      _error[details.url] = details.error ? true : false;
      if (!config.addon.typemissmatch) return callback(details);
    }
  };
  /*  */
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (config.addon.state === "enabled") {
      if (changeInfo.status === "complete") {
        var _url = tab.url;
        if (_complete[_url]) {
          return callback({"url": _url, "error": _error[_url]});
        }
      }
    }
  });
};

app.webRequest = {
  "removeListener": {
    "onCompleted": function () {chrome.webRequest.onCompleted.removeListener(onCompleted)},
    "onBeforeRequest": function () {chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest)},
    "onHeadersReceived": function () {chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceived)}
  },
  "addListener": {
    "onCompleted": function () {chrome.webRequest.onCompleted.addListener(onCompleted, {"urls": ["http://*/*", "https://*/*"]})},
    "onBeforeRequest": function () {chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {"urls": ["http://*/*"]}, ["blocking"])},
    "onHeadersReceived": function () {chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, {"urls": ["http://*/*", "https://*/*"]}, ["blocking", "responseHeaders"])}
  },
  "init": function () {
    app.webRequest.removeListener.onCompleted();
    app.webRequest.removeListener.onBeforeRequest();
    app.webRequest.removeListener.onHeadersReceived();
    /*  */
    if (config.addon.state === "enabled") {
      app.webRequest.addListener.onCompleted();
      app.webRequest.addListener.onBeforeRequest();
      if (config.addon.typemissmatch || config.addon.uinsecurer) {
        app.webRequest.addListener.onHeadersReceived();
      }
    }
  }
};

app.popup = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === 'popup-to-background') {
          if (request.method === id) tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {tmp[id] = callback},
    "send": function (id, data, tabId) {
      chrome.runtime.sendMessage({"path": 'background-to-popup', "method": id, "data": data});
    }
  }
})();

app.options = (function () {
  var tmp = {};
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    for (var id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === 'options-to-background') {
          if (request.method === id) tmp[id](request.data);
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {tmp[id] = callback},
    "send": function (id, data, tabId) {
      chrome.runtime.sendMessage({"path": 'background-to-options', "method": id, "data": data});
    }
  }
})();
