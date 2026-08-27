import assert from "node:assert/strict";
import test from "node:test";

import { stageForPhotoPicker } from "../src/lib/scan-navigation.ts";

test("front camera stages the back-label choice before opening iOS camera UI", () => {
  assert.equal(stageForPhotoPicker("front", "Camera"), "back-choice");
});

test("library and back-label pickers continue to show their photo steps", () => {
  assert.equal(stageForPhotoPicker("front", "Library"), "front");
  assert.equal(stageForPhotoPicker("back", "Camera"), "back");
  assert.equal(stageForPhotoPicker("back", "Library"), "back");
});
