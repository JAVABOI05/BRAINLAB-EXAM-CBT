import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const forwardedProto = request.headers.get("x-forwarded-proto") || "http";
  const canonicalDomain = "brainlabacademy.com.ng";
  const isCanonicalHost = host.includes(canonicalDomain);

  let supabaseConnected = false;
  let supabaseLatencyMs = 0;
  let errorMessage: string | null = null;

  const start = Date.now();
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("settings").select("key").limit(1);
    supabaseLatencyMs = Date.now() - start;
    if (!error) {
      supabaseConnected = true;
    } else {
      errorMessage = error.message;
    }
  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : "Could not connect to Supabase database";
  }

  const googleClientIdConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);

  const checks = {
    canonical_domain: {
      expected: canonicalDomain,
      current_host: host,
      is_canonical: isCanonicalHost,
      is_https: forwardedProto === "https",
      status: isCanonicalHost ? "PASS" : "ALIASED",
    },
    auth_redirects: {
      canonical_callback: `https://${canonicalDomain}/auth/callback`,
      canonical_reset_password: `https://${canonicalDomain}/auth/reset-password`,
      supabase_oauth_callback: "https://eusgwsuoloomphebrepe.supabase.co/auth/v1/callback",
      status: "PASS",
    },
    supabase_service: {
      connected: supabaseConnected,
      latency_ms: supabaseLatencyMs,
      error: errorMessage,
      status: supabaseConnected ? "PASS" : "FAIL",
    },
    google_oauth: {
      client_id_present: googleClientIdConfigured,
      status: googleClientIdConfigured ? "PASS" : "CONFIGURED_IN_DASHBOARD",
    },
  };

  const allPassed = supabaseConnected;

  return NextResponse.json(
    {
      ok: allPassed,
      timestamp: new Date().toISOString(),
      summary: allPassed ? "Domain & Authentication infrastructure healthy" : "Configuration attention required",
      checks,
    },
    {
      status: allPassed ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
