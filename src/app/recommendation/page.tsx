"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ChevronLeftIcon, SparklesIcon, WineglassIcon } from "@/components/icons";
import type { WineRecommendation } from "@/server/recommendations/recommendation-service";

const examples = ["Turkey", "Steak", "Sushi", "Cheese platter", "Pasta with mushrooms"];
type NoSuitableMatch = { message: string; idealStyles: string[] };

export default function RecommendationPage() {
  const [food, setFood] = useState("");
  const [precision, setPrecision] = useState("");
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [precisionOpen, setPrecisionOpen] = useState(false);
  const [selected, setSelected] = useState<WineRecommendation | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [noSuitableMatch, setNoSuitableMatch] = useState<NoSuitableMatch | null>(null);

  async function recommend(event: FormEvent) {
    event.preventDefault();
    if (!food.trim()) return;
    setLoading(true); setError(null); setOpened(null); setNoSuitableMatch(null);
    try {
      const response = await fetch("/api/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ food, occasion: precision }) });
      const data = await response.json() as { recommendations?: WineRecommendation[]; noSuitableMatch?: NoSuitableMatch | null; error?: string };
      if (!response.ok) throw new Error(data.error || "Recommendations are temporarily unavailable.");
      setRecommendations(data.recommendations ?? []);
      setNoSuitableMatch(data.noSuitableMatch ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Recommendations are temporarily unavailable."); }
    finally { setLoading(false); }
  }

  async function confirmOpened() {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/wines/${selected.wine.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ change: -1 }) });
      if (!response.ok) throw new Error("We could not update your cellar.");
      setRecommendations((current) => current.filter((item) => item.wine.id !== selected.wine.id || item.wine.bottleCount > 1).map((item) => item.wine.id === selected.wine.id ? { ...item, wine: { ...item.wine, bottleCount: item.wine.bottleCount - 1 } } : item));
      setOpened(selected.wine.id); setSelected(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not update your cellar."); }
    finally { setLoading(false); }
  }

  return <main className="app-shell relative min-h-screen overflow-x-clip px-5 py-6 sm:px-6 sm:py-10">
    <div aria-hidden="true" className="ambient ambient-top" /><div aria-hidden="true" className="ambient ambient-bottom" />
    <section className="page-enter relative z-10 mx-auto w-full max-w-2xl">
      <Link className="back-link" href="/"><ChevronLeftIcon className="size-5" /> Home</Link>
      <header className="recommendation-heading"><div className="app-icon app-icon-small"><SparklesIcon className="size-6" /></div><p className="result-eyebrow">From your cellar</p><h1>What should I drink?</h1><p>A thoughtful bottle for tonight, chosen only from wines you own.</p></header>

      <form className="recommendation-form" onSubmit={recommend}>
        <label htmlFor="food">What are you eating tonight?</label>
        <input id="food" value={food} onChange={(event) => setFood(event.target.value)} placeholder="What are you eating tonight?" autoComplete="off" />
        <div className="recommendation-examples" aria-label="Examples">{examples.map((example) => <button key={example} type="button" onClick={() => setFood(example)}>• {example}</button>)}</div>
        <button className="action action-primary" disabled={loading || !food.trim()} type="submit">{loading ? "Choosing wines…" : "Recommend wines"}</button>
      </form>

      {error && <p className="error-message" role="alert">{error}</p>}
      {!loading && noSuitableMatch && !error && <section className="no-match" aria-live="polite"><p className="match-status match-status-none">⚪ No Suitable Match</p><h2>{noSuitableMatch.message}</h2><p>Ideal wine styles</p><ul>{noSuitableMatch.idealStyles.map((style) => <li key={style}>{style}</li>)}</ul></section>}
      {recommendations.length > 0 && <div className="recommendation-results" aria-live="polite">
        {recommendations.map((item) => <article className="recommendation-card" key={item.wine.id}>
          <div className="recommendation-card-title"><div><p>{item.wine.producer || "Your cellar"}</p><h2>{item.wine.wineName || "Unnamed wine"}</h2><span>{item.wine.vintage || "Vintage not stated"}</span></div><WineglassIcon className="size-6" /></div>
          <p className={`match-status ${item.status === "Excellent Match" ? "match-status-excellent" : "match-status-good"}`}>{item.status === "Excellent Match" ? "🟢" : "🟡"} {item.status}</p>
          <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          <details><summary>Why?</summary><p>{item.why}</p></details>
          {opened === item.wine.id ? <p className="opened-confirmation">Enjoy your bottle. Your cellar is up to date.</p> : <button className="action action-primary" type="button" onClick={() => setSelected(item)}>I&apos;ll drink this</button>}
        </article>)}

        <section className="precision-panel"><h2>Need more precision?</h2>{precisionOpen ? <form onSubmit={recommend}><label htmlFor="precision">Tell us one more thing about the meal.</label><input id="precision" placeholder={precisionQuestion(food)} value={precision} onChange={(event) => setPrecision(event.target.value)} /><button className="action action-secondary" disabled={!precision.trim() || loading}>Refine recommendations</button></form> : <button className="continue-link" type="button" onClick={() => setPrecisionOpen(true)}>Add one detail</button>}</section>
      </div>}
    </section>

    {selected && <div className="dialog-backdrop" role="presentation"><section className="selection-dialog" role="dialog" aria-modal="true" aria-labelledby="open-title"><WineglassIcon className="size-7" /><h2 id="open-title">Did you actually open this bottle?</h2><p>{selected.wine.wineName || "This wine"} · {selected.wine.vintage || "No vintage"}</p><div><button className="action action-secondary" type="button" onClick={() => setSelected(null)}>No</button><button className="action action-primary" type="button" disabled={loading} onClick={() => void confirmOpened()}>Yes</button></div></section></div>}
  </main>;
}

function precisionQuestion(food: string): string {
  if (/turkey/i.test(food)) return "How is the turkey prepared?";
  if (/steak/i.test(food)) return "How is the steak cooked?";
  if (/sushi/i.test(food)) return "Mostly fish or vegetable sushi?";
  return "Formal dinner or casual?";
}
