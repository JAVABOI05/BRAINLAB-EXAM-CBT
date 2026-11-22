import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require campaign creation permission
    const hasPerm = await adminHasPermission("mail.campaign.create");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json(
        { error: "Insufficient privileges to create broadcast campaigns." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Subject and message body are required for broadcasting." },
        { status: 400 }
      );
    }

    const {
      subject,
      title = subject,
      message,
      audience = "active_subscribers",
      actionUrl,
      actionLabel = "View on BrainLab",
      submit_for_approval = true,
    } = body;

    const supabase = getSupabaseServerClient();

    // 1. Build standardized HTML with BrainLab 2026 design system
    const buttonHtml = actionUrl
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${actionUrl}" style="background-color:#1356E8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
            ${actionLabel} &rarr;
          </a>
        </div>`
      : "";

    const htmlContent = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:24px;">
        <h2 style="color:#0B1536;margin-top:0;font-size:22px;font-weight:800;">${title}</h2>
        <p style="font-size:15px;line-height:1.6;color:#334155;">Hello <strong>{{first_name}}</strong>,</p>
        <div style="font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">${message}</div>
        ${buttonHtml}
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0;" />
        <p style="font-size:12px;color:#94A3B8;text-align:center;">
          Official announcement from BrainLab Academy. <a href="{{unsubscribe_url}}" style="color:#64748B;">Unsubscribe</a>
        </p>
      </div>
    `;

    // 2. Count estimated audience from mail_contacts (without 500 limit and without missing profiles table)
    let countQuery = supabase.from("mail_contacts").select("id", { count: "exact", head: true }).eq("is_suppressed", false);
    if (audience === "active_subscribers") {
      countQuery = countQuery.eq("marketing_consent", true);
    } else if (audience === "paid_tiers") {
      countQuery = countQuery.neq("subscription_tier", "free");
    }

    const { count: estimatedRecipients } = await countQuery;

    // 3. Governance Policy Enforcement:
    // Create the broadcast as a campaign requiring formal approval before dispatch.
    // This eliminates unapproved, immediate email blasts.
    const initialStatus = submit_for_approval ? "pending_approval" : "draft";

    const { data: campaign, error: campErr } = await supabase
      .from("mail_campaigns")
      .insert({
        title,
        subject,
        body_html: htmlContent,
        body_text: message,
        from_sender: "BrainLab Academy <noreply@mail.brainlabacademy.com.ng>",
        reply_to: "support@brainlabacademy.com.ng",
        category: "marketing",
        target_audience: audience,
        recipient_count: estimatedRecipients || 0,
        status: initialStatus,
        created_by_admin_id: admin.id,
        created_by_admin_name: admin.email,
        submitted_at: submit_for_approval ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: campErr?.message || "Failed to create campaign" }, { status: 500 });
    }

    // 4. Audit Log
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "broadcast.campaign_created",
      resource_type: "mail_campaigns",
      resource_id: campaign.id,
      details: { title, audience, estimatedRecipients, status: initialStatus },
    });

    return NextResponse.json({
      success: true,
      campaign,
      message: submit_for_approval
        ? `Broadcast campaign "${title}" submitted for approval (${estimatedRecipients || 0} estimated recipients). Per BrainLab governance policy, an authorized administrator must approve this campaign before it can be dispatched.`
        : `Broadcast draft saved.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process broadcast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
