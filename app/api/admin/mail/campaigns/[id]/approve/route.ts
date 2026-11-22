import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Enforce permission to approve campaigns
    const hasPerm = await adminHasPermission("mail.campaign.approve");
    const isSuperAdmin = admin.role === "super_admin";
    if (!hasPerm && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to approve email campaigns." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServerClient();

    // 2. Fetch the target campaign
    const { data: campaign, error: fetchErr } = await supabase
      .from("mail_campaigns")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // 3. Status guard: Only campaigns in 'pending_approval' can be approved
    if (campaign.status !== "pending_approval" && campaign.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot approve campaign in '${campaign.status}' state.` },
        { status: 400 }
      );
    }

    // 4. Server-enforced anti-self-approval rule:
    // The creator cannot approve their own campaign unless they are a Super Admin acting under explicit override.
    // If they created it, require a separate administrator approval.
    if (campaign.created_by_admin_id === admin.id) {
      const body = await request.json().catch(() => ({}));
      if (!isSuperAdmin || !body.super_admin_self_override) {
        return NextResponse.json(
          {
            error: "Governance policy violation: Campaign creator cannot self-approve campaigns. A separate administrator must review and approve this broadcast.",
            self_approval_blocked: true,
          },
          { status: 403 }
        );
      }
    }

    // 5. Build immutable approval snapshot
    const nowIso = new Date().toISOString();
    const approvalSnapshot = {
      approved_by_id: admin.id,
      approved_by_name: admin.email,
      approved_at: nowIso,
      title: campaign.title,
      subject: campaign.subject,
      preview_text: campaign.preview_text,
      body_html: campaign.body_html,
      target_audience: campaign.target_audience,
      category: campaign.category,
      recipient_count: campaign.recipient_count,
    };

    // 6. Update campaign state to 'approved'
    const { data: updated, error: updateErr } = await supabase
      .from("mail_campaigns")
      .update({
        status: "approved",
        approved_by_admin_id: admin.id,
        approved_by_admin_name: admin.email,
        approved_at: nowIso,
        approval_snapshot: approvalSnapshot,
        rejection_reason: null,
        updated_at: nowIso,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 7. Log approval in mail_audit_logs
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "campaign.approve",
      resource_type: "mail_campaigns",
      resource_id: params.id,
      details: {
        campaignTitle: campaign.title,
        recipientCount: campaign.recipient_count,
        snapshot: approvalSnapshot,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.title}" has been approved for dispatch.`,
      campaign: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
