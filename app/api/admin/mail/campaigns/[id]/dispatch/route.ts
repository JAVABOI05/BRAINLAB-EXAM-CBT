import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { enqueueMail } from "@/app/lib/mailEngine";
import { substituteTokens } from "@/app/lib/emailService";
import { generateUnsubscribeToken } from "@/app/lib/notificationPreferences";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await props.params;
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasPermission = await adminHasPermission("mail.campaign.dispatch", admin.role);
    if (!hasPermission && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden: campaign dispatch permission is required." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();
    const { data: campaign, error: campaignError } = await supabase
      .from("mail_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.status !== "approved") {
      return NextResponse.json({
        error: `Dispatch blocked: campaign status is '${campaign.status}'. Only approved campaigns can be queued.`,
      }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Mail outbox is not configured on this environment." }, { status: 503 });
    }

    let queuedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    let evaluatedCount = 0;
    const pageSize = 500;

    for (let offset = 0; ; offset += pageSize) {
      let query = supabase
        .from("mail_contacts")
        .select("id,email,first_name,full_name,subscription_tier,marketing_consent,is_suppressed")
        .eq("is_suppressed", false);

      if (campaign.category === "marketing" || campaign.target_audience === "active_subscribers") {
        query = query.eq("marketing_consent", true);
      }
      if (campaign.target_audience === "paid_tiers") {
        query = query.neq("subscription_tier", "free");
      }

      const { data: contacts, error: contactsError } = await query
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (contactsError) {
        throw new Error(`Unable to load campaign contacts: ${contactsError.message}`);
      }
      if (!contacts?.length) break;

      for (const contact of contacts) {
        evaluatedCount++;
        const email = String(contact.email || "").trim().toLowerCase();
        if (!email.includes("@")) {
          failedCount++;
          continue;
        }

        const { data: insertedRecipient, error: recipientInsertError } = await supabase
          .from("mail_campaign_recipients")
          .upsert({
            campaign_id: campaign.id,
            contact_id: contact.id,
            email,
            name: contact.full_name || contact.first_name || "Learner",
            status: "queued",
          }, {
            onConflict: "campaign_id,email",
            ignoreDuplicates: true,
          })
          .select("id")
          .maybeSingle();

        if (recipientInsertError) {
          failedCount++;
          continue;
        }

        let recipientId = insertedRecipient?.id as string | undefined;
        if (!recipientId) {
          const { data: existingRecipient, error: existingRecipientError } = await supabase
            .from("mail_campaign_recipients")
            .select("id,status")
            .eq("campaign_id", campaign.id)
            .eq("email", email)
            .maybeSingle();
          if (existingRecipientError || !existingRecipient) {
            failedCount++;
            continue;
          }
          // Existing recipient rows are never reset implicitly. A dedicated retry
          // action must explicitly requeue failed/dead-letter messages.
          duplicateCount++;
          continue;
        }

        const unsubscribeToken = generateUnsubscribeToken(email);
        const unsubscribeUrl =
          `https://www.brainlabacademy.com.ng/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(unsubscribeToken)}`;
        const tokens = {
          first_name: contact.first_name || "Learner",
          full_name: contact.full_name || contact.first_name || "Learner",
          email,
          subscription_plan: String(contact.subscription_tier || "free").toUpperCase(),
          unsubscribe_url: unsubscribeUrl,
          current_year: new Date().getFullYear().toString(),
        };

        try {
          const queued = await enqueueMail({
            messageKind: campaign.category === "marketing" ? "marketing" : "service_notification",
            idempotencyKey: `campaign:${campaign.id}:recipient:${recipientId}`,
            metadata: { campaignId: campaign.id, campaignRecipientId: recipientId },
            payload: {
              to: email,
              from: campaign.from_sender,
              replyTo: campaign.reply_to,
              subject: substituteTokens(campaign.subject, tokens),
              html: substituteTokens(campaign.body_html, tokens),
              text: campaign.body_text ? substituteTokens(campaign.body_text, tokens) : undefined,
              tags: [
                { name: "campaign_id", value: campaign.id },
                { name: "category", value: campaign.category },
              ],
            },
          });
          if (queued.duplicate) duplicateCount++;
          else queuedCount++;
        } catch (queueError) {
          failedCount++;
          const message = queueError instanceof Error ? queueError.message : "Queue insertion failed";
          await supabase
            .from("mail_campaign_recipients")
            .update({ status: "failed", error_message: message.slice(0, 2000) })
            .eq("id", recipientId);
        }
      }

      if (contacts.length < pageSize) break;
    }

    const nextStatus = queuedCount > 0 || duplicateCount > 0 ? "queued" : "failed";
    const { error: updateCampaignError } = await supabase
      .from("mail_campaigns")
      .update({
        status: nextStatus,
        recipient_count: evaluatedCount,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          complained: 0,
          failed: failedCount,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    if (updateCampaignError) throw new Error(`Campaign status update failed: ${updateCampaignError.message}`);

    const { error: auditError } = await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "campaign.queue",
      resource_type: "mail_campaigns",
      resource_id: campaign.id,
      details: { evaluated: evaluatedCount, queued: queuedCount, duplicates: duplicateCount, failed: failedCount },
    });
    if (auditError) console.error("[Mail Campaign Audit]", auditError.message);

    return NextResponse.json({
      success: true,
      queued: true,
      message: `Campaign queued: ${queuedCount} new messages, ${duplicateCount} already queued or processed, ${failedCount} failed.`,
      summary: { evaluated: evaluatedCount, queued: queuedCount, duplicates: duplicateCount, failed: failedCount },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Campaign queueing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
