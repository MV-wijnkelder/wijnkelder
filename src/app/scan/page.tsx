"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { WineReview } from "@/components/wine-review";
import { WineProfile } from "@/components/wine-profile";
import { CameraIcon, CheckIcon, ChevronLeftIcon, PhotoIcon } from "@/components/icons";
import type { Wine } from "@/domain/wine";
import { compressImage } from "@/lib/image-compression";
import { stageForPhotoPicker } from "@/lib/scan-navigation";
import type { LabelSide, PhotoSource, ScanStage } from "@/lib/scan-navigation";
import { AIService } from "@/services/ai-service";
import { WineService } from "@/services/wine-service";

type LabelPhoto = { file: File; url: string };

export default function ScanPage() {
  const [stage, setStage] = useState<ScanStage>("start");
  const [front, setFront] = useState<LabelPhoto | null>(null);
  const [back, setBack] = useState<LabelPhoto | null>(null);
  const [result, setResult] = useState<Wine | null>(null);
  const [warning, setWarning] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploreSaveMessage, setExploreSaveMessage] = useState<string | null>(null);
  const inputs = {
    frontCamera: useRef<HTMLInputElement>(null), frontLibrary: useRef<HTMLInputElement>(null),
    backCamera: useRef<HTMLInputElement>(null), backLibrary: useRef<HTMLInputElement>(null),
  };
  const frontUrl = front?.url, backUrl = back?.url;
  useEffect(() => () => { if (frontUrl) URL.revokeObjectURL(frontUrl); }, [frontUrl]);
  useEffect(() => () => { if (backUrl) URL.revokeObjectURL(backUrl); }, [backUrl]);

  function open(side: LabelSide, source: PhotoSource) {
    setStage(stageForPhotoPicker(side, source)); setError(null);
    inputs[`${side}${source}`].current?.click();
  }

  async function selectPhoto(side: LabelSide, source: PhotoSource, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const isFrontCamera = side === "front" && source === "Camera";
    setBusy(true); setError(null);
    try {
      const optimized = await compressImage(file);
      const photo = { file: optimized, url: URL.createObjectURL(optimized) };
      if (side === "front") setFront(photo); else setBack(photo);
      if (side === "back" && source === "Camera") await recognize(photo, true);
    } catch (cause) {
      if (isFrontCamera) setStage("front");
      setError(cause instanceof Error ? cause.message : "The photo could not be optimized.");
    }
    finally { setBusy(false); event.target.value = ""; }
  }

  async function recognize(backPhoto?: LabelPhoto, alreadyBusy = false) {
    if (!front || (busy && !alreadyBusy)) return;
    setBusy(true); setError(null);
    try {
      const recognition = await AIService.recognizeWine(front.file, backPhoto?.file);
      if (!recognition.recognized) { setError("This wine could not be recognized with enough confidence."); return; }
      setResult(recognition.wine);
      setWarning(recognition.labelWarning ?? []);
      setStage(recognition.labelWarning?.length ? "warning" : "review");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The wine could not be recognized."); }
    finally { setBusy(false); }
  }

  function reset() {
    setStage("start"); setFront(null); setBack(null); setResult(null); setWarning([]); setError(null); setBusy(false); setExploring(false); setExploreSaveMessage(null);
  }

  function retake(side: LabelSide) {
    if (side === "front") { setFront(null); setBack(null); } else setBack(null);
    setResult(null); setWarning([]); setStage(side); open(side, "Camera");
  }

  const fileInput = (side: LabelSide, source: PhotoSource) => <input ref={inputs[`${side}${source}`]} className="sr-only" type="file" accept="image/*" capture={source === "Camera" ? "environment" : undefined} onChange={(event) => void selectPhoto(side, source, event)} aria-label={`${side} label ${source.toLowerCase()}`} />;

  return <main className="app-shell relative flex min-h-screen justify-center overflow-hidden px-5 py-6 sm:px-6 sm:py-10">
    <div aria-hidden="true" className="ambient ambient-top" /><div aria-hidden="true" className="ambient ambient-bottom" />
    <section className="page-enter relative z-10 flex w-full max-w-xl flex-col">
      <Link className="back-link" href="/" aria-label="Back to home"><ChevronLeftIcon className="size-5" /> Back</Link>
      {!exploring && <div className="mt-6 text-center sm:mt-8"><div className="app-icon app-icon-small mx-auto mb-5"><CameraIcon className="size-7" /></div><h1 className="text-4xl font-semibold tracking-[-0.045em] text-ink">Scan Wine</h1></div>}
      <div className="mt-8 flex flex-col gap-4">
        {stage === "start" && <Choice title="How would you like to add your wine?" onCamera={() => open("front", "Camera")} onLibrary={() => open("front", "Library")} />}
        {stage === "front" && <PhotoStep title="Front label" photo={front} busy={busy} onCamera={() => open("front", "Camera")} onLibrary={() => open("front", "Library")} onUse={() => setStage("back-choice")} onRetake={() => retake("front")} />}
        {stage === "back-choice" && <div className="label-empty-card workflow-card"><h2>Would you like to add a back label?</h2><button className="action action-primary w-full" type="button" disabled={busy} onClick={() => setStage("back")}>Yes</button><button className="action action-secondary w-full" type="button" disabled={busy} onClick={() => void recognize()}>Skip</button></div>}
        {stage === "back" && <PhotoStep title="Back label" photo={back} busy={busy} onCamera={() => open("back", "Camera")} onLibrary={() => open("back", "Library")} onUse={() => void recognize(back ?? undefined)} onRetake={() => retake("back")} />}
        {stage === "warning" && <div className="label-warning" role="alert"><h2>These labels may belong to different wines</h2><p>The recognition confidence was lowered because the labels conflict:</p><ul>{warning.map((item) => <li key={item}>{item}</li>)}</ul><button className="action action-primary w-full" type="button" onClick={() => retake("front")}>Retake front label</button><button className="action action-secondary w-full" type="button" onClick={() => retake("back")}>Retake back label</button><button className="continue-link" type="button" onClick={() => setStage("review")}>Continue anyway</button></div>}
        {stage === "review" && result && !exploring && <WineReview wine={result} onChange={setResult} onScanAgain={reset} onSave={async (wine) => { const saved = await WineService.add(wine); return { duplicate: saved.duplicate }; }} onExplore={async (wine) => { setResult(await WineService.explore(wine)); setExploring(true); }} />}
        {stage === "review" && result && exploring && <><WineProfile wine={result} />{exploreSaveMessage ? <p className="success-message" role="status"><span><CheckIcon className="size-3.5" /></span>{exploreSaveMessage}</p> : null}<div className="explore-actions"><button className="action action-primary w-full" type="button" disabled={busy || Boolean(exploreSaveMessage)} onClick={() => void (async () => { setBusy(true); setError(null); try { const saved = await WineService.add(result); setExploreSaveMessage(saved.duplicate ? "Wine added. Bottle quantity increased." : "Wine added to My Cellar."); } catch (cause) { setError(cause instanceof Error ? cause.message : "The wine could not be saved."); } finally { setBusy(false); } })()}>{busy ? "Saving…" : "Add to My Cellar"}</button><Link className="action action-secondary w-full" href="/">Done</Link></div></>}
        {busy && <p className="optimization-status" role="status"><span className="optimization-spinner" /> Processing photo…</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </div>
      {fileInput("front", "Camera")}{fileInput("front", "Library")}{fileInput("back", "Camera")}{fileInput("back", "Library")}
    </section>
  </main>;
}

function Choice({ title, onCamera, onLibrary }: { title: string; onCamera: () => void; onLibrary: () => void }) {
  return <div className="label-empty-card workflow-card"><h2>{title}</h2><button className="action action-primary w-full" type="button" onClick={onCamera}><CameraIcon className="size-5" /> Capture photo</button><button className="action action-secondary w-full" type="button" onClick={onLibrary}><PhotoIcon className="size-5" /> Choose from library</button></div>;
}
function PhotoStep({ title, photo, busy, onCamera, onLibrary, onUse, onRetake }: { title: string; photo: LabelPhoto | null; busy: boolean; onCamera: () => void; onLibrary: () => void; onUse: () => void; onRetake: () => void }) {
  if (!photo) return <Choice title={title} onCamera={onCamera} onLibrary={onLibrary} />;
  return <article className="label-preview-card"><div className="label-photo-wrap">{/* Blob preview URLs cannot use the Next.js image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.url} alt={`${title} preview`} /></div><div className="label-card-body"><p><span className="captured-check"><CheckIcon className="size-3.5" /></span><strong>{title} captured</strong></p><div className="label-card-actions"><button type="button" onClick={onUse} disabled={busy}>Use photo</button><button type="button" onClick={onRetake} disabled={busy}><CameraIcon className="size-4" /> Retake</button></div></div></article>;
}
