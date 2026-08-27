"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Wine } from "@/domain/wine";
import { ArrowClockwiseIcon, CheckIcon, PlusIcon } from "@/components/icons";
import Link from "next/link";

type WineReviewProps = {
  wine: Wine;
  onChange: (wine: Wine) => void;
  onScanAgain: () => void;
  onSave: (wine: Wine) => Promise<{ duplicate: boolean }>;
};

type TextField = Exclude<keyof Wine, "grapeVarieties" | "alcoholPercentage" | "confidence" | "profile" | "cellar">;

const textFields: Array<{ key: TextField; label: string; placeholder: string }> = [
  { key: "producer", label: "Producer", placeholder: "Producer name" },
  { key: "wineName", label: "Wine name", placeholder: "Wine name" },
  { key: "vintage", label: "Vintage", placeholder: "For example, 2020" },
  { key: "country", label: "Country", placeholder: "Country of origin" },
  { key: "region", label: "Region", placeholder: "Wine region" },
  { key: "appellation", label: "Appellation", placeholder: "Appellation" },
  { key: "wineColor", label: "Wine color", placeholder: "For example, red" },
  { key: "bottleSize", label: "Bottle size", placeholder: "For example, 750 ml" },
];

export function WineReview({ wine, onChange, onScanAgain, onSave }: WineReviewProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateText(key: TextField, value: string) {
    onChange({ ...wine, [key]: value.trimStart() || null });
    setSaveMessage(null);
  }

  function updateGrapes(value: string) {
    onChange({
      ...wine,
      grapeVarieties: value.split(",").map((grape) => grape.trim()).filter(Boolean),
    });
    setSaveMessage(null);
  }

  function updateAlcohol(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    onChange({ ...wine, alcoholPercentage: value === "" ? null : Number(value) });
    setSaveMessage(null);
  }

  async function confirmReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const result = await onSave(wine);
      setSaveMessage(result.duplicate ? "Wine successfully added. Bottle quantity increased." : "Wine successfully added.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The wine could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="review-card" onSubmit={confirmReview} aria-labelledby="review-title">
      <div className="result-heading">
        <div>
          <p className="result-eyebrow">Review recognition</p>
          <h2 id="review-title">Wine details</h2>
        </div>
        <div className="confidence" aria-label={`${wine.confidence}% confidence`}>
          <strong>{wine.confidence}%</strong>
          <span>Confidence</span>
        </div>
      </div>

      <div className="ai-summary">
        <span className="ai-summary-icon"><CheckIcon className="size-4" /></span>
        <div><strong>Recognition complete</strong><p>AI filled in this information. Review and edit it where needed.</p></div>
      </div>

      <p className="section-label">Editable information</p>
      <div className="review-fields">
        {textFields.slice(0, 6).map(({ key, label, placeholder }) => (
          <label className="review-field" key={key}>
            <span>{label}</span>
            <input
              type="text"
              value={wine[key] ?? ""}
              placeholder={placeholder}
              onChange={(event) => updateText(key, event.target.value)}
            />
          </label>
        ))}

        <label className="review-field">
          <span>Grape varieties</span>
          <input
            type="text"
            value={wine.grapeVarieties.join(", ")}
            placeholder="For example, Merlot, Cabernet Sauvignon"
            onChange={(event) => updateGrapes(event.target.value)}
          />
          <small>Separate multiple grape varieties with a comma.</small>
        </label>

        {textFields.slice(6).map(({ key, label, placeholder }) => (
          <label className="review-field" key={key}>
            <span>{label}</span>
            <input
              type="text"
              value={wine[key] ?? ""}
              placeholder={placeholder}
              onChange={(event) => updateText(key, event.target.value)}
            />
          </label>
        ))}

        <label className="review-field">
          <span>Alcohol percentage</span>
          <div className="input-suffix">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={wine.alcoholPercentage ?? ""}
              placeholder="For example, 13.5"
              onChange={updateAlcohol}
            />
            <span aria-hidden="true">%</span>
          </div>
        </label>
      </div>

      {saveMessage && <p className="success-message" role="status"><span><CheckIcon className="size-3.5" /></span>{saveMessage}</p>}
      {saveError && <p className="error-message" role="alert">{saveError}</p>}

      {saveMessage ? <div className="review-actions">
        <button className="action action-primary w-full" type="button" onClick={onScanAgain}>
          <ArrowClockwiseIcon className="size-5" />
          Scan another wine
        </button>
        <Link className="action action-secondary w-full" href="/cellar">My cellar</Link>
      </div> : <div className="review-actions">
        <button className="action action-secondary w-full" type="button" onClick={onScanAgain}><ArrowClockwiseIcon className="size-5" /> Start over</button>
        <button className="action action-primary w-full" type="submit" disabled={isSaving}>
          {isSaving ? <span className="spinner" aria-hidden="true" /> : <PlusIcon className="size-5" />}
          {isSaving ? "Saving…" : "Add to cellar"}
        </button>
      </div>}
    </form>
  );
}
