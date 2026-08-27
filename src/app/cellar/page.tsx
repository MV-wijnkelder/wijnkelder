"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, PlusIcon, TrashIcon, WineglassIcon } from "@/components/icons";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

export default function CellarPage() {
  const [wines, setWines] = useState<StoredWine[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StoredWine | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StoredWine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0);

  const load = useCallback(async (query = "") => {
    const sequence = ++loadSequence.current;
    setIsLoading(true); setError(null);
    try { const loaded = await WineService.list(query); if (sequence === loadSequence.current) setWines(loaded); }
    catch (loadError) { setError(message(loadError)); }
    finally { if (sequence === loadSequence.current) setIsLoading(false); }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(search), 250); return () => clearTimeout(timer); }, [load, search]);

  async function changeCount(wine: StoredWine, change: number) {
    try {
      const updated = await WineService.changeBottleCount(wine.id, change);
      setWines((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (changeError) { setError(message(changeError)); }
  }

  async function remove(wine: StoredWine) {
    setPendingDelete(null);
    loadSequence.current += 1;
    setWines((current) => current.filter((item) => item.id !== wine.id));
    setIsLoading(false);
    try { await WineService.delete(wine.id); }
    catch (deleteError) { setError(message(deleteError)); void load(search); }
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
      <Link className="back-link" href="/"><ChevronLeftIcon className="size-5" /> Home</Link>
      <div className="cellar-heading"><div className="app-icon app-icon-small"><WineglassIcon className="size-6" /></div><div><p className="result-eyebrow">Your collection</p><h1>My Cellar</h1></div></div>
      <label className="cellar-search"><span className="sr-only">Search your cellar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, producer, region…" type="search" /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      {isLoading ? <p className="cellar-status" role="status">Loading wines…</p> : wines.length === 0 ? <div className="cellar-empty"><WineglassIcon className="size-8" /><strong>{search ? "No wines found" : "Your cellar is empty"}</strong><p>{search ? "Try a different search term." : "Scan a label to add your first wine."}</p>{!search && <Link className="action action-primary" href="/scan"><PlusIcon className="size-5" /> Scan wine</Link>}</div> : <div className="wine-list">{wines.map((wine) => <article className="wine-card" key={wine.id}>
        <Link className="wine-card-main" href={`/cellar/${wine.id}`} aria-label={`Open ${wine.wineName || "wine"} profile`}><div><p>{wine.producer || "Unknown producer"}</p><h2>{wine.wineName || "Unnamed wine"}</h2><span>{[wine.vintage, wine.region, wine.country].filter(Boolean).join(" · ") || "Origin unknown"}</span></div><strong className="bottle-badge">{wine.bottleCount} {wine.bottleCount === 1 ? "bottle" : "bottles"}</strong></Link>
        <div className="wine-card-actions"><div className="count-actions"><button type="button" onClick={() => void changeCount(wine, -1)} disabled={wine.bottleCount === 0} aria-label="One fewer bottle">−</button><span>{wine.bottleCount}</span><button type="button" onClick={() => void changeCount(wine, 1)} aria-label="One more bottle">+</button></div><button type="button" onClick={() => setEditing(wine)}>Edit</button><button className="delete-button" type="button" onClick={() => setPendingDelete(wine)} aria-label="Delete wine"><TrashIcon className="size-4" /></button></div>
      </article>)}</div>}
    </section>
    {editing && <div className="dialog-backdrop" role="presentation"><form className="edit-dialog" onSubmit={(event) => void saveEdit(event)}><h2>Edit wine</h2><EditField label="Producer" value={editing.producer} onChange={(producer) => setEditing({ ...editing, producer })} /><EditField label="Wine name" value={editing.wineName} onChange={(wineName) => setEditing({ ...editing, wineName })} /><EditField label="Vintage" value={editing.vintage} onChange={(vintage) => setEditing({ ...editing, vintage })} /><EditField label="Country" value={editing.country} onChange={(country) => setEditing({ ...editing, country })} /><EditField label="Region" value={editing.region} onChange={(region) => setEditing({ ...editing, region })} /><EditField label="Appellation" value={editing.appellation} onChange={(appellation) => setEditing({ ...editing, appellation })} /><EditField label="Grape varieties" value={editing.grapeVarieties.join(", ")} onChange={(value) => setEditing({ ...editing, grapeVarieties: value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [] })} /><EditField label="Wine color" value={editing.wineColor} onChange={(wineColor) => setEditing({ ...editing, wineColor })} /><EditField label="Bottle size" value={editing.bottleSize} onChange={(bottleSize) => setEditing({ ...editing, bottleSize })} /><label className="review-field"><span>Alcohol percentage</span><input type="number" min="0" max="100" step="0.1" value={editing.alcoholPercentage ?? ""} onChange={(event) => setEditing({ ...editing, alcoholPercentage: event.target.value ? Number(event.target.value) : null })} /></label><div className="edit-actions"><button className="action action-secondary" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="action action-primary" type="submit">Save</button></div></form></div>}
    {pendingDelete && <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-copy"><TrashIcon className="size-6" /><h2 id="delete-title">Delete this wine?</h2><p id="delete-copy">{pendingDelete.wineName || "This wine"} and its bottle count will be permanently removed from your cellar.</p><div className="edit-actions"><button className="action action-secondary" type="button" onClick={() => setPendingDelete(null)}>Cancel</button><button className="action action-danger" type="button" onClick={() => void remove(pendingDelete)}>Delete</button></div></div></div>}
  </main>;
}

function EditField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) { return <label className="review-field"><span>{label}</span><input value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} /></label>; }
function message(error: unknown) { return error instanceof Error ? error.message : "The operation failed."; }
