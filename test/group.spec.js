const assetsLoader = require('../src/index.js');
const files = require('./files.js');

describe('asset loader', () => {

    describe('group', () => {

        let complete = false;
        let loadProgress = 0;
        let groupA = null;
        let groupB = null;

        const loader = assetsLoader()
            .add({
                id: 'groupA',
                assets: files.images
            })
            .add({
                id: 'groupB',
                assets: [files.json]
            });

        beforeEach(function(done) {
            if (complete) {
                done();
                return;
            }
            loader
                .on('progress', function(progress) {
                    loadProgress = progress;
                })
                .on('complete', () => {
                    complete = true;
                    groupA = loader.get('groupA');
                    groupB = loader.get('groupB');
                    done();
                })
                .on('error', function(error) {
                    console.log(error);
                })
                .start();
        });

        it('should have finished loading', () => {
            expect(complete).equals(true);
            expect(loadProgress).to.eql(1);
        });

        it('should have groupA', () => {
            expect(groupA).to.exist;
            expect(groupA.get()).to.have.lengthOf(2);
            expect(groupA.get()[0]).to.have.property('type', 'jpg');
        });

        it('should have groupB', () => {
            expect(groupB).to.exist;
            expect(groupB.get()).to.have.lengthOf(1);
            expect(groupB.get()[0]).to.have.property('type', 'json');
        });
    });
});
