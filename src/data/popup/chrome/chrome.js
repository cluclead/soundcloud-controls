/* globals chrome */
'use strict';

var background = {
  send: function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function (request) {
      if (request.method === id) {
        callback(request.data);
      }
    });
  }
};

document.body.style.width = '500px';
document.body.style.height = '200px';

background.send('show');
