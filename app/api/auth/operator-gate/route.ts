import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "brainlab_private_entry";
const COOKIE_AGE_SECONDS = 60 * 60 * 8;

function originIsSame(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}

function unavailable() {
  return NextResponse.json({ error: "Secure access is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!originIsSame(request)) {
    return NextResponse.json({ error: "Request denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const gatePath = process.env.BRAINLAB_PRIVATE_ENTRY_PATH ?? "";
  const gateToken = process.env.BRAINLAB_PRIVATE_ENTRY_TOKEN ?? "";
  const gatePathIsValid = /^[A-Za-z0-9_-]{32,128}$/.test(gatePath);
  if (!url || !anonKey || !gatePathIsValid || gateToken.length < 32) return unavailable();

  let accessToken = "";
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "accessToken" in body && typeof body.accessToken === "string") {
      accessToken = body.accessToken;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!accessToken || accessToken.length > 8192) {
    return NextResponse.json({ error: "Request denied." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Request denied." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { data: isOperator, error: roleError } = await client.rpc("is_admin");
  if (roleError || isOperator !== true) {
    return NextResponse.json({ error: "Request denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE_NAME, gateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: COOKIE_AGE_SECONDS,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!originIsSame(request)) {
    return NextResponse.json({ error: "Request denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
  return response;
}
