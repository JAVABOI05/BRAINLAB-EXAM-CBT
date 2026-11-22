import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.view");
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'draft', 'pending_approval', 'approved', 'sent', etc.

    const supabase = getSupabaseServerClient();
    let query = supabase.from("mail_campaigns").select("*");

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: campaigns, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaigns: campaigns || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.campaign.create");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges to create campaigns" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.title || !body.subject || !body.body_html) {
      return NextResponse.json({ error: "Title, subject, and HTML body content are required." }, { status: 400 });
    }

    const {
      title,
      subject,
      preview_text,
      body_html,
      body_text,
      template_id,
      from_sender = "BrainLab Academy <noreply@mail.brainlabacademy.com.ng>",
      reply_to = "support@brainlabacademy.com.ng",
      category = "marketing",
      target_audience = "active_subscribers",
      audience_filter = {},
      submit_for_approval = false,
    } = body;

    const supabase = getSupabaseServerClient();

    // 1. Estimate recipient count based on audience
    let countQuery = supabase.from("mail_contacts").select("id", { count: "exact", head: true });
    if (category === "marketing" || target_audience === "active_subscribers") {
      countQuery = countQuery.eq("marketing_consent", true).eq("is_suppressed", false);
    } else if (target_audience === "paid_tiers") {
      countQuery = countQuery.neq("subscription_tier", "free").eq("is_suppressed", false);
    } else {
      countQuery = countQuery.eq("is_suppressed", false);
    }

    const { count: estimatedCount } = await countQuery;

    const initialStatus = submit_for_approval ? "pending_approval" : "draft";

    const insertPayload = {
      title,
      subject,
      preview_text: preview_text || null,
      body_html,
      body_text: body_text || null,
      template_id: template_id || null,
      from_sender,
      reply_to,
      category,
      target_audience,
      audience_filter,
      recipient_count: estimatedCount || 0,
      status: initialStatus,
      created_by_admin_id: admin.id,
      created_by_admin_name: admin.email,
      submitted_at: submit_for_approval ? new Date().toISOString() : null,
    };

    const { data: campaign, error } = await supabase
      .from("mail_campaigns")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to mail_audit_logs
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: submit_for_approval ? "campaign.create_and_submit" : "campaign.create_draft",
      resource_type: "mail_campaigns",
      resource_id: campaign.id,
      details: { title, target_audience, estimatedRecipients: estimatedCount, status: initialStatus },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
