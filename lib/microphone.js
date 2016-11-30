'use strict';
/**
 * @file An implementation of a microphone to record audio
 *
 * @author Anand Suresh <anandsuresh@gmail.com>
 * @copyright Copyright (c) 2016-present, Anand Suresh. All rights reserved.
 */

const node = {
  child: require('child_process'),
  os: require('os'),
  stream: require('stream'),
  util: require('util')
};
const debug = require('debug')('audio:microphone');



/**
 * An implementation of a microphone to record audio
 *
 * @param {Object} [opts] Configuration options for the microphone
 * @param {Number} [opts.bits=16] Sample size in bits
 * @param {Number} [opts.channels=2] Number of channels of audio
 * @param {String} [opts.endianness='little'] Byte-order for the encoding; [little, big, swap]
 * @param {String} [opts.encoding='signed-integer'] Encoding of the audio; [signed-integer, unsigned-integer, floating-point, mu-law, a-law, ima-adpcm, ms-adpcm, gsm-full-rate]
 * @param {Number} [opts.sampleRate=44100] Rate at which audio is sampled
 * @param {String} [opts.type='raw'] File-type of the audio
 */
function Microphone(opts) {
  Microphone.super_.call(this);

  opts = opts || {};
  this.bits = opts.bits || 16;
  this.channels = opts.channels || 2;
  this.endianness = opts.endianness || 'little';
  this.encoding = opts.encoding || 'signed-integer';
  this.sampleRate = opts.sampleRate || 44100;
  this.type = opts.type || 'raw';

  this._process = null;
  this._audioStream = null;
  this._ended = false;

  this.on('error', (err) => debug(err));
}
node.util.inherits(Microphone, node.stream.Readable);


Microphone.prototype._read = function _read() {
  let dataPushed = false;
  let chunk = null;

  while ((chunk = this._audioStream.read())) {
    debug('read %d bytes', chunk.length);
    dataPushed = true;
    if (!this.push(chunk))
      break;
  }

  if (!chunk && this._ended) {
    this.push(null);
    this._audioStream = null;
    debug('mic stream ended');
  } else if (!dataPushed) {
    debug('waiting for data');
    this._audioStream.once('readable', () => this._read());
  }
};


/**
 * Starts recording audio from the microphone
 *
 * @returns {Promise}
 */
Microphone.prototype.start = function start() {
  return new Promise((resolve, reject) => {
    if (this._process) {
      debug('.start() called when already recording!');
      return reject(Error('Mic is already recording!'));
    }

    const audioOpts = [
      '-d',
      '--bits', this.bits,
      '--channels', this.channels,
      '--endian', this.endianness,
      '--encoding', this.encoding,
      '--rate', this.sampleRate,
      '--type', this.type,
      '-'
    ];
    const processOpts = {
      cwd: node.os.tmpdir(),
      stdio: ['ignore', 'pipe', 'ignore']
    };
    const sox = this._process = node.child.spawn('sox', audioOpts, processOpts)
      .once('error', (err) => {
        debug('process error: %s', err);
        sox.kill('SIGKILL');
        this.emit('error', err);
      })
      .once('exit', (code, signal) => {
        debug('process %d exit. code: %d signal %s', sox.pid, code, signal);
        this._process = null;

        // Mainly for testing
        this.emit('childKilled', sox.pid);

        if (signal)
          this.emit('error', Error('Mic interrupted by ' + signal + '. Exit code: ' + code + '!'));
      });

    // Mainly for testing
    this.emit('childSpawned', sox.pid);
    debug('spawned sox process %d', sox.pid);

    this._audioStream = sox.stdout
      .once('error', (err) => {
        debug('sox stream error: %s%s', err, err.stack);
        sox.kill('SIGKILL');
        this.emit('error', err);
      })
      .once('end', () => {
        debug('sox stream ended');
        this._ended = true;
        this._read();
      });

    this.emit('recording');
    debug('mic opened');
    resolve();
  });
};


/**
 * Stops recording audio from the microphone
 *
 * @returns {Promise}
 */
Microphone.prototype.stop = function stop() {
  return new Promise((resolve) => {
    if (this._process) {
      this._process.kill('SIGTERM');
      this.emit('stopped');
      debug('stop recording');
    }

    resolve();
  });
};


/**
 * Export the class
 * @type {Microphone}
 */
module.exports = Microphone;
