'use strict';

var app = new EventEmitter();

app.once('load', function () {
  let script = document.createElement('script');
  document.body.appendChild(script);
  script.src = 'lib/background.js';
});

app.Promise = Promise;

app.storage = (function () {
  let objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: (id) => objs[id],
    write: (id, data) => {
      objs[id] = data;
      let tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.button = (function () {
  let onCommand = function () {};
  chrome.browserAction.onClicked.addListener(onCommand);
  chrome.browserAction.setBadgeBackgroundColor({
    color: [0, 0, 0, 10]
  });

  return {
    onCommand: (c) => onCommand = c,
    set icon (root) { // jshint ignore: line
      chrome.browserAction.setIcon({
        path: {
          '16': '../../data/' + root + '/16.png',
          '32': '../../data/' + root + '/32.png'
        }
      });
    },
    set label (title) { // jshint ignore: line
      chrome.browserAction.setTitle({title});
    },
    set badge (val) { // jshint ignore: line
      chrome.browserAction.setBadgeText({
        text: (val ? val : '') + ''
      });
    }
  };
})();

app.popup = {
  hide: function () {},
  send: (method, data) => chrome.extension.sendRequest({method, data}),
  receive: (id, callback) => chrome.extension.onRequest.addListener(function (request, sender) {
    if (request.method === id && !sender.tab) {
      callback(request.data);
    }
  })
};

app.inject = (function () {
  return {
    send: (method, data, id) => chrome.tabs.sendMessage(+id, {method, data}, function () {}),
    receive: (id, callback) => chrome.runtime.onMessage.addListener(
      (msg, sndr) => msg.method === id && sndr.tab && sndr.tab.id && callback.call(sndr.tab, msg.data, sndr.tab.id)
    )
  };
})();

app.tab = {
  open: (url) => chrome.tabs.create({url, active: true}),
  onClose: (c) => chrome.tabs.onRemoved.addListener((id) => c(id))
};

app.notification = (title, message) => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: chrome.extension.getURL('./') + 'data/icons/48.png',
  title,
  message
}, function () {});

app.version = () => chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;

app.timers = window;

app.startup = (function () {
  let loadReason, callback = function () {};
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      callback();
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return (c) => {
    callback = c;
    check();
  };
})();
