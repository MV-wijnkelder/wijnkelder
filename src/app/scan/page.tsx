"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { WineReview } from "@/components/wine-review";
import { CameraIcon, ChevronLeftIcon, PhotoIcon, WineglassIcon } from "@/components/icons";
import type { Wine } from "@/domain/wine";
import { AIService } from "@/services/ai-service";

const NOT_RECOGNIZED_MESSAGE = "Deze wijn kon niet met voldoende zekerheid worden herkend.";

export default function ScanPage() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [result, setResult] = useState<Wine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0];

    if (photo) {
      setPhoto(photo);
      setPhotoUrl(URL.createObjectURL(photo));
      setResult(null);
      setError(null);
    }
  }

  function resetPhoto() {
    setPhoto(null);
    setPhotoUrl(null);
    setResult(null);
    setError(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (libraryInput.current) libraryInput.current.value = "";
  }

  async function recognizeWine() {
    if (!photo || isRecognizing) return;

    setIsRecognizing(true);
    setError(null);
    setResult(null);

    try {
      const recognition = await AIService.recognizeWine(photo);
      if (recognition.recognized) {
        setResult(recognition.wine);
      } else {
        setError(NOT_RECOGNIZED_MESSAGE);
      }
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : "The wine could not be recognized.");
    } finally {
      setIsRecognizing(false);
    }
  }

  return (
    <main className="app-shell relative flex min-h-screen justify-center overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="ambient ambient-top" />
      <div aria-hidden="true" className="ambient ambient-bottom" />

      <section className="page-enter relative z-10 flex w-full max-w-xl flex-col">
        <Link className="back-link" href="/" aria-label="Terug naar home">
          <ChevronLeftIcon className="size-5" /> Terug
        </Link>

        <div className="mt-10 text-center sm:mt-14">
          <div className="app-icon app-icon-small mx-auto mb-7">
            <CameraIcon className="size-7" />
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl">
            Scan wijnetiket
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-7 text-muted sm:text-lg">
            Maak een duidelijke foto van het etiket of kies een bestaande foto uit je bibliotheek.
          </p>
        </div>

        {result ? (
          <WineReview wine={result} onChange={setResult} onScanAgain={resetPhoto} />
        ) : photoUrl ? (
          <div className="mt-9 flex flex-col gap-4">
            <div className={`preview-frame ${isRecognizing ? "is-loading" : ""}`}>
              {/* A blob URL from the local device does not need Next.js image optimisation. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="h-full w-full object-contain" src={photoUrl} alt="Voorbeeld van het gekozen wijnetiket" />
              {isRecognizing && <div className="recognition-overlay" aria-hidden="true"><span /><span /><span /></div>}
            </div>
            <button
              className="action action-primary w-full"
              type="button"
              onClick={recognizeWine}
              disabled={isRecognizing}
            >
              {isRecognizing ? <span className="spinner" aria-hidden="true" /> : <WineglassIcon className="size-5" />}
              {isRecognizing ? "Wijn herkennen…" : "Gebruik deze foto"}
            </button>
            {isRecognizing && <p className="sr-only" role="status">De wijn wordt herkend.</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
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
              <CameraIcon className="size-5" />
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
              <PhotoIcon className="size-5" />
              Kies uit fotobibliotheek
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
