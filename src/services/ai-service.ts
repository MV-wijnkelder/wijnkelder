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
    const data: unknown = await response.json();

    if (!response.ok) {
      const message = isErrorResponse(data) ? data.error : "The wine could not be recognized.";
      throw new Error(message);
    }

    return data as WineRecognitionResult;
  },
};

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
