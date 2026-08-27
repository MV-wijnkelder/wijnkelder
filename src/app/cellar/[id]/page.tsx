"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon } from "@/components/icons";
import { WineProfile } from "@/components/wine-profile";
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
      {error ? <p className="error-message mt-8" role="alert">{error}</p> : !wine ? <p className="cellar-status" role="status">Opening wine…</p> : <WineProfile wine={wine} bottleCount={wine.bottleCount} />}
    </section>
  </main>;
}
