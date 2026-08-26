import { NextRequest, NextResponse } from "next/server";
import { MICROSOFT_AUTH_COOKIE } from "@/lib/microsoft-auth";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(MICROSOFT_AUTH_COOKIE);
  return response;
}
