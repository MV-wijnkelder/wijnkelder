import type { WineRecognitionResult } from "@/lib/wine-recognition";
import type { Wine, WineEnrichment } from "@/domain/wine";
import type { AIProvider, RecognitionImage } from "./ai-provider";

/** Provider-independent application service for AI capabilities. */
export class AIService {
  constructor(private readonly provider: AIProvider) {}

  recognizeWine(frontImage: RecognitionImage, backImage?: RecognitionImage): Promise<WineRecognitionResult> {
    return this.provider.recognizeWine(frontImage, backImage);
  }

  generateWineProfile(wine: Wine): Promise<WineEnrichment> {
    return this.provider.generateWineProfile(wine);
  }
}
