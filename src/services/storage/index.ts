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
      return response.ok;
    } catch {
      return false;
    }
  },
};

export type { StorageService as StorageServiceContract } from "@/services/storage/storage-service";
