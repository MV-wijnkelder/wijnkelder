import assert from "node:assert/strict";
import test from "node:test";
import { fitImageWithinMaxWidth } from "../src/lib/image-compression.ts";

test("landscape images are limited to 1600px while preserving aspect ratio", () => {
  assert.deepEqual(fitImageWithinMaxWidth(4032, 3024), { width: 1600, height: 1200 });
});

test("portrait images keep their width when it is already below the limit", () => {
  assert.deepEqual(fitImageWithinMaxWidth(3024, 4032), { width: 1600, height: 2133 });
  assert.deepEqual(fitImageWithinMaxWidth(1200, 1600), { width: 1200, height: 1600 });
});
