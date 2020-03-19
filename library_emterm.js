// Copyright 2013 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

mergeInto(LibraryManager.library, {
  $TTY__deps: ['$FS'],
#if !MINIMAL_RUNTIME
  $TTY__postset: function() {
    addAtInit('TTY.init();');
    addAtExit('TTY.shutdown();');
  },
#endif
  $TTY: {
    ttys: [],
    init: function () {
      // https://github.com/emscripten-core/emscripten/pull/1555
      // if (ENVIRONMENT_IS_NODE) {
      //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
      //   // device, it always assumes it's a TTY device. because of this, we're forcing
      //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
      //   // with text files until FS.init can be refactored.
      //   process['stdin']['setEncoding']('utf8');
      // }
    },
    shutdown: function() {
      // https://github.com/emscripten-core/emscripten/pull/1555
      // if (ENVIRONMENT_IS_NODE) {
      //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
      //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
      //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
      //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
      //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
      //   process['stdin']['pause']();
      // }
    },
    register: function(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops: ops };
      FS.registerDevice(dev, TTY.stream_ops);
    },
    stream_ops: {
      open: function(stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) {
          throw new FS.ErrnoError({{{ cDefine('ENODEV') }}});
        }
        stream.tty = tty;
        stream.seekable = false;
      },
      close: function(stream) {
        // flush any pending line data
        stream.tty.ops.flush(stream.tty);
      },
      flush: function(stream) {
        stream.tty.ops.flush(stream.tty);
      },
      read: function(stream, buffer, offset, length, pos /* ignored */) {
        if (!stream.tty || !stream.tty.ops.get_char) {
          throw new FS.ErrnoError({{{ cDefine('ENXIO') }}});
        }
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty, stream.flags & 0x800 /*O_NONBLOCK*/ === 0);
          } catch (e) {
            throw new FS.ErrnoError({{{ cDefine('EIO') }}});
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError({{{ cDefine('EAGAIN') }}});
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset+i] = result;
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now();
        }
        return bytesRead;
      },
      write: function(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) {
          throw new FS.ErrnoError({{{ cDefine('ENXIO') }}});
        }
        try {
          for (var i = 0; i < length; i++) {
            stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
          }
        } catch (e) {
          throw new FS.ErrnoError({{{ cDefine('EIO') }}});
        }
        if (length) {
          stream.node.timestamp = Date.now();
        } else {
          stream.tty.ops.put_char(stream.tty, null);
        }
        return i;
      },
      poll: function(stream) {
        if (!stream.tty) {
          throw new FS.ErrnoError({{{ cDefine('EBADF') }}});
        }
        var ret = 0;
        if (Module.tty && Module.tty.poll_out) {
          if (Module.tty.poll_out(stream.tty)) {
            ret |= {{{ cDefine('POLLOUT') }}};
          }
        } else {
          ret |= {{{ cDefine('POLLOUT') }}};
        }
        if (stream.tty.input.length) {
          ret |= {{{ cDefine('POLLIN') }}};
        } else if (Module.tty && Module.tty.poll_in && Module.tty.poll_in(stream.tty)) {
          ret |= {{{ cDefine('POLLIN') }}};
        }
        return ret;
      },
      ioctl: function(stream, op, argp) {
        if (!stream.tty) {
          throw new FS.ErrnoError({{{ cDefine('ENOTTY') }}});
        }
        switch (op) {
          case {{{ cDefine('TIOCGWINSZ') }}}: {
            if (Module.tty && Module.tty.get_winsize) {
              var winsize = {
                ws_row: 0,
                ws_col: 0,
                ws_xpixel: 0,
                ws_ypixel: 0
              };
              Module.tty.get_winsize(stream.tty, winsize);
              {{{ makeSetValue('argp', 0/*C_STRUCTS.winsize.ws_row*/, 'winsize.ws_row', 'i16') }}};
              {{{ makeSetValue('argp', 2/*C_STRUCTS.winsize.ws_col*/, 'winsize.ws_col', 'i16') }}};
              {{{ makeSetValue('argp', 4/*C_STRUCTS.winsize.ws_xpixel*/, 'winsize.ws_xpixel', 'i16') }}};
              {{{ makeSetValue('argp', 6/*C_STRUCTS.winsize.ws_ypixel*/, 'winsize.ws_ypixel', 'i16') }}};
            }
            return 0;
          }
          case {{{ cDefine('TIOCSWINSZ') }}}: {
            if (Module.tty && Module.tty.set_winsize) {
              var winsize = {
                ws_row: {{{ makeGetValue('argp', 0/*C_STRUCTS.winsize.ws_row*/, 'i16') }}},
                ws_col: {{{ makeGetValue('argp', 2/*C_STRUCTS.winsize.ws_col*/, 'i16') }}},
                ws_xpixel: {{{ makeGetValue('argp', 4/*C_STRUCTS.winsize.ws_xpixel*/, 'i16') }}},
                ws_ypixel: {{{ makeGetValue('argp', 6/*C_STRUCTS.winsize.ws_ypixel*/, 'i16') }}}
              }
              Module.tty.set_winsize(stream.tty, winsize);
            }
            return 0;
          }
          default: return 0;
        }
      }
    },
    default_tty_ops: {
      // get_char has 3 particular return values:
      // a.) the next character represented as an integer
      // b.) undefined to signal that no data is currently available
      // c.) null to signal an EOF
      get_char: function(tty, blocking) {
        if (Module.tty && Module.tty.get_char) return Module.tty.get_char(tty, blocking);
        if (!tty.input.length) {
          var result = null;
#if ENVIRONMENT_MAY_BE_NODE
          if (ENVIRONMENT_IS_NODE) {
            // we will read data by chunks of BUFSIZE
            var BUFSIZE = 256;
            var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
            var bytesRead = 0;

            try {
              bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null);
            } catch(e) {
              // Cross-platform differences: on Windows, reading EOF throws an exception, but on other OSes,
              // reading EOF returns 0. Uniformize behavior by treating the EOF exception to return 0.
              if (e.toString().indexOf('EOF') != -1) bytesRead = 0;
              else throw e;
            }

            if (bytesRead > 0) {
              result = buf.slice(0, bytesRead).toString('utf-8');
            } else {
              result = null;
            }
          } else
#endif
          if (typeof window != 'undefined' &&
            typeof window.prompt == 'function') {
            // Browser.
            result = window.prompt('Input: ');  // returns null on cancel
            if (result !== null) {
              result += '\n';
            }
          } else if (typeof readline == 'function') {
            // Command line.
            result = readline();
            if (result !== null) {
              result += '\n';
            }
          }
          if (!result) {
            return null;
          }
          tty.input = intArrayFromString(result, true);
        }
        return tty.input.shift();
      },
      put_char: function(tty, val) {
        if (Module.tty && Module.tty.put_char) return Module.tty.put_char(tty, val);
        if (val === null || val === {{{ charCode('\n') }}}) {
          if (Module.tty && Module.tty.put_array) {
            if (val !== null) tty.output.push(val);
            Module.tty.put_array(tty, tty.output);
          } else {
            out(UTF8ArrayToString(tty.output, 0));
          }
          tty.output = [];
        } else {
          if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
        }
      },
      flush: function(tty) {
        if (Module.tty && Module.tty.flush) return Module.tty.flush(tty);
        if (tty.output && tty.output.length > 0) {
          tty.ops.put_char(tty, null);
        }
      }
    },
    default_tty1_ops: {
      put_char: function(tty, val) {
        if (val === null || val === {{{ charCode('\n') }}}) {
          err(UTF8ArrayToString(tty.output, 0));
          tty.output = [];
        } else {
          if (val != 0) tty.output.push(val);
        }
      },
      flush: function(tty) {
        if (tty.output && tty.output.length > 0) {
          err(UTF8ArrayToString(tty.output, 0));
          tty.output = [];
        }
      }
    }
  }
});
