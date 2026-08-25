import type { WineRecognitionResult } from "@/lib/wine-recognition";
import type { AIProvider, RecognitionImage } from "./ai-provider";

/** Provider-independent application service for AI capabilities. */
export class AIService {
  constructor(private readonly provider: AIProvider) {}

  recognizeWine(image: RecognitionImage): Promise<WineRecognitionResult> {
    return this.provider.recognizeWine(image);
  }
}
