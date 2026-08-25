import type { StorageService as StorageServiceContract } from "@/services/storage/storage-service";

const REQUEST_TIMEOUT_MS = 20_000;

/** Browser-safe facade; Microsoft credentials remain behind the API boundary. */
export const StorageService: StorageServiceContract = {
  async addWine(wine) {
    try {
      const response = await fetch("/api/wines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wine),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(isErrorResponse(data) ? data.error : "De wijn kon niet worden opgeslagen.");
      }
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("Het opslaan duurde te lang. Probeer het opnieuw.");
      }
      if (error instanceof Error) throw error;
      throw new Error("De wijn kon niet worden opgeslagen.");
    }
  },
};

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string";
}

export type { StorageService as StorageServiceContract } from "@/services/storage/storage-service";
