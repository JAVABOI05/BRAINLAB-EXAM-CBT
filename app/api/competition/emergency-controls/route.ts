import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { verifyAdminPin } from "@/app/lib/adminPinServer";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data: allControls, error } = await supabase
      .from("competition_emergency_controls")
      .select("*")
      .order("scope", { ascending: true });

    if (error) throw error;
    const controls = allControls?.find((item) => item.scope === "global" && item.target_id === "all") || {
      scope: "global", target_id: "all", is_paused: false, freeze_leaderboards: false,
      maintenance_mode: false, announcement: "",
    };

    return NextResponse.json({
      controls,
      scopedControls: (allControls || []).filter((item) => item.scope !== "global"),
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
    if (adminRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: only Super Admin may operate Arena emergency controls." }, { status: 403 });
    }

    const body = await req.json();
    const {
      scope = "global", target_id = "all",
      is_paused, freeze_leaderboards, maintenance_mode, announcement, pin,
    } = body;

    if (!["global", "competition", "match", "challenge", "registration"].includes(scope)) {
      return NextResponse.json({ error: "Invalid emergency-control scope." }, { status: 400 });
    }
    if (scope === "global" && target_id !== "all") {
      return NextResponse.json({ error: "Global emergency controls must target 'all'." }, { status: 400 });
    }
    if (scope !== "global" && (!target_id || target_id === "all")) {
      return NextResponse.json({ error: "A specific target ID is required for scoped emergency controls." }, { status: 400 });
    }

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
        scope,
        target_id,
        is_paused: Boolean(is_paused),
        freeze_leaderboards: Boolean(freeze_leaderboards),
        maintenance_mode: Boolean(maintenance_mode),
        announcement: typeof announcement === "string" ? announcement.trim() : "",
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "scope,target_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, controls: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating emergency controls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
