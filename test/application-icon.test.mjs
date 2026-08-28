import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const officialIconUrl = "/images/icon-hero.webp";

test("application metadata and manifest use the canonical VinoCastello icon", async () => {
  const [layout, manifest] = await Promise.all([
    readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/manifest.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /applicationName: "VinoCastello"/);
  assert.match(layout, /title: "VinoCastello"/);
  assert.ok(layout.includes(officialIconUrl));
  assert.ok(manifest.includes(officialIconUrl));
  assert.doesNotMatch(`${layout}\n${manifest}`, /favicon\.ico|apple-touch-icon|icon-(?:192|512)\.png/);
});

test("the canonical icon points to the existing artwork", async () => {
  const icon = await stat(new URL("../public/images/icon-hero.webp", import.meta.url));

  assert.ok(icon.isFile());
  assert.ok(icon.size > 0);
});
