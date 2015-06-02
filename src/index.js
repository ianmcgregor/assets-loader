'use strict';

var Emitter = require('./emitter.js');

var browserHasBlob = (function() {
  try {
    return !!new Blob();
  } catch (e) {
    return false;
  }
}());

/*
 * Group
 */

function AssetsLoader(config) {
  config = config || {};

  var crossOrigin = config.crossOrigin;
  var isTouchLocked = !!config.isTouchLocked;
  var blob = !!(config.blob && browserHasBlob);
  var webAudioContext = config.webAudioContext;

  var assetsLoader;
  var map = {};
  var files = [];
  var queue = [];
  var numLoaded = 0;
  var numTotal = 0;

  var add = function(options) {
    if (Array.isArray(options)) {
      options.forEach(function(item) {
        add(item);
      });
      return assetsLoader;
    }
    var loader = new AssetsLoader.Loader(configure(options));
    queue.push(loader);
    return assetsLoader;
  };

  var get = function(id) {
    return map[id];
  };

  var configure = function(options) {
    if (typeof options === 'string') {
      var url = options;
      options = {url: url};
    }

    if (options.isTouchLocked === undefined) { options.isTouchLocked = isTouchLocked; }
    if (options.blob === undefined) { options.blob = blob; }

    options.id = options.id || options.url;
    options.type = options.type || options.url.split('?')[0].split('.').pop().toLowerCase();
    options.crossOrigin = options.crossOrigin || crossOrigin;
    options.webAudioContext = options.webAudioContext || webAudioContext;

    return options;
  };

  var start = function() {
    numTotal = queue.length;

    queue.forEach(function(loader) {
      loader.on('progress', progressHandler);
      loader.once('complete', completeHandler);
      loader.once('error', errorHandler);
      loader.start();
    });

    return assetsLoader;
  };

  var progressHandler = function(progress) {
    var loaded = numLoaded + progress;
    assetsLoader.emit('progress', loaded / numTotal);
  };

  var completeHandler = function(key, file) {
    numLoaded++;
    assetsLoader.emit('progress', numLoaded / numTotal);
    map[key] = file;
    files.push(file);

    checkComplete();
  };

  var errorHandler = function(err) {
    numTotal--;
    if (assetsLoader.listeners('error').length) {
      assetsLoader.emit('error', err);
    } else {
      console.error(err);
    }
    checkComplete();
  };

  var checkComplete = function() {
    if (numLoaded >= numTotal) {
      assetsLoader.emit('complete', files, map);
    }
  };

  var destroy = function() {
    while (queue.length) {
      queue.pop().destroy();
    }
    assetsLoader.off('error');
    assetsLoader.off('progress');
    assetsLoader.off('complete');
    map = {};
    files = [];
    webAudioContext = null;
    numTotal = 0;
    numLoaded = 0;

    return assetsLoader;
  };

  assetsLoader = Object.create(Emitter.prototype, {
      _events: { value: {} },
      add: { value: add },
      start: { value: start },
      get: { value: get },
      destroy: { value: destroy }
  });

  if (Array.isArray(config.assets)) {
    add(config.assets);
  }

  return Object.freeze(assetsLoader);
}

/*
 * Loader
 */

