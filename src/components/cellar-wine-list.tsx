"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { StoredWine } from "@/domain/wine";
import { drinkingStageLabel, getDrinkingLifecycle } from "@/lib/drinking-lifecycle";

export function CellarWineList({ wines, returnTo }: { wines: StoredWine[]; returnTo?: string }) {
  const scrollKey = returnTo ? `vinocastello-selection-scroll:${returnTo}` : null;
  useEffect(() => {
    if (!scrollKey) return;
    const saved = Number(sessionStorage.getItem(scrollKey));
    if (Number.isFinite(saved) && saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "instant" }));
  }, [scrollKey]);
  return <div className="wine-list">{wines.map((wine) => { const lifecycle = getDrinkingLifecycle(wine); return <article className="wine-card" key={wine.id} data-wine-id={wine.id}>
    <Link className="wine-card-main" href={`/cellar/${wine.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} onClick={() => { if (scrollKey) sessionStorage.setItem(scrollKey, String(window.scrollY)); }} aria-label={`Open ${wine.wineName || "wine"} profile`}>
      <div><p>{wine.producer || "Unknown producer"}</p><h2>{wine.wineName || "Unnamed wine"}</h2><span>{[wine.vintage, wine.region, wine.country, lifecycle && drinkingStageLabel(lifecycle.stage)].filter(Boolean).join(" · ") || "Origin unknown"}</span></div>
      <strong className="bottle-badge">{wine.bottleCount} {wine.bottleCount === 1 ? "bottle" : "bottles"}</strong>
    </Link>
  </article>; })}</div>;
}
