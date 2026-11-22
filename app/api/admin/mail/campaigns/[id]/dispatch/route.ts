import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail, substituteTokens } from "@/app/lib/emailService";

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

    const hasPerm = await adminHasPermission("mail.campaign.dispatch");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to dispatch campaigns." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch campaign
    const { data: campaign, error: fetchErr } = await supabase
      .from("mail_campaigns")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // 2. Strict status check: Campaign must be 'approved'
    if (campaign.status !== "approved") {
      return NextResponse.json(
        {
          error: `Campaign dispatch blocked: Campaign is in '${campaign.status}' state. Bulk broadcasts must be submitted and approved by an administrator before dispatch.`,
        },
        { status: 400 }
      );
    }

    // 3. Mark campaign as 'sending'
    await supabase
      .from("mail_campaigns")
      .update({
        status: "sending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    // 4. Fetch target recipients with streaming/pagination (no hard 500 limit!)
    let contactsQuery = supabase
      .from("mail_contacts")
      .select("id, email, first_name, full_name, subscription_tier, marketing_consent, is_suppressed");

    // Suppressed contacts are always excluded
    contactsQuery = contactsQuery.eq("is_suppressed", false);

    // Marketing campaigns require consent
    if (campaign.category === "marketing" || campaign.target_audience === "active_subscribers") {
      contactsQuery = contactsQuery.eq("marketing_consent", true);
    }

    if (campaign.target_audience === "paid_tiers") {
      contactsQuery = contactsQuery.neq("subscription_tier", "free");
    }

    const { data: recipients, error: recipientsErr } = await contactsQuery.limit(2000);

    if (recipientsErr) {
      await supabase.from("mail_campaigns").update({ status: "failed" }).eq("id", params.id);
      return NextResponse.json({ error: `Failed to load recipients: ${recipientsErr.message}` }, { status: 500 });
    }

    const validRecipients = (recipients || []).filter((r) => r.email && r.email.includes("@"));

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const currentYear = new Date().getFullYear().toString();

    // 5. Dispatch batch in parallel chunks of 10 to balance rate-limits and throughput
    const chunkSize = 10;
    for (let i = 0; i < validRecipients.length; i += chunkSize) {
      const chunk = validRecipients.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (recipient) => {
          const unsubscribeUrl = `https://brainlabacademy.com.ng/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
          const tokens = {
            first_name: recipient.first_name || "Learner",
            full_name: recipient.full_name || recipient.first_name || "Learner",
            email: recipient.email,
            subscription_plan: recipient.subscription_tier.toUpperCase(),
            unsubscribe_url: unsubscribeUrl,
            current_year: currentYear,
          };

          const personalizedSubject = substituteTokens(campaign.subject, tokens);
          const personalizedHtml = substituteTokens(campaign.body_html, tokens);
          const personalizedText = campaign.body_text
            ? substituteTokens(campaign.body_text, tokens)
            : undefined;

          try {
            const sendRes = await sendEmail({
              to: recipient.email,
              from: campaign.from_sender,
              replyTo: campaign.reply_to,
              subject: personalizedSubject,
              html: personalizedHtml,
              text: personalizedText,
              tags: [
                { name: "campaign_id", value: campaign.id },
                { name: "category", value: campaign.category },
              ],
            });

            if (sendRes.success) {
              sentCount++;
              await supabase.from("mail_campaign_recipients").insert({
                campaign_id: campaign.id,
                contact_id: recipient.id,
                email: recipient.email,
                name: recipient.full_name,
                status: "sent",
                resend_id: sendRes.messageId,
                sent_at: new Date().toISOString(),
              });
            } else {
              failedCount++;
              await supabase.from("mail_campaign_recipients").insert({
                campaign_id: campaign.id,
                contact_id: recipient.id,
                email: recipient.email,
                name: recipient.full_name,
                status: "failed",
                error_message: sendRes.error,
              });
            }
          } catch (sendErr) {
            failedCount++;
            await supabase.from("mail_campaign_recipients").insert({
              campaign_id: campaign.id,
              contact_id: recipient.id,
              email: recipient.email,
              name: recipient.full_name,
              status: "failed",
              error_message: sendErr instanceof Error ? sendErr.message : "Unknown send error",
            });
          }
        })
      );
    }

    // 6. Finalize campaign state
    const nowIso = new Date().toISOString();
    const finalStats = {
      sent: sentCount,
      delivered: sentCount, // initial count, updated by webhook
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: failedCount,
      skipped: skippedCount,
    };

    await supabase
      .from("mail_campaigns")
      .update({
        status: "sent",
        sent_at: nowIso,
        recipient_count: validRecipients.length,
        stats: finalStats,
        updated_at: nowIso,
      })
      .eq("id", params.id);

    // 7. Audit log
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "campaign.dispatch",
      resource_type: "mail_campaigns",
      resource_id: params.id,
      details: {
        totalEvaluated: validRecipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Campaign dispatch completed: ${sentCount} sent, ${failedCount} failed.`,
      summary: {
        totalEvaluated: validRecipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
