'use strict';

var browserHasBlob = require('./browser-has-blob.js');
var Emitter = require('./emitter.js');
var createLoader = require('./loader');
var autoId = 0;

module.exports = function createGroup(config) {
    var group;
    var map = {};
    var assets = [];
    var queue = [];
    var numLoaded = 0;
    var numTotal = 0;
    var loaders = {};

    var add = function(options) {
        if (Array.isArray(options)) {
            options.forEach(function(item) {
                add(item);
            });
            return group;
        }
        var isGroup = options.assets && Array.isArray(options.assets);
        var loader;
        if (isGroup) {
            loader = createGroup(configure(options, config));
        } else {
            loader = createLoader(configure(options, config));
        }
        queue.push(loader);
        loaders[loader.id] = loader;
        return group;
    };

    var get = function(id) {
        if (!arguments.length) {
            return assets;
        }
        return map[id];
    };

    var getExtension = function(url) {
        return url && url.split('?')[0].split('.').pop().toLowerCase();
    };

    var configure = function(options, defaults) {
        if (typeof options === 'string') {
            var url = options;
            options = {
                url: url
            };
        }

        if (options.isTouchLocked === undefined) {
            options.isTouchLocked = defaults.isTouchLocked;
        }
        if (options.blob === undefined) {
            options.blob = defaults.blob;
        }

        options.id = options.id || options.url || String(++autoId);
        options.type = options.type || getExtension(options.url);
        options.crossOrigin = options.crossOrigin || defaults.crossOrigin;
        options.webAudioContext = options.webAudioContext || defaults.webAudioContext;
        options.log = defaults.log;

        return options;
    };

    var start = function() {
        numTotal = queue.length;

        queue.forEach(function(loader) {
            loader
                .on('progress', progressHandler)
                .once('complete', completeHandler)
                .once('error', errorHandler)
                .start();
        });

        return group;
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        group.emit('progress', loaded / numTotal);
    };

    var completeHandler = function(asset) {
        console.debug('completeHandler:', asset);
        numLoaded++;
        group.emit('progress', numLoaded / numTotal);
        map[asset.id] = asset.file;
        assets.push(asset);
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
            group.emit('complete', {
                id: config.id,
                file: assets
            });
        }
    };

    var destroy = function() {
        while (queue.length) {
            queue.pop().destroy();
        }
        group.off('error');
        group.off('progress');
        group.off('complete');
        assets = [];
        map = {};
        config.webAudioContext = null;
        numTotal = 0;
        numLoaded = 0;

        return group;
    };

    // emits: progress, error, complete

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
        },
        getLoader: {
            value: function(id) {
                console.log('getLoader', loaders)
                return loaders[id];
            }
        },
        id: {
            get: function() {
                return config.id;
            }
        }
    });

    config = configure(config || {}, {
        blob: false,
        touchLocked: false,
        crossOrigin: null,
        webAudioContext: null,
        log: false
    });

    if (Array.isArray(config.assets)) {
        add(config.assets);
    }

    return Object.freeze(group);
};
