import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: adminRole, error: roleError } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || adminRole?.role !== "super_admin") {
      return NextResponse.json({ error: "Only the Super Admin can change the whiteboard watermark policy." }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "A boolean enabled value is required." }, { status: 400 });
    }

    const { error } = await supabase.from("exam_config").upsert({
      config_key: "whiteboard_watermark_enabled",
      config_value: body.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "config_key" });

    if (error) {
      console.error("[admin/whiteboard-watermark] Save failed:", error.message);
      return NextResponse.json({ error: "Could not save the watermark setting." }, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled: body.enabled });
  } catch (error) {
    console.error("[admin/whiteboard-watermark] Unexpected error:", error);
    return NextResponse.json({ error: "Could not update the watermark setting." }, { status: 500 });
  }
}
