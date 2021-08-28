// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Returns all elements in the given collection, sorted stably by their result using the given selector. The selector function is called only once for each element.
 *
 * Example:
 *
 * ```ts
 * import { sortBy } from "./sort_by.ts"
 * import { assertEquals } from "../testing/asserts.ts";
 *
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const sortedByAge = sortBy(people, it => it.age)
 *
 * assertEquals(sortedByAge, [
 *     { name: 'John', age: 23 },
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 * ])
 * ```
 */
export function sortBy<T>(
  array: readonly T[],
  selector:
    | ((el: T) => number)
    | ((el: T) => string)
    | ((el: T) => bigint)
    | ((el: T) => Date),
): T[] {
  const len = array.length;
  const indexes = new Array<number>(len);
  const selectors = new Array<ReturnType<typeof selector> | null>(len);

  for (let i = 0; i < len; i++) {
    indexes[i] = i;
    const s = selector(array[i]);
    selectors[i] = Number.isNaN(s) ? null : s;
  }

  indexes.sort((ai, bi) => {
    const a = selectors[ai];
    const b = selectors[bi];
    if (a === null) return 1;
    if (b === null) return -1;
    return a > b ? 1 : a < b ? -1 : 0;
  });

  for (let i = 0; i < len; i++) {
    (indexes as unknown as T[])[i] = array[indexes[i]];
  }

  return indexes as unknown as T[];
}
