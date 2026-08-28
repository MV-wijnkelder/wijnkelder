export const FRIENDLY_SOMMELIER_ERROR = "I couldn't reach your sommelier just now. Your conversation is safe—please try again.";

type SommelierResponse = { reply?: string; error?: string };
const REQUEST_TIMEOUT_MS = 60_000;

export async function requestSommelier(createBody: () => FormData, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new DOMException("The conversation changed.", "AbortError");
    let response: Response;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetcher("/api/sommelier", { method: "POST", body: createBody(), signal: controller.signal });
    } catch {
      if (signal?.aborted) throw new DOMException("The conversation changed.", "AbortError");
      if (attempt === 1) throw new Error(FRIENDLY_SOMMELIER_ERROR);
      continue;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
    const data = await response.json().catch(() => ({})) as SommelierResponse;
    if (response.ok && data.reply) return data.reply;
    if (!isTransient(response.status) || attempt === 1) throw new Error(data.error || FRIENDLY_SOMMELIER_ERROR);
  }
  throw new Error(FRIENDLY_SOMMELIER_ERROR);
}

function isTransient(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
