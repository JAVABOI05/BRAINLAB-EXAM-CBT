import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  hasPermissionInScope,
  requiresPublicationApproval,
  canApprovePublication,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

async function getActor(req: NextRequest): Promise<CompetitionActor | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || "",
    role: (profile?.role || "student") as CompetitionActor["role"],
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: comp, error } = await supabase
      .from("competitions")
      .select("*, competition_question_banks(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

    return NextResponse.json({ competition: comp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching competition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data: comp } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!comp) return NextResponse.json({ error: "Competition not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body; // 'publish' | 'schedule' | 'pause' | 'cancel' | 'conclude'

    if (!action) return NextResponse.json({ error: "Action is required" }, { status: 400 });

    if (action === "publish") {
      // Check separation of duties
      const needsApproval = requiresPublicationApproval(comp, actor.role);
      if (needsApproval) {
        const canApprove = canApprovePublication(actor, comp.creator_id);
        if (!canApprove.allowed) {
          // Submit for moderation case instead of direct publication
          await supabase.from("competition_moderation_cases").insert({
            competition_id: id,
            reporter_id: actor.id,
            case_type: "publication_request",
            description: `Host ${actor.email} requested publication of public competition '${comp.title}'. Requires independent administrator approval.`,
            status: "pending",
          });

          await supabase.from("competitions").update({ status: "pending_approval" }).eq("id", id);

          return NextResponse.json({
            status: "pending_approval",
            message: "Submitted for independent administrator publication approval.",
          });
        }
      }

      const perm = hasPermissionInScope(actor, "competition.publish", {
        scopeType: "competition",
        scopeId: id,
      });
      if (!perm.allowed) return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });

      await supabase
        .from("competitions")
        .update({
          status: "published",
          approved_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } else if (action === "cancel") {
      const perm = hasPermissionInScope(actor, "competition.cancel", {
        scopeType: "competition",
        scopeId: id,
      });
      if (!perm.allowed) return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });

      await supabase
        .from("competitions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
    } else if (action === "pause") {
      await supabase
        .from("competitions")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", id);
    } else if (action === "conclude") {
      await supabase
        .from("competitions")
        .update({ status: "concluded", updated_at: new Date().toISOString() })
        .eq("id", id);
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    await logCompetitionAuditEvent({
      action: `competition_${action}`,
      resourceType: "competitions",
      resourceId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { previousStatus: comp.status, newStatus: action === "publish" ? "published" : action },
    });

    return NextResponse.json({ success: true, action });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing competition action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
