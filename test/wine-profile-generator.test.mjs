import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { generateWineProfile, hasWineProfile } from "../src/server/ai/wine-profile-generator.ts";

test("recognizes whether a stored profile has already been enriched", () => {
  const profile = emptyWineProfile();
  assert.equal(hasWineProfile(profile), false);
  profile.serving.temperature = "16–18°C";
  assert.equal(hasWineProfile(profile), true);
});

test("generates a structured profile for the exact supplied wine", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const profile = emptyWineProfile();
  profile.summary = "A structured summary.";
  globalThis.fetch = async (_url, init) => {
    const request = JSON.parse(init.body);
    assert.match(request.input[0].content[0].text, /Example Estate/);
    return Response.json({ output_text: JSON.stringify(profile) });
  };
  const wine = { producer: "Example Estate", wineName: "Reserve", vintage: "2020", country: "France", region: null, appellation: null, grapeVarieties: [], wineColor: "Red", bottleSize: "750 ml", alcoholPercentage: 13, confidence: 90, profile: emptyWineProfile() };
  assert.deepEqual(await generateWineProfile(wine, "test-key"), profile);
});
