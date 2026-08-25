import type { WineRecognition } from "@/lib/wine-recognition";

export type RecognitionImage = {
  bytes: ArrayBuffer;
  mediaType: string;
};

/** Contract implemented by every AI vendor adapter. */
export interface AIProvider {
  recognizeWine(image: RecognitionImage): Promise<WineRecognition>;
}
