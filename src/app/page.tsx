"use client";

import { useEffect, useMemo, useState } from "react";
import { CameraIcon, SparklesIcon, WineglassIcon } from "@/components/icons";
import { GlassCard, HeroBackground, PrimaryActionCard, SectionTitle } from "@/components/premium-ui";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

const actions = [
  { title: "Scan a Wine", description: "Identify and add bottles.", icon: CameraIcon, href: "/scan" },
  { title: "My Cellar", description: "Browse your collection.", icon: WineglassIcon, href: "/cellar" },
  { title: "What Should I Drink?", description: "Receive personalised recommendations.", icon: SparklesIcon, href: "/recommendation" },
  { title: "Your Sommelier", description: "Ask anything about wine.", icon: SparklesIcon, href: "/sommelier" },
] as const;

export default function Home() {
  const [wines, setWines] = useState<StoredWine[]>([]);
  useEffect(() => { void WineService.list().then(setWines).catch(() => setWines([])); }, []);
  const summary = useMemo(() => ({
    bottles: wines.reduce((total, wine) => total + wine.bottleCount, 0),
    colours: distribution(wines, (wine) => wine.wineColor),
    regions: distribution(wines, (wine) => wine.region),
  }), [wines]);

  return <main className="app-shell home-shell premium-page">
    <HeroBackground atmosphere="home" />
    <section className="home-content page-enter">
      <header className="home-hero"><div className="brand-seal"><WineglassIcon className="size-7" /></div><p>Private wine collection</p><h1>VINOCASTELLO</h1><div>Your wine.<br />Your collection.<br />Your trusted sommelier.</div></header>
      <nav className="home-actions" aria-label="Primary actions">{actions.map((action) => <PrimaryActionCard key={action.href} {...action} />)}</nav>
      <GlassCard className="cellar-summary">
        <SectionTitle eyebrow="At a glance">Cellar Summary</SectionTitle>
        <div className="summary-grid"><div className="bottle-total"><strong>{summary.bottles}</strong><span>Bottles protected</span></div><SummaryList title="Colours" values={summary.colours} /><SummaryList title="Regions" values={summary.regions} /></div>
      </GlassCard>
    </section>
  </main>;
}

function distribution(wines: StoredWine[], select: (wine: StoredWine) => string | null) {
  const counts = new Map<string, number>();
  wines.forEach((wine) => { const value = select(wine)?.trim(); if (value) counts.set(value, (counts.get(value) ?? 0) + wine.bottleCount); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function SummaryList({ title, values }: { title: string; values: [string, number][] }) {
  return <div className="summary-list"><h3>{title}</h3>{values.length ? <ul>{values.map(([label, count]) => <li key={label}><span>{label}</span><strong>{count}</strong></li>)}</ul> : <p>Awaiting your first bottle</p>}</div>;
}
