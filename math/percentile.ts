// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { sortBy } from "../collections/sort_by.ts"

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
    array: readonly T[],
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

