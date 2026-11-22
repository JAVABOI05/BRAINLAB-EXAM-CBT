import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set(["access_code_required", "premium_mock_only"]);

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = await getUserFromRequest(request);

    if (!user || !token) {
      return NextResponse.json({ ok: false, error: "unauthorized", message: "Your administrator session has expired. Please sign in again." }, { status: 401 });
    }

    const role = await resolveAdminRole(user.id, token, user.email || undefined);
    if (!role) {
      return NextResponse.json({ ok: false, error: "forbidden", message: "Administrator access is required." }, { status: 403 });
    }

    // Evaluate the same database permission used by the exam_config RLS policies.
    const permissionClient = getSupabaseServerClient(token);
    const { data: allowed, error: permissionError } = await permissionClient.rpc("admin_has_permission", {
      permission_key: "cbt.config.manage",
    });
    if (permissionError || allowed !== true) {
      return NextResponse.json({ ok: false, error: "forbidden", message: "Your administrator role cannot manage exam access settings." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key : "";
    const value = body?.value;

    if (!ALLOWED_KEYS.has(key) || typeof value !== "boolean") {
      return NextResponse.json({ ok: false, error: "invalid_setting", message: "Only supported boolean exam access settings can be changed." }, { status: 400 });
    }

    // Permission is checked above using the caller's JWT. The service client
    // performs the narrowly allow-listed write so RLS cannot silently return
    // zero updated rows to an otherwise-authorized administrator.
    const serviceClient = getSupabaseServerClient();
    const { error: saveError } = await serviceClient
      .from("exam_config")
      .upsert(
        { config_key: key, config_value: value, updated_at: new Date().toISOString() },
        { onConflict: "config_key" }
      );

    if (saveError) {
      console.error("[admin/exam-access-policy] Save failed:", saveError.message);
      return NextResponse.json({ ok: false, error: "save_failed", message: "Could not save this exam access setting. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, key, value });
  } catch (error) {
    console.error("[admin/exam-access-policy] Unexpected save error:", error);
    return NextResponse.json({ ok: false, error: "save_failed", message: "Could not save this exam access setting. Please try again." }, { status: 500 });
  }
}
