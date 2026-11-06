import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

const APPROVER_ROLES = new Set(["super_admin", "competition_admin"]);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const role = await resolveAdminRole(user.id);
    const isApprover = APPROVER_ROLES.has(role || "");
    const supabase = getSupabaseServerClient();

    if (isApprover) {
      const { data, error } = await supabase.from("competition_team_requests").select("*").order("submitted_at", { ascending: false }).limit(100);
      if (error) throw error;
      const ids = (data || []).map((item) => item.id);
      const { data: members, error: memberError } = ids.length
        ? await supabase.from("competition_team_request_members").select("*").in("request_id", ids)
        : { data: [], error: null };
      if (memberError) throw memberError;
      return NextResponse.json({ requests: data || [], members: members || [], can_approve: true });
    }

    const { data: own, error: ownError } = await supabase
      .from("competition_team_requests")
      .select("*")
      .or(`requested_by.eq.${user.id},founding_member_ids.cs.{${user.id}}`)
      .order("submitted_at", { ascending: false });
    if (ownError) throw ownError;
    const ids = (own || []).map((item) => item.id);
    const { data: members, error: memberError } = ids.length
      ? await supabase.from("competition_team_request_members").select("*").in("request_id", ids).eq("user_id", user.id)
      : { data: [], error: null };
    if (memberError) throw memberError;
    return NextResponse.json({ requests: own || [], members: members || [], can_approve: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load team requests." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await req.json();
    const action = body.action;
    const requestId = typeof body.request_id === "string" ? body.request_id : "";
    if (!requestId) return NextResponse.json({ error: "A team request ID is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data: requestRecord, error: requestError } = await supabase
      .from("competition_team_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!requestRecord) return NextResponse.json({ error: "Team request not found." }, { status: 404 });

    if (action === "respond") {
      if (!["accepted", "declined"].includes(body.decision)) {
        return NextResponse.json({ error: "Invalid founding-member response." }, { status: 400 });
      }
      if (requestRecord.status !== "pending" && requestRecord.status !== "needs_changes") {
        return NextResponse.json({ error: "This team request is no longer accepting founder responses." }, { status: 409 });
      }
      const { data: updated, error } = await supabase
        .from("competition_team_request_members")
        .update({ status: body.decision, responded_at: new Date().toISOString() })
        .eq("request_id", requestId)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!updated) return NextResponse.json({ error: "You are not listed as a founding member of this request." }, { status: 403 });
      await supabase.from("notifications").insert({
        user_id: requestRecord.requested_by,
        title: "Founding member response",
        message: `A proposed founding member has ${body.decision} the invitation for ${requestRecord.proposed_name}.`,
        type: "competition_team_founder_response",
        metadata: { team_request_id: requestId, response: body.decision },
      });
      return NextResponse.json({ ok: true, member: updated });
    }

    if (action === "review") {
      const role = await resolveAdminRole(user.id);
      if (!APPROVER_ROLES.has(role || "")) {
        return NextResponse.json({ error: "Only Super Admin or Competition Admin may approve permanent teams." }, { status: 403 });
      }
      if (!["approved", "rejected", "needs_changes"].includes(body.decision)) {
        return NextResponse.json({ error: "Invalid team request decision." }, { status: 400 });
      }
      if (requestRecord.status !== "pending" && requestRecord.status !== "needs_changes") {
        return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
      }
      const { data: founders, error: foundersError } = await supabase
        .from("competition_team_request_members")
        .select("user_id, status")
        .eq("request_id", requestId);
      if (foundersError) throw foundersError;

      if (body.decision === "approved") {
        if (!founders?.length || founders.some((member) => member.status !== "accepted")) {
          return NextResponse.json({ error: "Every proposed founding member must accept before approval." }, { status: 409 });
        }
        const founderIds = founders.map((member) => member.user_id);
        const { data: occupied } = await supabase
          .from("competition_team_members")
          .select("user_id")
          .in("user_id", founderIds)
          .eq("is_active", true);
        if (occupied?.length) {
          return NextResponse.json({ error: "A proposed founder has joined another active team since the request was submitted." }, { status: 409 });
        }

        const { data: createdTeamId, error: approvalError } = await supabase.rpc("approve_competition_team_request", {
          p_request_id: requestId,
          p_reviewed_by: user.id,
        });
        if (approvalError) throw approvalError;

        const { data: team, error: teamLoadError } = await supabase
          .from("competition_teams")
          .select("*")
          .eq("id", createdTeamId)
          .single();
        if (teamLoadError) throw teamLoadError;

        await supabase.from("notifications").insert(founderIds.map((userId) => ({
          user_id: userId,
          title: "Permanent team approved",
          message: `${team.name} has been approved. The founding members' democratic captain election is now open.`,
          type: "competition_team_approved",
          metadata: { team_id: team.id, team_request_id: requestId },
        })));
        return NextResponse.json({ ok: true, team, election_open: true });
      }

      const { data: updated, error } = await supabase
        .from("competition_team_requests")
        .update({
          status: body.decision,
          reviewed_by: user.id,
          review_notes: typeof body.review_notes === "string" ? body.review_notes.trim() : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: requestRecord.requested_by,
        title: body.decision === "rejected" ? "Team request declined" : "Team request needs changes",
        message: typeof body.review_notes === "string" ? body.review_notes : "Your team request has been reviewed.",
        type: "competition_team_request_review",
        metadata: { team_request_id: requestId, decision: body.decision },
      });
      return NextResponse.json({ ok: true, request: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process team request." }, { status: 500 });
  }
}
