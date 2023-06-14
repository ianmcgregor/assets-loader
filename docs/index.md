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
var assetsLoader = require('assets-loader');

// load some assets:

var loader = assetsLoader({
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
            { url: 'binary_file', type: 'bin' },
            // text
            'text_file.txt',
            { url: 'text_file', type: 'text' }
        ]
    })
    .on('error', function(error) {
        console.error(error);
    })
    .on('progress', function(progress) {
        console.log((progress * 100).toFixed() + '%');
    })
    .on('complete', function(assets) {
        assets.forEach(function(asset) {
            console.log(asset);
        });
        // get by id from loader instance
        console.log(loader.get('picture'));
    })
    .start();

// add assets in separate steps

var loader = assetsLoader()
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
    .add({
        id: 'sounds',
        assets: [
            { id: 'a', url: 'a.mp3' },
            { id: 'b', url: 'b.mp3' }
        ]
    })
    .on('complete', function(assets) {
        console.log(assets);
        console.log(loader.get('video'));
        console.log(loader.get('sounds'));
    })
    .start();

// configure values for every file

var loader = assetsLoader({
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
loader.getLoader('groupId').destroy();

// stats

console.log(assetsLoader.stats.getMbps()); // e.g. 3.2
assetsLoader.stats.log(); // e.g. Total loaded: 2.00mb time: 2.00s speed: 1.00mbps
```

### Create an `assets.json` file
Sometimes you may need to load a lot of assets. A simple solution for that is to generate an `assets.json` file listing all your assets. Here is a bash script to do that:

```bash
#!/bin/bash

# Assign found results to an array 
# Source: https://stackoverflow.com/a/23357277/616095
assets=()
while IFS=read -r -d $'\0'; do assets+=("${REPLY//static\//}")

# Filter results (excluding static/fonts folder)
# Source: http://www.liamdelahunty.com/tips/linux_find_exclude_multiple_directories.php
done < <(find static \( -path static/fonts -o -name ".*" \) -prune -o -type f -print0)

# Format an array to JSON (require https://github.com/stedolan/jq)
# Source: https://stackoverflow.com/a/26809318/616095
printf '%s\n' "${assets[@]}" | jq -R . | jq -s . > dest/assets.json
```

This script assumed that your assets are located in a `static/` folder and write the result to `dest/assets.json`. After running the script you just have to require your JSON file:

```javascript
new assetsLoader({
    assets: require('dest/assets.json')
})
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
