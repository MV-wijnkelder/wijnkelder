"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, PlusIcon, TrashIcon, WineglassIcon } from "@/components/icons";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

export default function CellarPage() {
  const [wines, setWines] = useState<StoredWine[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StoredWine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query = "") => {
    setIsLoading(true); setError(null);
    try { setWines(await WineService.list(query)); }
    catch (loadError) { setError(message(loadError)); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(search), 250); return () => clearTimeout(timer); }, [load, search]);

  async function changeCount(wine: StoredWine, change: number) {
    try {
      const updated = await WineService.changeBottleCount(wine.id, change);
      setWines((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (changeError) { setError(message(changeError)); }
  }

  async function remove(wine: StoredWine) {
    if (!window.confirm(`Verwijder ${wine.wineName ?? "deze wijn"} uit je kelder?`)) return;
    try { await WineService.delete(wine.id); setWines((current) => current.filter((item) => item.id !== wine.id)); }
    catch (deleteError) { setError(message(deleteError)); }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    try {
      const updated = await WineService.update(editing);
      setWines((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (editError) { setError(message(editError)); }
  }

  return <main className="app-shell relative min-h-screen overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
    <div aria-hidden="true" className="ambient ambient-top" /><div aria-hidden="true" className="ambient ambient-bottom" />
    <section className="page-enter relative z-10 mx-auto w-full max-w-3xl">
      <Link className="back-link" href="/"><ChevronLeftIcon className="size-5" /> Terug</Link>
      <div className="cellar-heading"><div className="app-icon app-icon-small"><WineglassIcon className="size-6" /></div><div><p className="result-eyebrow">Jouw collectie</p><h1>Mijn kelder</h1></div></div>
      <label className="cellar-search"><span className="sr-only">Zoek in je wijnkelder</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek op naam, producent, regio…" type="search" /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      {isLoading ? <p className="cellar-status" role="status">Wijnen laden…</p> : wines.length === 0 ? <div className="cellar-empty"><WineglassIcon className="size-8" /><strong>{search ? "Geen wijnen gevonden" : "Je wijnkelder is nog leeg"}</strong><p>{search ? "Probeer een andere zoekterm." : "Scan een etiket om je eerste wijn toe te voegen."}</p>{!search && <Link className="action action-primary" href="/scan"><PlusIcon className="size-5" /> Scan etiket</Link>}</div> : <div className="wine-list">{wines.map((wine) => <article className="wine-card" key={wine.id}>
        <div className="wine-card-main"><div><p>{wine.producer || "Onbekende producent"}</p><h2>{wine.wineName || "Naamloze wijn"}</h2><span>{[wine.vintage, wine.region, wine.country].filter(Boolean).join(" · ") || "Geen herkomst bekend"}</span></div><strong className="bottle-badge">{wine.bottleCount} {wine.bottleCount === 1 ? "fles" : "flessen"}</strong></div>
        <div className="wine-card-actions"><div className="count-actions"><button type="button" onClick={() => void changeCount(wine, -1)} disabled={wine.bottleCount === 0} aria-label="Eén fles minder">−</button><span>{wine.bottleCount}</span><button type="button" onClick={() => void changeCount(wine, 1)} aria-label="Eén fles meer">+</button></div><button type="button" onClick={() => setEditing(wine)}>Bewerken</button><button className="delete-button" type="button" onClick={() => void remove(wine)} aria-label="Wijn verwijderen"><TrashIcon className="size-4" /></button></div>
      </article>)}</div>}
    </section>
    {editing && <div className="dialog-backdrop" role="presentation"><form className="edit-dialog" onSubmit={(event) => void saveEdit(event)}><h2>Wijn bewerken</h2><EditField label="Producent" value={editing.producer} onChange={(producer) => setEditing({ ...editing, producer })} /><EditField label="Wijnnaam" value={editing.wineName} onChange={(wineName) => setEditing({ ...editing, wineName })} /><EditField label="Jaargang" value={editing.vintage} onChange={(vintage) => setEditing({ ...editing, vintage })} /><EditField label="Land" value={editing.country} onChange={(country) => setEditing({ ...editing, country })} /><EditField label="Regio" value={editing.region} onChange={(region) => setEditing({ ...editing, region })} /><EditField label="Appellatie" value={editing.appellation} onChange={(appellation) => setEditing({ ...editing, appellation })} /><EditField label="Druivenrassen" value={editing.grapeVarieties.join(", ")} onChange={(value) => setEditing({ ...editing, grapeVarieties: value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [] })} /><EditField label="Wijnkleur" value={editing.wineColor} onChange={(wineColor) => setEditing({ ...editing, wineColor })} /><EditField label="Flesformaat" value={editing.bottleSize} onChange={(bottleSize) => setEditing({ ...editing, bottleSize })} /><label className="review-field"><span>Alcoholpercentage</span><input type="number" min="0" max="100" step="0.1" value={editing.alcoholPercentage ?? ""} onChange={(event) => setEditing({ ...editing, alcoholPercentage: event.target.value ? Number(event.target.value) : null })} /></label><div className="edit-actions"><button className="action action-secondary" type="button" onClick={() => setEditing(null)}>Annuleren</button><button className="action action-primary" type="submit">Opslaan</button></div></form></div>}
  </main>;
}

function EditField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) { return <label className="review-field"><span>{label}</span><input value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} /></label>; }
function message(error: unknown) { return error instanceof Error ? error.message : "De bewerking is mislukt."; }
