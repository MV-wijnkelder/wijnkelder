"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { WineReview } from "@/components/wine-review";
import { CameraIcon, CheckIcon, ChevronLeftIcon, PhotoIcon, TrashIcon, WineglassIcon } from "@/components/icons";
import type { Wine } from "@/domain/wine";
import { compressImage } from "@/lib/image-compression";
import { AIService } from "@/services/ai-service";
import { WineService } from "@/services/wine-service";

const NOT_RECOGNIZED_MESSAGE = "Deze wijn kon niet met voldoende zekerheid worden herkend.";
type LabelSide = "front" | "back";
type LabelPhoto = { file: File; url: string };

export default function ScanPage() {
  const [front, setFront] = useState<LabelPhoto | null>(null);
  const [back, setBack] = useState<LabelPhoto | null>(null);
  const [result, setResult] = useState<Wine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [optimizingSides, setOptimizingSides] = useState<Set<LabelSide>>(() => new Set());
  const selectionSequence = useRef<Record<LabelSide, number>>({ front: 0, back: 0 });
  const frontCameraInput = useRef<HTMLInputElement>(null);
  const frontLibraryInput = useRef<HTMLInputElement>(null);
  const backCameraInput = useRef<HTMLInputElement>(null);
  const backLibraryInput = useRef<HTMLInputElement>(null);
  const frontUrl = front?.url;
  const backUrl = back?.url;

  useEffect(() => () => { if (frontUrl) URL.revokeObjectURL(frontUrl); }, [frontUrl]);
  useEffect(() => () => { if (backUrl) URL.revokeObjectURL(backUrl); }, [backUrl]);

  async function selectPhoto(side: LabelSide, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const sequence = ++selectionSequence.current[side];
    setOptimizingSides((current) => new Set(current).add(side));
    setResult(null);
    setError(null);
    try {
      const optimizedFile = await compressImage(file);
      if (selectionSequence.current[side] !== sequence) return;
      const photo = { file: optimizedFile, url: URL.createObjectURL(optimizedFile) };
      if (side === "front") setFront(photo); else setBack(photo);
    } catch (optimizationError) {
      if (selectionSequence.current[side] === sequence) {
        setError(optimizationError instanceof Error ? optimizationError.message : "The photo could not be optimized.");
      }
    } finally {
      if (selectionSequence.current[side] === sequence) {
        setOptimizingSides((current) => {
          const next = new Set(current);
          next.delete(side);
          return next;
        });
      }
    }
  }

  function removeBack() {
    selectionSequence.current.back += 1;
    setOptimizingSides((current) => {
      const next = new Set(current);
      next.delete("back");
      return next;
    });
    setBack(null);
    setError(null);
    if (backCameraInput.current) backCameraInput.current.value = "";
    if (backLibraryInput.current) backLibraryInput.current.value = "";
  }

  function resetPhotos() {
    selectionSequence.current.front += 1;
    selectionSequence.current.back += 1;
    setOptimizingSides(new Set());
    setFront(null);
    setBack(null);
    setResult(null);
    setError(null);
    [frontCameraInput, frontLibraryInput, backCameraInput, backLibraryInput].forEach((input) => {
      if (input.current) input.current.value = "";
    });
  }

  async function recognizeWine() {
    if (!front || isRecognizing || optimizingSides.size > 0) return;
    setIsRecognizing(true);
    setError(null);
    setResult(null);
    try {
      const recognition = await AIService.recognizeWine(front.file, back?.file);
      if (recognition.recognized) setResult(recognition.wine);
      else setError(NOT_RECOGNIZED_MESSAGE);
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : "The wine could not be recognized.");
    } finally {
      setIsRecognizing(false);
    }
  }

  const input = (side: LabelSide, source: "camera" | "library") => (
    <input
      ref={side === "front" ? (source === "camera" ? frontCameraInput : frontLibraryInput) : (source === "camera" ? backCameraInput : backLibraryInput)}
      className="sr-only"
      type="file"
      accept="image/*"
      capture={source === "camera" ? "environment" : undefined}
      onChange={(event) => void selectPhoto(side, event)}
      aria-label={`${side === "front" ? "Front" : "Back"} label ${source}`}
    />
  );

  return (
    <main className="app-shell relative flex min-h-screen justify-center overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="ambient ambient-top" /><div aria-hidden="true" className="ambient ambient-bottom" />
      <section className="page-enter relative z-10 flex w-full max-w-xl flex-col">
        <Link className="back-link" href="/" aria-label="Terug naar home"><ChevronLeftIcon className="size-5" /> Terug</Link>
        <div className="mt-8 text-center sm:mt-12">
          <div className="app-icon app-icon-small mx-auto mb-6"><CameraIcon className="size-7" /></div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl">Scan Wine</h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-7 text-muted sm:text-lg">Capture the front label and optionally add the back label for a richer recognition.</p>
        </div>

        {result ? (
          <WineReview
            wine={result}
            onChange={setResult}
            onScanAgain={resetPhotos}
            onSave={async (wine) => {
              const saved = await WineService.add(wine);
              return { duplicate: saved.duplicate };
            }}
          />
        ) : (
          <div className="mt-9 flex flex-col gap-4">
            <div className="label-grid">
              <LabelCard title="Front Label" photo={front} required isLoading={isRecognizing} onCamera={() => frontCameraInput.current?.click()} onLibrary={() => frontLibraryInput.current?.click()} />
              {front && (back
                ? <LabelCard title="Back Label" photo={back} isLoading={isRecognizing} onCamera={() => backCameraInput.current?.click()} onLibrary={() => backLibraryInput.current?.click()} onDelete={removeBack} />
                : <button className="label-add-card" type="button" onClick={() => backCameraInput.current?.click()} disabled={isRecognizing}><span className="label-add-icon"><CameraIcon className="size-6" /></span><strong>Back Label</strong><small>Optional · Add photo</small></button>)}
            </div>
            {input("front", "camera")}{input("front", "library")}{input("back", "camera")}{input("back", "library")}

            {front && <>
              <button className="action action-primary w-full" type="button" onClick={recognizeWine} disabled={!front || isRecognizing || optimizingSides.size > 0}>
                {isRecognizing ? <span className="spinner" aria-hidden="true" /> : <WineglassIcon className="size-5" />}
                {isRecognizing ? "Recognizing Wine…" : "Recognize Wine"}
              </button>
              {!back && <button className="action action-secondary w-full" type="button" onClick={() => backCameraInput.current?.click()} disabled={isRecognizing}><CameraIcon className="size-5" /> Add Back Label <span className="optional-text">Optional</span></button>}
            </>}
            {isRecognizing && <p className="sr-only" role="status">The wine is being recognized.</p>}
            {optimizingSides.size > 0 && <p className="optimization-status" role="status"><span className="optimization-spinner" aria-hidden="true" /> Optimizing photos...</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function LabelCard({ title, photo, required = false, isLoading, onCamera, onLibrary, onDelete }: { title: string; photo: LabelPhoto | null; required?: boolean; isLoading: boolean; onCamera: () => void; onLibrary: () => void; onDelete?: () => void }) {
  if (!photo) return (
    <div className="label-empty-card">
      <span className="label-add-icon"><CameraIcon className="size-6" /></span><div><strong>{title}</strong><small>{required ? "Required" : "Optional"}</small></div>
      <button className="capture-button" type="button" onClick={onCamera}><CameraIcon className="size-5" /> Capture front label</button>
      <button className="library-button" type="button" onClick={onLibrary}><PhotoIcon className="size-4" /> Choose from library</button>
    </div>
  );
  return (
    <article className={`label-preview-card ${isLoading ? "is-loading" : ""}`}>
      <div className="label-photo-wrap">
        {/* Blob URLs from the local device do not need Next.js image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`${title} preview`} />
        {isLoading && <div className="recognition-overlay" aria-hidden="true"><span /><span /><span /></div>}
      </div>
      <div className="label-card-body"><p><span className="captured-check"><CheckIcon className="size-3.5" /></span><strong>{title} captured</strong></p>
        <div className="label-card-actions"><button type="button" onClick={onCamera} disabled={isLoading}><CameraIcon className="size-4" /> Retake</button><button type="button" onClick={onLibrary} disabled={isLoading}><PhotoIcon className="size-4" /> Library</button>{onDelete && <button className="delete-button" type="button" onClick={onDelete} disabled={isLoading} aria-label="Delete back label"><TrashIcon className="size-4" /></button>}</div>
      </div>
    </article>
  );
}
