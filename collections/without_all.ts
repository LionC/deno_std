// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Returns an array excluding all given values.
 *
 * Example:
 *
 * ```ts
 * import { withoutAll } from "./without_all.ts";
 * import { assertEquals } from "../testing/asserts.ts";
 *
 * const withoutList = withoutAll([2, 1, 2, 3], [1, 2]);
 *
 * assertEquals(withoutList, [3]);
 * ```
 */
export function withoutAll<T>(array: readonly T[], values: readonly T[]): T[] {
  const toExclude = new Set(values);
  return array.filter((it) => !toExclude.has(it));
}
