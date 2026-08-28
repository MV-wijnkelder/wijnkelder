export const FRIENDLY_SOMMELIER_ERROR = "I couldn't reach your sommelier just now. Your conversation is safe—please try again.";

export function isTransientSommelierFailure(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Network interruptions previously surfaced the browser's raw "Failed to fetch"
 * and had no recovery path. Repeat a transient request once with the exact same
 * conversation payload so a successful retry cannot lose or duplicate context. */
export async function requestSommelier(payload: object, fetcher: typeof fetch = fetch): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher("/api/sommelier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; error?: string };
      if (response.ok && data.reply) return data.reply;
      if (attempt === 0 && isTransientSommelierFailure(response.status)) continue;
      throw new Error(response.status >= 500 ? FRIENDLY_SOMMELIER_ERROR : data.error || FRIENDLY_SOMMELIER_ERROR);
    } catch (error) {
      if (attempt === 0 && (!(error instanceof Error) || error.message === "Failed to fetch" || error instanceof TypeError)) continue;
      if (error instanceof Error && error.message !== "Failed to fetch" && !(error instanceof TypeError)) throw error;
      throw new Error(FRIENDLY_SOMMELIER_ERROR);
    }
  }
  throw new Error(FRIENDLY_SOMMELIER_ERROR);
}
