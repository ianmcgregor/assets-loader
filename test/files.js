'use strict';

var assets = require('./assets.json');

var elAudio = document.createElement('audio');
var extAudio = (elAudio.canPlayType('audio/mpeg;') ? 'mp3' : 'ogg');
var elVideo = document.createElement('video');
var extVideo = (elVideo.canPlayType('video/webm;') ? 'webm' : 'mp4');

module.exports = {
  'image': assets.image[0],
  'imageXHR': assets.image[1],
  'audio': assets.audio[0][extAudio],
  'video': assets.video[0][extVideo],
  'json': assets.json[0],
  'text': assets.text[0],
  'images': [
    {
      url: assets.image[2],
      type: 'jpg'
    },
    {
      url: assets.image[3],
      type: 'jpg'
    }
  ]
};
