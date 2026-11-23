import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabasePublicServerClient } from "../../lib/supabaseServer";
import { CANONICAL_PHONE_DIGITS, CANONICAL_PHONE_DISPLAY } from "../../lib/contactConfig";

function generateContactReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BL-CNT-${suffix}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  cbt_exam: "CBT Exam Practice",
  access_code: "Access Code Help",
  subscription: "Billing & Subscriptions",
  revision_class: "Live Masterclass",
  institutional: "School Partnership",
  other: "General Inquiry",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, category, message } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid phone or WhatsApp number." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide your inquiry or support message." },
        { status: 400 }
      );
    }

    const referenceCode = generateContactReferenceCode();
    const sanitizedEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;
    const sanitizedCategory = category && typeof category === "string" ? category.trim() : "general_inquiry";
    const categoryLabel = CATEGORY_LABELS[sanitizedCategory] || sanitizedCategory;
    const nowIso = new Date().toISOString();
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanMessage = message.trim();

    // 1. Ingest into BrainLab Admin Unified Inbox (mail_conversations & mail_messages)
    let conversationId: string | undefined;
    try {
      const supabase = getSupabaseServerClient();
      const customerEmail = sanitizedEmail || `${cleanPhone.replace(/\D/g, "")}@phone.brainlabacademy.com.ng`;
      const firstName = cleanName.split(" ")[0] || "Learner";

      // A. Upsert contact in mail_contacts directory
      await supabase.from("mail_contacts").upsert(
        {
          email: customerEmail,
          full_name: cleanName,
          first_name: firstName,
          phone: cleanPhone,
          subscription_tier: "free",
          marketing_consent: true,
          tags: ["portal_inquiry", sanitizedCategory],
          updated_at: nowIso,
        },
        { onConflict: "email" }
      );

      // B. Create or update conversation thread
      const { data: convData } = await supabase
        .from("mail_conversations")
        .insert({
          recipient_inbox: "support@brainlabacademy.com.ng",
          customer_email: customerEmail,
          customer_name: cleanName,
          subject: `[Ticket: ${referenceCode}] ${categoryLabel} — ${cleanName}`,
          status: "open",
          priority: sanitizedCategory === "access_code" ? "high" : "normal",
          message_count: 1,
          last_message_at: nowIso,
        })
        .select("id")
        .single();

      if (convData?.id) {
        conversationId = convData.id;

        // C. Record inbound message
        const bodyHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;line-height:1.6;color:#0F172A;">
            <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;"><strong>Inquiry Ticket:</strong> <code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;color:#0F172A;">${referenceCode}</code></p>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;"><strong>Candidate Name:</strong> ${cleanName}</p>
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;"><strong>Phone / WhatsApp:</strong> <a href="https://wa.me/${cleanPhone.replace(/\D/g, "")}" style="color:#0284C7;font-weight:700;">${cleanPhone}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;"><strong>Category:</strong> ${categoryLabel}</p>
            </div>
            <div style="font-size:15px;line-height:1.7;color:#1E293B;white-space:pre-wrap;background:#FFFFFF;padding:16px;border-radius:8px;border:1px solid #E2E8F0;">${cleanMessage}</div>
            <p style="font-size:12px;color:#94A3B8;margin-top:16px;">
              Submitted via BrainLab Academy Contact &amp; Support Portal. Reply directly in Admin Unified Inbox to respond via email.
            </p>
          </div>
        `;

        await supabase.from("mail_messages").insert({
          conversation_id: convData.id,
          direction: "inbound",
          from_email: customerEmail,
          from_name: cleanName,
          to_email: "support@brainlabacademy.com.ng",
          subject: `[Ticket: ${referenceCode}] ${categoryLabel}`,
          body_text: `Phone / WhatsApp: ${cleanPhone}\nTopic: ${categoryLabel}\nTicket Reference: ${referenceCode}\n\nMessage:\n${cleanMessage}`,
          body_html: bodyHtml,
          raw_headers: {
            referenceCode,
            category: sanitizedCategory,
            phone: cleanPhone,
            source: "portal_contact_form",
            receivedAt: nowIso,
          },
        });
      }
    } catch (ingestErr) {
      console.warn("[CONTACT INGESTION] Unified inbox sync notice:", ingestErr);
    }

    // 2. Broadcast live alert for connected proctors/admins
    try {
      const publicClient = getSupabasePublicServerClient();
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_contact_inquiry",
        payload: {
          referenceCode,
          name: cleanName,
          phone: cleanPhone,
          email: sanitizedEmail,
          category: sanitizedCategory,
          preview: cleanMessage.slice(0, 100),
          submittedAt: nowIso,
          conversationId,
        },
      });
    } catch (bcErr) {
      console.warn("[CONTACT INQUIRY] Real-time broadcast notice:", bcErr);
    }

    console.info(`[CONTACT INQUIRY] Reference: ${referenceCode} | Category: ${sanitizedCategory} | ConvID: ${conversationId}`);

    // Pre-format official WhatsApp fallback redirect URL
    const encodedWaMsg = encodeURIComponent(
      `Hello BrainLab Academy Desk [Ticket: ${referenceCode}],\n\nName: ${cleanName}\nPhone: ${cleanPhone}\nCategory: ${categoryLabel}\n\nMessage:\n${cleanMessage}`
    );
    const whatsappUrl = `https://wa.me/${CANONICAL_PHONE_DIGITS}?text=${encodedWaMsg}`;

    return NextResponse.json({
      ok: true,
      referenceCode,
      conversationId,
      message: "Your inquiry ticket has been registered. Our Academic Support Desk will follow up promptly.",
      whatsappUrl,
      supportPhone: CANONICAL_PHONE_DISPLAY,
      submittedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
