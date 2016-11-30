'use strict';
/**
 * @file Unit tests for the speaker
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (c) 2016-present, Anand Suresh. All rights reserved.
 */

const node = {
  child: require('child_process')
};
const chai = require('chai');
const expect = chai.expect;

const Microphone = require('../lib/microphone');
const Speaker = require('../lib/speaker');



describe('Speaker', function () {
  describe('new', function () {
    it('should be callable', function () {
      expect(Speaker).to.be.a('function');
    });

    it('should not throw an error when instantiated without arguments', function () {
      const speaker = new Speaker();
      expect(speaker).to.be.an.instanceOf(Speaker);
      expect(speaker.type).to.equal('raw');
    });

    it('should not throw an error when instantiated with arguments', function () {
      const speaker = new Speaker({
        bits: 8,
        channels: 1,
        endianness: 'big',
        encoding: 'unsigned-integer',
        sampleRate: 16000,
        type: 'lpc10'
      });
      expect(speaker).to.be.an.instanceOf(Speaker);
      expect(speaker.bits).to.equal(8);
      expect(speaker.channels).to.equal(1);
      expect(speaker.endianness).to.equal('big');
      expect(speaker.encoding).to.equal('unsigned-integer');
      expect(speaker.sampleRate).to.equal(16000);
      expect(speaker.type).to.equal('lpc10');
    });
  });


  describe('streaming', function () {
    let mic = null;

    beforeEach(function () {
      mic = new Microphone();
    });

    it('should spawn a sox process', function (done) {
      let speaker = new Speaker()
        .on('childSpawned', (pid) => {
          expect(speaker._process).to.not.be.null;
          expect(speaker._process).to.be.an.instanceOf(node.child.ChildProcess);
          expect(speaker._process.pid).to.equal(pid);

          mic.stop();
          done();
        });

      mic.pipe(speaker);
      mic.start();
    });

    it('should kill the sox process when done', function (done) {
      let childPid = null;
      let speaker = new Speaker()
        .on('childSpawned', (pid) => childPid = pid)
        .on('childKilled', (pid) => {
          expect(pid).to.equal(childPid);
          expect(speaker._process).to.be.null;
          done();
        });

      mic.pipe(speaker);
      mic.start();
      setTimeout(() => mic.stop(), 1000);
    });
  });
});
