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
 * @param {String} [opts.type='raw'] File-type of the audio
 * @param {Number} [opts.bits] Sample size in bits; defaults to 16 for `raw`
 * @param {Number} [opts.channels] Number of channels of audio; defaults to 2 for `raw`
 * @param {String} [opts.endianness] Byte-order for the encoding; [little, big, swap]; defaults to 'little' for `raw`
 * @param {String} [opts.encoding] Encoding of the audio; [signed-integer, unsigned-integer, floating-point, mu-law, a-law, ima-adpcm, ms-adpcm, gsm-full-rate]; defaults to `signed-integer` for `raw`
 * @param {Number} [opts.sampleRate] Rate at which audio is sampled; defaults to 44100 for `raw`
 */
function Microphone(opts) {
  Microphone.super_.call(this);

  opts = opts || {};
  this.type = opts.type || 'raw';
  this.bits = this.type === 'raw' ? opts.bits || 16 : opts.bits;
  this.channels = this.type === 'raw' ? opts.channels || 2 : opts.channels;
  this.endianness = this.type === 'raw' ? opts.endianness || 'little' : opts.endianness;
  this.encoding = this.type === 'raw' ? opts.encoding || 'signed-integer' : opts.encoding;
  this.sampleRate = this.type === 'raw' ? opts.sampleRate || 44100 : opts.sampleRate;

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

    const audioOpts = ['-d'];
    if (this.bits) audioOpts.push('--bits', this.bits);
    if (this.channels) audioOpts.push('--channels', this.channels);
    if (this.endianness) audioOpts.push('--endian', this.endianness);
    if (this.encoding) audioOpts.push('--encoding', this.encoding);
    if (this.sampleRate) audioOpts.push('--rate', this.sampleRate);
    if (this.type) audioOpts.push();
    audioOpts.push('--type', this.type);
    audioOpts.push('-');

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
