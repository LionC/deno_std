// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/**
 * Joins all elements in the given array into on string, using the given
 * selector to convert each element to a string.
 *
 * Example:
 *
 * ```ts
 * import { joinToString } from "./join_to_string.ts"
 * import { assertEquals } from "../testing/asserts.ts"
 *
 * const people = [
 *     { name: 'Anna', age: 34 },
 *     { name: 'Kim', age: 42 },
 *     { name: 'John', age: 23 },
 * ]
 * const names = sumOf(people, i => i.age)
 *
 * assertEquals(totalAge, 99)
 * ```
 */
export function joinToString<T>(
  array: readonly T[],
  selector: (el: T) => string,
  delimiter: string,
): string {
  let ret = "";
//   let tail = false;
// 
//   for (const i of array) {
//     ret += selector(i);
//   }
// 
  return ret;
}