AssetsLoader.Loader = function(options) {
  var id = options.id;
  var url = options.url;
  var type = options.type;
  var crossOrigin = options.crossOrigin;
  var isTouchLocked = options.isTouchLocked;
  var blob = options.blob && browserHasBlob;
  var webAudioContext = options.webAudioContext;

  var loader;
  var loadHandler;
  var request;
  var startTime;
  var timeout;

  var start = function() {
    startTime = Date.now();

    switch (type) {
      case 'json':
        loadJSON();
        break;
      case 'jpg':
      case 'png':
      case 'gif':
      case 'webp':
        loadImage();
        break;
      case 'mp3':
      case 'ogg':
      case 'opus':
      case 'wav':
      case 'm4a':
        loadAudio();
        break;
      case 'ogv':
      case 'mp4':
      case 'webm':
      case 'hls':
        loadVideo();
        break;
      case 'bin':
        loadXHR('arraybuffer');
        break;
      default:
        throw 'AssetsLoader ERROR: Unknown type for file with URL: ' + url + ' (' + type + ')';
    }
  };

  var dispatchComplete = function(file) {
    if (!file) { return; }
    loader.emit('progress', 1);
    loader.emit('complete', id, file);
    removeListeners();
  };

  var loadXHR = function(responseType, customLoadHandler) {
    loadHandler = customLoadHandler || completeHandler;

    request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = responseType;
    request.addEventListener('progress', progressHandler);
    request.addEventListener('load', loadHandler);
    request.addEventListener('error', errorHandler);
    request.send();
  };

  var progressHandler = function(event) {
    if (event.lengthComputable) {
      loader.emit('progress', event.loaded / event.total);
    }
  };

  var completeHandler = function() {
    if (success()) {
      dispatchComplete(request.response);
    }
  };

  var success = function() {
    if (request && request.status < 400) {
      AssetsLoader.stats.update(request, startTime, url);
      return true;
    }
    errorHandler(request && request.statusText);
    return false;
  };

  // json

  var loadJSON = function() {
    loadXHR('json', function() {
      if (success()) {
        var data = request.response;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        dispatchComplete(data);
      }
    });
  };

  // image

  var loadImage = function() {
    if (blob) {
      loadImageBlob();
    } else {
      loadImageElement();
    }
  };

  var loadImageElement = function() {
    request = new Image();
    if (crossOrigin) {
      request.crossOrigin = 'anonymous';
    }
    request.addEventListener('error', errorHandler, false);
    request.addEventListener('load', elementLoadHandler, false);
    request.src = url;
  };

  var elementLoadHandler = function() {
    window.clearTimeout(timeout);
    dispatchComplete(request);
  };

  var loadImageBlob = function() {
    loadXHR('blob', function() {
      if (success()) {
        var url = window.URL.createObjectURL(request.response);
        request = new Image();
        request.addEventListener('error', errorHandler, false);
        request.addEventListener('load', imageBlobHandler, false);
        request.src = url;
      }
    });
  };

  var imageBlobHandler = function() {
    window.URL.revokeObjectURL(url);
    dispatchComplete(request);
  };

  // audio

  var loadAudio = function(webAudioContext) {
    if (webAudioContext) {
      loadAudioBuffer();
    } else {
      loadMediaElement('audio');
    }
  };

  // video

  var loadVideo = function() {
    if (blob) {
      loadXHR('blob');
    } else {
      loadMediaElement('video');
    }
  };

  // audio buffer

  var loadAudioBuffer = function() {
    loadXHR('arraybuffer', function() {
      if (success()) {
        webAudioContext.decodeAudioData(
          request.response,
          function(buffer) {
            request = null;
            dispatchComplete(buffer);
          },
          function(e) {
            errorHandler(e);
          }
        );
      }
    });
  };

  // media element

  var loadMediaElement = function(tagName) {
    request = document.createElement(tagName);

    if (!isTouchLocked) {
      // timeout because sometimes canplaythrough doesn't fire
      window.clearTimeout(timeout);
      timeout = window.setTimeout(elementLoadHandler, 2000);
      request.addEventListener('canplaythrough', elementLoadHandler, false);
    }

    request.addEventListener('error', errorHandler, false);
    request.preload = 'auto';
    request.src = url;
    request.load();

    if (isTouchLocked) {
      dispatchComplete(request);
    }
  };

  // error

  var errorHandler = function(err) {
    window.clearTimeout(timeout);

    var message = err;

    if (request && request.tagName && request.error) {
      var ERROR_STATE = ['', 'ABORTED', 'NETWORK', 'DECODE', 'SRC_NOT_SUPPORTED'];
      message = 'MediaError: ' + ERROR_STATE[request.error.code] + ' ' + request.src;
    } else if (request && request.statusText) {
      message = request.statusText;
    } else if (err && err.message) {
      message = err.message;
    } else if (err && err.type) {
      message = err.type;
    }

    loader.emit('error', 'Error loading "' + url + '" ' + message);

    destroy();
  };

  // clean up

  var removeListeners = function() {
    loader.off('error');
    loader.off('progress');
    loader.off('complete');

    if (request) {
      request.removeEventListener('progress', progressHandler);
      request.removeEventListener('load', loadHandler);
      request.removeEventListener('error', errorHandler);
      request.removeEventListener('load', elementLoadHandler);
      request.removeEventListener('canplaythrough', elementLoadHandler);
      request.removeEventListener('load', imageBlobHandler);
    }
  };

  var destroy = function() {
    removeListeners();

    if (request && request.abort && request.readyState < 4) {
      request.abort();
    }

    request = null;
    webAudioContext = null;

    window.clearTimeout(timeout);
  };

  loader = Object.create(Emitter.prototype, {
      _events: { value: {} },
      start: { value: start },
      destroy: { value: destroy }
  });

  return Object.freeze(loader);
};

/*
 * Stats
 */

AssetsLoader.stats = {
  mbs: 0,
  secs: 0,
  update: function(request, startTime, url) {
    var length;
    var headers = request.getAllResponseHeaders();
    if (headers) {
      var match = headers.match(/content-length: (\d+)/i);
      if (match && match.length) {
        length = match[1];
      }
    }
    // var length = request.getResponseHeader('Content-Length');
    if (length) {
      length = parseInt(length, 10);
      var mbs = length / 1024 / 1024;
      var secs = (Date.now() - startTime) / 1000;
      this.secs += secs;
      this.mbs += mbs;
      this.log(url, mbs, secs);
    } else {
      console.warn.call(console, 'Can\'t get Content-Length:', url);
    }
  },
  log: function(url, mbs, secs) {
    console.log.call(console, url, mbs, secs);
    if (url) {
      var file = 'File loaded: ' +
                 url.substr(url.lastIndexOf('/') + 1) +
                 ' size:' + mbs.toFixed(2) + 'mb' +
                 ' time:' + secs.toFixed(2) + 's' +
                 ' speed:' + (mbs / secs).toFixed(2) + 'mbps';

      console.log.call(console, file);
    }
    var total = 'Total loaded: ' + this.mbs.toFixed(2) + 'mb' +
                ' time:' + this.secs.toFixed(2) + 's' +
                ' speed:' + this.getMbps().toFixed(2) + 'mbps';
    console.log.call(console, total);
  },
  getMbps: function() {
    return this.mbs / this.secs;
  }
};

module.exports = AssetsLoader;
