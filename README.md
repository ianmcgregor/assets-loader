# assets-loader

[![NPM version](https://badge.fury.io/js/assets-loader.svg)](http://badge.fury.io/js/assets-loader) [![Bower version](https://badge.fury.io/bo/assets-loader.svg)](http://badge.fury.io/bo/assets-loader) [![Build Status](https://secure.travis-ci.org/ianmcgregor/assets-loader.png)](https://travis-ci.org/ianmcgregor/assets-loader)

A simple batch assets loader.

<http://ianmcgregor.github.io/assets-loader/examples/>

### Installation

npm:
```
npm install assets-loader --save-dev
```
bower:
```
bower install assets-loader --save-dev
```

### Usage

```javascript
var AssetsLoader = require('assets-loader');

// load some assets:

var loader = new AssetsLoader({
        assets: [
            // image
            '/images/picture.png',
            // image with crossorigin
            { url: '/images/picture.jpg', crossOrigin: 'anonymous' },
            // image without extension
            { url: 'http://lorempixel.com/100/100', type: 'jpg' },
            // image as blob
            { url: '/images/picture.webp', blob: true },
            // specify id for retrieval
            { id: 'picture', url: '/images/picture.jpg' },
            // json
            'data.json',
            { url: 'data.json' },
            { url: '/endpoint', type: 'json' },
            // video
            'video.webm',
            { url: 'video.webm' },
            { url: 'video.mp4', blob: true },
            // audio
            'audio.ogg',
            { url: 'audio.ogg', blob: true },
            { url: 'audio.mp3', webAudioContext: audioContext },
            // binary / arraybuffer
            'binary_file.bin',
            { url: 'binary_file', type: 'bin' }
        ]
    })
    .on('error', function(error) {
        console.error(error);
    })
    .on('progress', function(progress) {
        console.log((progress * 100).toFixed() + '%');
    })
    .on('complete', function(map) {
        // map is a hashmap of loaded files
        // keys are either ids if specified or urls
        Object.keys(map).forEach(function(key) {
            console.log(key, map[key]);
        });
        // get by id from map arg
        console.log(map.picture); // <img />
        // get by id from loader instance
        console.log(loader.get('picture')); // <img />
        // get array of all loaded files
        loader.get().forEach(function(file) {
            console.log(file);
        });
    })
    .start();

// add assets in separate steps

var loader = new AssetsLoader()
    .add('audio.mp3')
    .add('picture.jpg')
    .add([
        'a.png',
        'b.png'
    ])
    .add({
        id: 'video',
        url: 'video.webm'
    })
    .add([
        { id: 'a', url: 'a.mp3' },
        { id: 'b', url: 'b.mp3' }
    ])
    .on('complete', function(files, map) {
        console.log(files, map);
    });

loader.start();

// configure values for every file

var loader = new AssetsLoader({
    blob: true, // only works if browser supports
    crossOrigin: 'anonymous',
    webAudioContext: audioContext,
    assets: [
        { id: 'a', url: 'a.mp3' },
        { id: 'b', url: 'b.jpg' },
        // override blob setting for this file
        { id: 'c', url: 'c.jpg', blob: false }
    ]
});

// destroy

loader.destroy();

// stats

console.log(AssetsLoader.stats.getMbps()); // e.g. 3.2
AssetsLoader.stats.log(); // e.g. Total loaded: 2.00mb time: 2.00s speed: 1.00mbps
```

### Dev setup

To install dependencies:

```
$ npm install
```

To run tests:

```
$ npm install -g karma-cli
$ karma start
```
