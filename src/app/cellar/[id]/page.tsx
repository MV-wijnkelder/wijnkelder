"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  useEffect(() => { void params.then(({ id }) => WineService.get(Number(id))).then(setWine).catch((cause) => setError(cause instanceof Error ? cause.message : "The wine could not be loaded.")); }, [params]);
  return <main className="app-shell premium-page relative min-h-screen overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
    <HeroBackground atmosphere="cellar" />
    <section className="page-enter relative z-10 mx-auto w-full max-w-2xl">
      <BackButton href={returnTo?.startsWith("/cellar/insights/selection?") ? returnTo : "/cellar"}>{returnTo ? "Selection" : "My Cellar"}</BackButton>
      {error ? <p className="error-message mt-8" role="alert">{error}</p> : !wine ? <p className="cellar-status" role="status">Opening wine…</p> : <>
        <WineProfile wine={wine} bottleCount={wine.bottleCount} />
        <section className="profile-section personal-notes" aria-labelledby="personal-notes-heading">
          <h2 id="personal-notes-heading">Personal Notes</h2>
          {editingNote ? <form onSubmit={async (event) => {
            event.preventDefault(); setSavingNote(true); setError(null);
            try { setWine(await WineService.updatePersonalNotes(wine.id, noteDraft)); setEditingNote(false); }
            catch (cause) { setError(cause instanceof Error ? cause.message : "The Personal Note could not be saved."); }
            finally { setSavingNote(false); }
          }}>
            <label htmlFor="personal-note">Your observations</label>
            <textarea id="personal-note" rows={6} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} autoFocus />
            <div className="personal-note-actions">
              <button className="action action-secondary" type="button" disabled={savingNote} onClick={() => { setNoteDraft(wine.personalNotes ?? ""); setEditingNote(false); }}>Cancel</button>
              <button className="action action-primary" type="submit" disabled={savingNote}>{savingNote ? "Saving…" : "Save"}</button>
            </div>
          </form> : <>
            {wine.personalNotes ? <p className="personal-note-text">{wine.personalNotes}</p> : <p className="profile-empty">No personal notes yet.</p>}
            <PremiumButton onClick={() => { setNoteDraft(wine.personalNotes ?? ""); setEditingNote(true); }}>{wine.personalNotes ? "Edit Note" : "Add Note"}</PremiumButton>
          </>}
        </section>
        <div className="profile-refresh">
          <PremiumButton disabled={refreshingValue} onClick={async () => { setRefreshingValue(true); setRefreshMessage(null); try { setWine(await WineService.refreshMarketValue(wine.id)); setRefreshMessage("Estimated Market Value refreshed."); } catch (cause) { setRefreshMessage(cause instanceof Error ? cause.message : "The Estimated Market Value could not be refreshed. Please try again."); } finally { setRefreshingValue(false); } }}>{refreshingValue ? "Refreshing market price…" : "Refresh Market Price"}</PremiumButton>
        </div>
        <div className="profile-refresh">
          <PremiumButton disabled={refreshing} onClick={async () => { setRefreshing(true); setRefreshMessage(null); try { setWine(await WineService.refreshProfile(wine.id)); setRefreshMessage("Wine profile refreshed."); } catch (cause) { setRefreshMessage(cause instanceof Error ? cause.message : "The wine profile could not be refreshed. Please try again."); } finally { setRefreshing(false); } }}>{refreshing ? "Refreshing profile…" : "Refresh Wine Profile"}</PremiumButton>
          {refreshMessage && <p role="status">{refreshMessage}</p>}
        </div>
      </>}
    </section>
  </main>;
}
