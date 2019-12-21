/*
 * Copyright 2019 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var toolbaricon = function (state) {
  app.button.label = "Smart HTTPS is " + state.toUpperCase();
  app.button.icon = {
    "path": {
      "16": '../../data/icons/' + (state ? state + '/' : '') + '16.png',
      "32": '../../data/icons/' + (state ? state + '/' : '') + '32.png',
      "48": '../../data/icons/' + (state ? state + '/' : '') + '48.png',
      "64": '../../data/icons/' + (state ? state + '/' : '') + '64.png'
    }
  };
};

var optionssend = function () {
  app.options.send("retrieve-data", {
    "max": config.max.value,
    "regexp": config.addon.regexp,
    "fullurl": config.log.fullurl,
    "timeout": config.xhr.timeout,
    "consolelog": config.log.print,
    "httpObject": config.http.object,
    "httpsObject": config.https.object,
    "incognito": config.addon.incognito,
    "uinsecurer": config.addon.uinsecurer,
    "dwhitelisting": config.addon.dwhitelisting,
    "typemissmatch": config.addon.typemissmatch
  });
};

app.options.receive("max-table-items", function (i) {
  if (i) {
    config.max.value = i;
    optionssend();
  }
});

app.options.receive("store-https-data", function (o) {
  if (o) {
    config.https.object = o;
    core.stack.https = config.https.object;
    optionssend();
  }
});

app.options.receive("store-http-data", function (o) {
  if (o) {
    config.http.object = o;
    core.stack.http = config.http.object;
    optionssend();
  }
});

app.options.receive("timeout", function (o) {
  if (o) {
    config.xhr.timeout = o;
    optionssend();
  }
});

app.options.receive("regexp", function (flag) {
  config.addon.regexp = flag;
  optionssend();
});

app.options.receive("dwhitelisting", function (flag) {
  for (var id in core.stack.http) {
    if (core.stack.http[id].smart === true) {
      delete core.stack.http[id];
    }
  }
  /*  */
  config.http.object = core.stack.http;
  config.addon.dwhitelisting = flag;
  optionssend();
});

app.options.receive("incognito", function (flag) {
  for (var id in core.stack.http) {
    if (core.stack.http[id].incognito === true) {
      delete core.stack.http[id];
    }
  }
  /*  */
  config.http.object = core.stack.http;
  config.addon.incognito = flag;
  optionssend();
});

app.options.receive("fullurl", function (flag) {
  config.log.fullurl = flag;
  optionssend();
});

app.options.receive("typemissmatch", function (flag) {
  config.addon.typemissmatch = flag;
  app.webRequest.init();
});

app.options.receive("uinsecurer", function (flag) {
  config.addon.uinsecurer = flag;
  app.webRequest.init();
});

app.popup.receive("type", function (type) {
  if (type === "controls") app.tab.openOptions();
  if (type === "support") app.tab.open(app.homepage());
  if (type === "donation") app.tab.open(app.homepage() + "?reason=support");
  if (type === "state") {
    config.addon.state = config.addon.state === 'disabled' ? 'enabled' : 'disabled';
    app.popup.send("storageData", config.addon.state);
    toolbaricon(config.addon.state);
    app.webRequest.init();
  }
  /*  */
  if (type === "whitelist") {
    app.tab.getActive(function (tab) {
      if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
        var OLD = tab.url.replace("https://", "http://");
        var domain = app.toHostname(OLD);
        /*  */
        core.stack.http = config.http.object;
        config.http.proxy[domain] = {"url": OLD, "error": true, "smart": false};
        config.http.object = core.stack.http;
        /*  */
        core.stack.https = config.https.object;
        delete config.https.proxy[domain];
        config.https.object = core.stack.https;
        /*  */
        app.tab.update(tab, OLD, true);
      }
    });
  }
  /*  */
  if (type === "blacklist") {
    app.tab.getActive(function (tab) {
      if (tab.url.indexOf("http://") === 0 || tab.url.indexOf("https://") === 0) {
        var OLD = tab.url.replace("http://", "https://");
        var domain = app.toHostname(OLD);
        /*  */
        core.stack.https = config.https.object;
        config.https.proxy[domain] = {"url": OLD, "error": true, "smart": false};
        config.https.object = core.stack.https;
        /*  */
        core.stack.http = config.http.object;
        delete config.http.proxy[domain];
        config.http.object = core.stack.http;
        /*  */
        app.tab.update(tab, OLD, true);
      }
    });
  }
});

app.webRequest.init();
app.options.receive("retrieve-data", optionssend);
window.setTimeout(function () {toolbaricon(config.addon.state)} ,300);
app.options.receive("consolelog", function (flag) {config.log.print = flag});
app.options.receive("open-homepage", function (flag) {config.welcome.open = flag});
app.popup.receive("storageData", function () {app.popup.send("storageData", config.addon.state)});
