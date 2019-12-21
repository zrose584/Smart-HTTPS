/*
 * Copyright 2019 ilGur Petter
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var config = {};

config.addon = {
  set state (val) {app.storage.write("state", val)},
  set regexp (val) {app.storage.write('regexp', val)},
  set incognito (val) {app.storage.write('incognito', val)},
  set uinsecurer (val) {app.storage.write('uinsecurer', val)},
  set dwhitelisting (val) {app.storage.write('dwhitelisting', val)},
  set typemissmatch (val) {app.storage.write('typemissmatch', val)},
  get regexp () {return app.storage.read('regexp') !== undefined ? app.storage.read('regexp') : false},
  get state () {return app.storage.read("state") !== undefined ? app.storage.read("state") : "enabled"},
  get incognito () {return app.storage.read('incognito') !== undefined ? app.storage.read('incognito') : false},
  get uinsecurer () {return app.storage.read('uinsecurer') !== undefined ? app.storage.read('uinsecurer') : false},
  get dwhitelisting () {return app.storage.read('dwhitelisting') !== undefined ? app.storage.read('dwhitelisting') : false},
  get typemissmatch () {return app.storage.read('typemissmatch') !== undefined ? app.storage.read('typemissmatch') : false}
};

config.log = {
  set print (val) {app.storage.write('logPrint', val)},
  set fullurl (val) {app.storage.write('logFullUrl', val)},
  get print () {return app.storage.read('logPrint') !== undefined ? app.storage.read('logPrint') : false},
  get fullurl () {return app.storage.read('logFullUrl') !== undefined ? app.storage.read('logFullUrl') : false}
};

config.xhr = {
  get timeout () {return app.storage.read("xhrTimeout") !== undefined ? app.storage.read('xhrTimeout') : 3000},
  set timeout (val) {
    if (!val || isNaN(val)) val = 3000;
    val = parseInt(val);
    if (val < 0) val = 3000;
    if (val > 30000) val = 30000;
    app.storage.write("xhrTimeout", val);
  }
};

config.max = {
  get value () {return app.storage.read("maxValue") !== undefined ? app.storage.read("maxValue") : 50},
  set value (val) {
    if (!val || isNaN(val)) val = 50;
    val = parseInt(val);
    if (val < 0) val = 0;
    if (val > 1000) val = 1000;
    app.storage.write("maxValue", val);
    /*  */
    config.http.object = config.http.object;
    config.https.object = config.https.object;
  }
};

config.filter = function (o) {
  var size = 0, maxSize = config.max.value;
  for (var m in o) {if (o.hasOwnProperty(m)) size++}
  if (size >= 0 && maxSize >= 0) {
    while (size > maxSize) {
      for (var m in o) {
        delete o[m];
        size--;
        break;
      }
    }
  }
  /*  */
  return o;
};

config.http = {
  get object () {return app.storage.read("httpObject") !== undefined ? JSON.parse(app.storage.read('httpObject')) : {}},
  set object (o) {
    var tmp = config.filter(o);
    app.storage.write('httpObject', JSON.stringify(tmp));
  },
  "proxy": new Proxy({}, {
    "get": function (target, name, receiver) {
      if (config.addon.regexp) {
        for (var id in core.stack.http) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return core.stack.http[id];
        }
      }
      return core.stack.http[name];
    },
    "set": function (target, name, value) {
      if (config.addon.regexp) {
        for (var id in core.stack.http) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return core.stack.http[id] = value;
        }
      }
      core.stack.http[name] = value;
    },
    "deleteProperty": function (target, name) {
      if (config.addon.regexp) {
        for (var id in core.stack.http) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return delete core.stack.http[id];
        }
      }
      delete core.stack.http[name];
    }
  })
};

config.https = {
  get object () {return (app.storage.read("httpsObject") ? JSON.parse(app.storage.read('httpsObject')) : {})},
  set object (o) {
    var tmp = config.filter(o);
    app.storage.write('httpsObject', JSON.stringify(tmp));
  },
  "proxy": new Proxy({}, {
    "get": function (target, name, receiver) {
      if (config.addon.regexp) {
        for (var id in core.stack.https) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return core.stack.https[id];
        }
      }
      return core.stack.https[name];
    },
    "set": function (target, name, value) {
      if (config.addon.regexp) {
        for (var id in core.stack.https) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return core.stack.https[id] = value;
        }
      }
      core.stack.https[name] = value;
    },
    "deleteProperty": function (target, name) {
      if (config.addon.regexp) {
        for (var id in core.stack.https) {
          var exp = new RegExp(id);
          var result = exp.test(name);
          if (result) return delete core.stack.https[id];
        }
      }
      delete core.stack.https[name];
    }
  })
};
