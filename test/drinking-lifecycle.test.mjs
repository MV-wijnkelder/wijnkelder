import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { getDrinkingLifecycle } from "../src/lib/drinking-lifecycle.ts";

function wine(name, vintage, drinking, ageingPotential = null) {
  const profile = emptyWineProfile();
  profile.drinking = { ...profile.drinking, ...drinking };
  profile.sommelier.ageingPotential = ageingPotential;
  return { wineName: name, producer: "Known estate", vintage, profile, bottleCount: 1 };
}

test("age-worthy wines retain distinct earliest drinking and best periods", () => {
  const examples = [
    wine("Barolo", "2020", { drinkFrom: "2026", peakFrom: "2030", peakUntil: "2038", drinkUntil: "2042" }, "Long-lived and still developing"),
    wine("Brunello di Montalcino", "2019", { drinkFrom: "2025", peakFrom: "2029", peakUntil: "2036", drinkUntil: "2040" }),
    wine("Siepi", "2021", { drinkFrom: "2026", peakFrom: "2031", peakUntil: "2038", drinkUntil: "2041" }),
    wine("German Riesling Auslese", "2020", { drinkFrom: "2024", peakFrom: "2030", peakUntil: "2040", drinkUntil: "2045" }),
  ];
  assert.deepEqual(examples.map((item) => getDrinkingLifecycle(item, 2026).stage), ["ready", "ready", "ready", "ready"]);
  assert.ok(examples.every((item) => getDrinkingLifecycle(item, 2026).materialAgeingUpside));
  assert.equal(getDrinkingLifecycle(examples[0], 2026).outlook, "threeToFiveYears");
});

test("mature and genuinely old wines map to peak and deterioration without forced distribution", () => {
  const bordeaux = wine("Classed Growth Bordeaux", "2005", { drinkFrom: "2015", peakFrom: "2022", peakUntil: "2030", drinkUntil: "2035" });
  const oldEveryday = wine("Everyday red", "2008", { drinkFrom: "2010", peakFrom: "2011", peakUntil: "2013", drinkUntil: "2015" });
  const youngEveryday = wine("Fresh young red", "2025", { drinkFrom: "2026", peakFrom: "2028", peakUntil: "2028", drinkUntil: "2029" });
  assert.equal(getDrinkingLifecycle(bordeaux, 2026).readinessPosition, 8);
  assert.equal(getDrinkingLifecycle(oldEveryday, 2026).readinessPosition, 1);
  assert.equal(getDrinkingLifecycle(youngEveryday, 2026).outlook, "nextTwoYears");
});
