'use strict';

// Load Firefox based resources
var self          = require('sdk/self'),
    data          = self.data,
    sp            = require('sdk/simple-prefs'),
    prefs         = sp.prefs,
    pageMod       = require('sdk/page-mod'),
    tabs          = require('sdk/tabs'),
    timers        = require('sdk/timers'),
    array         = require('sdk/util/array'),
    unload        = require('sdk/system/unload'),
    {Panel}       = require('sdk/panel'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {on, off, once, emit} = require('sdk/event/core'),
    {all, defer, race, resolve}  = require('sdk/core/promise'),
    config        = require('../config');

exports.globals = {
  browser: 'firefox'
};

// Promise
exports.Promise = function (callback) {
  let d = defer();
  callback(d.resolve, d.reject);
  return d.promise;
};
exports.Promise.defer = defer;
exports.Promise.all = all;
exports.Promise.race = race;
exports.Promise.resolve = resolve;

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  let button = new ToggleButton({
    id: self.name,
    label: 'SoundCloud Controls',
    badgeColor: '#a8a8a8',
    icon: {
      '16': './icons/16.png',
      '32': './icons/32.png',
      '64': './icons/64.png'
    },
    onChange: function (state) {
      if (state.checked) {
        exports.popup.show(button);
      }
    }
  });
  return {
    state: (options) => button.state('window', options),
    set label (val) { // jshint ignore:line
      button.label = val;
    },
    set badge (val) { // jshint ignore:line
      button.badge = val;
    }
  };
})();

exports.popup = (function () {
  let popup = new Panel({
    contentURL: data.url('./popup/index.html'),
    contentScriptFile: [
      data.url('./popup/firefox/firefox.js'),
      data.url('./popup/index.js')
    ]
  });
popup.on('hide', () => exports.button.state({checked: false}));
  return {
    show: (position) => popup.show({
      width: 500,
      height: 160,
      position
    }),
    hide: () => popup.hide(),
    send: (id, data) => popup.port.emit(id, data),
    receive: (id, callback) => popup.port.on(id, callback)
  };
})();

exports.inject = (function () {
  let workers = [], callbacks = [];
  pageMod.PageMod({
    include: ['https://soundcloud.com/*', 'https://soundcloud.com/*'],
    contentScriptFile: [
      data.url('./content_script/firefox/firefox.js'),
      data.url('./content_script/inject.js')
    ],
    contentScriptWhen: 'start',
    attachTo: ['top', 'existing'],
    contentScriptOptions: {
      base: data.url('.')
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', () => array.add(workers, worker));
      worker.on('pagehide', () => array.remove(workers, worker));
      worker.on('detach', () => array.remove(workers, worker));
      callbacks.forEach((arr) => worker.port.on(arr[0], (data) => arr[1](data, worker.tab.id)));
    }
  });
  return {
    send: function (id, data, tab) {
      workers.forEach((worker) => worker.tab.id === tab && worker.port.emit(id, data));
    },
    receive: function (id, callback) {
      callbacks.push([id, callback]);
      workers.forEach(function (worker) {
        worker.port.on(id, (data) => callback(data, worker.tab.id));
      });
    }
  };
})();

exports.storage = {
  read: (id) => prefs[id],
  write: (id, data) => prefs[id] = data
};

exports.tab = {
  open: (url) => tabs.open({url}),
  onClose: (c) => tabs.on('close', (tab) => c(tab.id))
};

exports.version = () => self.version;

exports.timers = timers;

//startup
exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};
