import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
const storage = new NeonWineStorage();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await storage.list(url.searchParams.get("q") ?? url.searchParams.get("search") ?? ""));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const wine = await request.json() as Wine & { bottleCount?: number };
    const result = await storage.add(wine);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return failure(error); }
}

// Kept for clients that use PATCH /api/wines to add a bottle to a matching wine.
export async function PATCH(request: Request) {
  try {
    const wine = await request.json() as Wine;
    const result = await storage.add({ ...wine, bottleCount: 1 });
    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  console.error("Neon wine storage operation failed", error);
  const configuration = error instanceof Error && error.message.includes("DATABASE_URL");
  return NextResponse.json({ error: configuration ? "Database configuration is missing." : "The database operation failed." }, { status: configuration ? 503 : 500 });
}
