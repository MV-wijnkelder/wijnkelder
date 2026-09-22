import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { getDrinkingLifecycle } from "../src/lib/drinking-lifecycle.ts";
import { getReadinessPosition, getOutlookKey } from "../src/lib/cellar-insights.ts";

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

test("past Drink By overrides stale maturity and can never recommend Hold", () => {
  const stale = wine("Contradictory legacy wine", "2020", { drinkFrom: "2022", drinkBy: "2025", currentMaturity: "approaching peak" });
  const lifecycle = getDrinkingLifecycle(stale, 2026);
  assert.equal(lifecycle.stage, "pastPeak");
  assert.equal(lifecycle.recommendation, "Prioritise");
  assert.notEqual(lifecycle.stage, "nearPeak");
  assert.equal(getReadinessPosition(stale, 2026), lifecycle.readinessPosition);
  assert.equal(getOutlookKey(stale, 2026), lifecycle.outlook);
});

test("young, peak, and late lifecycle recommendations derive from the same dates", () => {
  const developing = wine("Developing", "2022", { drinkFrom: "2025", peakFrom: "2030", peakUntil: "2035", drinkBy: "2040" });
  const peak = wine("Peak", "2018", { drinkFrom: "2022", peakFrom: "2025", peakUntil: "2028", drinkBy: "2032" });
  const late = wine("Late", "2016", { drinkFrom: "2020", peakFrom: "2022", peakUntil: "2024", drinkBy: "2027" });
  assert.deepEqual([getDrinkingLifecycle(developing, 2026).stage, getDrinkingLifecycle(developing, 2026).recommendation], ["ready", "Hold"]);
  assert.deepEqual([getDrinkingLifecycle(peak, 2026).stage, getDrinkingLifecycle(peak, 2026).recommendation], ["peak", "Drink Now"]);
  assert.deepEqual([getDrinkingLifecycle(late, 2026).stage, getDrinkingLifecycle(late, 2026).recommendation], ["nearPeak", "Drink Now"]);
});

test("legacy Drink Until maps only to Drink By and receives inferred peak dates", () => {
  const legacy = wine("Legacy", "2020", { drinkFrom: "2022", drinkUntil: "2030" });
  const lifecycle = getDrinkingLifecycle(legacy, 2026);
  assert.equal(lifecycle.drinkBy, 2030);
  assert.ok(lifecycle.peakFrom > lifecycle.drinkFrom);
  assert.ok(lifecycle.peakUntil <= lifecycle.drinkBy);
});
