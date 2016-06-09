'use strict';

var app = app || require('./firefox/firefox');
var config = config || require('./config');

/* definitions */
var state = {};

var controls = {
  active: function () {
    let tabs = Object.keys(state);
    return tabs.length ? tabs.filter(n => state[n].play)[0] || tabs[0] : undefined;
  },
  isPlaying: () => Object.keys(state).reduce((p, c) => p || state[c].play, false),
  calcBadge: () => state[controls.active()].badge,
  act: (cmd, value) => app.inject.send(cmd, value, controls.active())
};

function update (name, value, id) {
  state[id] = state[id] || {
    play: false,
    volume: 50,
    progress: {
      now: 0,
      max: 60000
    },
    badge: {
      title: '',
      context: '',
      image: '',
      like: false
    }
  };
  state[id][name] = value;
  if (name === 'play') {
    let play = controls.isPlaying();
    app.popup.send('play', play);
    app.popup.send('badge', controls.calcBadge());
    app.button.badge = play ? 'p' : '';
  }
  else if (name === 'badge') {
    let tmp = controls.calcBadge();
    app.popup.send('badge', tmp);
    if (tmp.title) {
      app.button.label = `SoundCloud Controls\n\n${tmp.context}\n${tmp.title}`;
    }
  }
  else {
    app.popup.send(name, value);
  }
}

app.tab.onClose(id => {
  delete state[id];
  if (Object.keys(state).length === 0) {
    app.popup.send('disconnected');
    app.button.label = 'SoundCloud Controls';
  }
});

/* content script */
app.inject.receive('volume', update.bind(null, 'volume'));
app.inject.receive('progress', update.bind(null, 'progress'));
app.inject.receive('play', update.bind(null, 'play'));
app.inject.receive('badge', update.bind(null, 'badge'));

/* popup */
app.popup.receive('cmd', (cmd) =>  controls.act(cmd));
app.popup.receive('progress', (val) => controls.act('progress', val));
app.popup.receive('volume', (val) => controls.act('volume', val));
app.popup.receive('open', () => {
  app.tab.open('http://soundcloud.com/');
  app.popup.hide();
});
app.popup.receive('show', function () {
  let name = controls.active();
  if (name) {
    app.popup.send('volume', state[name].volume);
    app.popup.send('progress', state[name].progress);
    app.popup.send('play', controls.isPlaying());
    app.popup.send('badge', controls.calcBadge(name));
  }
});

/* welcome page */
app.startup(function () {
  let version = config.welcome.version;
  if (false && app.version() !== version) {
    app.timers.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/soundcloud.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
