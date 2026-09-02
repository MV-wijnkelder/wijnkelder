"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon, TrashIcon, WineglassIcon } from "@/components/icons";
import {
  BackButton,
  HeroBackground,
  PremiumButton,
  PremiumHeader,
  PremiumInput,
  PremiumLink,
} from "@/components/premium-ui";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";
import { downloadCellarWorkbook } from "@/lib/cellar-export";
import {
  CELLAR_STATE_KEY,
  emptyCellarNavigationState,
  parseCellarNavigationState,
} from "@/lib/cellar-navigation";

export default function CellarPage() {
  const [wines, setWines] = useState<StoredWine[]>([]);
  const [search, setSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : parseCellarNavigationState(sessionStorage.getItem(CELLAR_STATE_KEY))
          .search,
  );
  const [editing, setEditing] = useState<StoredWine | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<StoredWine | null>(null);
  const [confirmingEdit, setConfirmingEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingValues, setRefreshingValues] = useState(false);
  const loadSequence = useRef(0);
  const restored = useRef(false);
  const rememberPosition = useCallback(
    (wineId: number | null = null) => {
      const previous = parseCellarNavigationState(
        sessionStorage.getItem(CELLAR_STATE_KEY),
      );
      sessionStorage.setItem(
        CELLAR_STATE_KEY,
        JSON.stringify({
          search,
          scrollY: window.scrollY,
          wineId: wineId ?? previous.wineId,
        }),
      );
    },
    [search],
  );

  const load = useCallback(async (query = "") => {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await WineService.list(query);
      if (sequence === loadSequence.current) setWines(loaded);
    } catch (loadError) {
      setError(message(loadError));
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 250);
    return () => clearTimeout(timer);
  }, [load, search]);
  useEffect(() => {
    sessionStorage.setItem(
      CELLAR_STATE_KEY,
      JSON.stringify({
        ...parseCellarNavigationState(sessionStorage.getItem(CELLAR_STATE_KEY)),
        search,
      }),
    );
  }, [search]);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const save = () => rememberPosition();
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      history.scrollRestoration = previous;
    };
  }, [rememberPosition]);
  useEffect(() => {
    if (isLoading || restored.current) return;
    restored.current = true;
    const state = parseCellarNavigationState(
      sessionStorage.getItem(CELLAR_STATE_KEY),
    );
    requestAnimationFrame(() => {
      const card = state.wineId
        ? document.querySelector<HTMLElement>(
            `[data-wine-id="${state.wineId}"]`,
          )
        : null;
      if (card && state.scrollY === 0) card.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: state.scrollY, behavior: "instant" });
    });
  }, [isLoading]);

  function changeCount(wine: StoredWine, change: number) {
    setEditingOriginal(wine);
    setEditing({ ...wine, bottleCount: Math.max(0, wine.bottleCount + change) });
    setConfirmingEdit(true);
  }

  async function remove(wine: StoredWine) {
    if (
      !window.confirm(
        `Delete this wine?\n\nThis will remove ${wine.wineName ?? "this wine"} and all ${wine.bottleCount} ${wine.bottleCount === 1 ? "bottle" : "bottles"} from your cellar.`,
      )
    )
      return;
    try {
      await WineService.delete(wine.id);
      loadSequence.current += 1;
      setWines((current) => current.filter((item) => item.id !== wine.id));
      setIsLoading(false);
    } catch (deleteError) {
      setError(message(deleteError));
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !editingOriginal) return;
    setConfirmingEdit(true);
  }

  async function confirmEdit() {
    if (!editing) return;
    try {
      const updated = await WineService.update(editing);
      setWines((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(null);
      setEditingOriginal(null);
      setConfirmingEdit(false);
    } catch (editError) {
      setError(message(editError));
    }
  }

  return (
    <main className="app-shell premium-page relative min-h-screen overflow-x-clip px-5 py-6 sm:px-6 sm:py-10">
      <HeroBackground atmosphere="cellar" />
      <section className="page-enter relative z-10 mx-auto w-full max-w-3xl">
        <BackButton
          href="/"
          onClick={() =>
            sessionStorage.setItem(
              CELLAR_STATE_KEY,
              JSON.stringify(emptyCellarNavigationState),
            )
          }
        />
        <PremiumHeader
          icon={WineglassIcon}
          eyebrow="Your collection"
          title="My Cellar"
          subtitle="Every bottle, carefully kept."
        />
        <div className="profile-refresh">
          <PremiumButton disabled={refreshingValues || isLoading} onClick={async () => { setRefreshingValues(true); setError(null); try { setWines(await WineService.refreshAllMarketValues()); } catch (cause) { setError(message(cause)); } finally { setRefreshingValues(false); } }}>{refreshingValues ? "Refreshing cellar values…" : "Refresh Estimated Market Values"}</PremiumButton>
        </div>
        {!isLoading && <PremiumButton className="export-action" variant="secondary" onClick={() => downloadCellarWorkbook(wines)}>Export to Excel</PremiumButton>}
        <label className="cellar-search">
          <span className="sr-only">Search your cellar</span>
          <PremiumInput
            suppressHydrationWarning
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, producer, region…"
            type="search"
          />
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {isLoading ? (
          <p className="cellar-status" role="status">
            Loading wines…
          </p>
        ) : wines.length === 0 ? (
          <div className="cellar-empty">
            <WineglassIcon className="size-8" />
            <strong>
              {search ? "No wines found" : "Your cellar is empty"}
            </strong>
            <p>
              {search
                ? "Try a different search term."
                : "Scan a label to add your first wine."}
            </p>
            {!search && (
              <PremiumLink href="/scan">
                <PlusIcon className="size-5" /> Scan wine
              </PremiumLink>
            )}
          </div>
        ) : (
          <div className="wine-list">
            {wines.map((wine) => (
              <article
                className="wine-card"
                key={wine.id}
                data-wine-id={wine.id}
              >
                <Link
                  className="wine-card-main"
                  href={`/cellar/${wine.id}`}
                  onClick={() => rememberPosition(wine.id)}
                  aria-label={`Open ${wine.wineName || "wine"} profile`}
                >
                  <div>
                    <p>{wine.producer || "Unknown producer"}</p>
                    <h2>{wine.wineName || "Unnamed wine"}</h2>
                    <span>
                      {[wine.vintage, wine.region, wine.country]
                        .filter(Boolean)
                        .join(" · ") || "Origin unknown"}
                    </span>
                  </div>
                  <strong className="bottle-badge">
                    {wine.bottleCount}{" "}
                    {wine.bottleCount === 1 ? "bottle" : "bottles"}
                  </strong>
                </Link>
                <div className="wine-card-actions">
                  <div className="count-actions">
                    <button
                      type="button"
                      onClick={() => changeCount(wine, -1)}
                      disabled={wine.bottleCount === 0}
                      aria-label="One fewer bottle"
                    >
                      −
                    </button>
                    <span>{wine.bottleCount}</span>
                    <button
                      type="button"
                      onClick={() => changeCount(wine, 1)}
                      aria-label="One more bottle"
                    >
                      +
                    </button>
                  </div>
                  <button type="button" onClick={() => { setEditingOriginal(wine); setEditing({ ...wine }); setConfirmingEdit(false); }}>
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => void remove(wine)}
                    aria-label="Delete wine"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <div className="dialog-backdrop" role="presentation">
          <form
            className="edit-dialog"
            onSubmit={(event) => void saveEdit(event)}
          >
            <h2>{confirmingEdit ? "Confirm changes" : "Edit wine"}</h2>
            {confirmingEdit && editingOriginal ? <>
              <dl className="change-list">{wineChanges(editingOriginal, editing).map((change) => <div key={change.label}><dt>{change.label}</dt><dd>{change.before}</dd><dd className="change-new">→ {change.after}</dd></div>)}</dl>
              <div className="edit-actions">
                <PremiumButton variant="secondary" type="button" onClick={() => setConfirmingEdit(false)}>Cancel</PremiumButton>
                <PremiumButton type="button" onClick={() => void confirmEdit()}>Confirm</PremiumButton>
              </div>
            </> : <>
            <EditField
              label="Producer"
              value={editing.producer}
              onChange={(producer) => setEditing({ ...editing, producer })}
            />
            <EditField
              label="Wine name"
              value={editing.wineName}
              onChange={(wineName) => setEditing({ ...editing, wineName })}
            />
            <EditField
              label="Vintage"
              value={editing.vintage}
              onChange={(vintage) => setEditing({ ...editing, vintage })}
            />
            <EditField
              label="Country"
              value={editing.country}
              onChange={(country) => setEditing({ ...editing, country })}
            />
            <EditField
              label="Region"
              value={editing.region}
              onChange={(region) => setEditing({ ...editing, region })}
            />
            <EditField
              label="Appellation"
              value={editing.appellation}
              onChange={(appellation) =>
                setEditing({ ...editing, appellation })
              }
            />
            <EditField
              label="Grape varieties"
              value={editing.grapeVarieties.join(", ")}
              onChange={(value) =>
                setEditing({
                  ...editing,
                  grapeVarieties:
                    value
                      ?.split(",")
                      .map((item) => item.trim())
                      .filter(Boolean) ?? [],
                })
              }
            />
            <EditField
              label="Wine color"
              value={editing.wineColor}
              onChange={(wineColor) => setEditing({ ...editing, wineColor })}
            />
            <EditField
              label="Bottle size"
              value={editing.bottleSize}
              onChange={(bottleSize) => setEditing({ ...editing, bottleSize })}
            />
            <label className="review-field">
              <span>Alcohol percentage</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editing.alcoholPercentage ?? ""}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    alcoholPercentage: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
            </label>
            <label className="review-field"><span>Quantity</span><input type="number" min="0" step="1" value={editing.bottleCount} onChange={(event) => setEditing({ ...editing, bottleCount: Math.max(0, Number(event.target.value)) })} /></label>
            <div className="edit-actions">
              <PremiumButton
                variant="secondary"
                type="button"
                onClick={() => { setEditing(null); setEditingOriginal(null); }}
              >
                Cancel
              </PremiumButton>
              <PremiumButton type="submit">Save</PremiumButton>
            </div>
            </>}
          </form>
        </div>
      )}
    </main>
  );
}

function wineChanges(original: StoredWine, edited: StoredWine) {
  const fields: [string, unknown, unknown][] = [
    ["Producer", original.producer, edited.producer], ["Wine name", original.wineName, edited.wineName],
    ["Vintage", original.vintage, edited.vintage], ["Country", original.country, edited.country],
    ["Region", original.region, edited.region], ["Appellation", original.appellation, edited.appellation],
    ["Grape varieties", original.grapeVarieties.join(", "), edited.grapeVarieties.join(", ")],
    ["Wine color", original.wineColor, edited.wineColor], ["Bottle size", original.bottleSize, edited.bottleSize],
    ["Alcohol percentage", original.alcoholPercentage, edited.alcoholPercentage], ["Quantity", original.bottleCount, edited.bottleCount],
  ];
  return fields.filter(([, before, after]) => String(before ?? "") !== String(after ?? "")).map(([label, before, after]) => ({ label, before: String(before ?? "Not recorded"), after: String(after ?? "Not recorded") }));
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="review-field">
      <span>{label}</span>
      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      />
    </label>
  );
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "The operation failed.";
}
