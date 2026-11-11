import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import {
  getPlatformConfig,
  setPlatformConfig,
} from "@/app/lib/platformConfig";
import {
  DEFAULT_SEASONAL_FOCUS_CONFIG,
  SeasonalExamFocusConfig,
} from "@/app/lib/examFocus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAdminRole(user.id, undefined, user.email ?? undefined);
    if (!role) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    const config = await getPlatformConfig<SeasonalExamFocusConfig>(
      "seasonal_exam_focus",
      DEFAULT_SEASONAL_FOCUS_CONFIG
    );

    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch exam focus" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAdminRole(user.id, undefined, user.email ?? undefined);
    if (role !== "super_admin" && role !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin privileges required to update examination focus" }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const currentConfig = await getPlatformConfig<SeasonalExamFocusConfig>(
      "seasonal_exam_focus",
      DEFAULT_SEASONAL_FOCUS_CONFIG
    );

    const updatedConfig: SeasonalExamFocusConfig = {
      active_mode: body.active_mode === "manual_override" ? "manual_override" : "automatic_schedule",
      manual_priority_order: Array.isArray(body.manual_priority_order)
        ? body.manual_priority_order
        : currentConfig.manual_priority_order,
      scheduled_presets: Array.isArray(body.scheduled_presets)
        ? body.scheduled_presets
        : currentConfig.scheduled_presets,
      last_updated_at: new Date().toISOString(),
      last_updated_by: user.email || user.id,
    };

    await setPlatformConfig(
      "seasonal_exam_focus",
      updatedConfig,
      { id: user.id, email: user.email || "" },
      body.change_reason || "Updated seasonal examination focus and priority hierarchy"
    );

    return NextResponse.json({ ok: true, config: updatedConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update exam focus" }, { status: 500 });
  }
}
