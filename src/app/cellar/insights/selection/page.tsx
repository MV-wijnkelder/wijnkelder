"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CellarWineList } from "@/components/cellar-wine-list";
import { WineglassIcon } from "@/components/icons";
import { BackButton, HeroBackground, PremiumHeader } from "@/components/premium-ui";
import { filterCellar, filterTitle, type CellarFilter } from "@/lib/cellar-filter";
import type { OutlookKey } from "@/lib/cellar-insights";
import type { StoredWine } from "@/domain/wine";
import { WineService } from "@/services/wine-service";

export default function InsightSelectionPage() {
  return <Suspense fallback={<p className="cellar-status">Loading selection…</p>}><InsightSelection /></Suspense>;
}

function InsightSelection() {
  const params = useSearchParams();
  const filter = useMemo(() => ({ kind: params.get("kind") ?? "colour", value: params.get("value") ?? "" }) as CellarFilter, [params]);
  const [wines, setWines] = useState<StoredWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void WineService.list().then(setWines).catch(() => setError("This selection could not be loaded.")).finally(() => setLoading(false)); }, []);
  const selected = useMemo(() => filterCellar(wines, filter), [wines, filter]);
  const title = filter.kind === "outlook" ? outlookTitle(filter.value as OutlookKey) : filter.kind === "readiness" ? readinessTitle(Number(filter.value)) : filterTitle(filter);
  const returnTo = `/cellar/insights/selection?kind=${filter.kind}&value=${encodeURIComponent(filter.value)}`;
  return <main className="app-shell premium-page relative min-h-screen overflow-x-clip px-5 py-6 sm:px-6 sm:py-10"><HeroBackground atmosphere="cellar" /><section className="page-enter relative z-10 mx-auto w-full max-w-3xl">
    <BackButton href="/cellar/insights">Cellar Insights</BackButton><PremiumHeader icon={WineglassIcon} eyebrow="Cellar Insights" title={title} subtitle={filter.kind === "colour" && wines.length ? `${Math.round(selected.reduce((n, w) => n + w.bottleCount, 0) / wines.reduce((n, w) => n + w.bottleCount, 0) * 100)}% of collection` : "Wines in this selection."} />
    {error ? <p className="error-message" role="alert">{error}</p> : loading ? <p className="cellar-status">Loading wines…</p> : selected.length ? <CellarWineList wines={selected} returnTo={returnTo} /> : <div className="cellar-empty"><WineglassIcon /><strong>No wines found in this selection.</strong></div>}
  </section></main>;
}
function outlookTitle(key: OutlookKey) { return ({ pastPeak: "Past Peak", drinkNow: "Drink Now", nextTwoYears: "Next 1–2 Years", threeToFiveYears: "3–5 Years", longTerm: "5+ Years" })[key]; }
function readinessTitle(position: number) { return ["", "Well Beyond Peak", "Beyond Peak", "Past Peak", "Young", "Ready", "Excellent", "Near Peak", "At Peak"][position] ?? "Drink Readiness"; }
