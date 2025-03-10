// Copyright Node.js contributors. All rights reserved. MIT License.
import { captureRejectionSymbol } from "../events.js";
import Readable, { ReadableState } from "./readable.ts";
import Stream from "./stream.ts";
import Writable, { WritableState } from "./writable.ts";
import type { WritableEncodings } from "./writable.ts";
import { Buffer } from "../buffer.ts";
import {
  ERR_STREAM_ALREADY_FINISHED,
  ERR_STREAM_DESTROYED,
  ERR_UNKNOWN_ENCODING,
} from "../_errors.ts";
import type { Encodings } from "../_utils.ts";
import createReadableStreamAsyncIterator from "./async_iterator.ts";
import type { ReadableStreamAsyncIterator } from "./async_iterator.ts";
import {
  _destroy,
  computeNewHighWaterMark,
  emitReadable,
  fromList,
  howMuchToRead,
  nReadingNextTick,
  updateReadableListening,
} from "./readable_internal.ts";
import { kOnFinished, writeV } from "./writable_internal.ts";
import {
  endDuplex,
  finishMaybe,
  onwrite,
  readableAddChunk,
} from "./duplex_internal.ts";
import { debuglog } from "../_util/_debuglog.ts";

export { errorOrDestroy } from "./duplex_internal.ts";

let debug = debuglog("stream", (fn) => {
  debug = fn;
});

export interface DuplexOptions {
  allowHalfOpen?: boolean;
  autoDestroy?: boolean;
  decodeStrings?: boolean;
  defaultEncoding?: Encodings;
  destroy?(
    this: Duplex,
    error: Error | null,
    callback: (error: Error | null) => void,
  ): void;
  emitClose?: boolean;
  encoding?: Encodings;
  final?(this: Duplex, callback: (error?: Error | null) => void): void;
  highWaterMark?: number;
  objectMode?: boolean;
  read?(this: Duplex, size: number): void;
  readable?: boolean;
  readableHighWaterMark?: number;
  readableObjectMode?: boolean;
  writable?: boolean;
  writableCorked?: number;
  writableHighWaterMark?: number;
  writableObjectMode?: boolean;
  write?(
    this: Duplex,
    // deno-lint-ignore no-explicit-any
    chunk: any,
    encoding: Encodings,
    callback: (error?: Error | null) => void,
  ): void;
  writev?: writeV;
}

// @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
interface Duplex extends Readable, Writable {}

/**
 * A duplex is an implementation of a stream that has both Readable and Writable
 * attributes and capabilities
 */
class Duplex extends Stream {
  allowHalfOpen = true;
  _final?: (
    callback: (error?: Error | null | undefined) => void,
  ) => void;
  _readableState: ReadableState;
  _writableState: WritableState;
  _writev?: writeV | null;

  constructor(options?: DuplexOptions) {
    super();

    const readableOptions = {
      autoDestroy: options?.autoDestroy,
      defaultEncoding: options?.defaultEncoding,
      destroy: options?.destroy as unknown as (
        this: Readable,
        error: Error | null,
        callback: (error: Error | null) => void,
      ) => void,
      emitClose: options?.emitClose,
      encoding: options?.encoding,
      highWaterMark: options?.highWaterMark ?? options?.readableHighWaterMark,
      objectMode: options?.objectMode ?? options?.readableObjectMode,
      read: options?.read as unknown as (this: Readable) => void,
    };

    const writableOptions = {
      autoDestroy: options?.autoDestroy,
      decodeStrings: options?.decodeStrings,
      defaultEncoding: options?.defaultEncoding,
      destroy: options?.destroy as unknown as (
        this: Writable,
        error: Error | null,
        callback: (error: Error | null) => void,
      ) => void,
      emitClose: options?.emitClose,
      final: options?.final as unknown as (
        this: Writable,
        callback: (error?: Error | null) => void,
      ) => void,
      highWaterMark: options?.highWaterMark ?? options?.writableHighWaterMark,
      objectMode: options?.objectMode ?? options?.writableObjectMode,
      write: options?.write as unknown as (
        this: Writable,
        // deno-lint-ignore no-explicit-any
        chunk: any,
        encoding: string,
        callback: (error?: Error | null) => void,
      ) => void,
      writev: options?.writev as unknown as (
        this: Writable,
        // deno-lint-ignore no-explicit-any
        chunks: Array<{ chunk: any; encoding: Encodings }>,
        callback: (error?: Error | null) => void,
      ) => void,
    };

    this._readableState = new ReadableState(readableOptions);
    this._writableState = new WritableState(
      writableOptions,
      this as unknown as Writable,
    );
    //Very important to override onwrite here, duplex implementation adds a check
    //on the readable side
    this._writableState.onwrite = onwrite.bind(undefined, this);

    if (options) {
      if (options.allowHalfOpen === false) {
        this.allowHalfOpen = false;
      }
      if (typeof options.destroy === "function") {
        this._destroy = options.destroy;
      }
      if (typeof options.final === "function") {
        this._final = options.final;
      }
      if (typeof options.read === "function") {
        this._read = options.read;
      }
      if (options.readable === false) {
        this.readable = false;
        this._readableState.readable = false;
        this._readableState.ended = true;
        this._readableState.endEmitted = true;
      }
      if (options.writable === false) {
        this.writable = false;
        this._writableState.writable = false;
        this._writableState.ending = true;
        this._writableState.ended = true;
        this._writableState.finished = true;
      }
      if (typeof options.write === "function") {
        this._write = options.write;
      }
      if (typeof options.writev === "function") {
        this._writev = options.writev;
      }
    }
  }

