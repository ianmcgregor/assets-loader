(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.AssetsLoader = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var Emitter = _dereq_('./emitter.js');

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

},{"./emitter.js":3}],2:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(_dereq_,module,exports){
'use strict';

var EventEmitter = _dereq_('events').EventEmitter;

function Emitter() {
    EventEmitter.call(this);
    this.setMaxListeners(20);
}

Emitter.prototype = Object.create(EventEmitter.prototype);
Emitter.prototype.constructor = Emitter;

Emitter.prototype.off = function(type, listener) {
    if (listener) {
        return this.removeListener(type, listener);
    }
    if (type) {
        return this.removeAllListeners(type);
    }
    return this.removeAllListeners();
};

module.exports = Emitter;

},{"events":2}]},{},[1])(1)
});
//# sourceMappingURL=assets-loader.js.map
