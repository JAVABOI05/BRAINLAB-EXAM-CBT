import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
    }

    // Resend payload contains:
    // type: "email.delivered" | "email.bounced" | "email.complained" | "email.opened" | "email.clicked" | "email.sent"
    // created_at: string
    // data: { id, from, to: string[], subject, created_at, tags }
    const eventType = (payload.type as string) || "unknown";
    const data = (payload.data as Record<string, unknown>) || {};
    const emailId = (data.id as string) || (data.email_id as string) || "unknown";
    const eventId = (payload.id as string) || `${emailId}_${eventType}_${payload.created_at || Date.now()}`;
    const recipients = Array.isArray(data.to) ? (data.to as string[]) : [String(data.to || "")];
    const primaryRecipient = recipients[0]?.toLowerCase() || "";

    const supabase = getSupabaseServerClient();

    // 1. Idempotency Check: Don't process the same event twice
    const { data: existingEvent } = await supabase
      .from("mail_events")
      .select("id")
      .eq("resend_event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, idempotent_skip: true });
    }

    // 2. Identify Campaign ID from tags if present
    let campaignId: string | null = null;
    if (Array.isArray(data.tags)) {
      const campTag = (data.tags as Array<{ name: string; value: string }>).find((t) => t.name === "campaign_id");
      if (campTag) campaignId = campTag.value;
    }

    // 3. Record Event
    await supabase.from("mail_events").insert({
      resend_event_id: eventId,
      resend_email_id: emailId,
      event_type: eventType,
      recipient: primaryRecipient,
      campaign_id: campaignId,
      payload,
    });

    // 4. Update Campaign Recipient and Aggregates
    const nowIso = new Date().toISOString();

    if (emailId && emailId !== "unknown") {
      const recipientUpdates: Record<string, unknown> = {};

      if (eventType === "email.delivered") {
        recipientUpdates.status = "delivered";
        recipientUpdates.delivered_at = nowIso;
      } else if (eventType === "email.opened") {
        recipientUpdates.opened_at = nowIso;
      } else if (eventType === "email.clicked") {
        recipientUpdates.clicked_at = nowIso;
      } else if (eventType === "email.bounced") {
        recipientUpdates.status = "bounced";
        recipientUpdates.error_message = (data.bounce as { message?: string })?.message || "Bounced";
      } else if (eventType === "email.complained") {
        recipientUpdates.status = "complained";
        recipientUpdates.error_message = "Spam complaint received";
      }

      if (Object.keys(recipientUpdates).length > 0) {
        await supabase
          .from("mail_campaign_recipients")
          .update(recipientUpdates)
          .eq("resend_id", emailId);
      }
    }

    // 5. Automatic Suppression Handling:
    // If an email bounced or generated a spam complaint, immediately suppress future sends!
    if ((eventType === "email.bounced" || eventType === "email.complained") && primaryRecipient) {
      const reason = eventType === "email.bounced" ? "Automated suppression: Hard bounce received" : "Automated suppression: Spam complaint received";

      await supabase
        .from("mail_contacts")
        .update({
          is_suppressed: true,
          suppression_reason: reason,
          marketing_consent: false,
          updated_at: nowIso,
        })
        .eq("email", primaryRecipient);

      // Also reflect in notification_preferences
      await supabase
        .from("notification_preferences")
        .update({
          unsubscribed_all: true,
          marketing_announcements: false,
          unsubscribed_at: nowIso,
        })
        .eq("email", primaryRecipient);
    }

    // 6. Update Campaign stats if campaignId is known
    if (campaignId) {
      const { data: camp } = await supabase
        .from("mail_campaigns")
        .select("stats")
        .eq("id", campaignId)
        .single();

      if (camp) {
        const stats = (camp.stats || {}) as Record<string, number>;
        if (eventType === "email.delivered") stats.delivered = (stats.delivered || 0) + 1;
        if (eventType === "email.opened") stats.opened = (stats.opened || 0) + 1;
        if (eventType === "email.clicked") stats.clicked = (stats.clicked || 0) + 1;
        if (eventType === "email.bounced") stats.bounced = (stats.bounced || 0) + 1;
        if (eventType === "email.complained") stats.complained = (stats.complained || 0) + 1;

        await supabase
          .from("mail_campaigns")
          .update({ stats, updated_at: nowIso })
          .eq("id", campaignId);
      }
    }

    return NextResponse.json({ success: true, event_type: eventType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[Resend Webhook Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