  [captureRejectionSymbol](err?: Error) {
    this.destroy(err);
  }

  [Symbol.asyncIterator](): ReadableStreamAsyncIterator {
    return createReadableStreamAsyncIterator(this);
  }

  _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    callback(error);
  }

  _read(size?: number) {
    return Readable.prototype._read.call(this, size);
  }

  _undestroy() {
    Writable.prototype._undestroy.call(this);
    Readable.prototype._undestroy.call(this);

    return;
  }

  destroy(err?: Error | null, cb?: (error?: Error | null) => void) {
    const r = this._readableState;
    const w = this._writableState;

    if (w.destroyed || r.destroyed) {
      if (typeof cb === "function") {
        cb();
      }

      return this;
    }

    if (err) {
      // Avoid V8 leak, https://github.com/nodejs/node/pull/34103#issuecomment-652002364
      err.stack;

      if (!w.errored) {
        w.errored = err;
      }
      if (!r.errored) {
        r.errored = err;
      }
    }

    w.destroyed = true;
    r.destroyed = true;

    this._destroy(err || null, (err) => {
      if (err) {
        // Avoid V8 leak, https://github.com/nodejs/node/pull/34103#issuecomment-652002364
        err.stack;

        if (!w.errored) {
          w.errored = err;
        }
        if (!r.errored) {
          r.errored = err;
        }
      }

      w.closed = true;
      r.closed = true;

      if (typeof cb === "function") {
        cb(err);
      }

      if (err) {
        queueMicrotask(() => {
          const r = this._readableState;
          const w = this._writableState;

          if (!w.errorEmitted && !r.errorEmitted) {
            w.errorEmitted = true;
            r.errorEmitted = true;

            this.emit("error", err);
          }

          r.closeEmitted = true;

          if (w.emitClose || r.emitClose) {
            this.emit("close");
          }
        });
      } else {
        queueMicrotask(() => {
          const r = this._readableState;
          const w = this._writableState;

          r.closeEmitted = true;

          if (w.emitClose || r.emitClose) {
            this.emit("close");
          }
        });
      }
    });

    return this;
  }

  isPaused() {
    return Readable.prototype.isPaused.call(this);
  }

  off = this.removeListener;

  on(
    event: "close" | "end" | "pause" | "readable" | "resume",
    listener: () => void,
  ): this;
  // deno-lint-ignore no-explicit-any
  on(event: "data", listener: (chunk: any) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  // deno-lint-ignore no-explicit-any
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  on(
    ev: string | symbol,
    fn:
      | (() => void)
      // deno-lint-ignore no-explicit-any
      | ((chunk: any) => void)
      | ((err: Error) => void)
      // deno-lint-ignore no-explicit-any
      | ((...args: any[]) => void),
  ) {
    const res = super.on.call(this, ev, fn);
    const state = this._readableState;

    if (ev === "data") {
      state.readableListening = this.listenerCount("readable") > 0;

      if (state.flowing !== false) {
        this.resume();
      }
    } else if (ev === "readable") {
      if (!state.endEmitted && !state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.flowing = false;
        state.emittedReadable = false;
        if (state.length) {
          emitReadable(this);
        } else if (!state.reading) {
          queueMicrotask(() => nReadingNextTick(this));
        }
      }
    }

    return res;
  }

  pause(): this {
    return Readable.prototype.pause.call(this) as this;
  }

  pipe<T extends Duplex | Writable>(dest: T, pipeOpts?: { end?: boolean }): T {
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    return Readable.prototype.pipe.call(this, dest, pipeOpts);
  }

  // deno-lint-ignore no-explicit-any
  push(chunk: any, encoding?: Encodings): boolean {
    return readableAddChunk(this, chunk, encoding, false);
  }

  /** You can override either this method, or the async `_read` method */
  read(n?: number) {
    debug("read", n);
    // Same as parseInt(undefined, 10), however V8 7.3 performance regressed
    // in this scenario, so we are doing it manually.
    if (n === undefined) {
      n = NaN;
    }
    const state = this._readableState;
    const nOrig = n;

    if (n > state.highWaterMark) {
      state.highWaterMark = computeNewHighWaterMark(n);
    }

    if (n !== 0) {
      state.emittedReadable = false;
    }

    if (
      n === 0 &&
      state.needReadable &&
      ((state.highWaterMark !== 0
        ? state.length >= state.highWaterMark
        : state.length > 0) ||
        state.ended)
    ) {
      debug("read: emitReadable", state.length, state.ended);
      if (state.length === 0 && state.ended) {
        endDuplex(this);
      } else {
        emitReadable(this);
      }
      return null;
    }

    n = howMuchToRead(n, state);

    if (n === 0 && state.ended) {
      if (state.length === 0) {
        endDuplex(this);
      }
      return null;
    }

    let doRead = state.needReadable;
    debug("need readable", doRead);

    if (
      state.length === 0 || state.length - (n as number) < state.highWaterMark
    ) {
      doRead = true;
      debug("length less than watermark", doRead);
    }

    if (
      state.ended || state.reading || state.destroyed || state.errored ||
      !state.constructed
    ) {
      doRead = false;
      debug("reading, ended or constructing", doRead);
    } else if (doRead) {
      debug("do read");
      state.reading = true;
      state.sync = true;
      if (state.length === 0) {
        state.needReadable = true;
      }
      this._read(state.highWaterMark);
      state.sync = false;
      if (!state.reading) {
        n = howMuchToRead(nOrig, state);
      }
    }

    let ret;
    if ((n as number) > 0) {
      ret = fromList(n as number, state);
    } else {
      ret = null;
    }

    if (ret === null) {
      state.needReadable = state.length <= state.highWaterMark;
      n = 0;
    } else {
      state.length -= n as number;
      if (state.multiAwaitDrain) {
        (state.awaitDrainWriters as Set<Writable>).clear();
      } else {
        state.awaitDrainWriters = null;
      }
    }

    if (state.length === 0) {
      if (!state.ended) {
        state.needReadable = true;
      }

      if (nOrig !== n && state.ended) {
        endDuplex(this);
      }
    }

    if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
      state.dataEmitted = true;
      this.emit("data", ret);
    }

    return ret;
  }

  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  removeAllListeners(
    ev:
      | "close"
      | "data"
      | "end"
      | "error"
      | "pause"
      | "readable"
      | "resume"
      | symbol
      | undefined,
  ) {
    const res = super.removeAllListeners(ev);

    if (ev === "readable" || ev === undefined) {
      queueMicrotask(() => updateReadableListening(this));
    }

    return res;
  }

  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  removeListener(
    event: "close" | "end" | "pause" | "readable" | "resume",
    listener: () => void,
  ): this;
  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  // deno-lint-ignore no-explicit-any
  removeListener(event: "data", listener: (chunk: any) => void): this;
  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  removeListener(event: "error", listener: (err: Error) => void): this;
  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  removeListener(
    event: string | symbol,
    // deno-lint-ignore no-explicit-any
    listener: (...args: any[]) => void,
  ): this;
  // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
  removeListener(
    ev: string | symbol,
    fn:
      | (() => void)
      // deno-lint-ignore no-explicit-any
      | ((chunk: any) => void)
      | ((err: Error) => void)
      // deno-lint-ignore no-explicit-any
      | ((...args: any[]) => void),
  ): this {
    const res = super.removeListener.call(this, ev, fn);

    if (ev === "readable") {
      queueMicrotask(() => updateReadableListening(this));
    }

    // @ts-ignore `deno_std`'s types are scricter than types from DefinitelyTyped for Node.js thus causing problems
    return res;
  }

  resume(): this {
    return Readable.prototype.resume.call(this) as this;
  }

  setEncoding(enc: Encodings): this {
    return Readable.prototype.setEncoding.call(this, enc) as this;
  }

  // deno-lint-ignore no-explicit-any
  unshift(chunk: any, encoding?: Encodings): boolean {
    return readableAddChunk(this, chunk, encoding, true);
  }

  unpipe(dest?: Writable): this {
    return Readable.prototype.unpipe.call(this, dest) as this;
  }

  wrap(stream: Stream): this {
    return Readable.prototype.wrap.call(this, stream) as this;
  }

  get readable(): boolean {
    const r = this._readableState;

    return !!r && r.readable &&
      !r.destroyed &&
      !r.errorEmitted &&
      !r.endEmitted;
  }
  set readable(val: boolean) {
    if (this._readableState) {
      this._readableState.readable = val;
    }
  }

  get readableHighWaterMark(): number {
    return this._readableState.highWaterMark;
  }

  get readableBuffer() {
    return this._readableState && this._readableState.buffer;
  }

  get readableFlowing(): boolean | null {
    return this._readableState.flowing;
  }

  set readableFlowing(state: boolean | null) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }

  get readableLength() {
    return this._readableState.length;
  }

  get readableObjectMode() {
    return this._readableState ? this._readableState.objectMode : false;
  }

  get readableEncoding() {
    return this._readableState ? this._readableState.encoding : null;
  }

  get readableEnded() {
    return this._readableState ? this._readableState.endEmitted : false;
  }

  _write(
    // deno-lint-ignore no-explicit-any
    chunk: any,
    encoding: string,
    cb: (error?: Error | null) => void,
  ): void {
    return Writable.prototype._write.call(this, chunk, encoding, cb);
  }

  write(
    // deno-lint-ignore no-explicit-any
    chunk: any,
    x?: WritableEncodings | null | ((error: Error | null | undefined) => void),
    y?: ((error: Error | null | undefined) => void),
  ) {
    // deno-lint-ignore no-explicit-any
    return Writable.prototype.write.call(this, chunk, x as any, y);
  }

  cork() {
    return Writable.prototype.cork.call(this);
  }

  uncork() {
    return Writable.prototype.uncork.call(this);
  }

  setDefaultEncoding(encoding: string) {
    // node::ParseEncoding() requires lower case.
    if (typeof encoding === "string") {
      encoding = encoding.toLowerCase();
    }
    if (!Buffer.isEncoding(encoding)) {
      throw new ERR_UNKNOWN_ENCODING(encoding);
    }
    this._writableState.defaultEncoding = encoding as Encodings;
    return this;
  }

  end(cb?: () => void): void;
  // deno-lint-ignore no-explicit-any
  end(chunk: any, cb?: () => void): void;
  // deno-lint-ignore no-explicit-any
  end(chunk: any, encoding: Encodings, cb?: () => void): void;

  end(
    // deno-lint-ignore no-explicit-any
    x?: any | (() => void),
    y?: Encodings | (() => void),
    z?: () => void,
  ) {
    const state = this._writableState;
    // deno-lint-ignore no-explicit-any
    let chunk: any | null;
    let encoding: Encodings | null;
    let cb: undefined | ((error?: Error) => void);

    if (typeof x === "function") {
      chunk = null;
      encoding = null;
      cb = x;
    } else if (typeof y === "function") {
      chunk = x;
      encoding = null;
      cb = y;
    } else {
      chunk = x;
      encoding = y as Encodings;
      cb = z;
    }

    if (chunk !== null && chunk !== undefined) {
      this.write(chunk, encoding);
    }

    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }

    let err: Error | undefined;
    if (!state.errored && !state.ending) {
      state.ending = true;
      debug("** Writable.end calling finishMaybe", state);
      finishMaybe(this, state, true);
      state.ended = true;
    } else if (state.finished) {
      err = new ERR_STREAM_ALREADY_FINISHED("end");
    } else if (state.destroyed) {
      err = new ERR_STREAM_DESTROYED("end");
    }

    if (typeof cb === "function") {
      if (err || state.finished) {
        queueMicrotask(() => {
          (cb as (error?: Error | undefined) => void)(err);
        });
      } else {
        state[kOnFinished].push(cb);
      }
    }

    return this;
  }

  get destroyed() {
    if (
      this._readableState === undefined ||
      this._writableState === undefined
    ) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  }

  set destroyed(value: boolean) {
    if (this._readableState && this._writableState) {
      this._readableState.destroyed = value;
      this._writableState.destroyed = value;
    }
  }

  get writable() {
    const w = this._writableState;
    return !!w && w.writable !== false && !w.destroyed && !w.errored &&
      !w.ending && !w.ended;
  }

  set writable(val) {
    if (this._writableState) {
      this._writableState.writable = !!val;
    }
  }

  get writableFinished() {
    return this._writableState ? this._writableState.finished : false;
  }

  get writableObjectMode() {
    return this._writableState ? this._writableState.objectMode : false;
  }

  get writableBuffer() {
    return this._writableState && this._writableState.getBuffer();
  }

  get writableEnded() {
    return this._writableState ? this._writableState.ending : false;
  }

  get writableHighWaterMark() {
    return this._writableState && this._writableState.highWaterMark;
  }

  get writableCorked() {
    return this._writableState ? this._writableState.corked : 0;
  }

  get writableLength() {
    return this._writableState && this._writableState.length;
  }
}

export default Duplex;
