import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import {
  CompetitionActor,
  getCompetitionActor,
  hasPermissionInScope,
  requiresPublicationApproval,
  canApprovePublication,
  logCompetitionAuditEvent,
} from "@/app/lib/competitionRbac";

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
    const actor = await getCompetitionActor(req);
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

      const { error: publishError } = await supabase
        .from("competitions")
        .update({
          status: "published",
          approved_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (publishError) throw publishError;

      const { data: publishedCompetition, error: verifyError } = await supabase
        .from("competitions")
        .select("id, status, visibility")
        .eq("id", id)
        .single();
      if (verifyError) throw verifyError;
      if (!publishedCompetition || publishedCompetition.status !== "published") {
        throw new Error("Competition publication could not be verified. It has not been confirmed as published.");
      }
    } else if (action === "cancel") {
      const perm = hasPermissionInScope(actor, "competition.cancel", {
        scopeType: "competition",
        scopeId: id,
      });
      if (!perm.allowed) return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });

      const { error: cancelError } = await supabase
        .from("competitions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (cancelError) throw cancelError;
    } else if (action === "pause") {
      const { error: pauseError } = await supabase
        .from("competitions")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (pauseError) throw pauseError;
    } else if (action === "conclude") {
      const { error: concludeError } = await supabase
        .from("competitions")
        .update({ status: "concluded", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (concludeError) throw concludeError;
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

    if (action === "publish") {
      const { data: publishedCompetition, error: verifyError } = await supabase
        .from("competitions")
        .select("status, visibility")
        .eq("id", id)
        .single();
      if (verifyError) throw verifyError;
      return NextResponse.json({
        success: true,
        action,
        status: publishedCompetition.status,
        visibility: publishedCompetition.visibility,
        discoverable: publishedCompetition.status === "published" && publishedCompetition.visibility === "public",
        message: publishedCompetition.visibility === "public"
          ? "Competition published and available in the public Arena."
          : `Competition published, but it is not listed publicly because visibility is set to ${publishedCompetition.visibility}.`,
      });
    }
    return NextResponse.json({ success: true, action });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing competition action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const actor = await getCompetitionActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (actor.role !== "super_admin") {
      return NextResponse.json({ error: "Only Super Admin can permanently delete a competition." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase
      .from("competitions")
      .select("id, title, status, visibility")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return NextResponse.json({ error: "Competition not found." }, { status: 404 });

    if (body.confirmation !== existing.title) {
      return NextResponse.json({
        error: "Confirmation did not match the competition title. No data was deleted.",
      }, { status: 400 });
    }

    const { data: deleted, error: deleteError } = await supabase.rpc(
      "delete_competition_permanently_atomic",
      { p_competition_id: id }
    );
    if (deleteError) throw deleteError;

    await logCompetitionAuditEvent({
      action: "competition_permanently_deleted",
      resourceType: "competitions",
      resourceId: id,
      actorId: actor.id,
      actorEmail: actor.email,
      details: {
        title: existing.title,
        previousStatus: existing.status,
        previousVisibility: existing.visibility,
        deletionResult: deleted,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: true,
      title: existing.title,
      message: "Competition and its Arena match records were permanently deleted.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error permanently deleting competition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
