'use strict';
/**
 * @file A mic-to-speaker channel
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (c) 2016-present, Anand Suresh. All rights reserved.
 */

const Audio = require('..');
const mic = Audio.getMicrophone();
const speaker = Audio.getSpeaker();

let sigIntsReceived = false;
process.on('SIGINT', () => {
  sigIntsReceived ? process.exit(0) : sigIntsReceived = true;
  mic.stop();
});

mic.start()
  .then(() => mic.pipe(speaker));
