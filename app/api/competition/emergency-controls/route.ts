import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { verifyAdminPin } from "@/app/lib/adminPinServer";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data: controls, error } = await supabase
      .from("competition_emergency_controls")
      .select("*")
      .eq("scope", "global")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      controls: controls || {
        scope: "global",
        is_paused: false,
        freeze_leaderboards: false,
        maintenance_mode: false,
        announcement: "",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching emergency controls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id);
    if (!adminRole || (adminRole !== "super_admin" && adminRole !== "platform_admin" && adminRole !== "competition_admin")) {
      return NextResponse.json({ error: "Forbidden: Super Admin, Platform Admin, or Competition Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { is_paused, freeze_leaderboards, maintenance_mode, announcement, pin } = body;

    // Verify Admin Security PIN
    if (!pin) {
      return NextResponse.json({ error: "Admin Security PIN is required for emergency controls modification." }, { status: 403 });
    }

    const pinVerified = await verifyAdminPin(pin);
    if (!pinVerified) {
      return NextResponse.json({ error: "Invalid Admin Security PIN." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    const { data: updated, error } = await supabase
      .from("competition_emergency_controls")
      .upsert({
        scope: "global",
        target_id: "all",
        is_paused: Boolean(is_paused),
        freeze_leaderboards: Boolean(freeze_leaderboards),
        maintenance_mode: Boolean(maintenance_mode),
        announcement: announcement?.trim() || "",
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "scope" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, controls: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating emergency controls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
