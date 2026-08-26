"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Wine } from "@/domain/wine";
import { ArrowClockwiseIcon, CheckIcon, PlusIcon } from "@/components/icons";

const RELEASE_2_MESSAGE = "This feature will be available in Release 2.";

type WineReviewProps = {
  wine: Wine;
  onChange: (wine: Wine) => void;
  onScanAgain: () => void;
};

type TextField = Exclude<keyof Wine, "grapeVarieties" | "alcoholPercentage" | "confidence">;

const textFields: Array<{ key: TextField; label: string; placeholder: string }> = [
  { key: "producer", label: "Producent", placeholder: "Naam van de producent" },
  { key: "wineName", label: "Wijnnaam", placeholder: "Naam van de wijn" },
  { key: "vintage", label: "Jaargang", placeholder: "Bijv. 2020" },
  { key: "country", label: "Land", placeholder: "Land van herkomst" },
  { key: "region", label: "Regio", placeholder: "Wijnregio" },
  { key: "appellation", label: "Appellatie", placeholder: "Appellatie" },
  { key: "wineColor", label: "Wijnkleur", placeholder: "Bijv. rood" },
  { key: "bottleSize", label: "Flesformaat", placeholder: "Bijv. 750 ml" },
];

export function WineReview({ wine, onChange, onScanAgain }: WineReviewProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  function confirmReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(RELEASE_2_MESSAGE);
  }

  return (
    <form className="review-card" onSubmit={confirmReview} aria-labelledby="review-title">
      <div className="result-heading">
        <div>
          <p className="result-eyebrow">Controleer de herkenning</p>
          <h2 id="review-title">Wijndetails</h2>
        </div>
        <div className="confidence" aria-label={`${wine.confidence}% zekerheid`}>
          <strong>{wine.confidence}%</strong>
          <span>Zekerheid</span>
        </div>
      </div>

      <div className="ai-summary">
        <span className="ai-summary-icon"><CheckIcon className="size-4" /></span>
        <div><strong>Herkenning voltooid</strong><p>Onderstaande informatie is door AI ingevuld. Controleer en pas aan waar nodig.</p></div>
      </div>

      <p className="section-label">Bewerkbare informatie</p>
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
          <span>Druivenrassen</span>
          <input
            type="text"
            value={wine.grapeVarieties.join(", ")}
            placeholder="Bijv. Merlot, Cabernet Sauvignon"
            onChange={(event) => updateGrapes(event.target.value)}
          />
          <small>Scheid meerdere druivenrassen met een komma.</small>
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
          <span>Alcoholpercentage</span>
          <div className="input-suffix">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              inputMode="decimal"
              value={wine.alcoholPercentage ?? ""}
              placeholder="Bijv. 13.5"
              onChange={updateAlcohol}
            />
            <span aria-hidden="true">%</span>
          </div>
        </label>
      </div>

      {saveMessage && (
        <p className="release-message" role="status">
          {saveMessage}
        </p>
      )}

      <div className="review-actions">
        <button className="action action-secondary w-full" type="button" onClick={onScanAgain}>
          <ArrowClockwiseIcon className="size-5" />
          Scan opnieuw
        </button>
        <button className="action action-primary w-full" type="submit" aria-disabled="true">
          <PlusIcon className="size-5" />
          Toevoegen aan wijnkelder
        </button>
      </div>
    </form>
  );
}
