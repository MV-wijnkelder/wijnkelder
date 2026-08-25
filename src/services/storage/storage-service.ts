import type { Wine } from "@/domain/wine";

/**
 * In-memory label sources associated with a wine.
 *
 * Storage implementations may use these attachments in the future without
 * adding image data to the canonical Wine model.
 */
export type WineLabelImages = {
  front: Blob;
  back?: Blob;
};

export type AddWineResult =
  | { status: "WineAdded"; bottleQuantity: 1 }
  | { status: "WineAlreadyExists"; bottleQuantity: number };

export type IncreaseWineResult = { status: "BottleQuantityIncreased"; bottleQuantity: number };

/**
 * Provider-independent persistence contract for the wine cellar.
 *
 * UI code depends on this abstraction rather than on a particular storage
 * technology, so providers can be replaced without changing the interface.
 */
export interface StorageService {
  addWine(wine: Wine, labelImages?: WineLabelImages): Promise<AddWineResult>;
  increaseBottleCount(wine: Wine): Promise<IncreaseWineResult>;
}
