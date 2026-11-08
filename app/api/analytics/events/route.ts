import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
  resolveAdminRole,
} from "@/app/lib/supabaseServer";
import { isGovernanceAdminRole } from "@/app/lib/adminRoles";
import { checkRateLimit, getClientIp } from "@/app/lib/abuseProtection";
import { sanitizePayload, type AnalyticsEventName } from "@/app/lib/analytics";

const VALID_EVENTS: AnalyticsEventName[] = [
  "programme_viewed",
  "programme_selected",
  "channel_join_clicked",
  "countdown_viewed",
  "free_practice_started",
  "demo_completed",
  "signup_started",
  "signup_completed",
  "enrolment_started",
  "payment_completed",
  "school_enquiry_submitted",
  "tutor_application_submitted",
];

/**
 * Creates an ephemeral, one-way daily session hash to prevent persistent user profiling.
 */
function createDailySessionHash(ip: string): string {
  const dayString = new Date().toISOString().split("T")[0];
  return crypto
    .createHash("sha256")
    .update(`${ip}:${dayString}:brainlab-analytics-salt`)
    .digest("hex")
    .slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting: 30 events per minute per IP
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`analytics-ingest:${ip}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const { event, payload } = body;

    // 2. Event Name Whitelist Validation
    if (!event || !VALID_EVENTS.includes(event as AnalyticsEventName)) {
      return NextResponse.json({ ok: false, error: "Unrecognized event type" }, { status: 400 });
    }

    // 3. Payload Sanitization: Strip PII
    const safePayload = sanitizePayload(
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    );
    const sessionHash = createDailySessionHash(ip);

    // 4. Persistence into Supabase
    const publicClient = getSupabasePublicServerClient();
    const { error: insertError } = await publicClient
      .from("platform_analytics_events")
      .insert([
        {
          event_name: event,
          event_payload: safePayload,
          session_hash: sessionHash,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      // Fail safely without logging personal details
      console.warn(`[ANALYTICS INGEST] Persistence notice: ${insertError.message}`);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    if (!isGovernanceAdminRole(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden: Analytics privilege required" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient(token);
    const { data, error } = await supabase
      .from("platform_analytics_events")
      .select("event_name, event_payload, session_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Calculate Funnel Aggregation
    const counts: Record<string, number> = {};
    for (const name of VALID_EVENTS) {
      counts[name] = 0;
    }
    for (const row of data || []) {
      if (counts[row.event_name] !== undefined) {
        counts[row.event_name]++;
      }
    }

    return NextResponse.json({
      ok: true,
      counts,
      recentEvents: data || [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
