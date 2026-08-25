import type { WineRecognitionResult } from "@/lib/wine-recognition";

const RECOGNITION_ENDPOINT = "/api/recognize-wine";

/** Browser-facing AI facade. UI components never depend on a provider. */
export const AIService = {
  async recognizeWine(frontLabel: File | Blob, backLabel?: File | Blob): Promise<WineRecognitionResult> {
    const formData = createRecognitionFormData(frontLabel, backLabel);

    const response = await fetch(RECOGNITION_ENDPOINT, {
      method: "POST",
      body: formData,
    });
    const data = await parseRecognitionResponse(response);

    if (!response.ok) {
      const message = isErrorResponse(data) ? data.error : "The wine could not be recognized.";
      throw new Error(message);
    }

    return normalizeRecognitionResult(data);
  },
};

/**
 * Read the body once and parse it independently of WebKit's Response.json()
 * implementation. Keeping status, headers and body available here also makes
 * malformed proxy responses fail with an actionable application error.
 */
export async function parseRecognitionResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const rawBody = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("The recognition service returned an invalid response.");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error("The recognition service returned invalid JSON.");
  }
}

/**
 * Preserve the proven single-label payload, and use explicit label fields only
 * when a back label is present. Preview/object URLs are strings and therefore
 * cannot pass this boundary or accidentally become upload values.
 */
export function createRecognitionFormData(frontLabel: File | Blob, backLabel?: File | Blob): FormData {
  assertUpload(frontLabel, "frontLabel");

  const formData = new FormData();
  if (backLabel === undefined) {
    formData.append("image", frontLabel);
    return formData;
  }

  assertUpload(backLabel, "backLabel");
  formData.append("frontLabel", frontLabel);
  formData.append("backLabel", backLabel);
  return formData;
}

function assertUpload(value: unknown, field: "frontLabel" | "backLabel"): asserts value is File | Blob {
  if (!(value instanceof Blob)) {
    throw new TypeError(`${field} must be a File or Blob`);
  }
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

const nullableWineFields = [
  "producer",
  "wineName",
  "vintage",
  "country",
  "region",
  "appellation",
  "wineColor",
  "bottleSize",
] as const;

/** Copy only canonical JSON fields so upload and browser objects cannot reach result state. */
function normalizeRecognitionResult(value: unknown): WineRecognitionResult {
  if (!isRecord(value) || typeof value.recognized !== "boolean") {
    throw new Error("The recognition service returned an invalid result.");
  }
  if (!value.recognized) return { recognized: false };
  if (!isRecord(value.wine)) throw new Error("The recognition service returned an invalid wine.");

  const wine = value.wine;
  for (const field of nullableWineFields) {
    if (wine[field] !== null && typeof wine[field] !== "string") {
      throw new Error("The recognition service returned an invalid wine.");
    }
  }
  if (!Array.isArray(wine.grapeVarieties) || !wine.grapeVarieties.every((grape) => typeof grape === "string")) {
    throw new Error("The recognition service returned an invalid wine.");
  }
  if (wine.alcoholPercentage !== null && typeof wine.alcoholPercentage !== "number") {
    throw new Error("The recognition service returned an invalid wine.");
  }
  if (typeof wine.confidence !== "number") {
    throw new Error("The recognition service returned an invalid wine.");
  }

  return {
    recognized: true,
    wine: {
      producer: wine.producer as string | null,
      wineName: wine.wineName as string | null,
      vintage: wine.vintage as string | null,
      country: wine.country as string | null,
      region: wine.region as string | null,
      appellation: wine.appellation as string | null,
      grapeVarieties: [...wine.grapeVarieties],
      wineColor: wine.wineColor as string | null,
      bottleSize: wine.bottleSize as string | null,
      alcoholPercentage: wine.alcoholPercentage as number | null,
      confidence: wine.confidence,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
