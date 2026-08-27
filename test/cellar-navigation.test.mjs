import assert from "node:assert/strict";
import test from "node:test";
import { emptyCellarNavigationState, parseCellarNavigationState } from "../src/lib/cellar-navigation.ts";

test("cellar navigation state retains search, scroll, and selected wine", () => {
  assert.deepEqual(parseCellarNavigationState(JSON.stringify({ search: "rioja", scrollY: 4280, wineId: 75 })), { search: "rioja", scrollY: 4280, wineId: 75 });
});

test("invalid cellar navigation state safely resets", () => {
  assert.deepEqual(parseCellarNavigationState("not-json"), emptyCellarNavigationState);
  assert.deepEqual(parseCellarNavigationState(JSON.stringify({ search: 7, scrollY: -1, wineId: 0 })), emptyCellarNavigationState);
});
