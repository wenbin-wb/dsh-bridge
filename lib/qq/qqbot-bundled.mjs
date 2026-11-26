/*!
 * @tencent-connect/qqbot-nodejs — MIT License
 * Copyright (c) Tencent
 * https://github.com/tencent-connect/qqbot-nodejs
 *
 * This bundle inlines the official Tencent QQ Bot Node.js SDK (MIT).
 * The full upstream license text: https://github.com/tencent-connect/qqbot-nodejs/blob/main/LICENSE
 */

import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirnameFunc } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirnameFunc(__filename);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { websocketMask, websocketUnmask } = __require("http");
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (websocketMask) {
      module.exports.mask = function(source, mask, output, offset, length) {
        if (length < 24) _mask(source, mask, output, offset, length);
        else websocketMask(source, mask, output, offset, length);
      };
      module.exports.unmask = function(buffer, mask) {
        if (buffer.length < 24) _unmask(buffer, mask);
        else websocketUnmask(buffer, mask);
      };
    } else if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        this._mask = void 0;
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) {
          return dataLength ? [target, data] : [target];
        }
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (!dataLength) return [target];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https2 = __require("https");
    var http2 = __require("http");
    var net = __require("net");
    var querystring = __require("querystring");
    var tls = __require("tls");
    var { randomBytes, createHash: createHash3 } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          options = initAsClient(this, address, protocols, options);
        } else {
          this._isServer = true;
        }
        if (options.autoPong) {
          this._autoPong = true;
          this._autoPongComplete = () => autoPongComplete(this);
          this._pendingAutoPongs = 0;
          this._maxPendingAutoPongs = options.maxPendingAutoPongs | 0;
        }
        this._closeTimeout = options.closeTimeout;
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        maxPendingAutoPongs: 60,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        parsedUrl = new URL2(parsedUrl);
        parsedUrl.protocol = parsedUrl.protocol === "http:" ? "ws:" : "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request2 = isSecure ? https2.request : http2.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        const username = querystring.unescape(parsedUrl.username);
        const password = querystring.unescape(parsedUrl.password);
        opts.auth = `${username}:${password}`;
      }
      if (isIpcUrl) {
        const i = opts.path.indexOf(":");
        if (i === -1) {
          opts.socketPath = opts.path;
          opts.path = "";
        } else {
          opts.socketPath = opts.path.slice(0, i);
          opts.path = opts.path.slice(i + 1);
        }
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request2(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request2(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash3("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
      return opts;
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeCode = code;
      if (reason.length === 0) {
        websocket._closeMessage = EMPTY_BUFFER;
      } else {
        websocket._closeMessage = Buffer.allocUnsafeSlow(reason.length);
        websocket._closeMessage.set(reason);
      }
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong && websocket.readyState === WebSocket2.OPEN) {
        if (websocket._maxPendingAutoPongs > 0 && websocket._pendingAutoPongs >= websocket._maxPendingAutoPongs) {
          websocket.terminate();
        } else {
          websocket._pendingAutoPongs++;
          websocket.pong(data, !this._isServer, websocket._autoPongComplete);
        }
      }
      websocket.emit("ping", data);
    }
    function autoPongComplete(websocket) {
      websocket._pendingAutoPongs--;
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http2 = __require("http");
    var { Duplex } = __require("stream");
    var { createHash: createHash3 } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Number} [options.maxPendingAutoPongs=60] The maximum number of
       *     pending automatic pongs
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          maxPendingAutoPongs: 60,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash3("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http2.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/@tencent-connect/qqbot-nodejs/dist/QQBot.js
import * as fs3 from "node:fs";
import * as path from "node:path";

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/types.js
function resolvePolicy(ctx, path3, explicit, defaultValue) {
  if (explicit !== void 0 && explicit !== null) {
    return explicit;
  }
  const keys = path3.split(".");
  let value = ctx.state.policy;
  for (const key of keys) {
    if (value === null || value === void 0)
      break;
    value = value[key];
  }
  if (value !== void 0 && value !== null) {
    return value;
  }
  return defaultValue;
}
async function runMiddlewareChain(middlewares, ctx) {
  let index = -1;
  const dispatch = async (i) => {
    if (i <= index) {
      throw new Error("next() called multiple times");
    }
    index = i;
    if (ctx.stopped) {
      return;
    }
    if (i >= middlewares.length) {
      return;
    }
    const fn = middlewares[i];
    if (!fn) {
      return;
    }
    await fn(ctx, () => dispatch(i + 1));
  };
  await dispatch(0);
  return !ctx.stopped;
}
function createMiddlewareContext(params) {
  const receivedAt = Date.now();
  let stopped = false;
  let stopReason;
  const ac = new AbortController();
  const ctx = {
    bot: params.bot,
    message: params.message,
    replyTarget: params.message.replyTarget,
    state: {},
    log: params.log,
    stop(reason) {
      stopped = true;
      stopReason = reason;
    },
    get stopped() {
      return stopped;
    },
    get stopReason() {
      return stopReason;
    },
    get signal() {
      return ac.signal;
    },
    abort(reason) {
      ac.abort(reason);
      stopped = true;
      stopReason = reason ?? "aborted";
    },
    get aborted() {
      return ac.signal.aborted;
    },
    receivedAt
  };
  return ctx;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/types.js
var ApiError = class extends Error {
  httpStatus;
  path;
  bizCode;
  bizMessage;
  name = "ApiError";
  constructor(message, httpStatus, path3, bizCode, bizMessage) {
    super(message);
    this.httpStatus = httpStatus;
    this.path = path3;
    this.bizCode = bizCode;
    this.bizMessage = bizMessage;
  }
};
var MediaFileType;
(function(MediaFileType2) {
  MediaFileType2[MediaFileType2["IMAGE"] = 1] = "IMAGE";
  MediaFileType2[MediaFileType2["VIDEO"] = 2] = "VIDEO";
  MediaFileType2[MediaFileType2["VOICE"] = 3] = "VOICE";
  MediaFileType2[MediaFileType2["FILE"] = 4] = "FILE";
})(MediaFileType || (MediaFileType = {}));
var StreamInputMode = {
  REPLACE: "replace"
};
var StreamInputState = {
  GENERATING: 1,
  DONE: 10
};
var StreamContentType = {
  MARKDOWN: "markdown"
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/format.js
function formatErrorMessage(err) {
  if (err instanceof Error) {
    let formatted = err.message || err.name || "Error";
    let cause = err.cause;
    const seen = /* @__PURE__ */ new Set([err]);
    while (cause && !seen.has(cause)) {
      seen.add(cause);
      if (cause instanceof Error) {
        if (cause.message) {
          formatted += ` | ${cause.message}`;
        }
        cause = cause.cause;
      } else if (typeof cause === "string") {
        formatted += ` | ${cause}`;
        break;
      } else {
        break;
      }
    }
    return formatted;
  }
  if (typeof err === "string") {
    return err;
  }
  if (err === null || err === void 0 || typeof err === "number" || typeof err === "boolean" || typeof err === "bigint") {
    return String(err);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return Object.prototype.toString.call(err);
  }
}
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/api-client.js
var DEFAULT_BASE_URL = "https://api.sgroup.qq.com";
var DEFAULT_TIMEOUT_MS = 3e4;
var FILE_UPLOAD_TIMEOUT_MS = 12e4;
var ApiClient = class {
  baseUrl;
  defaultTimeoutMs;
  fileUploadTimeoutMs;
  logger;
  resolveUserAgent;
  constructor(config = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fileUploadTimeoutMs = config.fileUploadTimeoutMs ?? FILE_UPLOAD_TIMEOUT_MS;
    this.logger = config.logger;
    const ua = config.userAgent ?? "qqbot-nodejs/unknown";
    this.resolveUserAgent = typeof ua === "function" ? ua : () => ua;
  }
  async request(accessToken, method, path3, body, options) {
    const url = `${this.baseUrl}${path3}`;
    const headers = {
      Authorization: `QQBot ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": this.resolveUserAgent()
    };
    const isFileUpload = options?.uploadRequest === true || path3.includes("/files") || path3.includes("/upload_prepare") || path3.includes("/upload_part_finish");
    const timeout = options?.timeoutMs ?? (isFileUpload ? this.fileUploadTimeoutMs : this.defaultTimeoutMs);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const fetchInit = { method, headers, signal: controller.signal };
    if (body) {
      fetchInit.body = JSON.stringify(body);
    }
    this.logger?.debug?.(`[qqbot:api] >>> ${method} ${url} (timeout: ${timeout}ms)`);
    if (body && this.logger?.debug) {
      const logBody = { ...body };
      for (const key of options?.redactBodyKeys ?? ["file_data"]) {
        if (typeof logBody[key] === "string") {
          logBody[key] = `<redacted ${logBody[key].length} chars>`;
        }
      }
      this.logger.debug(`[qqbot:api] >>> Body: ${JSON.stringify(logBody)}`);
    }
    let res;
    try {
      res = await fetch(url, fetchInit);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        this.logger?.error?.(`[qqbot:api] <<< Timeout after ${timeout}ms`);
        throw new ApiError(`Request timeout [${path3}]: exceeded ${timeout}ms`, 0, path3);
      }
      this.logger?.error?.(`[qqbot:api] <<< Network error: ${formatErrorMessage(err)}`);
      throw new ApiError(`Network error [${path3}]: ${formatErrorMessage(err)}`, 0, path3);
    } finally {
      clearTimeout(timeoutId);
    }
    const traceId = res.headers.get("x-tps-trace-id") ?? "";
    this.logger?.info?.(`[qqbot:api] <<< Status: ${res.status} ${res.statusText}${traceId ? ` | TraceId: ${traceId}` : ""}`);
    let rawBody;
    try {
      rawBody = await res.text();
    } catch (err) {
      throw new ApiError(`Failed to read response [${path3}]: ${formatErrorMessage(err)}`, res.status, path3);
    }
    this.logger?.debug?.(`[qqbot:api] <<< Body: ${rawBody}`);
    const contentType = res.headers.get("content-type") ?? "";
    const isHtmlResponse = contentType.includes("text/html") || rawBody.trimStart().startsWith("<");
    if (!res.ok) {
      if (isHtmlResponse) {
        const statusHint = res.status === 502 || res.status === 503 || res.status === 504 ? "\u8C03\u7528\u53D1\u751F\u5F02\u5E38\uFF0C\u8BF7\u7A0D\u5019\u91CD\u8BD5" : res.status === 429 ? "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u5DF2\u88AB\u9650\u6D41" : `\u5F00\u653E\u5E73\u53F0\u8FD4\u56DE HTTP ${res.status}`;
        throw new ApiError(`${statusHint}\uFF08${path3}\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5`, res.status, path3);
      }
      try {
        const error = JSON.parse(rawBody);
        const bizCode = error.code ?? error.err_code;
        throw new ApiError(`API Error [${path3}]: ${error.message ?? rawBody}`, res.status, path3, bizCode, error.message);
      } catch (parseErr) {
        if (parseErr instanceof ApiError) {
          throw parseErr;
        }
        throw new ApiError(`API Error [${path3}] HTTP ${res.status}: ${rawBody.slice(0, 200)}`, res.status, path3);
      }
    }
    if (isHtmlResponse) {
      throw new ApiError(`QQ \u670D\u52A1\u7AEF\u8FD4\u56DE\u4E86\u975E JSON \u54CD\u5E94\uFF08${path3}\uFF09\uFF0C\u53EF\u80FD\u662F\u4E34\u65F6\u6545\u969C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5`, res.status, path3);
    }
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new ApiError(`\u5F00\u653E\u5E73\u53F0\u54CD\u5E94\u683C\u5F0F\u5F02\u5E38\uFF08${path3}\uFF09\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5`, res.status, path3);
    }
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/media-chunked.js
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as https from "node:https";

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/retry.js
async function withRetry(fn, policy, persistentPolicy, logger) {
  let lastError = null;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(formatErrorMessage(err));
      if (persistentPolicy?.shouldPersistRetry(lastError)) {
        (logger?.warn ?? logger?.error)?.(`[qqbot:retry] Hit persistent-retry trigger, entering persistent loop (timeout=${persistentPolicy.timeoutMs / 1e3}s)`);
        return await persistentRetryLoop(fn, persistentPolicy, logger);
      }
      if (policy.shouldRetry?.(lastError, attempt) === false) {
        throw lastError;
      }
      if (attempt < policy.maxRetries) {
        const delay = policy.backoff === "exponential" ? policy.baseDelayMs * 2 ** attempt : policy.baseDelayMs;
        logger?.debug?.(`[qqbot:retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message.slice(0, 100)}`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
async function persistentRetryLoop(fn, policy, logger) {
  const deadline = Date.now() + policy.timeoutMs;
  let attempt = 0;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      logger?.debug?.(`[qqbot:retry] Persistent retry succeeded after ${attempt} retries`);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(formatErrorMessage(err));
      if (!policy.shouldPersistRetry(lastError)) {
        logger?.error?.(`[qqbot:retry] Persistent retry: error is no longer retryable, aborting`);
        throw lastError;
      }
      attempt++;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      const actualDelay = Math.min(policy.intervalMs, remaining);
      (logger?.warn ?? logger?.error)?.(`[qqbot:retry] Persistent retry #${attempt}: retrying in ${actualDelay}ms (remaining=${Math.round(remaining / 1e3)}s)`);
      await sleep(actualDelay);
    }
  }
  logger?.error?.(`[qqbot:retry] Persistent retry timed out after ${policy.timeoutMs / 1e3}s (${attempt} attempts)`);
  throw lastError ?? new Error(`Persistent retry timed out (${policy.timeoutMs / 1e3}s)`);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var UPLOAD_RETRY_POLICY = {
  maxRetries: 2,
  baseDelayMs: 1e3,
  backoff: "exponential",
  shouldRetry: (error) => {
    const msg = error.message;
    return !(msg.includes("400") || msg.includes("401") || msg.includes("Invalid") || msg.includes("timeout") || msg.includes("Timeout"));
  }
};
var COMPLETE_UPLOAD_RETRY_POLICY = {
  maxRetries: 2,
  baseDelayMs: 2e3,
  backoff: "exponential"
};
var PART_FINISH_RETRY_POLICY = {
  maxRetries: 2,
  baseDelayMs: 1e3,
  backoff: "exponential"
};
function buildPartFinishPersistentPolicy(retryTimeoutMs, retryableCodes = PART_FINISH_RETRYABLE_CODES) {
  return {
    timeoutMs: retryTimeoutMs ?? 2 * 60 * 1e3,
    intervalMs: 1e3,
    shouldPersistRetry: (error) => {
      if (retryableCodes.size === 0) {
        return false;
      }
      if ("bizCode" in error && typeof error.bizCode === "number") {
        return retryableCodes.has(error.bizCode);
      }
      return false;
    }
  };
}
var PART_FINISH_RETRYABLE_CODES = /* @__PURE__ */ new Set([40093001]);
var UPLOAD_PREPARE_FALLBACK_CODE = 40093002;

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/routes.js
function messagePath(scope, targetId) {
  return scope === "c2c" ? `/v2/users/${targetId}/messages` : `/v2/groups/${targetId}/messages`;
}
function channelMessagePath(channelId) {
  return `/channels/${channelId}/messages`;
}
function dmMessagePath(guildId) {
  return `/dms/${guildId}/messages`;
}
function mediaUploadPath(scope, targetId) {
  return scope === "c2c" ? `/v2/users/${targetId}/files` : `/v2/groups/${targetId}/files`;
}
function uploadPreparePath(scope, targetId) {
  return scope === "c2c" ? `/v2/users/${targetId}/upload_prepare` : `/v2/groups/${targetId}/upload_prepare`;
}
function uploadPartFinishPath(scope, targetId) {
  return scope === "c2c" ? `/v2/users/${targetId}/upload_part_finish` : `/v2/groups/${targetId}/upload_part_finish`;
}
function uploadCompletePath(scope, targetId) {
  return mediaUploadPath(scope, targetId);
}
function streamMessagePath(openid) {
  return `/v2/users/${openid}/stream_messages`;
}
function gatewayPath() {
  return "/gateway";
}
function interactionPath(interactionId) {
  return `/interactions/${interactionId}`;
}
function getNextMsgSeq(_msgId) {
  const timePart = Date.now() % 1e8;
  const random = Math.floor(Math.random() * 65536);
  return (timePart ^ random) % 65536;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/media-chunked.js
var UploadDailyLimitExceededError = class extends Error {
  filePath;
  fileSize;
  name = "UploadDailyLimitExceededError";
  constructor(filePath, fileSize, originalMessage) {
    super(originalMessage);
    this.filePath = filePath;
    this.fileSize = fileSize;
  }
};
var DEFAULT_CONCURRENT_PARTS = 1;
var MAX_CONCURRENT_PARTS = 10;
var MAX_PART_FINISH_RETRY_TIMEOUT_MS = 10 * 60 * 1e3;
var PART_UPLOAD_TIMEOUT_MS = 3e5;
var MD5_10M_SIZE = 10002432;
var ChunkedMediaApi = class {
  client;
  tokenManager;
  logger;
  cache;
  sanitize;
  constructor(client, tokenManager, config = {}) {
    this.client = client;
    this.tokenManager = tokenManager;
    this.logger = config.logger;
    this.cache = config.uploadCache;
    this.sanitize = config.sanitizeFileName ?? ((n) => n);
  }
  async uploadChunked(opts) {
    const prefix = opts.logPrefix ?? "[qqbot:chunked-upload]";
    const input = resolveSource(opts.source, opts.fileName);
    const displayName = input.fileName;
    const fileSize = input.size;
    const pathLabel = input.kind === "localPath" ? input.path : "<buffer>";
    this.logger?.info?.(`${prefix} Start: file=${displayName} size=${formatFileSize(fileSize)} type=${opts.fileType}`);
    const hashes = await computeHashes(input);
    this.logger?.debug?.(`${prefix} hashes: md5=${hashes.md5} sha1=${hashes.sha1} md5_10m=${hashes.md5_10m}`);
    if (this.cache) {
      const cached = this.cache.get(hashes.md5, opts.scope, opts.targetId, opts.fileType);
      if (cached) {
        this.logger?.info?.(`${prefix} cache HIT (md5=${hashes.md5.slice(0, 8)}) \u2014 skipping chunked upload`);
        return { file_uuid: "", file_info: cached, ttl: 0 };
      }
    }
    const fileNameForPrepare = opts.fileType === MediaFileType.FILE ? this.sanitize(displayName) : displayName;
    const prepareResp = await this.callUploadPrepare(opts, fileNameForPrepare, fileSize, hashes, pathLabel);
    const { upload_id, parts } = prepareResp;
    const block_size = prepareResp.block_size;
    const maxConcurrent = Math.min(prepareResp.concurrency ? prepareResp.concurrency : DEFAULT_CONCURRENT_PARTS, MAX_CONCURRENT_PARTS);
    const retryTimeoutMs = prepareResp.retry_timeout ? Math.min(prepareResp.retry_timeout * 1e3, MAX_PART_FINISH_RETRY_TIMEOUT_MS) : void 0;
    this.logger?.info?.(`${prefix} prepared: upload_id=${upload_id} block=${formatFileSize(block_size)} parts=${parts.length} concurrency=${maxConcurrent}`);
    let completedParts = 0;
    let uploadedBytes = 0;
    const uploadPart = async (part) => {
      const partIndex = part.index;
      const offset = (partIndex - 1) * block_size;
      const length = Math.min(block_size, fileSize - offset);
      const partBuffer = await readPart(input, offset, length);
      const md5Hex = crypto.createHash("md5").update(partBuffer).digest("hex");
      this.logger?.debug?.(`${prefix} part ${partIndex}/${parts.length}: ${formatFileSize(length)} offset=${offset} md5=${md5Hex}`);
      await putToPresignedUrl(part.presigned_url, partBuffer, partIndex, parts.length, this.logger, prefix);
      await this.callUploadPartFinish(opts, upload_id, partIndex, length, md5Hex, retryTimeoutMs);
      completedParts++;
      uploadedBytes += length;
      this.logger?.info?.(`${prefix} part ${partIndex}/${parts.length} done (${completedParts}/${parts.length})`);
      opts.onProgress?.({
        completedParts,
        totalParts: parts.length,
        uploadedBytes,
        totalBytes: fileSize
      });
    };
    await runWithConcurrency(parts.map((part) => () => uploadPart(part)), maxConcurrent);
    this.logger?.info?.(`${prefix} all parts uploaded, completing...`);
    const result = await this.callCompleteUpload(opts, upload_id);
    this.logger?.info?.(`${prefix} completed: file_uuid=${result.file_uuid} ttl=${result.ttl}s`);
    if (this.cache && result.file_info && result.ttl > 0) {
      this.cache.set(hashes.md5, opts.scope, opts.targetId, opts.fileType, result.file_info, result.file_uuid, result.ttl);
    }
    return result;
  }
  async callUploadPrepare(opts, fileName, fileSize, hashes, pathLabel) {
    const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
    const path3 = uploadPreparePath(opts.scope, opts.targetId);
    try {
      return await this.client.request(token, "POST", path3, {
        file_type: opts.fileType,
        file_name: fileName,
        file_size: fileSize,
        md5: hashes.md5,
        sha1: hashes.sha1,
        md5_10m: hashes.md5_10m
      }, { uploadRequest: true });
    } catch (err) {
      if (err instanceof ApiError && err.bizCode === UPLOAD_PREPARE_FALLBACK_CODE) {
        throw new UploadDailyLimitExceededError(pathLabel, fileSize, err.message);
      }
      throw err;
    }
  }
  async callUploadPartFinish(opts, uploadId, partIndex, blockSize, md5, retryTimeoutMs) {
    const persistentPolicy = buildPartFinishPersistentPolicy(retryTimeoutMs);
    const path3 = uploadPartFinishPath(opts.scope, opts.targetId);
    await withRetry(async () => {
      const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
      return this.client.request(token, "POST", path3, {
        upload_id: uploadId,
        part_index: partIndex,
        block_size: blockSize,
        md5
      }, { uploadRequest: true });
    }, PART_FINISH_RETRY_POLICY, persistentPolicy, this.logger);
  }
  async callCompleteUpload(opts, uploadId) {
    const path3 = uploadCompletePath(opts.scope, opts.targetId);
    return withRetry(async () => {
      const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
      return this.client.request(token, "POST", path3, { upload_id: uploadId }, { uploadRequest: true });
    }, COMPLETE_UPLOAD_RETRY_POLICY, void 0, this.logger);
  }
};
function resolveSource(source, fileNameOverride) {
  if (source.kind === "localPath") {
    const inferredName = source.path.split(/[/\\]/).pop() || "file";
    return {
      kind: "localPath",
      path: source.path,
      size: source.size,
      fileName: fileNameOverride ?? inferredName
    };
  }
  return {
    kind: "buffer",
    buffer: source.buffer,
    size: source.buffer.length,
    fileName: fileNameOverride ?? source.fileName ?? "file"
  };
}
async function readPart(input, offset, length) {
  if (input.kind === "buffer") {
    return input.buffer.subarray(offset, offset + length);
  }
  const handle = await fs.promises.open(input.path, "r");
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buf, 0, length, offset);
    return bytesRead < length ? buf.subarray(0, bytesRead) : buf;
  } finally {
    await handle.close();
  }
}
async function computeHashes(input) {
  if (input.kind === "buffer") {
    const md5 = crypto.createHash("md5").update(input.buffer).digest("hex");
    const sha1 = crypto.createHash("sha1").update(input.buffer).digest("hex");
    const md5_10m = input.size > MD5_10M_SIZE ? crypto.createHash("md5").update(input.buffer.subarray(0, MD5_10M_SIZE)).digest("hex") : md5;
    return { md5, sha1, md5_10m };
  }
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash("md5");
    const sha1 = crypto.createHash("sha1");
    const md5_10m = crypto.createHash("md5");
    let consumed = 0;
    const needsMd5_10m = input.size > MD5_10M_SIZE;
    const stream = fs.createReadStream(input.path);
    stream.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      md5.update(buf);
      sha1.update(buf);
      if (needsMd5_10m) {
        const remaining = MD5_10M_SIZE - consumed;
        if (remaining > 0) {
          md5_10m.update(remaining >= buf.length ? buf : buf.subarray(0, remaining));
        }
      }
      consumed += buf.length;
    });
    stream.on("end", () => {
      const md5Hex = md5.digest("hex");
      const sha1Hex = sha1.digest("hex");
      resolve({
        md5: md5Hex,
        sha1: sha1Hex,
        md5_10m: needsMd5_10m ? md5_10m.digest("hex") : md5Hex
      });
    });
    stream.on("error", reject);
  });
}
var PART_UPLOAD_MAX_RETRIES = 2;
function putToCOS(presignedUrl, data, signal) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(presignedUrl);
    const req = https.request(parsed, {
      method: "PUT",
      headers: { "Content-Length": String(data.length) },
      signal
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const etag = (res.headers.etag ?? "").replace(/"/g, "");
        const requestId = res.headers["x-cos-request-id"]?.toString() ?? "-";
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, etag, requestId });
        } else {
          reject(new Error(`COS PUT failed: ${res.statusCode} ${res.statusMessage ?? ""} - ${Buffer.concat(chunks).toString().slice(0, 120)}`));
        }
      });
      res.on("error", reject);
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.end(data);
  });
}
async function putToPresignedUrl(presignedUrl, data, partIndex, totalParts, logger, prefix) {
  let lastError = null;
  for (let attempt = 0; attempt <= PART_UPLOAD_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PART_UPLOAD_TIMEOUT_MS);
    try {
      const startTime = Date.now();
      const { etag, requestId } = await putToCOS(presignedUrl, data, controller.signal);
      const elapsed = Date.now() - startTime;
      logger?.debug?.(`${prefix} PUT part ${partIndex}/${totalParts} OK (${elapsed}ms ETag=${etag} requestId=${requestId})`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const code = err.code ?? "none";
      const causeMsg = (() => {
        const c = err instanceof Error ? err.cause : void 0;
        return c instanceof Error ? c.message : "none";
      })();
      if (lastError.name === "AbortError") {
        lastError = new Error(`Part ${partIndex}/${totalParts} upload timeout after ${PART_UPLOAD_TIMEOUT_MS}ms`);
      }
      if (attempt < PART_UPLOAD_MAX_RETRIES) {
        const delay = 1e3 * 2 ** attempt;
        (logger?.warn ?? logger?.error)?.(`${prefix} PUT part ${partIndex}/${totalParts} attempt ${attempt + 1} failed (${lastError.message.slice(0, 120)} code=${code} cause=${causeMsg}), retrying in ${delay}ms`);
        await sleep2(delay);
      } else {
        logger?.error?.(`${prefix} PUT part ${partIndex}/${totalParts} all retries exhausted (code=${code} cause=${causeMsg})`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError ?? new Error(`Part ${partIndex}/${totalParts} upload failed`);
}
async function runWithConcurrency(tasks, maxConcurrent) {
  for (let i = 0; i < tasks.length; i += maxConcurrent) {
    const batch = tasks.slice(i, i + maxConcurrent);
    await Promise.all(batch.map((task) => task()));
  }
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/media.js
import * as fs2 from "node:fs";

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/file-utils.js
var MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
var CHUNKED_UPLOAD_MAX_SIZE = 100 * 1024 * 1024;
var LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;
var MEDIA_FILE_TYPE_INFO = {
  [MediaFileType.IMAGE]: { maxSize: 30 * 1024 * 1024, name: "image" },
  [MediaFileType.VIDEO]: { maxSize: 100 * 1024 * 1024, name: "video" },
  [MediaFileType.VOICE]: { maxSize: 20 * 1024 * 1024, name: "voice" },
  [MediaFileType.FILE]: { maxSize: 100 * 1024 * 1024, name: "file" }
};
function getMaxUploadSize(fileType) {
  return MEDIA_FILE_TYPE_INFO[fileType]?.maxSize ?? CHUNKED_UPLOAD_MAX_SIZE;
}
function sanitizeFileName(name) {
  if (!name) {
    return "file";
  }
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return cleaned || "file";
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/media.js
var MAX_BASE64_CHECK_SIZE = Math.ceil(MAX_UPLOAD_SIZE * 1.4);
function formatUploadSize() {
  return formatFileSize(MAX_UPLOAD_SIZE);
}
var MediaApi = class {
  client;
  tokenManager;
  logger;
  cache;
  sanitize;
  constructor(client, tokenManager, config = {}) {
    this.client = client;
    this.tokenManager = tokenManager;
    this.logger = config.logger;
    this.cache = config.uploadCache;
    this.sanitize = config.sanitizeFileName ?? ((n) => n);
  }
  /**
   * Upload media via base64, URL, buffer, or local file path to a C2C or Group target.
   */
  async uploadMedia(scope, targetId, fileType, creds, opts) {
    const sources = [opts.url, opts.fileData, opts.buffer, opts.localPath].filter((v) => v !== void 0);
    if (sources.length === 0) {
      throw new Error(`uploadMedia: one of url/fileData/buffer/localPath is required`);
    }
    if (sources.length > 1) {
      throw new Error(`uploadMedia: url/fileData/buffer/localPath are mutually exclusive (got ${sources.length})`);
    }
    let fileData = opts.fileData;
    if (opts.buffer) {
      fileData = opts.buffer.toString("base64");
    } else if (opts.localPath) {
      const buf = await fs2.promises.readFile(opts.localPath);
      fileData = buf.toString("base64");
    }
    if (fileData && fileData.length > MAX_BASE64_CHECK_SIZE) {
      const sizeMB = (fileData.length / (1024 * 1024)).toFixed(1);
      throw new Error(`fileData too large (${sizeMB}MB decoded); QQ Bot single upload limit is ${formatUploadSize()}`);
    }
    if (fileData && this.cache) {
      const hash = this.cache.computeHash(fileData);
      const cached = this.cache.get(hash, scope, targetId, fileType);
      if (cached) {
        return { file_uuid: "", file_info: cached, ttl: 0 };
      }
    }
    const body = {
      file_type: fileType,
      srv_send_msg: opts.srvSendMsg ?? false
    };
    if (opts.url) {
      body.url = opts.url;
    } else if (fileData) {
      body.file_data = fileData;
    }
    if (fileType === MediaFileType.FILE && opts.fileName) {
      body.file_name = this.sanitize(opts.fileName);
    }
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const path3 = mediaUploadPath(scope, targetId);
    const result = await withRetry(() => this.client.request(token, "POST", path3, body, {
      redactBodyKeys: ["file_data"],
      uploadRequest: true
    }), UPLOAD_RETRY_POLICY, void 0, this.logger);
    if (fileData && result.file_info && result.ttl > 0 && this.cache) {
      const hash = this.cache.computeHash(fileData);
      this.cache.set(hash, scope, targetId, fileType, result.file_info, result.file_uuid, result.ttl);
    }
    return result;
  }
  /**
   * Send a media message (post upload) to a C2C or Group target.
   */
  async sendMediaMessage(scope, targetId, fileInfo, creds, opts) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const msgSeq = opts?.msgId ? getNextMsgSeq(opts.msgId) : 1;
    const path3 = messagePath(scope, targetId);
    return this.client.request(token, "POST", path3, {
      msg_type: 7,
      media: { file_info: fileInfo },
      msg_seq: msgSeq,
      ...opts?.content ? { content: opts.content } : {},
      ...opts?.msgId ? { msg_id: opts.msgId } : {}
    });
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/messages.js
var MessageApi = class {
  client;
  tokenManager;
  markdownSupport;
  logger;
  messageSentHook = null;
  constructor(client, tokenManager, config) {
    this.client = client;
    this.tokenManager = tokenManager;
    this.markdownSupport = config.markdownSupport;
    this.logger = config.logger;
  }
  onMessageSent(callback) {
    this.messageSentHook = callback;
  }
  notifyMessageSent(refIdx, meta) {
    if (this.messageSentHook) {
      try {
        this.messageSentHook(refIdx, meta);
      } catch (err) {
        this.logger?.error?.(`[qqbot:messages] onMessageSent hook error: ${formatErrorMessage(err)}`);
      }
    }
  }
  async sendMessage(scope, targetId, content, creds, opts) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const msgSeq = opts?.msgId ? getNextMsgSeq(opts.msgId) : 1;
    const body = this.buildMessageBody(content, opts?.msgId, msgSeq, opts?.messageReference, opts?.inlineKeyboard);
    const path3 = messagePath(scope, targetId);
    return this.sendAndNotify(creds.appId, token, "POST", path3, body, { text: content });
  }
  async sendProactiveMessage(scope, targetId, content, creds) {
    if (!content?.trim()) {
      throw new Error("Proactive message content must not be empty");
    }
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const body = this.buildProactiveBody(content);
    const path3 = messagePath(scope, targetId);
    return this.sendAndNotify(creds.appId, token, "POST", path3, body, { text: content });
  }
  async sendChannelMessage(opts) {
    const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
    return this.client.request(token, "POST", channelMessagePath(opts.channelId), {
      content: opts.content,
      ...opts.msgId ? { msg_id: opts.msgId } : {}
    });
  }
  async sendDmMessage(opts) {
    const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
    return this.client.request(token, "POST", dmMessagePath(opts.guildId), {
      content: opts.content,
      ...opts.msgId ? { msg_id: opts.msgId } : {}
    });
  }
  /** Send a typing indicator to a C2C user. */
  async sendInputNotify(opts) {
    const inputSecond = opts.inputSecond ?? 60;
    const token = await this.tokenManager.getAccessToken(opts.creds.appId, opts.creds.clientSecret);
    const msgSeq = opts.msgId ? getNextMsgSeq(opts.msgId) : 1;
    const response = await this.client.request(token, "POST", messagePath("c2c", opts.openid), {
      msg_type: 6,
      input_notify: { input_type: 1, input_second: inputSecond },
      msg_seq: msgSeq,
      ...opts.msgId ? { msg_id: opts.msgId } : {}
    });
    return { refIdx: response.ext_info?.ref_idx };
  }
  async acknowledgeInteraction(interactionId, creds, code = 0, data) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const body = { code };
    if (data)
      body.data = data;
    await this.client.request(token, "PUT", interactionPath(interactionId), body);
  }
  /** Get the WebSocket gateway URL for the bot. */
  async getGatewayUrl(creds) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const data = await this.client.request(token, "GET", gatewayPath());
    return data.url;
  }
  /**
   * Send a C2C stream message chunk (`/v2/users/{openid}/stream_messages`).
   * Only supported for one-to-one chats.
   */
  async sendC2CStreamMessage(creds, openid, req) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const path3 = streamMessagePath(openid);
    const body = {
      input_mode: req.input_mode,
      input_state: req.input_state,
      content_type: req.content_type,
      content_raw: req.content_raw,
      event_id: req.event_id,
      msg_id: req.msg_id,
      msg_seq: req.msg_seq,
      index: req.index
    };
    if (req.stream_msg_id) {
      body.stream_msg_id = req.stream_msg_id;
    }
    return this.client.request(token, "POST", path3, body);
  }
  /**
   * Raw message send — transparently forwards all fields to the QQ Open Platform API.
   *
   * This is the "escape hatch" for any message type not covered by the
   * higher-level helpers. Fields like `msg_type`, `markdown`, `ark`, `embed`,
   * `keyboard`, `media`, `message_reference`, `is_wakeup` etc. are passed through
   * as-is to `/v2/users/{openid}/messages` or `/v2/groups/{group_openid}/messages`.
   *
   * Auto-injects `msg_seq` if not provided.
   */
  async sendRaw(scope, targetId, creds, body) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const path3 = messagePath(scope, targetId);
    if (body.msg_seq === void 0) {
      body.msg_seq = body.msg_id ? getNextMsgSeq(body.msg_id) : 1;
    }
    if (body.msg_type === void 0) {
      if (body.markdown)
        body.msg_type = 2;
      else if (body.ark)
        body.msg_type = 3;
      else if (body.embed)
        body.msg_type = 4;
      else if (body.media)
        body.msg_type = 7;
      else
        body.msg_type = 0;
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== void 0));
    return this.sendAndNotify(creds.appId, token, "POST", path3, cleaned, { text: cleaned.content ?? cleaned.markdown?.content });
  }
  /**
   * Send a message to a guild text channel.
   * Supports content, keyboard, message_reference, and arbitrary extra fields.
   */
  async sendChannelMessageRaw(channelId, creds, body) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== void 0));
    return this.client.request(token, "POST", channelMessagePath(channelId), cleaned);
  }
  /**
   * Send a DM (direct message) in a guild.
   */
  async sendDmMessageRaw(guildId, creds, body) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== void 0));
    return this.client.request(token, "POST", dmMessagePath(guildId), cleaned);
  }
  /**
   * Recall (delete) a message.
   */
  async recallMessage(scope, targetId, messageId, creds) {
    const token = await this.tokenManager.getAccessToken(creds.appId, creds.clientSecret);
    const path3 = `${messagePath(scope, targetId)}/${messageId}`;
    await this.client.request(token, "DELETE", path3);
  }
  async sendAndNotify(_appId, accessToken, method, path3, body, meta) {
    const result = await this.client.request(accessToken, method, path3, body);
    if (result.ext_info?.ref_idx && this.messageSentHook) {
      try {
        this.messageSentHook(result.ext_info.ref_idx, meta);
      } catch (err) {
        this.logger?.error?.(`[qqbot:messages] onMessageSent hook error: ${formatErrorMessage(err)}`);
      }
    }
    return result;
  }
  buildMessageBody(content, msgId, msgSeq, messageReference, inlineKeyboard) {
    const body = this.markdownSupport ? { markdown: { content }, msg_type: 2, msg_seq: msgSeq } : { content, msg_type: 0, msg_seq: msgSeq };
    if (msgId) {
      body.msg_id = msgId;
    }
    if (messageReference && !this.markdownSupport) {
      body.message_reference = { message_id: messageReference };
    }
    if (inlineKeyboard) {
      body.keyboard = inlineKeyboard;
    }
    return body;
  }
  buildProactiveBody(content) {
    return this.markdownSupport ? { markdown: { content }, msg_type: 2 } : { content, msg_type: 0 };
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/api/token.js
var DEFAULT_TOKEN_BASE_URL = "https://bots.qq.com";
var TOKEN_PATH = "/app/getAppAccessToken";
var DEFAULT_TOKEN_TIMEOUT_MS = 1e4;
var FIVE_MINUTES_MS = 5 * 60 * 1e3;
var TokenManager = class {
  cache = /* @__PURE__ */ new Map();
  fetchPromises = /* @__PURE__ */ new Map();
  refreshControllers = /* @__PURE__ */ new Map();
  logger;
  resolveUserAgent;
  baseUrl;
  constructor(config) {
    this.logger = config?.logger;
    const ua = config?.userAgent ?? "qqbot-nodejs/unknown";
    this.resolveUserAgent = typeof ua === "function" ? ua : () => ua;
    this.baseUrl = config?.baseUrl ?? DEFAULT_TOKEN_BASE_URL;
  }
  async getAccessToken(appId, clientSecret) {
    const normalizedId = appId.trim();
    const cached = this.cache.get(normalizedId);
    const refreshAheadMs = cached ? Math.min(FIVE_MINUTES_MS, (cached.expiresAt - Date.now()) / 3) : 0;
    if (cached && Date.now() < cached.expiresAt - refreshAheadMs) {
      return cached.token;
    }
    let pending = this.fetchPromises.get(normalizedId);
    if (pending) {
      this.logger?.debug?.(`[qqbot:token:${normalizedId}] Fetch in progress, reusing promise`);
      return pending;
    }
    pending = (async () => {
      try {
        return await this.doFetchToken(normalizedId, clientSecret);
      } finally {
        this.fetchPromises.delete(normalizedId);
      }
    })();
    this.fetchPromises.set(normalizedId, pending);
    return pending;
  }
  clearCache(appId) {
    if (appId) {
      this.cache.delete(appId.trim());
      this.logger?.debug?.(`[qqbot:token:${appId}] Cache cleared`);
    } else {
      this.cache.clear();
      this.logger?.debug?.(`[token] All caches cleared`);
    }
  }
  getStatus(appId) {
    if (this.fetchPromises.has(appId)) {
      return { status: "refreshing", expiresAt: this.cache.get(appId)?.expiresAt ?? null };
    }
    const cached = this.cache.get(appId);
    if (!cached) {
      return { status: "none", expiresAt: null };
    }
    const remaining = cached.expiresAt - Date.now();
    const isValid = remaining > Math.min(FIVE_MINUTES_MS, remaining / 3);
    return { status: isValid ? "valid" : "expired", expiresAt: cached.expiresAt };
  }
  startBackgroundRefresh(appId, clientSecret, options) {
    if (this.refreshControllers.has(appId)) {
      this.logger?.info?.(`[qqbot:token:${appId}] Background refresh already running`);
      return;
    }
    const { refreshAheadMs = 5 * 60 * 1e3, randomOffsetMs = 30 * 1e3, minRefreshIntervalMs = 60 * 1e3, retryDelayMs = 5 * 1e3 } = options ?? {};
    const controller = new AbortController();
    this.refreshControllers.set(appId, controller);
    const { signal } = controller;
    const loop = async () => {
      this.logger?.info?.(`[qqbot:token:${appId}] Background refresh started`);
      while (!signal.aborted) {
        try {
          await this.getAccessToken(appId, clientSecret);
          const cached = this.cache.get(appId);
          if (cached) {
            const expiresIn = cached.expiresAt - Date.now();
            const randomOffset = Math.random() * randomOffsetMs;
            const refreshIn = Math.max(expiresIn - refreshAheadMs - randomOffset, minRefreshIntervalMs);
            this.logger?.debug?.(`[qqbot:token:${appId}] Next refresh in ${Math.round(refreshIn / 1e3)}s`);
            await this.abortableSleep(refreshIn, signal);
          } else {
            await this.abortableSleep(minRefreshIntervalMs, signal);
          }
        } catch (err) {
          if (signal.aborted) {
            break;
          }
          this.logger?.error?.(`[qqbot:token:${appId}] Background refresh failed: ${formatErrorMessage(err)}`);
          await this.abortableSleep(retryDelayMs, signal);
        }
      }
      if (this.refreshControllers.get(appId) === controller) {
        this.refreshControllers.delete(appId);
      }
      this.logger?.info?.(`[qqbot:token:${appId}] Background refresh stopped`);
    };
    loop().catch((err) => {
      if (this.refreshControllers.get(appId) === controller) {
        this.refreshControllers.delete(appId);
        this.logger?.error?.(`[qqbot:token:${appId}] Background refresh crashed: ${formatErrorMessage(err)}`);
      }
    });
  }
  stopBackgroundRefresh(appId) {
    if (appId) {
      const ctrl = this.refreshControllers.get(appId);
      if (ctrl) {
        ctrl.abort();
        this.refreshControllers.delete(appId);
      }
    } else {
      for (const ctrl of this.refreshControllers.values()) {
        ctrl.abort();
      }
      this.refreshControllers.clear();
    }
  }
  isBackgroundRefreshRunning(appId) {
    if (appId) {
      return this.refreshControllers.has(appId);
    }
    return this.refreshControllers.size > 0;
  }
  async doFetchToken(appId, clientSecret) {
    const url = `${this.baseUrl}${TOKEN_PATH}`;
    this.logger?.debug?.(`[qqbot:token:${appId}] >>> POST ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TOKEN_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.resolveUserAgent()
        },
        body: JSON.stringify({ appId, clientSecret }),
        signal: controller.signal
      });
    } catch (err) {
      this.logger?.error?.(`[qqbot:token:${appId}] Network error: ${formatErrorMessage(err)}`);
      throw new Error(`Network error getting access_token: ${formatErrorMessage(err)}`, {
        cause: err
      });
    } finally {
      clearTimeout(timeout);
    }
    const traceId = response.headers.get("x-tps-trace-id") ?? "";
    this.logger?.debug?.(`[qqbot:token:${appId}] <<< ${response.status}${traceId ? ` | TraceId: ${traceId}` : ""}`);
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Token fetch failed: HTTP ${response.status}${errorBody ? ` \u2014 ${errorBody.slice(0, 200)}` : ""}`);
    }
    let data;
    try {
      const rawBody = await response.text();
      const logBody = rawBody.replace(/"access_token"\s*:\s*"[^"]+"/g, '"access_token": "***"');
      this.logger?.debug?.(`[qqbot:token:${appId}] <<< Body: ${logBody}`);
      data = JSON.parse(rawBody);
    } catch (err) {
      throw new Error(`Failed to parse access_token response: ${formatErrorMessage(err)}`, {
        cause: err
      });
    }
    if (!data.access_token) {
      throw new Error(`Failed to get access_token: ${JSON.stringify(data)}`);
    }
    const expiresAt = Date.now() + (data.expires_in ?? 7200) * 1e3;
    this.cache.set(appId, { token: data.access_token, expiresAt, appId });
    this.logger?.debug?.(`[qqbot:token:${appId}] Cached, expires at: ${new Date(expiresAt).toISOString()}`);
    return data.access_token;
  }
  abortableSleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason ?? new DOMException("The operation was aborted", "AbortError"));
        return;
      }
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("The operation was aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
};

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);
var wrapper_default = import_websocket.default;

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/codec.js
function decodeGatewayMessageData(data) {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  if (Array.isArray(data) && data.every((chunk) => Buffer.isBuffer(chunk))) {
    return Buffer.concat(data).toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  }
  return "";
}
function readOptionalMessageSceneExt(event) {
  if (!("message_scene" in event)) {
    return void 0;
  }
  const scene = event.message_scene;
  return scene?.ext;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/constants.js
var INTENTS = {
  GUILDS: 1 << 0,
  GUILD_MEMBERS: 1 << 1,
  PUBLIC_GUILD_MESSAGES: 1 << 30,
  DIRECT_MESSAGE: 1 << 12,
  GROUP_AND_C2C: 1 << 25,
  /** Button interaction callbacks (INTERACTION_CREATE). */
  INTERACTION: 1 << 26
};
var FULL_INTENTS = INTENTS.GUILDS | INTENTS.GUILD_MEMBERS | INTENTS.PUBLIC_GUILD_MESSAGES | INTENTS.DIRECT_MESSAGE | INTENTS.GROUP_AND_C2C | INTENTS.INTERACTION;
var RECONNECT_DELAYS = [1e3, 2e3, 5e3, 1e4, 3e4, 6e4];
var RATE_LIMIT_DELAY = 6e4;
var MAX_RECONNECT_ATTEMPTS = Number.POSITIVE_INFINITY;
var MAX_QUICK_DISCONNECT_COUNT = 3;
var QUICK_DISCONNECT_THRESHOLD = 5e3;
var INVALID_SESSION_DELAY = 3e3;
var HANDSHAKE_TIMEOUT_MS = 3e4;
var GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11
};
var GatewayCloseCode = {
  NORMAL: 1e3,
  AUTH_FAILED: 4004,
  INVALID_SESSION: 4006,
  SEQ_OUT_OF_RANGE: 4007,
  RATE_LIMITED: 4008,
  SESSION_TIMEOUT: 4009,
  SERVER_ERROR_START: 4900,
  SERVER_ERROR_END: 4913,
  INSUFFICIENT_INTENTS: 4914,
  DISALLOWED_INTENTS: 4915
};
var GatewayEvent = {
  READY: "READY",
  RESUMED: "RESUMED",
  // ── Message events ──
  C2C_MESSAGE_CREATE: "C2C_MESSAGE_CREATE",
  AT_MESSAGE_CREATE: "AT_MESSAGE_CREATE",
  DIRECT_MESSAGE_CREATE: "DIRECT_MESSAGE_CREATE",
  GROUP_AT_MESSAGE_CREATE: "GROUP_AT_MESSAGE_CREATE",
  GROUP_MESSAGE_CREATE: "GROUP_MESSAGE_CREATE",
  // ── Interaction ──
  INTERACTION_CREATE: "INTERACTION_CREATE",
  // ── Guild events (P1) ──
  GUILD_CREATE: "GUILD_CREATE",
  GUILD_UPDATE: "GUILD_UPDATE",
  GUILD_DELETE: "GUILD_DELETE",
  GUILD_MEMBER_ADD: "GUILD_MEMBER_ADD",
  GUILD_MEMBER_UPDATE: "GUILD_MEMBER_UPDATE",
  GUILD_MEMBER_REMOVE: "GUILD_MEMBER_REMOVE",
  CHANNEL_CREATE: "CHANNEL_CREATE",
  CHANNEL_UPDATE: "CHANNEL_UPDATE",
  CHANNEL_DELETE: "CHANNEL_DELETE",
  // ── Group/C2C lifecycle events (P1) ──
  GROUP_ADD_ROBOT: "GROUP_ADD_ROBOT",
  GROUP_DEL_ROBOT: "GROUP_DEL_ROBOT",
  GROUP_MSG_REJECT: "GROUP_MSG_REJECT",
  GROUP_MSG_RECEIVE: "GROUP_MSG_RECEIVE",
  FRIEND_ADD: "FRIEND_ADD",
  FRIEND_DEL: "FRIEND_DEL",
  C2C_MSG_REJECT: "C2C_MSG_REJECT",
  C2C_MSG_RECEIVE: "C2C_MSG_RECEIVE",
  // ── Reaction events ──
  MESSAGE_REACTION_ADD: "MESSAGE_REACTION_ADD",
  MESSAGE_REACTION_REMOVE: "MESSAGE_REACTION_REMOVE"
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/errors.js
var GatewayErrorCode = {
  /** A finite `reconnect.maxAttempts` was exhausted (never raised with the unlimited default). */
  RETRY_EXHAUSTED: "GATEWAY_RETRY_EXHAUSTED",
  /** Non-retryable close (4914 offline/sandbox-only, 4915 banned). Needs operator action. */
  FATAL_CLOSE: "GATEWAY_FATAL_CLOSE"
};
var GatewayError = class extends Error {
  code;
  /** Remote WebSocket close code that caused the failure, when known. */
  closeCode;
  constructor(message, code, closeCode, options) {
    super(message, options);
    this.name = "GatewayError";
    this.code = code;
    this.closeCode = closeCode;
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/event-dispatcher.js
var REF_INDEX_KEY = "msg_idx";
function parseRefIndices(ext, msgType, msgElements) {
  let refMsgIdx;
  let msgIdx;
  if (Array.isArray(ext)) {
    for (const entry of ext) {
      if (typeof entry !== "string") {
        continue;
      }
      const eq = entry.indexOf("=");
      if (eq < 0) {
        continue;
      }
      const key = entry.slice(0, eq).trim();
      const val = entry.slice(eq + 1).trim();
      if (!val) {
        continue;
      }
      if (key === REF_INDEX_KEY) {
        msgIdx = val;
      } else if (key === "ref_msg_idx") {
        refMsgIdx = val;
      }
    }
  }
  if (msgType === 103 && Array.isArray(msgElements)) {
    for (const el of msgElements) {
      if (el?.msg_idx) {
        refMsgIdx = el.msg_idx;
        break;
      }
    }
  }
  return { refMsgIdx, msgIdx };
}
function dispatchEvent(eventType, data, _accountId, _log) {
  if (eventType === GatewayEvent.READY) {
    const d = data;
    return { action: "ready", data, sessionId: d.session_id };
  }
  if (eventType === GatewayEvent.RESUMED) {
    return { action: "resumed", data };
  }
  if (eventType === GatewayEvent.C2C_MESSAGE_CREATE) {
    const ev = data;
    const refs = parseRefIndices(ev.message_scene?.ext, ev.message_type, ev.msg_elements);
    return {
      action: "message",
      msg: {
        rawEventType: eventType,
        kind: "c2c",
        senderId: ev.author.user_openid,
        content: ev.content,
        messageId: ev.id,
        timestamp: ev.timestamp,
        attachments: ev.attachments,
        refMsgIdx: refs.refMsgIdx,
        msgIdx: refs.msgIdx,
        msgType: ev.message_type,
        messageScene: ev.message_scene,
        msgElements: ev.msg_elements,
        raw: ev
      }
    };
  }
  if (eventType === GatewayEvent.AT_MESSAGE_CREATE) {
    const ev = data;
    const refs = parseRefIndices(readOptionalMessageSceneExt(ev));
    return {
      action: "message",
      msg: {
        rawEventType: eventType,
        kind: "guild",
        senderId: ev.author.id,
        senderName: ev.author.username,
        content: ev.content,
        messageId: ev.id,
        timestamp: ev.timestamp,
        channelId: ev.channel_id,
        guildId: ev.guild_id,
        attachments: ev.attachments,
        refMsgIdx: refs.refMsgIdx,
        msgIdx: refs.msgIdx,
        raw: ev
      }
    };
  }
  if (eventType === GatewayEvent.DIRECT_MESSAGE_CREATE) {
    const ev = data;
    const refs = parseRefIndices(readOptionalMessageSceneExt(ev));
    return {
      action: "message",
      msg: {
        rawEventType: eventType,
        kind: "dm",
        senderId: ev.author.id,
        senderName: ev.author.username,
        content: ev.content,
        messageId: ev.id,
        timestamp: ev.timestamp,
        guildId: ev.guild_id,
        attachments: ev.attachments,
        refMsgIdx: refs.refMsgIdx,
        msgIdx: refs.msgIdx,
        raw: ev
      }
    };
  }
  if (eventType === GatewayEvent.GROUP_AT_MESSAGE_CREATE || eventType === GatewayEvent.GROUP_MESSAGE_CREATE) {
    const ev = data;
    const refs = parseRefIndices(ev.message_scene?.ext, ev.message_type, ev.msg_elements);
    return {
      action: "message",
      msg: {
        rawEventType: eventType,
        kind: "group",
        senderId: ev.author.member_openid,
        senderName: ev.author.username,
        senderIsBot: ev.author.bot,
        content: ev.content,
        messageId: ev.id,
        timestamp: ev.timestamp,
        groupOpenid: ev.group_openid,
        attachments: ev.attachments,
        refMsgIdx: refs.refMsgIdx,
        msgIdx: refs.msgIdx,
        msgType: ev.message_type,
        mentions: ev.mentions,
        messageScene: ev.message_scene,
        msgElements: ev.msg_elements,
        raw: ev
      }
    };
  }
  if (eventType === GatewayEvent.INTERACTION_CREATE) {
    return { action: "interaction", event: data };
  }
  return { action: "raw", type: eventType, data };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/reconnect.js
var DEFAULT_RECONNECT_POLICY = {
  maxAttempts: MAX_RECONNECT_ATTEMPTS,
  delays: RECONNECT_DELAYS
};
function resolveReconnectPolicy(policy) {
  const maxAttempts = policy?.maxAttempts ?? DEFAULT_RECONNECT_POLICY.maxAttempts;
  const delays = policy?.delays ?? DEFAULT_RECONNECT_POLICY.delays;
  const isUnlimited = maxAttempts === Number.POSITIVE_INFINITY;
  if (!isUnlimited && (!Number.isInteger(maxAttempts) || maxAttempts < 0)) {
    throw new RangeError(`reconnect.maxAttempts must be a non-negative integer or Infinity, got ${maxAttempts}`);
  }
  if (delays.length === 0 || delays.some((d) => !Number.isFinite(d) || d < 0)) {
    throw new RangeError("reconnect.delays must be a non-empty list of non-negative numbers");
  }
  return { maxAttempts, delays: [...delays] };
}
var ReconnectState = class {
  accountId;
  log;
  attempts = 0;
  lastConnectTime = 0;
  quickDisconnectCount = 0;
  policy;
  constructor(accountId, log, policy) {
    this.accountId = accountId;
    this.log = log;
    this.policy = resolveReconnectPolicy(policy);
  }
  /** Socket opened — starts the quick-disconnect window. Does not reset the budget. */
  onSocketOpen() {
    this.lastConnectTime = Date.now();
  }
  /**
   * Session established (READY / RESUMED) — resets the reconnect budget.
   *
   * Resetting on socket open instead would let "open then immediately kicked"
   * loops (e.g. repeated 4004) retry forever.
   */
  onConnected() {
    this.attempts = 0;
    this.lastConnectTime = Date.now();
  }
  isExhausted() {
    return this.attempts >= this.policy.maxAttempts;
  }
  /** Maximum consecutive attempts allowed by the active policy. */
  get maxAttempts() {
    return this.policy.maxAttempts;
  }
  getNextDelay(customDelay) {
    const { delays } = this.policy;
    const delay = customDelay ?? delays[Math.min(this.attempts, delays.length - 1)];
    this.attempts++;
    this.log?.debug?.(`[${this.accountId}] Reconnecting in ${delay}ms (attempt ${this.attempts})`);
    return delay;
  }
  handleClose(code, isAborted) {
    if (code === GatewayCloseCode.INSUFFICIENT_INTENTS || code === GatewayCloseCode.DISALLOWED_INTENTS) {
      const reason = code === GatewayCloseCode.INSUFFICIENT_INTENTS ? "offline/sandbox-only" : "banned";
      this.log?.error(`[${this.accountId}] Bot is ${reason}. Please contact QQ platform.`);
      return {
        shouldReconnect: false,
        clearSession: false,
        refreshToken: false,
        fatal: true,
        reason
      };
    }
    if (code === GatewayCloseCode.AUTH_FAILED) {
      this.log?.info(`[${this.accountId}] Invalid token (4004), will refresh token and reconnect`);
      return {
        shouldReconnect: !isAborted,
        clearSession: false,
        refreshToken: true,
        fatal: false,
        reason: "invalid token (4004)"
      };
    }
    if (code === GatewayCloseCode.RATE_LIMITED) {
      this.log?.info(`[${this.accountId}] Rate limited (4008), waiting ${RATE_LIMIT_DELAY}ms`);
      return {
        shouldReconnect: !isAborted,
        reconnectDelay: RATE_LIMIT_DELAY,
        clearSession: false,
        refreshToken: false,
        fatal: false,
        reason: "rate limited (4008)"
      };
    }
    if (code === GatewayCloseCode.INVALID_SESSION || code === GatewayCloseCode.SEQ_OUT_OF_RANGE || code === GatewayCloseCode.SESSION_TIMEOUT) {
      const codeDesc = {
        [GatewayCloseCode.INVALID_SESSION]: "session no longer valid",
        [GatewayCloseCode.SEQ_OUT_OF_RANGE]: "invalid seq on resume",
        [GatewayCloseCode.SESSION_TIMEOUT]: "session timed out"
      };
      this.log?.info(`[${this.accountId}] Error ${code} (${codeDesc[code]}), will re-identify`);
      return {
        shouldReconnect: !isAborted,
        clearSession: true,
        refreshToken: true,
        fatal: false,
        reason: codeDesc[code]
      };
    }
    if (code >= GatewayCloseCode.SERVER_ERROR_START && code <= GatewayCloseCode.SERVER_ERROR_END) {
      this.log?.info(`[${this.accountId}] Internal error (${code}), will re-identify`);
      return {
        shouldReconnect: !isAborted,
        clearSession: true,
        refreshToken: true,
        fatal: false,
        reason: `internal error (${code})`
      };
    }
    const connectionDuration = Date.now() - this.lastConnectTime;
    if (connectionDuration < QUICK_DISCONNECT_THRESHOLD && this.lastConnectTime > 0) {
      this.quickDisconnectCount++;
      this.log?.debug?.(`[${this.accountId}] Quick disconnect detected (${connectionDuration}ms), count: ${this.quickDisconnectCount}`);
      if (this.quickDisconnectCount >= MAX_QUICK_DISCONNECT_COUNT) {
        this.log?.error(`[${this.accountId}] Too many quick disconnects. This may indicate a permission issue.`);
        this.quickDisconnectCount = 0;
        return {
          shouldReconnect: !isAborted,
          reconnectDelay: RATE_LIMIT_DELAY,
          clearSession: false,
          refreshToken: false,
          fatal: false,
          reason: "too many quick disconnects"
        };
      }
    } else {
      this.quickDisconnectCount = 0;
    }
    return {
      shouldReconnect: !isAborted,
      clearSession: false,
      refreshToken: false,
      fatal: false,
      reason: `close code ${code}`
    };
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/gateway/gateway-connection.js
var GatewayConnection = class {
  isAborted = false;
  run = null;
  finish = () => {
  };
  currentWs = null;
  heartbeatInterval = null;
  sessionId = null;
  lastSeq = null;
  isConnecting = false;
  reconnectTimer = null;
  shouldRefreshToken = false;
  reconnect;
  opts;
  resolveUserAgent;
  constructor(opts) {
    this.opts = opts;
    this.reconnect = new ReconnectState(opts.account.accountId, opts.log, opts.reconnect);
    const ua = opts.userAgent ?? "qqbot-nodejs/unknown";
    this.resolveUserAgent = typeof ua === "function" ? ua : () => ua;
  }
  /**
   * Start the connection loop.
   *
   * Resolves when `abortSignal` fires. Rejects with a {@link GatewayError} when
   * a finite reconnect budget is exhausted (`RETRY_EXHAUSTED`) or the gateway sends
   * a non-retryable close (`FATAL_CLOSE`). Repeated calls return the same promise.
   */
  start() {
    this.run ??= new Promise((resolve, reject) => {
      const signal = this.opts.abortSignal;
      const onAbort = () => this.finish();
      this.finish = (error) => {
        if (this.isAborted)
          return;
        this.isAborted = true;
        signal.removeEventListener("abort", onAbort);
        this.clearReconnectTimer();
        this.cleanup();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      if (signal.aborted) {
        this.finish();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      try {
        this.restoreSession();
      } catch (error) {
        this.finish(toError(error));
        return;
      }
      void this.connect();
    });
    return this.run;
  }
  // ============ Session persistence ============
  restoreSession() {
    const saved = this.opts.session?.load();
    if (saved) {
      this.sessionId = saved.sessionId;
      this.lastSeq = saved.lastSeq;
      this.opts.log?.info?.(`[${this.opts.account.accountId}] Restored session: sessionId=${saved.sessionId}, lastSeq=${saved.lastSeq}`);
    }
  }
  saveCurrentSession() {
    const { session } = this.opts;
    if (!this.sessionId || !session) {
      return;
    }
    const snapshot = { sessionId: this.sessionId, lastSeq: this.lastSeq };
    this.notify("session.save", () => session.save(snapshot));
  }
  resetSession() {
    this.sessionId = null;
    this.lastSeq = null;
    const { session } = this.opts;
    if (session)
      this.notify("session.clear", () => session.clear());
  }
  // ============ Callbacks + cleanup ============
  /** Invoke a user callback without letting sync throws or async rejections escape. */
  notify(name, invoke) {
    const report = (err) => {
      this.opts.log?.error(`[${this.opts.account.accountId}] ${name} handler threw: ${toError(err).message}`);
    };
    try {
      const result = invoke();
      if (isPromiseLike(result))
        Promise.resolve(result).catch(report);
    } catch (err) {
      report(err);
    }
  }
  /** Release the socket and heartbeat. Emits nothing. */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    const ws = this.currentWs;
    this.currentWs = null;
    this.isConnecting = false;
    if (ws && ws.readyState !== wrapper_default.CLOSED)
      ws.terminate();
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  // ============ Reconnect ============
  /** Schedule the next attempt, or return the terminal error when the budget is spent. */
  planReconnect(customDelay, failure = {}) {
    if (this.reconnect.isExhausted()) {
      const error = new GatewayError(`Max reconnect attempts reached (${this.reconnect.maxAttempts})`, GatewayErrorCode.RETRY_EXHAUSTED, failure.closeCode, { cause: failure.cause });
      this.opts.log?.error(`[${this.opts.account.accountId}] ${error.message}`);
      return error;
    }
    this.clearReconnectTimer();
    const delay = this.reconnect.getNextDelay(customDelay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
    return null;
  }
  /** Report a disconnect after the reconnect decision is made, then settle if terminal. */
  afterDisconnect(code, reason, terminal) {
    const { onDisconnected } = this.opts;
    if (onDisconnected) {
      const event = { code, reason, willReconnect: terminal === null };
      this.notify("onDisconnected", () => onDisconnected(event));
    }
    if (terminal)
      this.finish(terminal);
  }
  // ============ Connect ============
  async connect() {
    const { log, account } = this.opts;
    if (this.isAborted)
      return;
    if (this.isConnecting) {
      log?.debug?.(`[${account.accountId}] Already connecting, skip`);
      return;
    }
    this.cleanup();
    this.isConnecting = true;
    try {
      if (this.shouldRefreshToken) {
        log?.debug?.(`[${account.accountId}] Refreshing token...`);
        this.opts.clearTokenCache?.();
        this.shouldRefreshToken = false;
      }
      const accessToken = await this.opts.getAccessToken();
      if (this.isAborted)
        return;
      log?.info(`[${account.accountId}] \u2705 Access token obtained`);
      const gatewayUrl = await this.opts.getGatewayUrl(accessToken);
      if (this.isAborted)
        return;
      log?.info(`[${account.accountId}] Connecting to ${gatewayUrl}`);
      this.openSocket(gatewayUrl, accessToken);
    } catch (err) {
      if (this.isAborted)
        return;
      this.isConnecting = false;
      const error = toError(err);
      log?.error(`[${account.accountId}] Connection failed: ${error.message}`);
      const terminal = this.planReconnect(isRateLimitError(error.message) ? RATE_LIMIT_DELAY : void 0, { cause: error });
      const { onError } = this.opts;
      if (onError)
        this.notify("onError", () => onError(error));
      if (terminal)
        this.finish(terminal);
    }
  }
  openSocket(gatewayUrl, accessToken) {
    const { log, account } = this.opts;
    const ws = new wrapper_default(gatewayUrl, {
      headers: { "User-Agent": this.resolveUserAgent() },
      handshakeTimeout: this.opts.handshakeTimeoutMs ?? HANDSHAKE_TIMEOUT_MS
    });
    this.currentWs = ws;
    ws.on("open", () => {
      if (ws !== this.currentWs)
        return;
      log?.info(`[${account.accountId}] WebSocket connected`);
      this.isConnecting = false;
      this.reconnect.onSocketOpen();
    });
    ws.on("message", (data) => {
      if (ws !== this.currentWs)
        return;
      try {
        const payload = JSON.parse(decodeGatewayMessageData(data));
        this.handlePayload(ws, payload, accessToken);
      } catch (err) {
        log?.error(`[${account.accountId}] Message parse error: ${toError(err).message}`);
      }
    });
    ws.on("close", (code, reason) => {
      if (ws !== this.currentWs)
        return;
      const reasonText = reason.toString();
      log?.info(`[${account.accountId}] WebSocket closed: ${code} ${reasonText}`);
      this.isConnecting = false;
      this.handleClose(code, reasonText);
    });
    ws.on("error", (err) => {
      if (ws !== this.currentWs)
        return;
      log?.error(`[${account.accountId}] WebSocket error: ${err.message}`);
      const { onError } = this.opts;
      if (onError)
        this.notify("onError", () => onError(err));
    });
  }
  // ============ Protocol handlers ============
  handlePayload(ws, payload, accessToken) {
    const { op, d, s } = payload;
    if (s) {
      this.lastSeq = s;
      this.saveCurrentSession();
    }
    switch (op) {
      case GatewayOp.HELLO:
        this.handleHello(ws, d, accessToken);
        break;
      case GatewayOp.DISPATCH:
        this.handleDispatch(payload);
        break;
      case GatewayOp.HEARTBEAT_ACK:
        break;
      case GatewayOp.RECONNECT:
        this.handleGatewayReconnect("Gateway requested reconnect");
        break;
      case GatewayOp.INVALID_SESSION:
        if (!d) {
          this.resetSession();
          this.shouldRefreshToken = true;
        }
        this.handleGatewayReconnect("Invalid gateway session", INVALID_SESSION_DELAY);
        break;
    }
  }
  handleDispatch(payload) {
    const { log, account } = this.opts;
    const { d, t } = payload;
    log?.debug?.(`[${account.accountId}] Dispatch event: t=${t} payload=${previewPayload(d)}`);
    const result = dispatchEvent(t ?? "", d, account.accountId, log);
    if (result.action === "ready") {
      this.sessionId = result.sessionId;
      this.reconnect.onConnected();
      this.saveCurrentSession();
      const { onReady } = this.opts;
      if (onReady)
        this.notify("onReady", () => onReady(result.data));
    } else if (result.action === "resumed") {
      this.reconnect.onConnected();
      this.saveCurrentSession();
      const onResumed = this.opts.onResumed ?? this.opts.onReady;
      if (onResumed)
        this.notify("onResumed", () => onResumed(result.data));
    } else if (result.action === "interaction") {
      const { onInteraction, onRawEvent } = this.opts;
      if (onInteraction) {
        this.notify("onInteraction", () => onInteraction(result.event));
      } else if (onRawEvent) {
        this.notify("onRawEvent", () => onRawEvent(t ?? "", d));
      }
    } else if (result.action === "message") {
      this.notify("onMessage", () => this.opts.onMessage(result.msg));
    } else if (result.action === "raw") {
      const { onRawEvent } = this.opts;
      if (onRawEvent)
        this.notify("onRawEvent", () => onRawEvent(result.type, result.data));
    }
  }
  handleHello(ws, d, accessToken) {
    const intents = this.opts.intents ?? FULL_INTENTS;
    if (this.sessionId && this.lastSeq !== null) {
      ws.send(JSON.stringify({
        op: GatewayOp.RESUME,
        d: {
          token: `QQBot ${accessToken}`,
          session_id: this.sessionId,
          seq: this.lastSeq
        }
      }));
    } else {
      ws.send(JSON.stringify({
        op: GatewayOp.IDENTIFY,
        d: {
          token: `QQBot ${accessToken}`,
          intents,
          shard: [0, 1]
        }
      }));
    }
    const interval = d.heartbeat_interval;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      if (ws.readyState === wrapper_default.OPEN) {
        ws.send(JSON.stringify({ op: GatewayOp.HEARTBEAT, d: this.lastSeq }));
      }
    }, interval);
  }
  /** Opcode 7 / 9: drop the socket locally and reconnect. */
  handleGatewayReconnect(reason, customDelay) {
    this.cleanup();
    const terminal = this.planReconnect(customDelay);
    this.afterDisconnect(GatewayCloseCode.NORMAL, reason, terminal);
  }
  handleClose(code, reason) {
    const action = this.reconnect.handleClose(code, this.isAborted);
    if (action.clearSession) {
      this.resetSession();
    }
    if (action.refreshToken) {
      this.shouldRefreshToken = true;
    }
    this.cleanup();
    const terminal = action.shouldReconnect ? this.planReconnect(action.reconnectDelay, { closeCode: code }) : new GatewayError(`Gateway closed (${code}): ${action.reason}`, GatewayErrorCode.FATAL_CLOSE, code);
    this.afterDisconnect(code, reason, terminal);
  }
};
function toError(err) {
  return err instanceof Error ? err : new Error(String(err));
}
function isPromiseLike(value) {
  return typeof value?.then === "function";
}
function isRateLimitError(message) {
  return message.includes("Too many requests") || message.includes("100001");
}
function previewPayload(data) {
  if (data === void 0)
    return "undefined";
  if (data === null)
    return "null";
  try {
    const s = JSON.stringify(data);
    return s === void 0 ? "(non-serializable)" : s;
  } catch {
    return "(non-serializable)";
  }
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/transport/webhook-verify.js
import * as crypto2 from "node:crypto";
function deriveSeed(botSecret) {
  let seed = botSecret;
  while (seed.length < 32) {
    seed = seed + seed;
  }
  return Buffer.from(seed.slice(0, 32), "utf-8");
}
function getKeyPair(botSecret) {
  const seed = deriveSeed(botSecret);
  const privateKey = crypto2.createPrivateKey({
    key: Buffer.concat([
      // Ed25519 PKCS8 DER prefix for 32-byte seed
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed
    ]),
    format: "der",
    type: "pkcs8"
  });
  const publicKey = crypto2.createPublicKey(privateKey);
  return { privateKey, publicKey };
}
function ed25519Sign(botSecret, message) {
  const { privateKey } = getKeyPair(botSecret);
  const signature = crypto2.sign(null, message, privateKey);
  return signature.toString("hex");
}
function verifyWebhookSignature(params) {
  const { body, timestamp, signature, botSecret } = params;
  try {
    const { publicKey } = getKeyPair(botSecret);
    const message = Buffer.concat([
      Buffer.from(timestamp, "utf-8"),
      body
    ]);
    const sigBuffer = Buffer.from(signature, "hex");
    return crypto2.verify(null, message, publicKey, sigBuffer);
  } catch {
    return false;
  }
}
function signValidationResponse(params) {
  const { plainToken, eventTs, botSecret } = params;
  const message = Buffer.from(eventTs + plainToken, "utf-8");
  const signature = ed25519Sign(botSecret, message);
  return {
    plain_token: plainToken,
    signature
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/transport/webhook-server-node.js
import * as http from "node:http";
var NodeHttpWebhookServer = class {
  server = null;
  async listen(port, path3, handler) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (req.method !== "POST" || req.url !== path3) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
          return;
        }
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = Buffer.concat(chunks);
            const headers = {};
            for (const [key, value] of Object.entries(req.headers)) {
              headers[key.toLowerCase()] = value;
            }
            const response = await handler({ body, headers });
            res.writeHead(response.status, {
              "Content-Type": "application/json",
              ...response.headers ?? {}
            });
            res.end(response.body);
          } catch (_err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          }
        });
      });
      server.on("error", reject);
      server.listen(port, () => {
        this.server = server;
        resolve();
      });
    });
  }
  close() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/transport/webhook.js
var OP_DISPATCH = 0;
var OP_HTTP_CALLBACK_ACK = 12;
var OP_VALIDATION = 13;
var WebhookTransport = class {
  opts;
  callbacks;
  log;
  server;
  accountId;
  stopped = false;
  stopResolve = null;
  constructor(opts, callbacks) {
    this.opts = opts;
    this.callbacks = callbacks;
    this.log = opts.log;
    this.server = opts.server ?? new NodeHttpWebhookServer();
    this.accountId = opts.accountId ?? opts.appId;
  }
  async start() {
    const port = this.opts.port ?? 8080;
    const path3 = this.opts.path ?? "/";
    this.log?.info?.(`[webhook] starting on port ${port}, path ${path3}`);
    await this.server.listen(port, path3, (req) => this.handleRequest(req));
    this.log?.info?.(`[webhook] listening on :${port}${path3}`);
    this.callbacks.onReady?.({ transport: "webhook", port, path: path3 });
    if (this.opts.abortSignal) {
      await new Promise((resolve) => {
        if (this.opts.abortSignal.aborted) {
          resolve();
          return;
        }
        this.stopResolve = resolve;
        this.opts.abortSignal.addEventListener("abort", () => this.stop(), { once: true });
      });
    } else {
      await new Promise((resolve) => {
        this.stopResolve = resolve;
      });
    }
  }
  stop() {
    if (this.stopped)
      return;
    this.stopped = true;
    this.server.close();
    this.log?.info?.(`[webhook] stopped`);
    this.stopResolve?.();
  }
  // ============ Request handler ============
  async handleRequest(req) {
    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf-8"));
    } catch {
      this.log?.warn?.(`[webhook] invalid JSON body`);
      return { status: 400, body: JSON.stringify({ error: "invalid json" }) };
    }
    if (payload.op === OP_VALIDATION) {
      return this.handleValidation(payload);
    }
    const timestamp = getHeader(req.headers, "x-signature-timestamp") ?? "";
    const signature = getHeader(req.headers, "x-signature-ed25519") ?? "";
    if (!timestamp || !signature) {
      this.log?.warn?.(`[webhook] missing signature headers`);
      return { status: 401, body: JSON.stringify({ error: "missing signature" }) };
    }
    const valid = verifyWebhookSignature({
      body: req.body,
      timestamp,
      signature,
      botSecret: this.opts.appSecret
    });
    if (!valid) {
      this.log?.warn?.(`[webhook] signature verification failed`);
      return { status: 401, body: JSON.stringify({ error: "invalid signature" }) };
    }
    if (payload.op === OP_DISPATCH) {
      this.handleDispatch(payload).catch((err) => {
        this.log?.error?.(`[webhook] dispatch error: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
    return {
      status: 200,
      body: JSON.stringify({ op: OP_HTTP_CALLBACK_ACK, d: 0 })
    };
  }
  // ============ Validation handler (op:13) ============
  handleValidation(payload) {
    const d = payload.d;
    if (!d?.plain_token || !d?.event_ts) {
      this.log?.warn?.(`[webhook] validation missing plain_token or event_ts`);
      return { status: 400, body: JSON.stringify({ error: "invalid validation" }) };
    }
    this.log?.info?.(`[webhook] handling callback URL validation`);
    const response = signValidationResponse({
      plainToken: d.plain_token,
      eventTs: d.event_ts,
      botSecret: this.opts.appSecret
    });
    return {
      status: 200,
      body: JSON.stringify(response)
    };
  }
  // ============ Dispatch handler (op:0) ============
  async handleDispatch(payload) {
    const eventType = payload.t ?? "";
    const data = payload.d;
    this.log?.debug?.(`[webhook] dispatch event: t=${eventType} payload=${JSON.stringify(data)}`);
    const result = dispatchEvent(eventType, data, this.accountId, this.log);
    switch (result.action) {
      case "ready":
        this.callbacks.onReady?.(result.data);
        break;
      case "resumed":
        this.callbacks.onResumed?.(result.data);
        break;
      case "message":
        try {
          await this.callbacks.onMessage(result.msg);
        } catch (err) {
          this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
        break;
      case "interaction":
        try {
          await this.callbacks.onInteraction?.(result.event);
        } catch (err) {
          this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
        break;
      case "ignore":
        break;
    }
  }
};
function getHeader(headers, key) {
  const val = headers[key];
  if (Array.isArray(val))
    return val[0];
  return val;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/upload-cache.js
import * as crypto3 from "node:crypto";
var MAX_CACHE_SIZE = 500;
function computeFileHash(data) {
  return crypto3.createHash("md5").update(data).digest("hex");
}
function buildCacheKey(contentHash, scope, targetId, fileType) {
  return `${contentHash}:${scope}:${targetId}:${fileType}`;
}
var UploadCache = class {
  cache = /* @__PURE__ */ new Map();
  logger;
  constructor(options) {
    this.logger = options?.logger;
  }
  computeHash(data) {
    return computeFileHash(data);
  }
  get(contentHash, scope, targetId, fileType) {
    const key = buildCacheKey(contentHash, scope, targetId, fileType);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    this.logger?.debug?.(`[upload-cache] HIT key=${key.slice(0, 40)}... uuid=${entry.fileUuid}`);
    return entry.fileInfo;
  }
  set(contentHash, scope, targetId, fileType, fileInfo, fileUuid, ttl) {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (now >= v.expiresAt) {
          this.cache.delete(k);
        }
      }
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const keys = Array.from(this.cache.keys());
        for (let i = 0; i < keys.length / 2; i++) {
          this.cache.delete(keys[i]);
        }
      }
    }
    const key = buildCacheKey(contentHash, scope, targetId, fileType);
    const safetyMargin = 60;
    const effectiveTtl = Math.max(ttl - safetyMargin, 10);
    this.cache.set(key, {
      fileInfo,
      fileUuid,
      expiresAt: Date.now() + effectiveTtl * 1e3
    });
    this.logger?.debug?.(`[upload-cache] SET key=${key.slice(0, 40)}... ttl=${effectiveTtl}s uuid=${fileUuid}`);
  }
  stats() {
    return { size: this.cache.size, maxSize: MAX_CACHE_SIZE };
  }
  clear() {
    this.cache.clear();
    this.logger?.debug?.(`[upload-cache] cleared`);
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/streaming.js
var DEFAULT_THROTTLE_MS = 500;
var MIN_THROTTLE_MS = 300;
var MAX_FLUSH_RETRIES = 3;
var RATE_LIMIT_BASE_DELAY_MS = 1e3;
var StreamSession = class {
  api;
  opts;
  throttleMs;
  eventId;
  streamMsgId;
  index = 0;
  /**
   * `msg_seq` for the current stream session. QQ open platform expects all
   * frames in one stream to share the same `msg_seq` (only `index` advances).
   */
  msgSeq = null;
  lastFlushAt = 0;
  lastSentText = "";
  pendingText = "";
  pendingTimer = null;
  flushInProgress = false;
  flushPromise = null;
  isCompleted = false;
  constructor(api, opts) {
    this.api = api;
    this.opts = opts;
    this.throttleMs = Math.max(opts.throttleMs ?? DEFAULT_THROTTLE_MS, MIN_THROTTLE_MS);
    this.eventId = opts.eventId ?? opts.msgId;
  }
  /**
   * Update the current full message text. Will be sent at most once per
   * throttle window.
   */
  async update(fullText) {
    if (this.isCompleted) {
      return;
    }
    this.pendingText = fullText;
    const now = Date.now();
    const elapsed = now - this.lastFlushAt;
    if (this.flushInProgress) {
      return;
    }
    if (elapsed >= this.throttleMs) {
      await this.flush(StreamInputState.GENERATING);
      return;
    }
    if (!this.pendingTimer) {
      const wait = this.throttleMs - elapsed;
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        if (!this.isCompleted) {
          this.flush(StreamInputState.GENERATING).catch((err) => {
            this.opts.logger?.error?.(`[qqbot:stream] throttle flush error: ${formatErrorMessage(err)}`);
          });
        }
      }, wait);
    }
  }
  /** Mark the stream as DONE. Sends a final frame with the latest text. */
  async complete() {
    if (this.isCompleted) {
      return void 0;
    }
    this.isCompleted = true;
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.flushPromise) {
      await this.flushPromise.catch(() => {
      });
    }
    return this.flush(StreamInputState.DONE);
  }
  /** Force-cancel without sending a DONE frame (caller must clean up). */
  cancel() {
    this.isCompleted = true;
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }
  // ============ Internal ============
  async flush(state) {
    if (this.flushInProgress) {
      return void 0;
    }
    if (this.pendingText === this.lastSentText && state !== StreamInputState.DONE) {
      return void 0;
    }
    this.flushInProgress = true;
    const promise = this.doFlush(state);
    this.flushPromise = promise;
    return promise;
  }
  async doFlush(state) {
    let flushFailed = false;
    try {
      const text = this.pendingText;
      if (this.msgSeq === null) {
        this.msgSeq = getNextMsgSeq(this.opts.msgId);
      }
      const currentIndex = this.index++;
      const req = {
        input_mode: StreamInputMode.REPLACE,
        input_state: state,
        content_type: StreamContentType.MARKDOWN,
        content_raw: text,
        event_id: this.eventId,
        msg_id: this.opts.msgId,
        msg_seq: this.msgSeq,
        index: currentIndex
      };
      if (this.streamMsgId) {
        req.stream_msg_id = this.streamMsgId;
      }
      const resp = await this.sendWithRetry(req);
      if (resp?.id && !this.streamMsgId) {
        this.streamMsgId = resp.id;
      }
      this.lastSentText = text;
      this.lastFlushAt = Date.now();
      return resp;
    } catch (err) {
      flushFailed = true;
      this.opts.logger?.error?.(`[qqbot:stream] flush failed (state=${state}): ${formatErrorMessage(err)}`);
      throw err;
    } finally {
      this.flushInProgress = false;
      if (!flushFailed && !this.isCompleted && this.pendingText !== this.lastSentText && !this.pendingTimer && state !== StreamInputState.DONE) {
        await this.flush(StreamInputState.GENERATING);
      }
    }
  }
  /**
   * Send a stream message with exponential backoff on rate-limit errors.
   * QQ returns err_code 50002 or HTTP 429 when rate-limited.
   */
  async sendWithRetry(req) {
    for (let attempt = 0; attempt <= MAX_FLUSH_RETRIES; attempt++) {
      try {
        return await this.api.sendC2CStreamMessage(this.opts.creds, this.opts.openid, req);
      } catch (err) {
        if (!this.isRateLimitError(err) || attempt >= MAX_FLUSH_RETRIES) {
          throw err;
        }
        const delay = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt);
        this.opts.logger?.debug?.(`[qqbot:stream] rate limited, retry ${attempt + 1}/${MAX_FLUSH_RETRIES} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        req.index = this.index++;
      }
    }
    return void 0;
  }
  /** Check if an error is a rate-limit error (QQ err_code 50002 or HTTP 429). */
  isRateLimitError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rate limit"))
      return true;
    const code = err?.code ?? err?.err_code;
    if (code === 50002 || code === 429)
      return true;
    return false;
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/QQBot.js
var MsgType = {
  /** Plain text. */
  TEXT: 0,
  /** Markdown. */
  MARKDOWN: 2,
  /** Ark template message. */
  ARK: 3,
  /** Embed message. */
  EMBED: 4,
  /** Rich media (image/video/voice/file). */
  MEDIA: 7
};
var noopLogger = {
  info: () => {
  },
  error: () => {
  },
  warn: () => {
  },
  debug: () => {
  }
};
var QQBot = class {
  // Public protocol primitives — exposed for advanced users.
  tokenManager;
  apiClient;
  messageApi;
  mediaApi;
  chunkedMediaApi;
  opts;
  logger;
  creds;
  account;
  userAgent;
  uploadCache;
  middlewares = [];
  handlers = {
    ready: /* @__PURE__ */ new Set(),
    resumed: /* @__PURE__ */ new Set(),
    disconnected: /* @__PURE__ */ new Set(),
    error: /* @__PURE__ */ new Set(),
    message: /* @__PURE__ */ new Set(),
    interaction: /* @__PURE__ */ new Set(),
    rawEvent: /* @__PURE__ */ new Set()
  };
  gateway = null;
  abortController = null;
  _apiGateway = null;
  constructor(options) {
    if (!options.appId) {
      throw new Error("QQBot: appId is required");
    }
    if (!options.appSecret) {
      throw new Error("QQBot: appSecret is required");
    }
    resolveReconnectPolicy(options.reconnect);
    this.opts = options;
    this.logger = options.logger ?? noopLogger;
    this.userAgent = options.userAgent ?? `qqbot-nodejs/0.1.0 (Node/${process.versions.node})`;
    this.creds = {
      appId: options.appId,
      clientSecret: options.appSecret
    };
    this.account = {
      accountId: options.accountId ?? options.appId,
      appId: options.appId,
      clientSecret: options.appSecret,
      markdownSupport: options.markdownSupport === true
    };
    this.uploadCache = options.uploadCache ?? new UploadCache({ logger: this.logger });
    this.apiClient = new ApiClient({
      logger: this.logger,
      userAgent: this.userAgent,
      baseUrl: options.baseUrl
    });
    this.tokenManager = new TokenManager({
      logger: this.logger,
      userAgent: this.userAgent,
      baseUrl: options.tokenBaseUrl
    });
    this.messageApi = new MessageApi(this.apiClient, this.tokenManager, {
      markdownSupport: options.markdownSupport === true,
      logger: this.logger
    });
    const cacheAdapter = {
      computeHash: (data) => this.uploadCache.computeHash(data),
      get: (hash, scope, targetId, fileType) => this.uploadCache.get(hash, scope, targetId, fileType),
      set: (hash, scope, targetId, fileType, fileInfo, fileUuid, ttl) => this.uploadCache.set(hash, scope, targetId, fileType, fileInfo, fileUuid, ttl)
    };
    this.mediaApi = new MediaApi(this.apiClient, this.tokenManager, {
      logger: this.logger,
      uploadCache: cacheAdapter,
      sanitizeFileName
    });
    this.chunkedMediaApi = new ChunkedMediaApi(this.apiClient, this.tokenManager, {
      logger: this.logger,
      uploadCache: cacheAdapter,
      sanitizeFileName
    });
  }
  // ============ Public getters ============
  /** The QQ Open Platform AppID this bot is bound to. */
  get appId() {
    return this.creds.appId;
  }
  /** The stable account id (defaults to appId). */
  get accountId() {
    return this.account.accountId;
  }
  /**
   * Return a read-only snapshot of the credentials this bot was constructed
   * with. Prefer this over reaching into private fields when you need to
   * call into the raw protocol-layer APIs (`bot.messageApi`, `bot.mediaApi`,
   * ...) that require a `Credentials` argument.
   *
   * The returned object is a shallow copy; mutating it does NOT affect the
   * bot instance.
   */
  getCredentials() {
    return { appId: this.creds.appId, clientSecret: this.creds.clientSecret };
  }
  // ============ Event listeners ============
  on(event, handler) {
    this.handlers[event].add(handler);
    return this;
  }
  off(event, handler) {
    this.handlers[event].delete(handler);
    return this;
  }
  // ============ Middleware ============
  /**
   * Register an inbound middleware. Middlewares run in registration order
   * before the `message` event listeners; calling `ctx.stop()` (or simply
   * not calling `next()`) short-circuits the chain — including the final
   * `message` listener.
   *
   * @example
   * ```ts
   * import { accessPolicy, mentionGate } from "@tencent-connect/qqbot-nodejs";
   * bot.use(accessPolicy({ group: { mode: "allowlist", allow: [...] } }));
   * bot.use(mentionGate());
   * bot.on("message", async (ctx, msg) => {  ... });
   * ```
   */
  use(...middleware) {
    for (const mw of middleware) {
      if (typeof mw !== "function") {
        throw new Error("QQBot.use: middleware must be a function");
      }
      this.middlewares.push(mw);
    }
    return this;
  }
  /** Read the registered middleware chain (for diagnostics). */
  getMiddlewares() {
    return this.middlewares;
  }
  async emit(event, ...args) {
    for (const handler of this.handlers[event]) {
      try {
        await Promise.resolve(handler(...args));
      } catch (err) {
        this.logger.error?.(`[qqbot] handler for "${String(event)}" threw: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  // ============ Lifecycle ============
  /**
   * Start receiving events from QQ Open Platform.
   *
   * - **WebSocket mode** (default): connects to the WS gateway with heartbeat/RESUME.
   * - **Webhook mode**: starts an HTTP server to receive POST callbacks.
   *
   * Resolves when {@link stop} or the abort signal terminates the connection.
   * Rejects when startup fails, or — in WebSocket mode — with a `GatewayError`
   * when a finite `reconnect.maxAttempts` is exhausted (`GATEWAY_RETRY_EXHAUSTED`) or the
   * gateway closes with a non-retryable code (`GATEWAY_FATAL_CLOSE`). Resources
   * are released either way, so the bot can be started again.
   */
  async start(externalSignal) {
    if (this.abortController)
      throw new Error("QQBot: already started");
    const controller = new AbortController();
    this.abortController = controller;
    const onAbort = () => controller.abort();
    if (externalSignal?.aborted) {
      controller.abort();
    } else {
      externalSignal?.addEventListener("abort", onAbort, { once: true });
    }
    try {
      if (controller.signal.aborted)
        return;
      const transportMode = this.opts.transport ?? "websocket";
      if (transportMode === "webhook") {
        await this.startWebhook(controller.signal);
      } else if (transportMode === "websocket") {
        await this.startWebSocket(controller.signal);
      } else {
        await this.startCustomTransport(transportMode, controller.signal);
      }
    } finally {
      externalSignal?.removeEventListener("abort", onAbort);
      if (this.abortController === controller)
        this.releaseRun();
    }
  }
  /**
   * Stop the transport and background refreshers.
   *
   * Ownership is released synchronously, so `start()` may be called again
   * right away; the previous `start()` promise still resolves on its own.
   */
  stop() {
    const controller = this.abortController;
    this.releaseRun();
    controller?.abort();
  }
  releaseRun() {
    this.tokenManager.stopBackgroundRefresh(this.creds.appId);
    this.gateway = null;
    this.abortController = null;
  }
  // ============ Token initialization ============
  /**
   * Initialize token based on the configured prefetch strategy.
   *
   * - `"sync"` (default): awaits the first token fetch, providing fail-fast
   *   semantics so credential errors surface at startup.
   * - `"async"`: fires the token fetch in the background and starts the
   *   background refresher immediately — trades fail-fast for faster startup.
   */
  async initToken(signal) {
    const mode = this.opts.tokenPrefetch ?? "sync";
    if (mode === "sync") {
      await this.tokenManager.getAccessToken(this.creds.appId, this.creds.clientSecret);
    } else {
      this.tokenManager.getAccessToken(this.creds.appId, this.creds.clientSecret).catch((err) => {
        this.logger.error?.(`[qqbot] async token prefetch failed: ${err}`);
        void this.emit("error", err instanceof Error ? err : new Error(String(err)));
      });
    }
    if (!signal.aborted)
      this.tokenManager.startBackgroundRefresh(this.creds.appId, this.creds.clientSecret);
  }
  // ============ Transport: WebSocket ============
  async startWebSocket(signal) {
    await this.initToken(signal);
    if (signal.aborted)
      return;
    this.gateway = new GatewayConnection({
      account: this.account,
      abortSignal: signal,
      log: this.logger,
      userAgent: this.userAgent,
      intents: this.opts.intents,
      reconnect: this.opts.reconnect,
      session: this.opts.sessionPersistence,
      getAccessToken: () => this.tokenManager.getAccessToken(this.creds.appId, this.creds.clientSecret),
      clearTokenCache: () => this.tokenManager.clearCache(this.creds.appId),
      getGatewayUrl: () => this.messageApi.getGatewayUrl(this.creds),
      onReady: (data) => {
        this.logger.info?.(`[qqbot] gateway READY`);
        void this.emit("ready", data);
      },
      onResumed: (data) => {
        this.logger.info?.(`[qqbot] gateway RESUMED`);
        void this.emit("resumed", data);
      },
      onError: (err) => {
        void this.emit("error", err);
      },
      onDisconnected: (event) => {
        void this.emit("disconnected", event);
      },
      onMessage: (raw) => this.handleInboundMessage(raw),
      onInteraction: (event) => {
        const ctx = { bot: this, event, state: {}, receivedAt: Date.now() };
        void this.emit("interaction", ctx, event);
      },
      onRawEvent: (type, data) => {
        const ctx = { bot: this, eventType: type, data, state: {}, receivedAt: Date.now() };
        void this.emit("rawEvent", ctx);
      }
    });
    await this.gateway.start();
  }
  // ============ Transport: Webhook ============
  async startWebhook(signal) {
    await this.initToken(signal);
    if (signal.aborted)
      return;
    const webhook = new WebhookTransport({
      appId: this.creds.appId,
      appSecret: this.creds.clientSecret,
      port: this.opts.webhook?.port,
      path: this.opts.webhook?.path,
      server: this.opts.webhook?.server,
      accountId: this.account.accountId,
      log: this.logger,
      abortSignal: signal
    }, {
      onReady: (data) => {
        this.logger.info?.(`[qqbot] webhook READY`);
        void this.emit("ready", data);
      },
      onResumed: (data) => {
        void this.emit("resumed", data);
      },
      onError: (err) => {
        void this.emit("error", err);
      },
      onMessage: (raw) => this.handleInboundMessage(raw),
      onInteraction: (event) => {
        const ctx = { bot: this, event, state: {}, receivedAt: Date.now() };
        void this.emit("interaction", ctx, event);
      }
    });
    await webhook.start();
  }
  // ============ Transport: custom ============
  async startCustomTransport(transport, signal) {
    const onAbort = () => transport.stop();
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      await transport.start();
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }
  // ============ Shared inbound message handler ============
  async handleInboundMessage(raw) {
    const replyTarget = this.deriveReplyTarget(raw);
    if (!replyTarget) {
      this.logger.debug?.(`[qqbot] inbound message has no reply target \u2014 skipping`);
      return;
    }
    const augmented = { ...raw, replyTarget };
    const ctx = createMiddlewareContext({
      bot: this,
      message: augmented,
      log: this.logger
    });
    const downstream = async () => {
      await this.emit("message", ctx, ctx.message);
    };
    const chain = [...this.middlewares, downstream];
    try {
      await runMiddlewareChain(chain, ctx);
    } catch (err) {
      this.logger.error?.(`[qqbot] middleware chain threw: ${err instanceof Error ? err.message : String(err)}`);
      void this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }
  // ============ Message sending ============
  /**
   * Universal message send — supports all QQ Open Platform message types.
   *
   * This is the most flexible sending method. It accepts the full parameter
   * set of POST `/v2/users/{openid}/messages` or `/v2/groups/{group_openid}/messages`.
   * Use it when the convenience helpers (sendText, sendMarkdown, etc.) don't
   * cover your use case.
   *
   * `msg_type` is auto-detected if not specified:
   * - markdown field present → 2 (Markdown)
   * - ark field present → 3 (Ark)
   * - embed field present → 4 (Embed)
   * - media field present → 7 (Rich media)
   * - otherwise → 0 (Text)
   *
   * @example Send a keyboard message
   * ```ts
   * await bot.send({
   *   target: msg.replyTarget,
   *   msgType: MsgType.MARKDOWN,
   *   markdown: { content: '# Hello' },
   *   keyboard: { content: { rows: [...] } },
   * });
   * ```
   *
   * @example Send a proactive message (no msgId)
   * ```ts
   * await bot.send({
   *   target: { scope: 'c2c', targetId: openid },
   *   content: 'Hello from bot!',
   * });
   * ```
   */
  async send(opts) {
    const body = {};
    if (opts.target.msgId)
      body.msg_id = opts.target.msgId;
    if (opts.msgType !== void 0)
      body.msg_type = opts.msgType;
    if (opts.content !== void 0)
      body.content = opts.content;
    if (opts.markdown)
      body.markdown = opts.markdown;
    if (opts.ark)
      body.ark = opts.ark;
    if (opts.embed)
      body.embed = opts.embed;
    if (opts.media)
      body.media = opts.media;
    if (opts.keyboard)
      body.keyboard = opts.keyboard;
    if (opts.messageReference)
      body.message_reference = opts.messageReference;
    if (opts.extra)
      Object.assign(body, opts.extra);
    return this.messageApi.sendRaw(opts.target.scope, opts.target.targetId, this.creds, body);
  }
  /**
   * Send a text message to a C2C user or group (smart mode).
   *
   * **Difference from `send()`**:
   * - `sendText` auto-selects msg_type based on `markdownSupport` config
   *   (markdown bots automatically send as msg_type=2).
   * - `send()` is explicit mode — you control msg_type directly.
   *
   * When `target.msgId` is present the message is treated as a reply
   * (tied to the inbound message lifecycle); otherwise it is treated as
   * a proactive push.
   */
  async sendText(target, content) {
    if (target.msgId) {
      return this.messageApi.sendMessage(target.scope, target.targetId, content, this.creds, {
        msgId: target.msgId
      });
    }
    return this.messageApi.sendProactiveMessage(target.scope, target.targetId, content, this.creds);
  }
  /** Send a text message with an inline keyboard. */
  async sendTextWithKeyboard(target, content, inlineKeyboard) {
    return this.messageApi.sendMessage(target.scope, target.targetId, content, this.creds, {
      msgId: target.msgId,
      inlineKeyboard
    });
  }
  /**
   * Send a Markdown message (msg_type=2).
   *
   * @example
   * ```ts
   * await bot.sendMarkdown(msg.replyTarget, '# Hello **world**');
   * await bot.sendMarkdown(msg.replyTarget, '# Click below', {
   *   keyboard: { content: { rows: [...] } },
   * });
   * ```
   */
  async sendMarkdown(target, content, opts) {
    return this.send({
      target,
      msgType: MsgType.MARKDOWN,
      markdown: { content },
      keyboard: opts?.keyboard
    });
  }
  /**
   * Recall (delete) a previously sent message.
   *
   * @example
   * ```ts
   * const sent = await bot.sendText(target, 'oops');
   * await bot.recallMessage(target, sent.id);
   * ```
   */
  async recallMessage(target, messageId) {
    return this.messageApi.recallMessage(target.scope, target.targetId, messageId, this.creds);
  }
  /**
   * Send a wakeup/recall message (C2C only, 30-day window).
   *
   * After a user initiates a conversation, the bot can send periodic
   * recall messages within 30 days using `is_wakeup: true`.
   * Platform enforces frequency limits.
   *
   * @example
   * ```ts
   * await bot.sendWakeup({ scope: 'c2c', targetId: openid }, '你有新消息!');
   * ```
   */
  async sendWakeup(target, content) {
    if (target.scope !== "c2c") {
      throw new Error("sendWakeup is only supported for C2C targets");
    }
    return this.send({ target, content, extra: { is_wakeup: true } });
  }
  /**
   * Send a message to a guild text channel.
   *
   * @example
   * ```ts
   * await bot.sendChannelMessage(channelId, '频道消息', { msgId });
   * ```
   */
  async sendChannelMessage(channelId, content, opts) {
    const body = { content };
    if (opts?.msgId)
      body.msg_id = opts.msgId;
    if (opts?.keyboard)
      body.keyboard = opts.keyboard;
    if (opts?.messageReference)
      body.message_reference = { message_id: opts.messageReference };
    return this.messageApi.sendChannelMessageRaw(channelId, this.creds, body);
  }
  /**
   * Send a direct message (DM) in a guild.
   *
   * @example
   * ```ts
   * await bot.sendDmMessage(guildId, '私信内容', { msgId });
   * ```
   */
  async sendDmMessage(guildId, content, opts) {
    const body = { content };
    if (opts?.msgId)
      body.msg_id = opts.msgId;
    return this.messageApi.sendDmMessageRaw(guildId, this.creds, body);
  }
  /** Send a typing indicator (C2C only). */
  async sendTyping(target, durationSec = 30) {
    if (target.scope !== "c2c") {
      throw new Error("sendTyping is only supported for C2C targets");
    }
    return this.messageApi.sendInputNotify({
      openid: target.targetId,
      creds: this.creds,
      msgId: target.msgId,
      inputSecond: durationSec
    });
  }
  /** Acknowledge an INTERACTION_CREATE event. */
  async acknowledgeInteraction(interactionId, code = 0, data) {
    return this.messageApi.acknowledgeInteraction(interactionId, this.creds, code, data);
  }
  // ============ API Gateway ============
  /**
   * Open Platform API Gateway — call any QQ Open Platform REST API with
   * automatic token injection and refresh.
   *
   * This is the "escape hatch" for any API not wrapped by a dedicated method.
   * All requests are authenticated, rate-limit aware, and return structured errors.
   *
   * @example List guilds
   * ```ts
   * const guilds = await bot.api.get('/users/@me/guilds');
   * ```
   *
   * @example Create an announcement
   * ```ts
   * await bot.api.post(`/guilds/${guildId}/announces`, {
   *   message_id: msgId, channel_id: channelId,
   * });
   * ```
   *
   * @example Get a raw access token
   * ```ts
   * const token = await bot.api.getToken();
   * ```
   */
  get api() {
    if (this._apiGateway)
      return this._apiGateway;
    this._apiGateway = {
      get: (path3, query) => this.apiRequest("GET", path3, void 0, query),
      post: (path3, body) => this.apiRequest("POST", path3, body),
      put: (path3, body) => this.apiRequest("PUT", path3, body),
      patch: (path3, body) => this.apiRequest("PATCH", path3, body),
      delete: (path3) => this.apiRequest("DELETE", path3),
      getToken: () => this.tokenManager.getAccessToken(this.creds.appId, this.creds.clientSecret)
    };
    return this._apiGateway;
  }
  async apiRequest(method, path3, body, query) {
    const token = await this.tokenManager.getAccessToken(this.creds.appId, this.creds.clientSecret);
    let fullPath = path3;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== void 0 && v !== null)
          params.set(k, String(v));
      }
      fullPath = `${path3}?${params.toString()}`;
    }
    return this.apiClient.request(token, method, fullPath, body ?? void 0);
  }
  // ============ Streaming ============
  /**
   * Open a C2C stream session for incremental output.
   *
   * @returns A {@link StreamSession} — call `update(fullText)` repeatedly,
   * then `complete()` when finished.
   */
  openStream(opts) {
    if (opts.target.scope !== "c2c") {
      throw new Error("Streaming is only supported for C2C targets");
    }
    if (!opts.target.msgId) {
      throw new Error("Streaming requires target.msgId from the inbound message");
    }
    const sessionOptions = {
      openid: opts.target.targetId,
      msgId: opts.target.msgId,
      creds: this.creds,
      eventId: opts.eventId,
      throttleMs: opts.throttleMs,
      logger: this.logger
    };
    return new StreamSession(this.messageApi, sessionOptions);
  }
  // ============ Media ============
  /**
   * Upload media (image / voice / video / file) to a target. Automatically
   * dispatches to the chunked-upload path when the source exceeds
   * {@link LARGE_FILE_THRESHOLD} bytes.
   */
  async uploadMedia(opts) {
    const sources = [opts.url, opts.fileData, opts.buffer, opts.localPath].filter((v) => v !== void 0);
    if (sources.length === 0) {
      throw new Error("uploadMedia: one of url/fileData/buffer/localPath is required");
    }
    if (sources.length > 1) {
      throw new Error("uploadMedia: provide exactly one source");
    }
    const size = await this.computeSourceSize(opts);
    const useChunked = size !== null && size >= LARGE_FILE_THRESHOLD;
    const fileName = opts.fileName ?? (opts.localPath ? path.basename(opts.localPath) : void 0) ?? (opts.url ? decodeURIComponent(path.basename(new URL(opts.url).pathname)) || void 0 : void 0);
    if (useChunked && (opts.localPath || opts.buffer)) {
      const source = opts.localPath ? { kind: "localPath", path: opts.localPath, size } : {
        kind: "buffer",
        buffer: opts.buffer,
        fileName
      };
      return this.chunkedMediaApi.uploadChunked({
        scope: opts.target.scope,
        targetId: opts.target.targetId,
        fileType: opts.fileType,
        source,
        creds: this.creds,
        fileName,
        onProgress: opts.onProgress ? (p) => opts.onProgress(p.uploadedBytes, p.totalBytes) : void 0
      });
    }
    return this.mediaApi.uploadMedia(opts.target.scope, opts.target.targetId, opts.fileType, this.creds, {
      url: opts.url,
      fileData: opts.fileData,
      buffer: opts.buffer,
      localPath: opts.localPath,
      srvSendMsg: opts.srvSendMsg,
      fileName
    });
  }
  /**
   * Upload + send a media message to a C2C user or group.
   */
  async sendMedia(opts) {
    const upload = await this.uploadMedia({ ...opts, srvSendMsg: false });
    const message = await this.mediaApi.sendMediaMessage(opts.target.scope, opts.target.targetId, upload.file_info, this.creds, {
      msgId: opts.target.msgId,
      content: opts.content
    });
    return { upload, message };
  }
  /** Convenience: upload + send an image. */
  async sendImage(target, source, opts) {
    return this.sendMedia({
      target,
      fileType: MediaFileType.IMAGE,
      ...source,
      content: opts?.content,
      onProgress: opts?.onProgress
    });
  }
  /** Convenience: upload + send a video. */
  async sendVideo(target, source, opts) {
    return this.sendMedia({
      target,
      fileType: MediaFileType.VIDEO,
      ...source,
      content: opts?.content,
      onProgress: opts?.onProgress
    });
  }
  /** Convenience: upload + send a voice message. */
  async sendVoice(target, source, opts) {
    return this.sendMedia({
      target,
      fileType: MediaFileType.VOICE,
      ...source,
      onProgress: opts?.onProgress
    });
  }
  /** Convenience: upload + send a generic file (for users with file-message permission). */
  async sendFile(target, source, opts) {
    return this.sendMedia({
      target,
      fileType: MediaFileType.FILE,
      ...source,
      fileName: opts?.fileName,
      content: opts?.content,
      onProgress: opts?.onProgress
    });
  }
  // ============ Internal ============
  deriveReplyTarget(raw) {
    if (raw.kind === "c2c") {
      return { scope: "c2c", targetId: raw.senderId, msgId: raw.messageId };
    }
    if (raw.kind === "group" && raw.groupOpenid) {
      return { scope: "group", targetId: raw.groupOpenid, msgId: raw.messageId };
    }
    return null;
  }
  async computeSourceSize(opts) {
    if (opts.buffer) {
      return opts.buffer.length;
    }
    if (opts.localPath) {
      try {
        const stat = await fs3.promises.stat(opts.localPath);
        return stat.size;
      } catch {
        return null;
      }
    }
    if (opts.fileData) {
      return Math.floor(opts.fileData.length * 3 / 4);
    }
    return null;
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/message-filter.js
function messageFilter(options = {}) {
  const skipSelfEcho = options.skipSelfEcho ?? true;
  const dedupOpts = options.dedup !== false ? { windowMs: 5e3, maxSize: 1e3, ...options.dedup ?? {} } : null;
  const seen = dedupOpts ? /* @__PURE__ */ new Map() : null;
  function evict(now) {
    if (!seen || !dedupOpts)
      return;
    if (seen.size <= dedupOpts.maxSize)
      return;
    for (const [key, ts] of seen) {
      if (now - ts > dedupOpts.windowMs || seen.size > dedupOpts.maxSize) {
        seen.delete(key);
      } else {
        break;
      }
    }
  }
  return async (ctx, next) => {
    if (skipSelfEcho && ctx.message.senderIsBot) {
      ctx.stop("self-echo");
      return;
    }
    if (seen && dedupOpts) {
      const id = ctx.message.messageId;
      const now = Date.now();
      if (seen.has(id)) {
        ctx.log.debug?.(`[message-filter] dropping duplicate messageId=${id}`);
        ctx.stop("deduplication");
        return;
      }
      seen.set(id, now);
      evict(now);
    }
    await next();
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/content-sanitizer.js
function contentSanitizer(options = {}) {
  const { stripBotMention = true, stripAllMentions = false, collapseWhitespace = false, parseFaceTags: parseFaceTags2 = false, transform } = options;
  return async (ctx, next) => {
    let content = ctx.message.content ?? "";
    if (stripAllMentions) {
      content = content.replace(/<@!?\d+>\s*/g, "");
    } else if (stripBotMention) {
      const appId = ctx.bot.appId;
      if (appId) {
        const re = new RegExp(`<@!?${appId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>\\s*`, "g");
        content = re[Symbol.replace](content, "");
      }
    }
    if (parseFaceTags2) {
      content = content.replace(/\[<face,id=(\d+)\/?>]/g, (_m, id) => faceToEmoji(id) ?? "");
      content = content.replace(/<faceType=\d+,faceId="[^"]*",ext="([^"]*)">/g, (_m, ext) => {
        try {
          const decoded = Buffer.from(ext, "base64").toString("utf-8");
          const parsed = JSON.parse(decoded);
          return `\u3010\u8868\u60C5: ${parsed.text || "\u672A\u77E5\u8868\u60C5"}\u3011`;
        } catch {
          return _m;
        }
      });
    } else {
      content = content.replace(/\[<face,id=\d+\/?>]/g, "");
      content = content.replace(/<faceType=\d+,faceId="[^"]*",ext="[^"]*">/g, "");
    }
    if (collapseWhitespace) {
      content = content.replace(/\s+/g, " ");
    }
    content = content.trim();
    if (transform) {
      content = transform(content, ctx);
    }
    ctx.message.content = content;
    await next();
  };
}
function faceToEmoji(id) {
  const map = {
    "0": "\u{1F60A}",
    "1": "\u{1F623}",
    "2": "\u{1F60D}",
    "4": "\u{1F60E}",
    "5": "\u{1F62D}",
    "6": "\u{1F633}",
    "7": "\u{1F910}",
    "8": "\u{1F634}",
    "9": "\u{1F622}",
    "10": "\u{1F630}",
    "11": "\u{1F621}",
    "12": "\u{1F917}",
    "13": "\u2B50",
    "14": "\u{1F31F}",
    "15": "\u{1F319}",
    "16": "\u{1F44D}",
    "18": "\u270A",
    "21": "\u{1F60A}",
    "23": "\u{1F622}",
    "25": "\u{1F914}",
    "26": "\u{1F631}",
    "27": "\u{1F605}",
    "28": "\u{1F601}",
    "29": "\u{1F92E}",
    "30": "\u{1F4AA}",
    "32": "\u{1F389}",
    "33": "\u{1F624}",
    "34": "\u{1F60F}",
    "35": "\u{1F97A}",
    "49": "\u{1F437}",
    "53": "\u{1F382}",
    "60": "\u2615",
    "63": "\u{1F339}",
    "66": "\u2764\uFE0F",
    "74": "\u{1F31E}",
    "75": "\u{1F31B}",
    "76": "\u{1F44F}",
    "78": "\u{1F91D}",
    "79": "\u270C\uFE0F",
    "85": "\u{1F385}",
    "89": "\u{1F349}",
    "96": "\u{1F613}",
    "97": "\u{1F632}",
    "100": "\u{1F602}",
    "101": "\u{1F60A}",
    "104": "\u{1F62D}",
    "106": "\u{1F631}",
    "109": "\u{1F618}",
    "111": "\u{1F970}"
  };
  return map[id];
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/rate-limiter.js
var SlidingWindow = class {
  buckets = /* @__PURE__ */ new Map();
  max;
  windowMs;
  constructor(tier) {
    this.max = tier.max;
    this.windowMs = tier.windowMs;
  }
  /** Returns `true` if allowed, `false` if rate-limited. */
  check(key) {
    const now = Date.now();
    let arr = this.buckets.get(key);
    if (!arr) {
      arr = [];
      this.buckets.set(key, arr);
    }
    while (arr.length > 0 && now - arr[0] > this.windowMs) {
      arr.shift();
    }
    if (arr.length >= this.max) {
      return false;
    }
    arr.push(now);
    return true;
  }
};
function rateLimiter(options = {}) {
  const { onLimit } = options;
  const perSender = options.perSender ? new SlidingWindow(options.perSender) : void 0;
  const perGroup = options.perGroup ? new SlidingWindow(options.perGroup) : void 0;
  const global = options.global ? new SlidingWindow(options.global) : void 0;
  return async (ctx, next) => {
    const senderId = ctx.message.senderId;
    const groupKey = ctx.message.groupOpenid ?? senderId;
    if (global && !global.check("__global__")) {
      await onLimit?.(ctx, "global");
      ctx.stop("rate-limit:global");
      return;
    }
    if (perGroup && !perGroup.check(groupKey)) {
      await onLimit?.(ctx, "perGroup");
      ctx.stop("rate-limit:perGroup");
      return;
    }
    if (perSender && !perSender.check(senderId)) {
      await onLimit?.(ctx, "perSender");
      ctx.stop("rate-limit:perSender");
      return;
    }
    await next();
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/concurrency-guard.js
function concurrencyGuard(options = {}) {
  const strategy = options.strategy ?? "queue";
  const maxQueue = options.maxQueue ?? 3;
  const { onDrop, onMerge, onDispatch, urgentPredicate, maxProcessingMs } = options;
  const locks = /* @__PURE__ */ new Map();
  function getState(key) {
    let s = locks.get(key);
    if (!s) {
      s = { busy: false, queue: [] };
      locks.set(key, s);
    }
    return s;
  }
  function cleanupState(key) {
    const s = locks.get(key);
    if (s && !s.busy && s.queue.length === 0 && (!s.mergeBuffer || s.mergeBuffer.length === 0)) {
      locks.delete(key);
    }
  }
  function targetKey(ctx) {
    const t = ctx.message.replyTarget;
    return `${t.scope}:${t.targetId}`;
  }
  const guard = async (ctx, next) => {
    const key = targetKey(ctx);
    const state = getState(key);
    if (!state.busy) {
      state.busy = true;
      state.activeCtx = ctx;
      if (strategy === "merge") {
        state.mergeBuffer = [];
        state.mergeWaiters = [];
      }
      let timedOut = false;
      let timeoutId;
      if (maxProcessingMs && maxProcessingMs > 0) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          ctx.log.warn?.(`[concurrency] aborting active chain ${key} after ${maxProcessingMs}ms`);
          ctx.abort("concurrency:processing-timeout");
          state.busy = false;
          state.activeCtx = void 0;
          if (strategy === "merge") {
            drainMergeBuffer(key, state, ctx).catch(() => {
            });
          } else {
            drainQueue(key);
          }
          cleanupState(key);
        }, maxProcessingMs);
      }
      try {
        await next();
      } finally {
        if (timeoutId)
          clearTimeout(timeoutId);
        if (!timedOut) {
          state.activeCtx = void 0;
          if (strategy === "merge") {
            await drainMergeBuffer(key, state, ctx);
            state.busy = false;
          } else {
            state.busy = false;
            if (strategy === "queue" || strategy === "abort") {
              drainQueue(key);
            }
          }
          cleanupState(key);
        }
      }
      return;
    }
    switch (strategy) {
      case "merge": {
        if (!state.mergeBuffer || !state.mergeWaiters) {
          state.mergeBuffer = [];
          state.mergeWaiters = [];
        }
        if (urgentPredicate?.(ctx)) {
          ctx.log.debug?.(`[concurrency:merge] urgent for ${key}`);
          for (const w of state.mergeWaiters)
            w.resolve();
          state.mergeBuffer.length = 0;
          state.mergeWaiters.length = 0;
          await next();
          return;
        }
        if (state.mergeBuffer.length >= maxQueue) {
          ctx.log.debug?.(`[concurrency:merge] buffer full (${maxQueue}), drop for ${key}`);
          await onDrop?.(ctx);
          ctx.stop("concurrency:merge-full");
          return;
        }
        ctx.log.debug?.(`[concurrency:merge] buffered: ${key} (msgId=${ctx.message.messageId} pos=${state.mergeBuffer.length + 1})`);
        state.mergeBuffer.push(ctx);
        let isSurvivor = false;
        await new Promise((resolve) => {
          state.mergeWaiters.push({
            ctx,
            resolve,
            markSurvivor: () => {
              isSurvivor = true;
            }
          });
        });
        if (isSurvivor) {
          await next();
        }
        return;
      }
      case "drop": {
        ctx.log.debug?.(`[concurrency] drop message for busy target ${key}`);
        await onDrop?.(ctx);
        ctx.stop("concurrency:drop");
        return;
      }
      case "abort": {
        ctx.log.debug?.(`[concurrency] abort previous for ${key}`);
        state.activeCtx?.abort("concurrency:abort");
        for (const entry of state.queue) {
          entry.ctx?.abort("concurrency:superseded");
          entry.run();
        }
        state.queue.length = 0;
        await waitForRelease(state, ctx);
        if (ctx.signal.aborted) {
          ctx.log.debug?.(`[concurrency] superseded while waiting for ${key}`);
          return;
        }
        state.busy = true;
        state.activeCtx = ctx;
        try {
          await next();
        } finally {
          state.busy = false;
          state.activeCtx = void 0;
          drainQueue(key);
        }
        return;
      }
      case "queue":
      default: {
        if (state.queue.length >= maxQueue) {
          ctx.log.debug?.(`[concurrency] queue full (${maxQueue}), drop for ${key}`);
          await onDrop?.(ctx);
          ctx.stop("concurrency:queue-full");
          return;
        }
        ctx.log.debug?.(`[concurrency] queued message for ${key} (pos=${state.queue.length + 1})`);
        await new Promise((resolve) => {
          state.queue.push({ run: resolve });
        });
        state.busy = true;
        state.activeCtx = ctx;
        try {
          await next();
        } finally {
          state.busy = false;
          state.activeCtx = void 0;
          drainQueue(key);
        }
        return;
      }
    }
  };
  async function drainMergeBuffer(key, state, ownerCtx) {
    while (state.mergeBuffer && state.mergeBuffer.length > 0) {
      const buffered = state.mergeBuffer.splice(0);
      const waiters = state.mergeWaiters?.splice(0) ?? [];
      const survivor = onMerge ? onMerge(buffered) : defaultMerge(buffered);
      const validSurvivor = buffered.includes(survivor) ? survivor : buffered[0];
      ownerCtx.log.debug?.(`[concurrency:merge] flushing batch: ${key} (count=${buffered.length})`);
      if (onDispatch) {
        state.activeCtx = validSurvivor;
        try {
          await onDispatch(validSurvivor);
        } catch (err) {
          validSurvivor.log.error?.(`[concurrency:merge] onDispatch error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          state.activeCtx = void 0;
        }
        for (const w of waiters)
          w.resolve();
      } else {
        for (const w of waiters) {
          if (w.ctx === validSurvivor)
            w.markSurvivor();
          w.resolve();
        }
      }
    }
    state.mergeBuffer = void 0;
    state.mergeWaiters = void 0;
  }
  function drainQueue(key) {
    const state = locks.get(key);
    if (!state)
      return;
    const entry = state.queue.shift();
    if (entry) {
      entry.run();
    } else if (!state.busy) {
      locks.delete(key);
    }
  }
  function waitForRelease(state, ctx) {
    if (!state.busy)
      return Promise.resolve();
    return new Promise((resolve) => {
      state.queue.unshift({ run: resolve, ctx });
    });
  }
  function defaultMerge(buffered) {
    const first = buffered[0];
    if (buffered.length === 1)
      return first;
    const contentBearingCtxs = buffered.filter((ctx) => (ctx.message.content ?? "") !== "");
    const contents = contentBearingCtxs.map((ctx) => ctx.message.content);
    if (contents.length > 0) {
      first.message.content = contents.join("\n");
    }
    const envelopes = contentBearingCtxs.map((ctx) => ctx.state.envelope).filter(Boolean);
    if (envelopes.length > 0) {
      first.state.envelope = envelopes.join("\n\n");
    }
    const allAttachments = contentBearingCtxs.flatMap((ctx) => ctx.message.attachments ?? []);
    if (allAttachments.length > 0) {
      first.message.attachments = allAttachments;
    }
    return first;
  }
  return guard;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/access-policy.js
function matcherMatches(matcher, value, ctx) {
  if (matcher === "*")
    return true;
  if (typeof matcher === "string")
    return matcher === value;
  if (matcher instanceof RegExp)
    return matcher.test(value);
  if (typeof matcher === "function")
    return matcher(ctx);
  return false;
}
function evaluateScope(policy, identifier, ctx) {
  const mode = policy?.mode ?? "open";
  if (policy?.deny) {
    for (const m of policy.deny) {
      if (matcherMatches(m, identifier, ctx)) {
        return { allowed: false, reason: `denied by deny-list (${identifier})` };
      }
    }
  }
  if (mode === "disabled") {
    return { allowed: false, reason: "scope disabled by policy" };
  }
  if (mode === "open") {
    return { allowed: true, reason: "" };
  }
  if (!policy?.allow || policy.allow.length === 0) {
    return { allowed: false, reason: "allowlist is empty" };
  }
  for (const m of policy.allow) {
    if (matcherMatches(m, identifier, ctx)) {
      return { allowed: true, reason: "" };
    }
  }
  return { allowed: false, reason: `not in allowlist (${identifier})` };
}
function accessPolicy(policy = {}) {
  return async (ctx, next) => {
    const { kind, senderId, groupOpenid, channelId } = ctx.message;
    let result;
    if (kind === "c2c" || kind === "dm") {
      result = evaluateScope(policy.c2c, senderId, ctx);
    } else if (kind === "group") {
      result = evaluateScope(policy.group, groupOpenid ?? "", ctx);
    } else if (kind === "guild") {
      result = evaluateScope(policy.guild, channelId ?? "", ctx);
    } else {
      result = { allowed: true, reason: "" };
    }
    if (!result.allowed) {
      ctx.log.debug?.(`[access] blocked ${kind} message from ${senderId}: ${result.reason}`);
      policy.onBlock?.(ctx, result.reason);
      ctx.stop(`access:${result.reason}`);
      return;
    }
    await next();
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/mention-gate.js
function detectMentionInContent(content, appId) {
  if (!content || !appId)
    return false;
  const re = new RegExp(`<@!?${appId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`);
  return re.test(content);
}
function mentionGate(options = {}) {
  const { requireMentionInGroup = true, alwaysAnswerC2C = true, isImplicitMention, onSkip, ignoreOtherMentions = false, passthrough = false, resolveConfig } = options;
  return async (ctx, next) => {
    const msg = ctx.message;
    const appId = ctx.bot.appId;
    if (msg.kind !== "group") {
      const decision2 = {
        wasMentioned: true,
        implicit: false,
        shouldAnswer: alwaysAnswerC2C || msg.kind !== "c2c" && msg.kind !== "dm",
        reason: "passthrough"
      };
      ctx.state.mention = decision2;
      await next();
      return;
    }
    const dynamic = resolveConfig?.(ctx);
    const effectiveRequireMention = resolvePolicy(ctx, "group.requireMention", dynamic?.requireMentionInGroup, requireMentionInGroup);
    const effectiveIgnoreOther = resolvePolicy(ctx, "group.ignoreOtherMentions", dynamic?.ignoreOtherMentions, ignoreOtherMentions);
    const wasMentioned = msg.rawEventType === "GROUP_AT_MESSAGE_CREATE" || Array.isArray(msg.mentions) && msg.mentions.some((m) => m?.is_you === true) || detectMentionInContent(msg.content, appId);
    const implicit = isImplicitMention?.(ctx) ?? false;
    let shouldAnswer = !effectiveRequireMention || wasMentioned || implicit;
    let reason = shouldAnswer ? "passthrough" : "no_mention";
    if (effectiveIgnoreOther && effectiveRequireMention && !wasMentioned && !implicit) {
      const mentions = msg.mentions;
      if (Array.isArray(mentions) && mentions.length > 0) {
        shouldAnswer = false;
        reason = "other_mention";
      }
    }
    const decision = {
      wasMentioned,
      implicit,
      shouldAnswer,
      reason
    };
    ctx.state.mention = decision;
    if (!shouldAnswer) {
      onSkip?.(ctx, decision);
      ctx.log.debug?.(`[mention-gate] skip group message (${reason}): wasMentioned=${wasMentioned}, implicit=${implicit}`);
      if (!passthrough) {
        ctx.stop(`mention-gate:${reason}`);
        return;
      }
    }
    await next();
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/quote-ref.js
var MemoryRefIndexStore = class {
  map = /* @__PURE__ */ new Map();
  maxSize;
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }
  get(key) {
    return this.map.get(key);
  }
  set(key, entry) {
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      if (first !== void 0)
        this.map.delete(first);
    }
    this.map.set(key, entry);
  }
};
function quoteRef(options = {}) {
  const contentLimit = options.contentLimit ?? 200;
  const store = options.store ?? new MemoryRefIndexStore(options.maxSize ?? 500);
  return async (ctx, next) => {
    const msg = ctx.message;
    const key = msg.msgIdx ?? msg.messageId;
    if (key) {
      let entry = {
        messageId: msg.messageId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: (msg.content ?? "").slice(0, contentLimit),
        timestamp: msg.timestamp,
        isBot: msg.senderIsBot,
        scope: msg.kind
      };
      if (options.enrichEntry) {
        entry = options.enrichEntry(entry, ctx);
      }
      await store.set(key, entry);
    }
    const refKey = msg.refMsgIdx;
    if (refKey) {
      const entry = await store.get(refKey);
      const resolveFromElements = () => {
        const el = msg.msgElements?.[0];
        if (!el || !el.content && !el.attachments?.length)
          return null;
        const rawContent = el.content ?? "";
        const attachments = parseAttachments(el.attachments);
        return { rawContent, attachments, text: buildText(rawContent, attachments) };
      };
      if (entry) {
        const elementsQuote = options.preferMsgElements !== false ? resolveFromElements() : null;
        if (elementsQuote) {
          ctx.state.quote = {
            refKey,
            source: "msg_elements",
            rawContent: elementsQuote.rawContent,
            attachments: elementsQuote.attachments,
            text: elementsQuote.text
          };
        } else {
          ctx.state.quote = {
            refKey,
            source: "store",
            entry,
            text: entry.content || "[empty message]"
          };
        }
        ctx.log.debug?.(`[quote-ref] hit refKey=${refKey} sender=${entry.senderId}`);
      } else {
        const elementsQuote = resolveFromElements();
        if (elementsQuote) {
          ctx.state.quote = {
            refKey,
            source: "msg_elements",
            rawContent: elementsQuote.rawContent,
            attachments: elementsQuote.attachments,
            text: elementsQuote.text
          };
        } else {
          ctx.state.quote = { refKey, source: "none", text: "" };
        }
        ctx.log.debug?.(`[quote-ref] ${elementsQuote ? "fallback" : "miss"} refKey=${refKey}`);
      }
    }
    await next();
  };
}
function parseAttachments(raw) {
  if (!raw || raw.length === 0)
    return [];
  return raw.map((a) => ({
    contentType: a.content_type,
    url: a.url,
    filename: a.filename,
    asrText: a.asr_refer_text
  }));
}
function buildText(content, attachments) {
  const parts = [];
  if (content.trim())
    parts.push(content.trim());
  for (const att of attachments) {
    const t = att.contentType.toLowerCase();
    if (t.startsWith("audio/")) {
      parts.push(att.asrText ? `[voice: ${att.asrText}]` : "[voice]");
    } else if (t.startsWith("image/")) {
      parts.push(att.filename ? `[image: ${att.filename}]` : "[image]");
    } else if (t.startsWith("video/")) {
      parts.push(att.filename ? `[video: ${att.filename}]` : "[video]");
    } else {
      parts.push(`[file: ${att.filename ?? "untitled"}]`);
    }
  }
  return parts.join("\n") || "[empty message]";
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/envelope-formatter.js
function envelopeFormatter(options = {}) {
  const { historyLimit = 5, includeQuote = true, includeSender = true, format } = options;
  return async (ctx, next) => {
    if (format) {
      ctx.state.envelope = format(ctx);
    } else {
      ctx.state.envelope = buildEnvelope(ctx, { historyLimit, includeQuote, includeSender });
    }
    ctx.log.debug?.(`[envelope] built ${ctx.state.envelope.length} chars (sender=${includeSender}, quote=${includeQuote}, history=${ctx.state.history?.length ?? 0}/${historyLimit})`);
    await next();
  };
}
function buildEnvelope(ctx, opts) {
  const sections = [];
  if (opts.includeSender) {
    const name = ctx.message.senderName || ctx.message.senderId;
    const scope = ctx.message.kind === "group" ? `group(${ctx.message.groupOpenid ?? "unknown"})` : ctx.message.kind;
    sections.push(`<from>
user: ${name}
scope: ${scope}
</from>`);
  }
  if (opts.includeQuote) {
    const quote = ctx.state.quote;
    if (quote && quote.text) {
      const sender = quote.entry?.senderName || quote.entry?.senderId;
      const line = sender ? `${sender}: ${quote.text}` : quote.text;
      sections.push(`<reply_to>
${line}
</reply_to>`);
    }
  }
  const history = ctx.state.history;
  if (history && history.length > 0) {
    const recent = history.slice(-opts.historyLimit);
    const lines = recent.map((h) => {
      const name = h.senderName || h.senderId;
      return `${name}: ${h.content.slice(0, 200)}`;
    });
    sections.push(`<history>
${lines.join("\n")}
</history>`);
  }
  const content = (ctx.message.content ?? "").trim();
  const attachments = ctx.message.attachments;
  const hasAttachments = attachments && attachments.length > 0;
  if (content || hasAttachments) {
    const parts = [];
    if (content) {
      parts.push(content);
    }
    if (hasAttachments) {
      for (const att of attachments) {
        const t = att.content_type.toLowerCase();
        if (t.startsWith("image/"))
          parts.push(`[image: ${att.filename ?? "image"}]`);
        else if (t.startsWith("audio/") || t === "voice") {
          parts.push(att.asr_refer_text ? `[voice: ${att.asr_refer_text}]` : "[voice]");
        } else if (t.startsWith("video/"))
          parts.push("[video]");
        else
          parts.push(`[file: ${att.filename ?? "file"}]`);
      }
    }
    sections.push(`<message>
${parts.join("\n")}
</message>`);
  }
  return sections.join("\n\n");
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/slash-command.js
function slashCommand(options = {}) {
  const prefixes = options.prefixes ?? ["/"];
  const catchErrors = options.catchErrors ?? true;
  const autoHelp = options.autoHelp ?? true;
  const allowFrom = options.allowFrom ?? [];
  const registry = /* @__PURE__ */ new Map();
  const register = (cmd) => {
    const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];
    if (names.length === 0) {
      throw new Error("slash-command: name must not be empty");
    }
    for (const n of names) {
      const key = n.toLowerCase();
      if (registry.has(key)) {
        throw new Error(`slash-command: duplicate name "${n}"`);
      }
      registry.set(key, cmd);
    }
  };
  const unregister = (name) => {
    registry.delete(name.toLowerCase());
  };
  const list = () => {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const cmd of registry.values()) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        out.push(cmd);
      }
    }
    return out;
  };
  for (const cmd of options.commands ?? []) {
    register(cmd);
  }
  if (autoHelp && !registry.has("help")) {
    register({
      name: "help",
      description: "List all available commands",
      handler: () => {
        const lines = ["Available commands:"];
        for (const cmd of list()) {
          if (cmd.hidden)
            continue;
          const names = Array.isArray(cmd.name) ? cmd.name.join(", ") : cmd.name;
          const desc = cmd.description ?? "";
          const usage = cmd.usage ? ` \u2014 ${cmd.usage}` : "";
          lines.push(`/${names}${usage}${desc ? ` \u2014 ${desc}` : ""}`);
        }
        return lines.join("\n");
      }
    });
  }
  const middleware = async (ctx, next) => {
    const content = (ctx.message.content ?? "").trim();
    if (!content) {
      await next();
      return;
    }
    const cleaned = content.replace(/<@!?[^>]+>\s*/g, "").trim();
    if (ctx.message.kind === "group") {
      const msg = ctx.message;
      const wasMentioned = msg.rawEventType === "GROUP_AT_MESSAGE_CREATE" || msg.mentions?.some((m) => m.is_you);
      if (!wasMentioned) {
        await next();
        return;
      }
    }
    const prefix = prefixes.find((p) => cleaned.startsWith(p));
    if (!prefix) {
      await next();
      return;
    }
    const body = cleaned.slice(prefix.length);
    const match = /^(\S+)(?:\s+(.*))?$/.exec(body);
    if (!match) {
      await next();
      return;
    }
    const [, name, rest = ""] = match;
    const cmd = registry.get(name.toLowerCase());
    if (!cmd) {
      await next();
      return;
    }
    const isAllowed = allowFrom.length === 0 || allowFrom.includes("*") || allowFrom.includes(ctx.message.senderId);
    if (!isAllowed) {
      await next();
      return;
    }
    const parsed = {
      name: name.toLowerCase(),
      args: rest ? rest.split(/\s+/) : [],
      raw: rest
    };
    ctx.state.command = parsed;
    const cmdScope = cmd.scope ?? "all";
    if (cmdScope !== "all") {
      const msgKind = ctx.message.kind;
      const isC2C = msgKind === "c2c" || msgKind === "dm";
      const isGroup = msgKind === "group";
      if (cmdScope === "c2c" && !isC2C || cmdScope === "group" && !isGroup) {
        const hint = cmdScope === "c2c" ? "\u8BE5\u6307\u4EE4\u4EC5\u9650\u79C1\u804A\u4F7F\u7528" : "\u8BE5\u6307\u4EE4\u4EC5\u9650\u7FA4\u804A\u4F7F\u7528";
        await sendCommandResult(ctx, hint);
        ctx.stop(`command:scope-denied:${parsed.name}`);
        return;
      }
    }
    const handlerCtx = ctx;
    handlerCtx.command = parsed;
    if (cmd.authorized) {
      const auth = cmd.authorized(handlerCtx);
      if (auth !== true) {
        const authMsg = typeof auth === "string" ? auth : "\u26A0\uFE0F \u65E0\u6743\u9650\u6267\u884C\u6B64\u547D\u4EE4";
        await sendCommandResult(ctx, { kind: "text", content: authMsg });
        ctx.stop(`command:unauthorized:${parsed.name}`);
        return;
      }
    }
    try {
      const result = await cmd.handler(handlerCtx);
      await sendCommandResult(ctx, result);
    } catch (err) {
      if (catchErrors) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.log.error?.(`[slash-command] handler "${parsed.name}" threw: ${msg}`);
        await sendCommandResult(ctx, { kind: "text", content: `Error: ${msg}` });
      } else {
        ctx.stop(`command:error:${parsed.name}`);
        throw err;
      }
    }
    ctx.stop(`command:matched:${parsed.name}`);
  };
  return { middleware, register, unregister, list };
}
async function sendCommandResult(ctx, result) {
  if (result === void 0 || result === null)
    return;
  if (typeof result === "string") {
    if (result)
      await ctx.bot.sendText(ctx.replyTarget, result);
    return;
  }
  if (typeof result === "object") {
    if (result.kind === "text" && result.content) {
      await ctx.bot.sendText(ctx.replyTarget, result.content);
    }
  }
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/history-buffer.js
var MemoryHistoryStore = class {
  buffers = /* @__PURE__ */ new Map();
  append(groupKey, entry, limit) {
    let buf = this.buffers.get(groupKey);
    if (!buf) {
      buf = [];
      this.buffers.set(groupKey, buf);
    }
    if (buf.some((e) => e.messageId === entry.messageId)) {
      return;
    }
    buf.push(entry);
    if (buf.length > limit) {
      buf.splice(0, buf.length - limit);
    }
  }
  list(groupKey, limit) {
    const buf = this.buffers.get(groupKey);
    if (!buf)
      return [];
    return buf.slice(-limit);
  }
  clear(groupKey) {
    this.buffers.delete(groupKey);
  }
  /** Diagnostic: number of groups with buffered history. */
  size() {
    return this.buffers.size;
  }
};
function historyBuffer(options = {}) {
  const limit = options.limit ?? 50;
  const store = options.store ?? new MemoryHistoryStore();
  const recordOnSkip = options.recordOnSkip ?? true;
  const getKey = options.groupKey ?? ((ctx) => ctx.message.kind === "group" ? ctx.message.groupOpenid : void 0);
  const m = async (ctx, next) => {
    const key = getKey(ctx);
    if (!key) {
      await next();
      return;
    }
    const effectiveLimit = resolvePolicy(ctx, "group.historyLimit", limit, 50);
    const buffered = await store.list(key, effectiveLimit);
    ctx.state.history = buffered;
    const entry = {
      senderId: ctx.message.senderId,
      senderName: ctx.message.senderName,
      content: ctx.message.content,
      timestamp: Date.parse(ctx.message.timestamp) || Date.now(),
      messageId: ctx.message.messageId
    };
    try {
      await store.append(key, entry, effectiveLimit);
    } catch (err) {
      ctx.log.error?.(`[history-buffer] append failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (ctx.stopped && !recordOnSkip) {
      return;
    }
    await next();
  };
  return m;
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/typing-indicator.js
var DEFAULT_DURATION_SEC = 60;
var DEFAULT_KEEPALIVE_INTERVAL_MS = 5e4;
function typingIndicator(options = {}) {
  const durationSec = options.durationSec ?? DEFAULT_DURATION_SEC;
  const predicate = options.predicate ?? (() => true);
  const awaitTyping = options.awaitTyping ?? false;
  const keepAlive = options.keepAlive ?? true;
  const keepAliveIntervalMs = options.keepAliveIntervalMs ?? DEFAULT_KEEPALIVE_INTERVAL_MS;
  return async (ctx, next) => {
    if (ctx.message.kind !== "c2c" || !predicate(ctx)) {
      await next();
      return;
    }
    const sendTyping = () => ctx.bot.sendTyping(ctx.replyTarget, durationSec).catch((err) => {
      ctx.log.debug?.(`[typing] failed: ${err instanceof Error ? err.message : String(err)}`);
    });
    const promise = sendTyping();
    if (awaitTyping) {
      await promise;
    }
    let timer = null;
    if (keepAlive) {
      timer = setInterval(() => {
        sendTyping();
      }, keepAliveIntervalMs);
    }
    try {
      await next();
    } finally {
      if (timer) {
        clearInterval(timer);
      }
    }
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/middleware/error-handler.js
var DEFAULT_FORMAT = (err) => {
  if (err instanceof ApiError) {
    if (err.bizMessage)
      return `[QQ ${err.bizCode ?? err.httpStatus}] ${err.bizMessage}`;
    return `[QQ ${err.httpStatus}] ${err.message}`;
  }
  return err.message || "Unknown error";
};
function errorHandler(options = {}) {
  const format = options.format ?? DEFAULT_FORMAT;
  const rethrow = options.rethrow ?? false;
  const filter = options.filter ?? (() => true);
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (!filter(e)) {
        if (rethrow)
          throw e;
        return;
      }
      ctx.log.error?.(`[error-handler] caught: ${e.message}`);
      try {
        const reply = format(e, ctx);
        if (reply) {
          await ctx.bot.sendText(ctx.replyTarget, reply);
        }
      } catch (sendErr) {
        ctx.log.error?.(`[error-handler] failed to send error reply: ${sendErr instanceof Error ? sendErr.message : String(sendErr)}`);
      }
      if (rethrow)
        throw e;
    }
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/storage/kv-store.js
import fs4 from "node:fs";
import path2 from "node:path";
var MemoryKVStore = class {
  map = /* @__PURE__ */ new Map();
  get(key) {
    const entry = this.map.get(key);
    if (!entry)
      return void 0;
    if (entry.expireAt && entry.expireAt <= Date.now()) {
      this.map.delete(key);
      return void 0;
    }
    return entry.value;
  }
  set(key, value, ttlMs) {
    this.map.set(key, {
      value,
      expireAt: ttlMs && ttlMs > 0 ? Date.now() + ttlMs : void 0
    });
  }
  delete(key) {
    return this.map.delete(key);
  }
  has(key) {
    const entry = this.map.get(key);
    if (!entry)
      return false;
    if (entry.expireAt && entry.expireAt <= Date.now()) {
      this.map.delete(key);
      return false;
    }
    return true;
  }
  keys(prefix) {
    const all = [...this.map.keys()];
    return prefix ? all.filter((k) => k.startsWith(prefix)) : all;
  }
  clear(prefix) {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const k of this.map.keys()) {
      if (k.startsWith(prefix))
        this.map.delete(k);
    }
  }
  /** Diagnostic: number of keys (incl. expired-but-not-yet-cleaned). */
  size() {
    return this.map.size;
  }
};
var FileKVStore = class {
  map = /* @__PURE__ */ new Map();
  filePath;
  saveThrottleMs;
  saveTimer = null;
  dirty = false;
  logger;
  constructor(opts) {
    this.filePath = path2.join(opts.dir, opts.fileName ?? "kv-store.json");
    this.saveThrottleMs = opts.saveThrottleMs ?? 1e3;
    this.logger = opts.logger ?? {};
    this.load();
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry)
      return void 0;
    if (entry.expireAt && entry.expireAt <= Date.now()) {
      this.map.delete(key);
      this.scheduleSave();
      return void 0;
    }
    return entry.value;
  }
  set(key, value, ttlMs) {
    this.map.set(key, {
      value,
      expireAt: ttlMs && ttlMs > 0 ? Date.now() + ttlMs : void 0
    });
    this.scheduleSave();
  }
  delete(key) {
    const removed = this.map.delete(key);
    if (removed)
      this.scheduleSave();
    return removed;
  }
  has(key) {
    return this.get(key) !== void 0;
  }
  keys(prefix) {
    const all = [...this.map.keys()];
    return prefix ? all.filter((k) => k.startsWith(prefix)) : all;
  }
  clear(prefix) {
    if (!prefix) {
      this.map.clear();
    } else {
      for (const k of this.map.keys()) {
        if (k.startsWith(prefix))
          this.map.delete(k);
      }
    }
    this.scheduleSave();
  }
  /** Force flush pending writes. Call before process exit. */
  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) {
      this.doSave();
    }
  }
  // ============ Internal ============
  load() {
    try {
      if (!fs4.existsSync(this.filePath))
        return;
      const raw = fs4.readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [k, e] of Object.entries(data)) {
        if (e.expireAt && e.expireAt <= now)
          continue;
        this.map.set(k, e);
      }
    } catch (err) {
      this.logger.error?.(`[file-kv-store] load failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  scheduleSave() {
    this.dirty = true;
    if (this.saveTimer)
      return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.doSave();
    }, this.saveThrottleMs);
  }
  doSave() {
    try {
      fs4.mkdirSync(path2.dirname(this.filePath), { recursive: true });
      const obj = {};
      for (const [k, e] of this.map)
        obj[k] = e;
      const tmp = this.filePath + ".tmp";
      fs4.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf-8");
      fs4.renameSync(tmp, this.filePath);
      this.dirty = false;
    } catch (err) {
      this.logger.error?.(`[file-kv-store] save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/storage/session-adapter.js
function kvSessionPersistence(opts) {
  const prefix = opts.prefix ?? "qqbot:session:";
  const key = `${prefix}${opts.accountId}`;
  const ttlMs = opts.ttlMs ?? 5 * 60 * 1e3;
  return {
    load() {
      const v = opts.store.get(key);
      if (v && typeof v.then === "function") {
        return null;
      }
      return v ?? null;
    },
    save(session) {
      void opts.store.set(key, session, ttlMs);
    },
    clear() {
      void opts.store.delete(key);
    }
  };
}

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/reply-limiter.js
var DEFAULT_LIMIT = 4;
var DEFAULT_TTL_MS = 60 * 60 * 1e3;
var DEFAULT_MAX_TRACKED = 1e4;
var ReplyLimiter = class {
  limit;
  ttlMs;
  maxTracked;
  tracker = /* @__PURE__ */ new Map();
  constructor(config) {
    this.limit = config?.limit ?? DEFAULT_LIMIT;
    this.ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxTracked = config?.maxTrackedMessages ?? DEFAULT_MAX_TRACKED;
  }
  /** Check whether a passive reply is allowed for the given message. */
  checkLimit(messageId) {
    const now = Date.now();
    this.evictIfNeeded(now);
    const record = this.tracker.get(messageId);
    if (!record) {
      return {
        allowed: true,
        remaining: this.limit,
        shouldFallbackToProactive: false
      };
    }
    if (now - record.firstReplyAt > this.ttlMs) {
      return {
        allowed: false,
        remaining: 0,
        shouldFallbackToProactive: true,
        fallbackReason: "expired",
        message: `Message is older than ${this.ttlMs / (60 * 60 * 1e3)}h; sending as a proactive message instead`
      };
    }
    const remaining = this.limit - record.count;
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        shouldFallbackToProactive: true,
        fallbackReason: "limit_exceeded",
        message: `Passive reply limit reached (${this.limit} per hour); sending proactively instead`
      };
    }
    return {
      allowed: true,
      remaining,
      shouldFallbackToProactive: false
    };
  }
  /** Record one passive reply against a message. */
  record(messageId) {
    const now = Date.now();
    const existing = this.tracker.get(messageId);
    if (!existing) {
      this.tracker.set(messageId, { count: 1, firstReplyAt: now });
    } else if (now - existing.firstReplyAt > this.ttlMs) {
      this.tracker.set(messageId, { count: 1, firstReplyAt: now });
    } else {
      existing.count++;
    }
  }
  /** Return diagnostic stats. */
  getStats() {
    let totalReplies = 0;
    for (const record of this.tracker.values()) {
      totalReplies += record.count;
    }
    return { trackedMessages: this.tracker.size, totalReplies };
  }
  /** Return limiter configuration. */
  getConfig() {
    return {
      limit: this.limit,
      ttlMs: this.ttlMs,
      ttlHours: this.ttlMs / (60 * 60 * 1e3)
    };
  }
  /** Clear all tracked records. */
  clear() {
    this.tracker.clear();
  }
  /** Opportunistically evict expired records to keep the tracker bounded. */
  evictIfNeeded(now) {
    if (this.tracker.size <= this.maxTracked) {
      return;
    }
    for (const [id, rec] of this.tracker) {
      if (now - rec.firstReplyAt > this.ttlMs) {
        this.tracker.delete(id);
      }
    }
  }
};

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/media-tags.js
var VALID_TAGS = ["qqimg", "qqvoice", "qqvideo", "qqfile", "qqmedia"];
var TAG_ALIASES = {
  qq_img: "qqimg",
  qqimage: "qqimg",
  qq_image: "qqimg",
  qqpic: "qqimg",
  qq_pic: "qqimg",
  qqpicture: "qqimg",
  qq_picture: "qqimg",
  qqphoto: "qqimg",
  qq_photo: "qqimg",
  img: "qqimg",
  image: "qqimg",
  pic: "qqimg",
  picture: "qqimg",
  photo: "qqimg",
  qq_voice: "qqvoice",
  qqaudio: "qqvoice",
  qq_audio: "qqvoice",
  voice: "qqvoice",
  audio: "qqvoice",
  qq_video: "qqvideo",
  video: "qqvideo",
  qq_file: "qqfile",
  qqdoc: "qqfile",
  qq_doc: "qqfile",
  file: "qqfile",
  doc: "qqfile",
  document: "qqfile",
  qq_media: "qqmedia",
  media: "qqmedia",
  attachment: "qqmedia",
  attach: "qqmedia",
  qqattachment: "qqmedia",
  qq_attachment: "qqmedia",
  qqsend: "qqmedia",
  qq_send: "qqmedia",
  send: "qqmedia"
};
var ALL_TAG_NAMES = [...VALID_TAGS, ...Object.keys(TAG_ALIASES)];
ALL_TAG_NAMES.sort((a, b) => b.length - a.length);
var TAG_NAME_PATTERN = ALL_TAG_NAMES.join("|");
var LEFT_BRACKET = "(?:[<\uFF1C<]|&lt;)";
var RIGHT_BRACKET = "(?:[>\uFF1E>]|&gt;)";
var SELF_CLOSING_TAG_REGEX = new RegExp("`?" + LEFT_BRACKET + "\\s*(" + TAG_NAME_PATTERN + `)(?:\\s+(?!file|src|path|url)[a-z_-]+\\s*=\\s*["']?[^"'\\s\uFF1C<>\uFF1E>]*?["']?)*\\s+(?:file|src|path|url)\\s*=\\s*["']?([^"'\\s>\uFF1E]+?)["']?(?:\\s+[a-z_-]+\\s*=\\s*["']?[^"'\\s\uFF1C<>\uFF1E>]*?["']?)*\\s*/?\\s*` + RIGHT_BRACKET + "`?", "gi");
var FUZZY_MEDIA_TAG_REGEX = new RegExp("`?" + LEFT_BRACKET + "\\s*(" + TAG_NAME_PATTERN + ")\\s*" + RIGHT_BRACKET + `["']?\\s*([^<\uFF1C<\uFF1E>"'\`]+?)\\s*["']?` + LEFT_BRACKET + "\\s*/?\\s*(?:" + TAG_NAME_PATTERN + ")\\s*" + RIGHT_BRACKET + "`?", "gi");
var MULTILINE_TAG_CLEANUP = new RegExp("(" + LEFT_BRACKET + "\\s*(?:" + TAG_NAME_PATTERN + ")\\s*" + RIGHT_BRACKET + ")([\\s\\S]*?)(" + LEFT_BRACKET + "\\s*/?\\s*(?:" + TAG_NAME_PATTERN + ")\\s*" + RIGHT_BRACKET + ")", "gi");

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/ref-index-store.js
var DEFAULT_TTL_MS2 = 7 * 24 * 60 * 60 * 1e3;

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/session-store.js
var DEFAULT_EXPIRE_MS = 5 * 60 * 1e3;

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/text-parsing.js
var MAX_FACE_EXT_BYTES = 64 * 1024;

// node_modules/@tencent-connect/qqbot-nodejs/dist/protocol/utils/text-chunk.js
var TEXT_CHUNK_LIMIT = 5e3;
export {
  ApiError,
  FULL_INTENTS,
  FileKVStore,
  GatewayConnection,
  GatewayError,
  GatewayErrorCode,
  MediaFileType,
  MemoryKVStore,
  MsgType,
  QQBot,
  ReplyLimiter,
  TEXT_CHUNK_LIMIT,
  accessPolicy,
  concurrencyGuard,
  contentSanitizer,
  envelopeFormatter,
  errorHandler,
  formatErrorMessage,
  formatFileSize,
  getMaxUploadSize,
  historyBuffer,
  kvSessionPersistence,
  mentionGate,
  messageFilter,
  quoteRef,
  rateLimiter,
  sanitizeFileName,
  slashCommand,
  typingIndicator
};
