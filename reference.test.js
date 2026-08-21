import assert from "node:assert/strict";
import test from "node:test";

import {
  normaliseCountryHint,
  partitionCountrySuggestion,
} from "./reference.js";

const countries = Object.freeze([
  Object.freeze({ code: "AF", name: "Afghanistan" }),
  Object.freeze({ code: "GB", name: "United Kingdom" }),
  Object.freeze({ code: "US", name: "United States" }),
  Object.freeze({ code: "ZM", name: "Zambia" }),
  Object.freeze({ code: "ZW", name: "Zimbabwe" }),
]);

test("normalises a well-shaped country hint", () => {
  assert.equal(normaliseCountryHint(" gb "), "GB");
});

test("rejects absent, malformed, and non-ASCII hints", () => {
  for (const value of [undefined, null, "", "G", "GBR", "G1", "ß", 42]) {
    assert.equal(normaliseCountryHint(value), null);
  }
});

test("moves a matching late-alphabet country into the suggested group", () => {
  const result = partitionCountrySuggestion(countries, "ZW");

  assert.deepEqual(result.suggested, [{ code: "ZW", name: "Zimbabwe" }]);
  assert.deepEqual(
    result.remaining.map(({ code }) => code),
    ["AF", "GB", "US", "ZM"],
  );
});

test("preserves the relative order of every remaining country", () => {
  const result = partitionCountrySuggestion(countries, "gb");

  assert.deepEqual(
    result.remaining.map(({ code }) => code),
    ["AF", "US", "ZM", "ZW"],
  );
});

test("returns the ordinary list when there is no usable hint", () => {
  for (const hint of [undefined, "", "XX", "not-a-code"]) {
    const result = partitionCountrySuggestion(countries, hint);
    assert.deepEqual(result.suggested, []);
    assert.deepEqual(result.remaining, countries);
  }
});

test("does not mutate the input array or country objects", () => {
  const before = structuredClone(countries);
  const result = partitionCountrySuggestion(countries, "GB");

  assert.deepEqual(countries, before);
  assert.notStrictEqual(result.remaining, countries);
  assert.strictEqual(result.suggested[0], countries[1]);
});

test("removes duplicate instances of the suggested code from the remainder", () => {
  const withDuplicate = [
    ...countries,
    { code: "gb", name: "Duplicate United Kingdom" },
  ];
  const result = partitionCountrySuggestion(withDuplicate, "GB");

  assert.equal(result.suggested.length, 1);
  assert.equal(
    result.remaining.some(({ code }) => code.toUpperCase() === "GB"),
    false,
  );
});

test("rejects a non-array country collection", () => {
  assert.throws(
    () => partitionCountrySuggestion(null, "GB"),
    new TypeError("countries must be an array"),
  );
});
