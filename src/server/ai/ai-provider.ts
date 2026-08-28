import type { WineRecognitionResult } from "@/lib/wine-recognition";
import type { Wine, WineEnrichment } from "@/domain/wine";

export type RecognitionImage = {
  bytes: ArrayBuffer;
  mediaType: string;
};

/** Contract implemented by every AI vendor adapter. */
export interface AIProvider {
  recognizeWine(frontImage: RecognitionImage, backImage?: RecognitionImage): Promise<WineRecognitionResult>;
  generateWineProfile(wine: Wine): Promise<WineEnrichment>;
}
