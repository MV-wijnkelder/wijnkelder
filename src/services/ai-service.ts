import type { WineRecognitionResult } from "@/lib/wine-recognition";

const RECOGNITION_ENDPOINT = "/api/recognize-wine";

/** Browser-facing AI facade. UI components never depend on a provider. */
export const AIService = {
  async recognizeWine(frontImage: File, backImage?: File): Promise<WineRecognitionResult> {
    const formData = new FormData();
    formData.append("frontImage", frontImage);
    if (backImage) formData.append("backImage", backImage);

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

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}
