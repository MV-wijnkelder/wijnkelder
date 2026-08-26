import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
const storage = new NeonWineStorage();
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try { return found(await storage.get(await id(context))); } catch (error) { return failure(error); }
}

export async function PUT(request: Request, context: Context) {
  try { return found(await storage.update(await id(context), await request.json() as Wine & { bottleCount?: number })); } catch (error) { return failure(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const body = await request.json() as { change?: number; bottleCountDelta?: number };
    const change = body.change ?? body.bottleCountDelta ?? 1;
    if (!Number.isInteger(change)) return NextResponse.json({ error: "Ongeldige wijziging." }, { status: 400 });
    return found(await storage.changeBottleCount(await id(context), change));
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    return await storage.delete(await id(context)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Wijn niet gevonden." }, { status: 404 });
  } catch (error) { return failure(error); }
}

async function id(context: Context): Promise<number> {
  const value = Number((await context.params).id);
  if (!Number.isSafeInteger(value) || value < 1) throw new InvalidIdError();
  return value;
}
function found(value: unknown | null) { return value ? NextResponse.json(value) : NextResponse.json({ error: "Wijn niet gevonden." }, { status: 404 }); }
class InvalidIdError extends Error {}
function failure(error: unknown) {
  if (error instanceof InvalidIdError) return NextResponse.json({ error: "Ongeldig wijn-id." }, { status: 400 });
  console.error("Neon wine storage operation failed", error);
  return NextResponse.json({ error: "De databasebewerking is mislukt." }, { status: 500 });
}
