'use strict';

var AssetsLoader = require('../src/index.js');
var files = require('./files.js');

describe('asset loader', function() {

  describe('success', function() {
    this.timeout(5000);

    var complete = false;
    var loadProgress;

    var loader = new AssetsLoader({
      crossOrigin: 'anonymous'
    })
    .add({
      url: files.image,
      type: 'jpg'
    })
    .add({
      url: files.imageXHR,
      type: 'jpg',
      useImageXHR: true
    })
    .add(files.audio)
    .add(files.video)
    .add({
      url: files.json,
      type: 'json'
    })
    .add(files.text)
    .add(files.images);

    beforeEach(function(done) {
      if (complete) {
        done();
        return;
      }
      loader.on('progress', function(progress) {
        loadProgress = progress;
      })
      .on('complete', function() {
        complete = true;

        // manual tests to view on karma debug page:
        document.body.appendChild(loader.get(files.image));
        document.body.appendChild(loader.get(files.imageXHR));
        document.body.insertAdjacentHTML('beforeend', JSON.stringify(loader.get(files.json)));
        loader.get(files.audio).setAttribute('controls', 'controls');
        document.body.appendChild(loader.get(files.audio));
        loader.get(files.audio).play();
        loader.get(files.video).setAttribute('controls', 'controls');
        document.body.appendChild(loader.get(files.video));
        files.images.forEach(function(img) {
          document.body.appendChild(loader.get(img.url));
        });

        done();
      })
      .on('error', function(error) {
        console.log(error);
      })
      .start();
    });

    it ('should have finished loading', function() {
      expect(complete).equals(true);
      expect(loadProgress).to.eql(1);
    });

    it ('should have loaded image element', function() {
      expect(loader.get(files.image)).to.exist;
      expect(loader.get(files.image).tagName).to.eql('IMG');
    });

    it ('should have loaded image blob', function() {
      expect(loader.get(files.imageXHR)).to.exist;
      expect(loader.get(files.imageXHR).tagName).to.eql('IMG');
    });

    it ('should have loaded audio', function() {
      expect(loader.get(files.audio)).to.exist;
      expect(loader.get(files.audio).tagName).to.eql('AUDIO');
    });

    it ('should have loaded video', function() {
      expect(loader.get(files.video)).to.exist;
      expect(loader.get(files.video).tagName).to.eql('VIDEO');
    });

    it ('should have loaded json', function() {
      expect(loader.get(files.json)).to.exist;
      expect(loader.get(files.json)).to.be.an('object');
      expect(loader.get(files.json).name).to.be.a('string');
    });

    it ('should have recorded stats', function() {
      expect(AssetsLoader.stats).to.be.an('object');
      expect(AssetsLoader.stats.getMbps()).to.be.a('number');
    });
  });
});
