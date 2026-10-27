import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { CompetitionActor, getCompetitionActor } from "@/app/lib/competitionRbac";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only Super Admin and Read-only Auditor can access full audit logs
    if (actor.role !== "super_admin" && actor.role !== "platform_admin") {
      return NextResponse.json(
        { error: "Access to competition audit logs is restricted to platform governance roles." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("competition_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);
    if (resourceType) query = query.eq("resource_type", resourceType);

    const { data: logs, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: logs || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
