'use strict';

var browserHasBlob = require('./browser-has-blob.js');
var Emitter = require('./emitter.js');
var loader = require('./loader');

module.exports = function(config) {
    config = config || {};

    var crossOrigin = config.crossOrigin;
    var isTouchLocked = !!config.isTouchLocked;
    var blob = !!(config.blob && browserHasBlob);
    var webAudioContext = config.webAudioContext;
    var log = !!config.log;

    var group;
    var map = {};
    var queue = [];
    var numLoaded = 0;
    var numTotal = 0;

    var add = function(options) {
        if (Array.isArray(options)) {
            options.forEach(function(item) {
                add(item);
            });
            return group;
        }
        queue.push(loader(configure(options)));
        return group;
    };

    var get = function(id) {
        if (!arguments.length) {
            return Object.keys(map).map(function(key) {
                return map[key];
            });
        }
        return map[id];
    };

    var configure = function(options) {
        if (typeof options === 'string') {
            var url = options;
            options = {
                url: url
            };
        }

        if (options.isTouchLocked === undefined) {
            options.isTouchLocked = isTouchLocked;
        }
        if (options.blob === undefined) {
            options.blob = blob;
        }

        options.id = options.id || options.url;
        options.type = options.type || options.url.split('?')[0].split('.').pop().toLowerCase();
        options.crossOrigin = options.crossOrigin || crossOrigin;
        options.webAudioContext = options.webAudioContext || webAudioContext;
        options.log = log;

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

        return group;
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        group.emit('progress', loaded / numTotal);
    };

    var completeHandler = function(key, file) {
        numLoaded++;
        group.emit('progress', numLoaded / numTotal);
        map[key] = file;
        checkComplete();
    };

    var errorHandler = function(err) {
        numTotal--;
        if (group.listeners('error').length) {
            group.emit('error', err);
        } else {
            console.error(err);
        }
        checkComplete();
    };

    var checkComplete = function() {
        if (numLoaded >= numTotal) {
            group.emit('complete', map);
        }
    };

    var destroy = function() {
        while (queue.length) {
            queue.pop().destroy();
        }
        group.off('error');
        group.off('progress');
        group.off('complete');
        map = {};
        webAudioContext = null;
        numTotal = 0;
        numLoaded = 0;

        return group;
    };

    group = Object.create(Emitter.prototype, {
        _events: {
            value: {}
        },
        add: {
            value: add
        },
        start: {
            value: start
        },
        get: {
            value: get
        },
        destroy: {
            value: destroy
        },
        getIds: {
            value: function() {
                return Object.keys(map);
            }
        }
    });

    if (Array.isArray(config.assets)) {
        add(config.assets);
    }

    return Object.freeze(group);
};
