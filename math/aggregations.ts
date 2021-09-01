// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { sortBy } from "../collections/sort_by.ts"

export function sum(numbers: Iterable<number>): number | undefined
export function sum(numbers: Iterable<bigint>): bigint | undefined
export function sum(numbers: Iterable<number>): number | undefined {
    let ret: number | undefined = undefined

    for (const num of numbers) {
        ret = ret === undefined
            ? num
            : ret + num
    }

    return ret
}

/**
 * Returns the arithmetic mean of the numbers in the given collection
 *
 * Example:
 *
 * ```ts
 * import { assertEquals } from "../testing/asserts.ts"
 * import { mean } from "./mean.ts";
 *
 * const numbers = [ 4, 2, 9 ]
 * assertEquals(mean(numbers), 5)
 * ```
 */
export function mean(numbers: Iterable<number>): number | undefined {
export function mean(numbers: Iterable<bigint>): bigint | undefined {
export function mean(numbers: Iterable<number>): number | undefined {
  let total: number | undefined = undefined
  let count: number | undefined = undefined

  for (const num of numbers) {
      if (total === undefined || count === undefined) {
          total = num
          count = 1

          continue
      }

      total += num
      count += 1
  }

  if (total === undefined || count === undefined) {
      return undefined
  }

  return total / count
}

/**
 * Returns the arithmetic median of the numbers in the given collection
 *
 * Example:
 *
 * ```ts
 * import { assertEquals } from "../testing/asserts.ts"
 * import { median } from "./median.ts"
 *
 * const numbers = [ 4, 2, 7 ]
 * assertEquals(median(numbers), 4)
 * ```
 */
export function median(collection: Array<number>): number | undefined {
  if (collection.length === 0) {
    return undefined;
  }

  const middle = Math.floor(collection.length / 2);
  const values = Array.from(collection);
  values.sort((a, b) => a - b);

  if (values.length % 2 === 0) {
    return (values[middle] + values[middle - 1]) / 2;
  }

  return values[middle];
}

/**
 * Returns the arithmetic mode(s) of the numbers in the given collection
 *
 * Example:
 *
 * ```ts
 * import { assertEquals } from "../testing/asserts.ts"
 * import { mode } from "./mode.ts"
 *
 * const numbers = [ 4, 2, 7, 4 ]
 * assertEquals(mode(numbers), 4)
 * ```
 */
export function mode(collection: Array<number>): Set<number> | undefined {
  if (collection.length === 0) {
    return undefined;
  }

  const counter: Record<number, number> = {};
  counter[collection[0]] = 1;
  const maxes = new Set([collection[0]]);
  let maxCount = 1;

  for (let i = 1; i < collection.length; i++) {
    const number = collection[i];
    counter[number] = (counter[number] || 0) + 1;

    if (counter[number] === maxCount) {
      maxes.add(number);
    } else if (counter[number] > maxCount) {
      maxes.clear();
      maxes.add(number);
      maxCount = counter[number];
    }
  }

  return maxes;
}


/**
 * Returns the arithmetic mean of the numbers in the given collection
 *
 * Example:
 *
 * ```ts
 * import { assertEquals } from "../testing/asserts.ts"
 * import { mean } from "./mean.ts";
 *
 * const numbers = [ 4, 2, 9 ]
 * assertEquals(mean(numbers), 5)
 * ```
 */
export function percentile<T>(
    elements: Iterator<T>,
    percent: number,
    selector: Parameters<typeof sortBy>[1],
    options: { preSorted: boolean } = { preSorted: false },
): T | undefined {
  if (array.length === 0) {
    return undefined;
  }

  const sorted = options.preSorted
    ? array
    : sortBy(array, selector)

  if (percent === 0) {
      return sorted[0]
  }

  const index = Math.ceil(sorted.length * percent / 100) - 1

  return sorted[index]
}

