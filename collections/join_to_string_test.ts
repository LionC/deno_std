// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "../testing/asserts.ts";
import { joinToString } from "./join_to_string.ts";

function joinToStringTest<T>(
  input: [
    Array<T>,
    (el: T) => string,
    string,
  ],
  expected: string,
  message?: string,
) {
  const actual = joinToString(...input);
  assertEquals(actual, expected, message);
}

Deno.test({
  name: "[collections/joinToString] no mutation",
  fn() {
    const array = [1, 2, 3, 4];
    joinToString(array, (it) => it.toString(), "");

    assertEquals(array, [1, 2, 3, 4]);
  },
});

Deno.test({
  name: "[collections/joinToString] empty input",
  fn() {
    joinToStringTest(
      [[], (_) => "", ""],
      "",
    );
  },
});

Deno.test({
  name: "[collections/joinToString] identity",
  fn() {
    joinToStringTest(
      [
        [ "A", "B", "C" ],
        (it) => it,
        "",
      ],
      "ABC",
    );
  },
});

Deno.test({
  name: "[collections/joinToString] mappers with separators",
  fn() {
    joinToStringTest(
      [
        [
            { name: "Neela" },
            { name: "Jonas" },
            { name: "Marija" },
        ],
        (it) => it.name,
        " and ",
      ],
      "Neela and Jonas and Marija",
    );
    joinToStringTest(
      [
        [ "Noam Chomsky", "Alan Turing", "Konrad Zuse" ],
        (it) => `Dr. ${it}`,
        " + ",
      ],
      "Dr. Noam Chomsky + Dr. Alan Turing + Dr. Konrad Zuse",
    );
  },
});
