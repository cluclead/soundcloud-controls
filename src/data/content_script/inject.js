/* globals background, unload */
'use strict';

var elements = {
  get badge () {
    return document.querySelector('.playControls__soundBadge');
  },
  get context () {
    return document.querySelector('.playControls__inner .playbackSoundBadge__context');
  },
  get title () {
    return document.querySelector('.playControls__inner .playbackSoundBadge__title');
  },
  get image () {
    return document.querySelector('.playControls__inner .image__full');
  },
  get volume () {
    return document.querySelector('.playControls__inner .volume__sliderWrapper');
  },
  get play () {
    return document.querySelector('.playControls__inner .playControl');
  },
  get next () {
    return document.querySelector('.playControls__inner .skipControl__next');
  },
  get previous () {
    return document.querySelector('.playControls__inner .skipControl__previous');
  },
  get progress () {
    return document.querySelector('.playControls__inner .playbackTimeline__progressWrapper');
  },
  get like () {
    return document.querySelector('.playControls__inner .playbackSoundBadge__like');
  }
};

var controls = {
  volume: () => +elements.volume.getAttribute('aria-valuenow') * 100,
  context: () => elements.context.title,
  title: () => elements.title.title,
  image: () => elements.image.style.backgroundImage.replace('50x50', '200x200'),
  play: () => elements.play.classList.contains('playing'),
  like: () => elements.like.classList.contains('sc-button-selected'),
  progress: () => ({
    now: +elements.progress.getAttribute('aria-valuenow'),
    max: +elements.progress.getAttribute('aria-valuemax')
  })
};

var observers = [], id;

function calcBadge () {
  window.clearTimeout(id);
  id = window.setTimeout(() => elements.title && background.send('badge', {
    title: controls.title(),
    context: controls.context(),
    image: controls.image(),
    like: controls.like(),
    location: document.location.href
  }), 100);
}

function init () {
  let config = {
    subtree: false,
    attributes: true,
    childList: false,
    characterData: false
  };
  if (document.querySelector('.playControls__inner') && observers.length === 0) {
    if (elements.badge) {
      let observer = new MutationObserver(calcBadge);
      observer.observe(elements.badge, {
        subtree: true,
        attributes: false,
        childList: true,
        characterData: false
      });
      observers.push(observer);
    }
    if (elements.volume) {
      let observer = new MutationObserver(() => background.send('volume', controls.volume()));
      observer.observe(elements.volume, config);
      observers.push(observer);
    }
    if (elements.play) {
      let observer = new MutationObserver(() => background.send('play', controls.play()));
      observer.observe(elements.play, config);
      observers.push(observer);
    }
    if (elements.progress) {
      let observer = new MutationObserver(() => background.send('progress', controls.progress()));
      observer.observe(elements.progress, config);
      observers.push(observer);
    }
    unload.when(function () {
      try {
        observers.forEach(observer => observer.disconnect());
      }
      catch (e) {}
    });
    // sending things that may not change after load
    background.send('volume', controls.volume());
    background.send('play', controls.play());
    calcBadge();
  }
  else {
    console.error('Cannot install mutation observer');
  }
}
window.addEventListener('DOMContentLoaded', init, false);
if (document.readyState === 'complete') {
  init();
}

background.receive('progress', function (val) {
  if (elements.progress) {
    let rect = elements.progress.getBoundingClientRect();
    elements.progress.dispatchEvent(new MouseEvent('mousedown', {
      clientX: rect.left + val / 100 * rect.width,
      bubbles: true,
    }));
    elements.progress.dispatchEvent(new MouseEvent('mouseup', {
      clientX: rect.left + val / 100 * rect.width,
      bubbles: true,
    }));
  }
});
background.receive('play', () => elements.play && elements.play.click());
background.receive('next', () => elements.next && elements.next.click());
background.receive('previous', () => elements.previous && elements.previous.click());
background.receive('like', () => elements.like && elements.like.click());
