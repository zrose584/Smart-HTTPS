/*
 * Copyright 2019 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var core = {
  "stack": {"http": {}, "https": {}},
  "handler": {
    "xhr": function (top, details) {
      var err = {};
      var headrequest = function (url, details, callback) {
        var xhr = app.XMLHttpRequest();
        xhr.timeout = config.xhr.timeout; // xhr timeout in milliseconds
        xhr._details = details;
        try {
          xhr.onreadystatechange = function () {
            if (xhr && xhr.readyState === 4) {
              if (xhr.status >= 400 || xhr.status < 200) {
                if (xhr.status === 0) callback({"error": '', "details": xhr._details}); /* no head support */
                else callback({"error": ('net::ERR_XHR_STATUS_' + xhr.status), "details": xhr._details});
              } else { /* if the response URL is HTTP, we still have the error */
                if (/^http:\/\//i.test(xhr.responseURL)) callback({"error": 'net::ERR_XHR_REDIRECT', "details": xhr._details});
                else callback({"error": '', "details": xhr._details});
              }
            }
          };
          xhr.open('HEAD', url, true);
          xhr.onerror = function () {callback({"error": 'net::ERR_XHR_ERROR', "details": xhr._details})};
          xhr.ontimeout = function () {callback({"error": 'net::ERR_XHR_TIMEOUT', "details": xhr._details})};
          xhr.send('');
        } catch (e) {callback({"error": 'net::ERR_XHR_TRYCATCH', "details": xhr._details})}
      };
      /*  */
      headrequest(top, details, function (o) {
        if (o.error) {
          if (!err[top]) {
            err[top] = true;
            core.handler.error(o.error, o.details, true);
          }
        }
      });
    },
    "error": function (error, details, force, host) {
      var top = details.url;
      var domain = host ? host : app.toHostname(top);
      if (domain) {
        core.stack.https = config.https.object;
        if (!config.https.proxy[domain]) {
          if (error.indexOf("::ERR_") !== -1) {
            core.stack.http = config.http.object;
            /* if the error for this domain is yet not handled */
            if (config.http.proxy[domain] && !config.http.proxy[domain].error) {
              try {
                window.setTimeout(function () {
                  app.tabQuery(details, function (tab) {
                    if (tab) {
                      if (force || /^https:\/\//i.test(details.url)) {
                        config.http.proxy[domain].error = true;
                        config.http.proxy[domain].incognito = tab.incognito;
                        config.http.object = core.stack.http;
                        if (config.log.print) console.error(error + " - Reverting back to HTTP: ", config.http.proxy[domain].url);
                        app.tab.update(tab, config.http.proxy[domain].url, false);
                      }
                    } else if (config.log.print) console.error(" - Couldn't find tab with url: ", details.url);
                  });
                }, 0);
              } catch (e) {
                if (config.log.print) console.error(" - Unknown Error!");
              }
            }
          }
          else {
            if (config.log.print) console.error(" - NEW error ", error);
          }
        }
        else {
          if (config.log.print) console.error(error + " - NOT reverting back to HTTP (forced HTTPS)");
        }
      }
      else {
        if (config.log.print) console.error(" - Invalid Domain: ", domain);
      }
    }
  }
};

app.onBeforeRequest(function (details) {
  var top = details.url;
  if (/^http:\/\//i.test(top)) {
    var newURL = top.replace(/^http:\/\//i, 'https://');
    core.stack.http = config.http.object;
    core.stack.https = config.https.object;
    var domain = app.toHostname(top);
    /*  */
    if (!config.http.proxy[domain]) {
      if (!config.https.proxy[domain]) {
        config.http.proxy[domain] = {"url": top, "error": false, "smart": true};
        config.http.object = core.stack.http;
        if (config.log.print) console.error(" - Smart switch to HTTPS: ", newURL);
      } else {
        if (config.log.print) console.error(" - Forced load in HTTPS: ", newURL);
      }
      core.handler.xhr(newURL, details); /* check for response errors */
      return {"redirectUrl": newURL}
    }
  }
  /*  */
  return;
});

app.onHeadersReceived(function (domain, details) {
  if (config.addon.typemissmatch) {
    if (/^http:\/\//i.test(details.url)) {
      if (config.http.proxy[domain]) {
        if (!config.http.proxy[domain].error) {
          core.handler.error("net::ERR_TYPE_MISMATCH", details, true, domain);
        }
      }
    }
  }
  /*  */
  if (config.addon.uinsecurer) {
    if (/^https:\/\//i.test(details.url)) {
      if (details.type === "main_frame" || details.type === "sub_frame") {
        var responseHeaders = details.responseHeaders;
      	for (var i = 0; i < responseHeaders.length; i++) {
          var name = responseHeaders[i].name.toLowerCase();
      		if (name === 'content-security-policy') {
      			if (typeof responseHeaders[i].value === 'string') {
      				if (responseHeaders[i].value.search('upgrade-insecure-requests') === -1) {
      					responseHeaders[i].value += '; upgrade-insecure-requests';
                if (config.log.print) console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain, responseHeaders);
                return {"responseHeaders": responseHeaders};
              }
            }
          }
      	}
        /*  */
      	responseHeaders.push({"name": 'Content-Security-Policy', "value": 'upgrade-insecure-requests'});
        if (config.log.print) console.error(" - Add Upgrade-Insecure-Requests to CSP for", domain, responseHeaders);
      	return {"responseHeaders": responseHeaders};
      }
    }
  }
});

app.onCompleted(function (e) {
  var check = function (details) {
    var top = details.url;
    var domain = app.toHostname(top);
    var msg1 = " - HTTPS is OK (" + domain + "), cleaning whitelist table";
    var msg2 = " - HTTPS had Error (" + domain + "), but removed from whitelist because whitelisting is disabled";
    var msg3 = " - (" + domain + ") is added manually (either through toolbar popup or options page), whitelist table is not changed";
    var msg4 = " - HTTPS had Error (" + domain + "), but removed from whitelist because incognito mode (private browsing) is enabled";
    var _clean = function (domain, msg) {
      if (config.http.proxy[domain].smart === true) {
        delete config.http.proxy[domain];
        config.http.object = core.stack.http;
        if (config.log.print) console.error(msg);
      } else if (config.log.print) console.error(msg3);
    };
    /*  */
    core.stack.http = config.http.object;
    core.stack.https = config.https.object;
    if (config.http.proxy[domain]) {
      if (!details.error || config.https.proxy[domain]) {
        var flag = /^https:\/\//i.test(details.url) && !config.http.proxy[domain].error;
        if (flag) _clean(domain, msg1);
        else if (config.addon.dwhitelisting) _clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) _clean(domain, msg4);
      }
      else if (details.error) {
        if (config.addon.dwhitelisting) _clean(domain, msg2);
        else if (config.http.proxy[domain].incognito && config.addon.incognito) _clean(domain, msg4);
      }
    }
  };
  /* prevent re-direct error */
  window.setTimeout(function () {check(e)}, 1500);
});

core.stack.http = config.http.object;
core.stack.https = config.https.object;
