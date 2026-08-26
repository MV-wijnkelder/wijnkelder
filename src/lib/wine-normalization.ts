import type { Wine } from "@/domain/wine";

/** Canonical identity used when deciding whether a scan adds another bottle. */
export function duplicateKey(wine: Pick<Wine, "producer" | "wineName" | "vintage">): string {
  return [wine.producer, wine.wineName, wine.vintage]
    .map((value) => value?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") ?? "")
    .join("\u001f");
}
