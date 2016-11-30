'use strict';
/**
 * @file
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (c) 2016-present, Anand Suresh. All rights reserved.
 */

const Microphone = require('./lib/microphone');
const Speaker = require('./lib/speaker');


const Sox = exports = module.exports = {};


Sox.getMicrophone = function getMicrophone(args) {
  return new Microphone(args);
};


Sox.getSpeaker = function getSpeaker(args) {
  return new Speaker(args);
};


/**
 * Export the class
 * @type {Sox}
 */
module.exports = Sox;
