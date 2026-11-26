import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return fallback;
}

/**
 * Public, non-sensitive CBT access policy. Never cache this response: an admin
 * change must affect the next candidate launch rather than waiting for a stale
 * browser/session cache to expire.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("exam_config")
      .select("config_key, config_value")
      .in("config_key", ["access_code_required", "premium_mock_only"]);

    if (error) {
      console.error("[exam/access-policy] Could not load access policy:", error.message);
      return NextResponse.json(
        { ok: false, error: "access_policy_unavailable", message: "Exam access settings are temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const values = new Map((data || []).map((row) => [row.config_key, row.config_value]));
    return NextResponse.json(
      {
        ok: true,
        access_code_required: parseBoolean(values.get("access_code_required"), true),
        premium_mock_only: parseBoolean(values.get("premium_mock_only"), false),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[exam/access-policy] Unexpected policy error:", error);
    return NextResponse.json(
      { ok: false, error: "access_policy_unavailable", message: "Exam access settings are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
