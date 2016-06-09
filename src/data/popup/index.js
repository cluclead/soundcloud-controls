/* globals background */
'use strict';

var elements = {
  volume: document.querySelector('[type=volume]'),
  image: document.getElementById('img'),
  title: document.getElementById('ttl'),
  context: document.getElementById('context'),
  connect: document.getElementById('no-connect'),
  play: document.querySelector('[type=play]'),
  like: document.querySelector('[data-cmd=like]'),
  time: {
    now: document.getElementById('timer-remains'),
    max: document.getElementById('timer-total')
  },
  partial: {
    bar: document.querySelector('[type=partial]'),
    circle: document.querySelector('[type=range] span')
  },
  vControls: {
    bar: document.querySelector('[type=volume] [type=partial]'),
    circle: document.querySelector('[type=volume] span'),
  }
};

function mm2str (ms) {
  let mm = '00' + Math.floor(ms / 60000);
  let ss = '00' + Math.floor((ms % 60000) / 1000);

  return `${mm.substr(-2)} : ${ss.substr(-2)}`;
}
var cache = {
  progress: {}
};

var controls = {
  set progress (obj) {  // jshint ignore:line
    cache.progress = obj;
    let val = obj.now / obj.max * 100;
    elements.partial.bar.style.width = val + '%';
    elements.partial.circle.style.left = val + '%';

    elements.time.now.textContent = mm2str(obj.now);
    elements.time.max.textContent = mm2str(obj.max);
  },
  set play (val) { // jshint ignore:line
    elements.play.setAttribute('class', val ? 'icon-pause' : 'icon-play');
  },
  set volume (val) { // jshint ignore:line
    if (val === 0) {
      elements.volume.setAttribute('class', 'icon-volume-off');
    }
    else if (val < 50) {
      elements.volume.setAttribute('class', 'icon-volume-down');
    }
    else {
      elements.volume.setAttribute('class', 'icon-volume-up');
    }
    elements.vControls.bar.style.width = val + '%';
    elements.vControls.circle.style.left = val + '%';
  },
  set image (val) { // jshint ignore:line
    elements.image.style.backgroundImage = val;
  },
  set title (val) { // jshint ignore:line
    elements.title.textContent = val;
  },
  set context (val) { // jshint ignore:line
    elements.context.textContent = val;
  },
  set like (val) { // jshint ignore:line
    elements.like.dataset.liked = val;
  }
};

elements.partial.bar.parentNode.addEventListener('click', function (e) {
  if (e.target.getAttribute('type') === 'range') {
    let percent = e.layerX / parseInt(window.getComputedStyle(e.target).width) * 100;
    background.send('progress', percent);
    // if player is not active progress is not being reported back
    controls.progress = {
      now: cache.progress.max * percent / 100,
      max: cache.progress.max
    };
  }
});
elements.volume.parentNode.addEventListener('click', function (e) {
  if (e.target.getAttribute('type') === 'range') {
    background.send('volume', e.layerX / parseInt(window.getComputedStyle(e.target).width) * 100);
  }
});
document.addEventListener('click', function (e) {
  let target =e.target;
  if (target.dataset.cmd) {
    background.send('cmd' , target.dataset.cmd);
  }
});

background.receive('volume', (v) => controls.volume = v);
background.receive('progress', (o) => controls.progress = o);
background.receive('play', (b) => controls.play = b);
background.receive('badge', function (o) {
  controls.title = o.title;
  controls.context = o.context;
  controls.image = o.image;
  controls.like = o.like;
  if (o.title) {
    elements.connect.style.display = 'none';
  }
});
background.receive('disconnected', () => elements.connect.style.display = 'flex');

elements.connect.addEventListener('click', () => {
  background.send('open');
  window.close();
});
