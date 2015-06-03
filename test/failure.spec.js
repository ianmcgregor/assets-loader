'use strict';

var AssetsLoader = require('../src/index.js');

describe('asset loader', function() {

  describe('failure', function() {
    this.timeout(5000);

    var assetLoader = new AssetsLoader({
      crossOrigin: 'anonymous'
    });

    var complete = false;
    var loadProgress;
    var errorMessages = [];
    var badFiles = [
      'http://www.example.com/fooEl.jpg',
      {url: 'http://www.example.com/fooBlob.jpg', useImageXHR: true},
      'http://www.example.com/foo.ogg',
      'http://www.example.com/foo.webm',
      'http://www.example.com/foo.json'
    ];

    badFiles.forEach(function(file) {
      assetLoader.add(file);
    });

    beforeEach(function(done) {
      if (complete) {
        done();
        return;
      }
      assetLoader.on('progress', function(progress) {
        loadProgress = progress;
      })
      .on('error', function(error) {
        errorMessages.push(error);
        console.warn(error);
      })
      .on('complete', function() {
        complete = true;
        done();
      })
      .start();
    });

    it ('should have finished loading', function() {
      expect(complete).equals(true);
    });

    it ('should have caught errors', function() {
      expect(errorMessages.length).to.eql(badFiles.length);
      expect(errorMessages[0]).to.be.a('string');
    });

  });
});
