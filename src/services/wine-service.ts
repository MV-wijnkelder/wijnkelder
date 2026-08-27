import type { Wine } from "@/domain/wine";

export interface StoredWine extends Wine {
  id: number;
  bottleCount: number;
  createdAt: string;
  updatedAt: string;
}

type SaveResult = { wine: StoredWine; duplicate: boolean };

export const WineService = {
  list(search = "") {
    const query = search ? `?q=${encodeURIComponent(search)}` : "";
    // The cellar is mutable. Reusing a browser-cached GET here can resurrect a
    // wine in the UI after its DELETE has already succeeded in the database.
    return request<StoredWine[]>(`/api/wines${query}`, { cache: "no-store" });
  },
  get(id: number) { return request<StoredWine>(`/api/wines/${id}`, { cache: "no-store" }); },
  add(wine: Wine) {
    return request<SaveResult>("/api/wines", { method: "POST", body: JSON.stringify(wine) });
  },
  update(wine: StoredWine) {
    return request<StoredWine>(`/api/wines/${wine.id}`, { method: "PUT", body: JSON.stringify(wine) });
  },
  changeBottleCount(id: number, change: number) {
    return request<StoredWine>(`/api/wines/${id}`, { method: "PATCH", body: JSON.stringify({ change }) });
  },
  async delete(id: number) {
    const response = await fetch(`/api/wines/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await errorMessage(response));
  },
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T>;
}

async function errorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof data?.error === "string" ? data.error : "The operation failed. Please try again.";
}
