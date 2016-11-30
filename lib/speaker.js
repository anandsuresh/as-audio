'use strict';
/**
 * @file An implementation of a speaker to play audio
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
const debug = require('debug')('audio:speaker');



/**
 * An implementation of a speaker to play audio
 *
 * @param {Object} [opts] Configuration options for the speaker
 * @param {String} [opts.type='raw'] File-type of the audio
 * @param {Number} [opts.bits] Sample size in bits; defaults to 16 for `raw`
 * @param {Number} [opts.channels] Number of channels of audio; defaults to 2 for `raw`
 * @param {String} [opts.endianness] Byte-order for the encoding; [little, big, swap]; defaults to 'little' for `raw`
 * @param {String} [opts.encoding] Encoding of the audio; [signed-integer, unsigned-integer, floating-point, mu-law, a-law, ima-adpcm, ms-adpcm, gsm-full-rate]; defaults to `signed-integer` for `raw`
 * @param {Number} [opts.sampleRate] Rate at which audio is sampled; defaults to 44100 for `raw`
 */
function Speaker(opts) {
  Speaker.super_.call(this);

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

  this.on('error', (err) => debug('speaker error: ', err));
  this.on('finish', () => this._process.kill('SIGTERM'));
  this.on('pipe', () => {
    if (!this._audioStream) {
      this._openSpeaker();
      debug('speaker stream opened on pipe');
    }
  });
}
node.util.inherits(Speaker, node.stream.PassThrough);


/**
 * Writes out data to the speaker
 * @inheritdoc
 */
Speaker.prototype.write = function (chunk) {
  if (!this._audioStream) {
    this._openSpeaker();
    debug('speaker stream opened on write');
  }

  debug('write %d bytes', chunk.length);
  return this._audioStream.write.apply(this._audioStream, arguments);
};


/**
 * Writes out data to the speaker
 * @inheritdoc
 */
Speaker.prototype.end = function () {
  if (!this._audioStream) {
    this._openSpeaker();
    debug('speaker stream opened on end');
  }

  debug('speaker stream ended');
  this._ended = true;
  return this._audioStream.end.apply(this._audioStream, arguments);
};


/**
 * Opens a stream to the speaker
 */
Speaker.prototype._openSpeaker = function _openSpeaker() {
  const audioOpts = [];
  if (this.bits) audioOpts.push('--bits', this.bits);
  if (this.channels) audioOpts.push('--channels', this.channels);
  if (this.endianness) audioOpts.push('--endian', this.endianness);
  if (this.encoding) audioOpts.push('--encoding', this.encoding);
  if (this.sampleRate) audioOpts.push('--rate', this.sampleRate);
  if (this.type) audioOpts.push();
  audioOpts.push('--type', this.type);
  audioOpts.push('-', '-d');

  const processOpts = {
    cwd: node.os.tmpdir(),
    stdio: ['pipe', 'ignore', 'ignore']
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

  this._audioStream = sox.stdin
    .once('error', (err) => {
      // Ignore EPIPE errors when the stream has ended
      if (err.code === 'EPIPE' && this._ended) {
        debug('absorbed EPIPE!');
        return;
      }

      debug('sox stream error: %s%s', err, err.stack);
      sox.kill('SIGKILL');
      this.emit('error', err);
    })
    .once('end', () => {
      debug('sox stream ended');
      this._audioStream = null;
    });
};


/**
 * Export the class
 * @type {Speaker}
 */
module.exports = Speaker;
