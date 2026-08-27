"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, WineglassIcon } from "@/components/icons";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

export default function WineProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [wine, setWine] = useState<StoredWine | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void params.then(({ id }) => WineService.get(Number(id))).then(setWine).catch((cause) => setError(cause instanceof Error ? cause.message : "The wine could not be loaded.")); }, [params]);
  return <main className="app-shell relative min-h-screen overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
    <div aria-hidden="true" className="ambient ambient-top" /><div aria-hidden="true" className="ambient ambient-bottom" />
    <section className="page-enter relative z-10 mx-auto w-full max-w-2xl">
      <Link className="back-link" href="/cellar"><ChevronLeftIcon className="size-5" /> My Cellar</Link>
      {error ? <p className="error-message mt-8" role="alert">{error}</p> : !wine ? <p className="cellar-status" role="status">Opening wine…</p> : <Profile wine={wine} />}
    </section>
  </main>;
}

function Profile({ wine }: { wine: StoredWine }) {
  const { profile } = wine;
  return <article className="wine-profile">
    <header className="profile-hero"><div className="app-icon app-icon-small"><WineglassIcon className="size-6" /></div><p>{wine.producer || "Unknown producer"}</p><h1>{wine.wineName || "Unnamed wine"}</h1><span>{[wine.vintage, wine.appellation, wine.region, wine.country].filter(Boolean).join(" · ") || "Origin unknown"}</span>{wine.grapeVarieties.length > 0 && <div className="profile-tags">{wine.grapeVarieties.map((grape) => <span key={grape}>{grape}</span>)}</div>}</header>
    <ProfileSection title="Wine"><Details values={[
      ["Producer", wine.producer], ["Wine", wine.wineName], ["Vintage", wine.vintage],
      ["Country", wine.country], ["Region", wine.region], ["Appellation", wine.appellation],
      ["Grape varieties", wine.grapeVarieties.join(", ") || null], ["Wine colour", wine.wineColor],
      ["Bottle size", wine.bottleSize], ["Alcohol", wine.alcoholPercentage === null ? null : `${wine.alcoholPercentage}%`],
      ["Bottles in cellar", String(wine.bottleCount)], ["Style", profile.style.wineStyle],
      ["Body", profile.style.body], ["Acidity", profile.style.acidity], ["Tannin", profile.style.tannin],
      ["Sweetness", profile.style.sweetness], ["Alcohol style", profile.style.alcohol],
    ]} /></ProfileSection>
    <ProfileSection title="Drinking"><Details values={[["Drink from", profile.drinking.drinkFrom], ["Drink until", profile.drinking.drinkUntil], ["Current maturity", profile.drinking.currentMaturity]]} /></ProfileSection>
    <ProfileSection title="Serving"><Details values={[["Temperature", profile.serving.temperature], ["Decant advice", profile.serving.decantAdvice]]} /></ProfileSection>
    <ProfileSection title="Food Pairing">{profile.foodPairings.length ? <div className="profile-tags">{profile.foodPairings.map((food) => <span key={food}>{food}</span>)}</div> : <Empty />}</ProfileSection>
    <ProfileSection title="About this Wine">{profile.summary ? <p className="profile-summary">{profile.summary}</p> : <Empty />}</ProfileSection>
  </article>;
}
function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="profile-section"><h2>{title}</h2>{children}</section>; }
function Details({ values }: { values: Array<[string, string | null]> }) { const known = values.filter(([, value]) => value); return known.length ? <dl>{known.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <Empty />; }
function Empty() { return <p className="profile-empty">Not available yet</p>; }
