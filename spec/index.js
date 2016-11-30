'use strict';
/**
 * @file Unit tests for the audio library
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (c) 2016-present, Anand Suresh. All rights reserved.
 */

const chai = require('chai');
const expect = chai.expect;

const audio = require('..');
const Microphone = require('../lib/microphone');
const Speaker = require('../lib/speaker');


describe('audio', function () {
  describe('.getMicrophone', function () {
    it('should return an instance of a microphone stream', function () {
      expect(audio.getMicrophone()).to.be.an.instanceOf(Microphone);
    });
  });

  describe('.getSpeaker', function () {
    it('should return an instance of a speaker stream', function () {
      expect(audio.getSpeaker()).to.be.an.instanceOf(Speaker);
    });
  });
});
