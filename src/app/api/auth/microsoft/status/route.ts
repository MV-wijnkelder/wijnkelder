import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, type MicrosoftSession, unseal } from "@/server/auth/microsoft-auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = unseal<MicrosoftSession>(cookieStore.get(AUTH_COOKIE)?.value);
  if (!session?.account || !session.refreshToken) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, account: session.account });
}
