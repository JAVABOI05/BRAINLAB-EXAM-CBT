import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const runtime = "nodejs";

function verifyResendSignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatureHeader = request.headers.get("svix-signature");

  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
    return false;
  }

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  if (!secretBytes.length) return false;

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");
  const candidates = signatureHeader
    .split(" ")
    .map((part) => part.split(","))
    .filter(([version, value]) => version === "v1" && Boolean(value))
    .map(([, value]) => value);

  return candidates.some((candidate) => {
    const supplied = Buffer.from(candidate, "base64");
    const expectedBytes = Buffer.from(expected, "base64");
    return supplied.length === expectedBytes.length && timingSafeEqual(supplied, expectedBytes);
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) return NextResponse.json({ error: "Empty payload" }, { status: 400 });

    if (!process.env.RESEND_WEBHOOK_SECRET) {
      console.error("[Resend Webhook] RESEND_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "Webhook verification is not configured" }, { status: 503 });
    }

    if (!verifyResendSignature(request, rawBody)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
    }

    const eventType = typeof payload.type === "string" ? payload.type : "unknown";
    const data = (payload.data && typeof payload.data === "object"
      ? payload.data
      : {}) as Record<string, unknown>;
    const emailId = String(data.email_id || data.id || "");
    const eventId = request.headers.get("svix-id")!;
    const recipients = Array.isArray(data.to) ? data.to as string[] : [];
    const primaryRecipient = String(recipients[0] || "").trim().toLowerCase();
    const tags = data.tags as Record<string, string> | Array<{ name: string; value: string }> | undefined;
    const campaignId = Array.isArray(tags)
      ? tags.find((tag) => tag.name === "campaign_id")?.value || null
      : (tags && typeof tags.campaign_id === "string" ? tags.campaign_id : null);

    if (!emailId || !primaryRecipient || eventType === "unknown") {
      return NextResponse.json({ error: "Incomplete Resend event payload" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error: eventError } = await supabase.from("mail_events").insert({
      resend_event_id: eventId,
      resend_email_id: emailId,
      event_type: eventType,
      recipient: primaryRecipient,
      campaign_id: campaignId,
      payload,
    });

    if (eventError && eventError.code !== "23505") {
      throw new Error(`Could not persist webhook event: ${eventError.message}`);
    }

    const now = new Date().toISOString();
    const recipientUpdates: Record<string, unknown> = {};
    if (eventType === "email.delivered") {
      recipientUpdates.status = "delivered";
      recipientUpdates.delivered_at = now;
    } else if (eventType === "email.opened") {
      recipientUpdates.opened_at = now;
    } else if (eventType === "email.clicked") {
      recipientUpdates.clicked_at = now;
    } else if (eventType === "email.bounced") {
      recipientUpdates.status = "bounced";
      recipientUpdates.error_message = (data.bounce as { message?: string } | undefined)?.message || "Permanent bounce";
    } else if (eventType === "email.complained") {
      recipientUpdates.status = "complained";
      recipientUpdates.error_message = "Spam complaint received";
    }

    if (Object.keys(recipientUpdates).length) {
      const { error } = await supabase
        .from("mail_campaign_recipients")
        .update(recipientUpdates)
        .eq("resend_id", emailId);
      if (error) throw new Error(`Could not update campaign recipient: ${error.message}`);
    }

    if (eventType === "email.bounced") {
      const { error } = await supabase
        .from("mail_contacts")
        .update({
          is_suppressed: true,
          suppression_reason: "Resend reported a permanent bounce",
          updated_at: now,
        })
        .eq("email", primaryRecipient);
      if (error) throw new Error(`Could not suppress bounced address: ${error.message}`);
    }

    if (eventType === "email.complained") {
      // A spam complaint opts the address out of marketing, not critical account/exam mail.
      const { data: contact, error: contactError } = await supabase
        .from("mail_contacts")
        .update({ marketing_consent: false, updated_at: now })
        .eq("email", primaryRecipient)
        .select("id")
        .maybeSingle();
      if (contactError) throw new Error(`Could not update marketing consent: ${contactError.message}`);

      const { error: preferenceError } = await supabase
        .from("notification_preferences")
        .update({ marketing_announcements: false, updated_at: now })
        .eq("email", primaryRecipient);
      if (preferenceError) throw new Error(`Could not update notification preference: ${preferenceError.message}`);

      const { error: consentError } = await supabase.from("mail_consent_events").insert({
        contact_id: contact?.id || null,
        email: primaryRecipient,
        action: "opt_out",
        source: "resend_webhook",
        evidence: { event_id: eventId, event_type: eventType },
      });
      if (consentError && consentError.code !== "23505") {
        throw new Error(`Could not record complaint opt-out: ${consentError.message}`);
      }
    }

    return NextResponse.json({ success: true, event_type: eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("[Resend Webhook Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
