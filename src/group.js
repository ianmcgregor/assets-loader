'use strict';

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
        // console.debug('add', options);
        if (Array.isArray(options)) {
            options.forEach(add);
            return group;
        }
        var isGroup = !!options.assets && Array.isArray(options.assets);
        // console.debug('isGroup', isGroup);
        var loader;
        if (isGroup) {
            loader = createGroup(configure(options, config));
        } else {
            loader = createLoader(configure(options, config));
        }
        loader.once('destroy', destroyHandler);
        queue.push(loader);
        loaders[loader.id] = loader;
        return group;
    };

    var get = function(id) {
        if (!arguments.length) {
            return assets;
        }
        if (map[id]) {
            return map[id];
        }
        return loaders[id];
    };

    var find = function(id) {
        if (get(id)) {
            return get(id);
        }
        var found = null;
        Object.keys(loaders).some(function(key) {
            found = loaders[key].find && loaders[key].find(id);
            return !!found;
        });
        return found;
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

        if (options.basePath === undefined) {
            options.basePath = defaults.basePath;
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

        queue = [];

        return group;
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        group.emit('progress', loaded / numTotal);
    };

    var completeHandler = function(asset, id, type) {
        if (Array.isArray(asset)) {
            asset = { id: id, file: asset, type: type };
        }
        numLoaded++;
        group.emit('progress', numLoaded / numTotal);
        map[asset.id] = asset.file;
        assets.push(asset);
        group.emit('childcomplete', asset);
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

    var destroyHandler = function(id) {
        loaders[id] = null;
        delete loaders[id];

        map[id] = null;
        delete map[id];

        assets.some(function(asset, i) {
            if (asset.id === id) {
                assets.splice(i, 1);
                return true;
            }
        });
    };

    var checkComplete = function() {
        if (numLoaded >= numTotal) {
            group.emit('complete', assets, map, config.id, 'group');
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

        Object.keys(loaders).forEach(function(key) {
            loaders[key].destroy();
        });
        loaders = {};

        group.emit('destroy', group.id);

        return group;
    };

    // emits: progress, error, complete, destroy

    group = Object.create(Emitter.prototype, {
        _events: {
            value: {}
        },
        id: {
            get: function() {
                return config.id;
            }
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
        find: {
            value: find
        },
        getLoader: {
            value: function(id) {
                return loaders[id];
            }
        },
        loaded: {
            get: function() {
                return numLoaded >= numTotal;
            }
        },
        file: {
            get: function() {
                return assets;
            }
        },
        destroy: {
            value: destroy
        }
    });

    config = configure(config || {}, {
        basePath: '',
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
