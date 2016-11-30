'use strict';
/**
 * @file Unit tests for the microphone
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



describe('Microphone', function () {
  describe('new', function () {
    it('should be callable', function () {
      expect(Microphone).to.be.a('function');
    });

    it('should not throw an error when instantiated without arguments', function () {
      const mic = new Microphone();
      expect(mic).to.be.an.instanceOf(Microphone);
      expect(mic.bits).to.equal(16);
      expect(mic.channels).to.equal(2);
      expect(mic.endianness).to.equal('little');
      expect(mic.encoding).to.equal('signed-integer');
      expect(mic.sampleRate).to.equal(44100);
      expect(mic.type).to.equal('raw');
    });

    it('should not throw an error when instantiated with arguments', function () {
      const mic = new Microphone({
        bits: 8,
        channels: 1,
        endianness: 'big',
        encoding: 'unsigned-integer',
        sampleRate: 16000,
        type: 'lpc10'
      });
      expect(mic).to.be.an.instanceOf(Microphone);
      expect(mic.bits).to.equal(8);
      expect(mic.channels).to.equal(1);
      expect(mic.endianness).to.equal('big');
      expect(mic.encoding).to.equal('unsigned-integer');
      expect(mic.sampleRate).to.equal(16000);
      expect(mic.type).to.equal('lpc10');
    });
  });


  describe('#start', function () {
    let mic = null;

    afterEach(function (done) {
      mic.on('childKilled', () => done());
      mic.stop();
    });

    it('should spawn a sox process', function () {
      let childPid = null;

      mic = new Microphone()
        .on('childSpawned', (pid) => childPid = pid);

      expect(mic._process).to.be.null;

      mic.start();

      expect(mic._process).to.not.be.null;
      expect(mic._process).to.be.an.instanceOf(node.child.ChildProcess);
      expect(mic._process.pid).to.equal(childPid);
    });

    it('should emit `recording` when started', function (done) {
      mic = new Microphone()
        .on('recording', done);

      mic.start();
    });

    it('should emit `data` events when started', function (done) {
      mic = new Microphone()
        .once('data', () => done());

      mic.start();
    });
  });


  describe('#stop', function () {
    let mic = null;
    let childPid = null;

    beforeEach(function () {
      mic = new Microphone()
        .on('error', (err) => { throw err; })
        .on('childSpawned', (pid) => childPid = pid);

      mic.start();
    });

    it('should kill the sox process', function (done) {
      mic.on('childKilled', (pid) => {
        expect(pid).to.equal(childPid);
        expect(mic._process).to.be.null;
        done();
      });

      mic.stop();
    });

    it('should emit the `stopped` event when stopped', function (done) {
      mic.on('stopped', done);

      mic.stop();
    });

    it('should emit the `end` event when stopped', function (done) {
      mic.on('data', () => {})
        .on('end', done);

      mic.stop();
    });
  });
});
