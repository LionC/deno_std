// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

// deno-lint-ignore-file no-explicit-any

import { notImplemented } from "./_utils.ts";

export class Script {
  constructor(code: string, _options = {}) {
    code = `${code}`;
  }

  runInThisContext(_options: any) {
    notImplemented();
  }

  runInContext(_contextifiedObject: any, _options: any) {
    notImplemented();
  }

  runInNewContext(_contextObject: any, _options: any) {
    notImplemented();
  }

  createCachedData() {
    notImplemented();
  }
}

export function createContext(_contextObject: any, _options: any) {
  notImplemented();
}

export function createScript(code: string, options: any) {
  return new Script(code, options);
}

export function runInContext(
  _code: string,
  _contextifiedObject: any,
  _options: any,
) {
  notImplemented();
}

export function runInNewContext(
  _code: string,
  _contextObject: any,
  _options: any,
) {
  notImplemented();
}

export function runInThisContext(
  _code: string,
  _options: any,
) {
  notImplemented();
}

export function isContext(_maybeContext: any) {
  notImplemented();
}

export function compileFunction(_code: string, _params: any, _options: any) {
  notImplemented();
}

export function measureMemory(_options: any) {
  notImplemented();
}

export default {
  Script,
  createContext,
  createScript,
  runInContext,
  runInNewContext,
  runInThisContext,
  isContext,
  compileFunction,
  measureMemory,
};
