import Link from "next/link";
import type { StoredWine } from "@/domain/wine";

export function CellarWineList({ wines, returnTo }: { wines: StoredWine[]; returnTo?: string }) {
  return <div className="wine-list">{wines.map((wine) => <article className="wine-card" key={wine.id} data-wine-id={wine.id}>
    <Link className="wine-card-main" href={`/cellar/${wine.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} aria-label={`Open ${wine.wineName || "wine"} profile`}>
      <div><p>{wine.producer || "Unknown producer"}</p><h2>{wine.wineName || "Unnamed wine"}</h2><span>{[wine.vintage, wine.region, wine.country].filter(Boolean).join(" · ") || "Origin unknown"}</span></div>
      <strong className="bottle-badge">{wine.bottleCount} {wine.bottleCount === 1 ? "bottle" : "bottles"}</strong>
    </Link>
  </article>)}</div>;
}
