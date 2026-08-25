import { NextResponse } from "next/server";
import { AIService } from "@/server/ai/ai-service";
import {
  OpenAIProvider,
  OpenAIProviderError,
  type OpenAIProviderErrorCode,
} from "@/server/ai/providers/openai-provider";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const OPENAI_API_KEY_ENV_NAME = ["OPENAI", "API", "KEY"].join("_");

// Recognition depends on a deployment-time secret and Node.js APIs (Buffer in
// the provider). Keep this route out of static optimization and the Edge
// runtime so Vercel reads the environment of the running function.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PROVIDER_ERRORS: Record<OpenAIProviderErrorCode, { message: string; status: number }> = {
  AUTHENTICATION_FAILED: { message: "De OpenAI API-sleutel is ongeldig of heeft geen toegang.", status: 503 },
  RATE_LIMITED: { message: "De herkenningsdienst is tijdelijk overbelast. Probeer het later opnieuw.", status: 429 },
  UPSTREAM_UNAVAILABLE: { message: "De herkenningsdienst is momenteel niet beschikbaar. Probeer het later opnieuw.", status: 502 },
  INVALID_RESPONSE: { message: "De herkenningsdienst gaf een ongeldig antwoord. Probeer het opnieuw.", status: 502 },
};

export async function POST(request: Request) {
  // Names only: never log environment values or the API key itself.
  console.info("recognize-wine runtime environment keys", Object.keys(process.env).sort());

  // A computed lookup is intentionally used here. Unlike a statically
  // referenced process.env property, it cannot be replaced with a build-time
  // value and is resolved from the Vercel function environment at request time.
  const configuredApiKey = process.env[OPENAI_API_KEY_ENV_NAME];
  const apiKey = configuredApiKey?.trim();
  if (!apiKey) {
    const reason = configuredApiKey === undefined ? "not present" : "empty";
    console.error(`OPENAI_API_KEY is ${reason} in the recognize-wine runtime environment`);
    return NextResponse.json(
      { error: "OPENAI_API_KEY ontbreekt in de serverconfiguratie; wijnherkenning kan niet worden gestart." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Het verzoek bevat geen geldige formuliergegevens." }, { status: 400 });
  }
  const image = formData.get("image");

  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please select a valid image." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "The image must be smaller than 10 MB." }, { status: 413 });
  }

  try {
    const aiService = new AIService(new OpenAIProvider(apiKey));
    const result = await aiService.recognizeWine({
      bytes: await image.arrayBuffer(),
      mediaType: image.type,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Wine recognition failed", error);
    if (error instanceof OpenAIProviderError) {
      const providerError = PROVIDER_ERRORS[error.code];
      return NextResponse.json({ error: providerError.message }, { status: providerError.status });
    }
    return NextResponse.json(
      { error: "Er ging iets mis tijdens de wijnherkenning. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}
