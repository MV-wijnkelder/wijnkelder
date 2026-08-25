import type { Wine } from "@/domain/wine";

/**
 * Provider-independent persistence contract for the wine cellar.
 *
 * UI code depends on this abstraction rather than on a particular storage
 * technology, so providers can be replaced without changing the interface.
 */
export interface StorageService {
  addWine(wine: Wine): Promise<boolean>;
}
