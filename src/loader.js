'use strict';

var Emitter = require('./emitter.js');
var browserHasBlob = require('./browser-has-blob.js');
var stats = require('./stats');

module.exports = function(options) {
    var id = options.id;
    var url = options.url;
    var type = options.type;
    var crossOrigin = options.crossOrigin;
    var isTouchLocked = options.isTouchLocked;
    var blob = options.blob && browserHasBlob;
    var webAudioContext = options.webAudioContext;
    var log = options.log;

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
            case 'binary':
                loadXHR('arraybuffer');
                break;
            case 'txt':
            case 'text':
                loadXHR('text');
                break;
            default:
                throw 'AssetsLoader ERROR: Unknown type for file with URL: ' + url + ' (' + type + ')';
        }
    };

    var dispatchComplete = function(file) {
        if (!file) {
            return;
        }
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
            stats.update(request, startTime, url, log);
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

    var loadAudio = function() {
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
        _events: {
            value: {}
        },
        start: {
            value: start
        },
        destroy: {
            value: destroy
        }
    });

    return Object.freeze(loader);
};