"use client";

import { useEffect, useState } from "react";
import { WineProfile } from "@/components/wine-profile";
import { BackButton, HeroBackground, PremiumButton } from "@/components/premium-ui";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

export default function WineProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [wine, setWine] = useState<StoredWine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshingValue, setRefreshingValue] = useState(false);
  useEffect(() => { void params.then(({ id }) => WineService.get(Number(id))).then(setWine).catch((cause) => setError(cause instanceof Error ? cause.message : "The wine could not be loaded.")); }, [params]);
  return <main className="app-shell premium-page relative min-h-screen overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
    <HeroBackground atmosphere="cellar" />
    <section className="page-enter relative z-10 mx-auto w-full max-w-2xl">
      <BackButton href="/cellar">My Cellar</BackButton>
      {error ? <p className="error-message mt-8" role="alert">{error}</p> : !wine ? <p className="cellar-status" role="status">Opening wine…</p> : <>
        <WineProfile wine={wine} bottleCount={wine.bottleCount} />
        <div className="profile-refresh">
          <PremiumButton disabled={refreshingValue} onClick={async () => { setRefreshingValue(true); setRefreshMessage(null); try { setWine(await WineService.refreshMarketValue(wine.id)); setRefreshMessage("Estimated Market Value refreshed."); } catch (cause) { setRefreshMessage(cause instanceof Error ? cause.message : "The Estimated Market Value could not be refreshed. Please try again."); } finally { setRefreshingValue(false); } }}>{refreshingValue ? "Refreshing value…" : "Refresh Estimated Market Value"}</PremiumButton>
        </div>
        <div className="profile-refresh">
          <PremiumButton disabled={refreshing} onClick={async () => { setRefreshing(true); setRefreshMessage(null); try { setWine(await WineService.refreshProfile(wine.id)); setRefreshMessage("Wine profile refreshed."); } catch (cause) { setRefreshMessage(cause instanceof Error ? cause.message : "The wine profile could not be refreshed. Please try again."); } finally { setRefreshing(false); } }}>{refreshing ? "Refreshing profile…" : "Refresh Wine Profile"}</PremiumButton>
          {refreshMessage && <p role="status">{refreshMessage}</p>}
        </div>
      </>}
    </section>
  </main>;
}
