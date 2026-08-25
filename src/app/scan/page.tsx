"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

export default function ScanPage() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0];

    if (photo) setPhotoUrl(URL.createObjectURL(photo));
  }

  function resetPhoto() {
    setPhotoUrl(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (libraryInput.current) libraryInput.current.value = "";
  }

  return (
    <main className="relative flex min-h-screen justify-center overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="ambient ambient-top" />
      <div aria-hidden="true" className="ambient ambient-bottom" />

      <section className="relative z-10 flex w-full max-w-xl flex-col">
        <Link className="back-link" href="/" aria-label="Terug naar home">
          <span aria-hidden="true">‹</span> Terug
        </Link>

        <div className="mt-10 text-center sm:mt-14">
          <div className="mx-auto mb-7 flex size-14 items-center justify-center rounded-[1.2rem] bg-wine text-2xl shadow-[0_14px_34px_rgba(99,31,50,0.18)]">
            <span aria-hidden="true">📷</span>
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl">
            Scan wijnetiket
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-7 text-muted sm:text-lg">
            Maak een duidelijke foto van het etiket of kies een bestaande foto uit je bibliotheek.
          </p>
        </div>

        {photoUrl ? (
          <div className="mt-9 flex flex-col gap-4">
            <div className="preview-frame">
              {/* A blob URL from the local device does not need Next.js image optimisation. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="h-full w-full object-contain" src={photoUrl} alt="Voorbeeld van het gekozen wijnetiket" />
            </div>
            <button className="action action-primary w-full" type="button">
              Gebruik deze foto
            </button>
            <button className="action action-secondary w-full" onClick={resetPhoto} type="button">
              Nieuwe foto
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-3">
            <input
              ref={cameraInput}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={selectPhoto}
              aria-label="Maak foto"
            />
            <button className="action action-primary w-full" onClick={() => cameraInput.current?.click()} type="button">
              <span aria-hidden="true" className="text-xl">📷</span>
              Maak foto
            </button>

            <input
              ref={libraryInput}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={selectPhoto}
              aria-label="Kies uit fotobibliotheek"
            />
            <button className="action action-secondary w-full" onClick={() => libraryInput.current?.click()} type="button">
              <span aria-hidden="true" className="text-xl">▧</span>
              Kies uit fotobibliotheek
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
