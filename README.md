# assets-loader

A simple batch assets loader.


### Usage

```javascript
var images = [];
for(var i = 0; i < 50; i++) {
  images.push({
    url: 'http://lorempixel.com/100/100?' + i,
    type: 'jpg'
  });
}

var loader = new AssetsLoader({
  assets: images
})
.on('error', function(error) {
  container.innerHTML = error;
})
.on('progress', function(progress) {
  container.innerHTML = (progress * 100).toFixed() + '%';
})
.on('complete', function(files, map) {
  console.log(files, map);
  container.innerHTML = '';
  files.forEach(function(image) {
    container.appendChild(image);
  })
})
.start();
```

### Dev setup

To install dependencies:

```
$ npm install
$ bower install
```

To run tests:

```
$ npm install -g karma-cli
$ karma start
```
