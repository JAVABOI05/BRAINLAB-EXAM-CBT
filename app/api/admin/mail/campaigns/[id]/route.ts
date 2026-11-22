import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.view");
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data: campaign, error } = await supabase
      .from("mail_campaigns")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Also fetch sample recipients or log entries
    const { data: recipients } = await supabase
      .from("mail_campaign_recipients")
      .select("*")
      .eq("campaign_id", params.id)
      .limit(50);

    return NextResponse.json({ success: true, campaign, sampleRecipients: recipients || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.campaign.create");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    // Check existing campaign status
    const { data: existing, error: fetchErr } = await supabase
      .from("mail_campaigns")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Cannot modify campaigns that are approved, queued, or sent
    if (["approved", "queued", "sending", "sent"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot modify campaign in '${existing.status}' status. Approved campaigns are immutable.` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title) updatePayload.title = body.title;
    if (body.subject) updatePayload.subject = body.subject;
    if (body.preview_text !== undefined) updatePayload.preview_text = body.preview_text;
    if (body.body_html) updatePayload.body_html = body.body_html;
    if (body.body_text !== undefined) updatePayload.body_text = body.body_text;
    if (body.template_id !== undefined) updatePayload.template_id = body.template_id;
    if (body.from_sender) updatePayload.from_sender = body.from_sender;
    if (body.reply_to) updatePayload.reply_to = body.reply_to;
    if (body.category) updatePayload.category = body.category;
    if (body.target_audience) updatePayload.target_audience = body.target_audience;

    if (body.submit_for_approval) {
      updatePayload.status = "pending_approval";
      updatePayload.submitted_at = new Date().toISOString();
      updatePayload.rejection_reason = null;
    }

    const { data: updated, error } = await supabase
      .from("mail_campaigns")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: body.submit_for_approval ? "campaign.submit" : "campaign.edit",
      resource_type: "mail_campaigns",
      resource_id: params.id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("mail_campaigns")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (["queued", "sending", "sent"].includes(existing.status)) {
      return NextResponse.json({ error: "Cannot delete a campaign that has already been dispatched." }, { status: 400 });
    }

    await supabase.from("mail_campaigns").delete().eq("id", params.id);

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "campaign.delete",
      resource_type: "mail_campaigns",
      resource_id: params.id,
    });

    return NextResponse.json({ success: true, message: "Campaign deleted." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
