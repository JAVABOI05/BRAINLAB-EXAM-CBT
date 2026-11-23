import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail } from "@/app/lib/emailService";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.inbox.view", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const inbox = searchParams.get("inbox"); // 'all', 'support@brainlabacademy.com.ng', 'hello@...', etc.
    const status = searchParams.get("status") || "all"; // 'open', 'pending', 'resolved', 'archived', 'all'
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const supabase = getSupabaseServerClient();
    let query = supabase.from("mail_conversations").select("*");

    if (inbox && inbox !== "all") {
      query = query.eq("recipient_inbox", inbox);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    const { data: conversations, error } = await query.order("last_message_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversations: conversations || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load conversations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Start a new customer support thread / direct outreach
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.compose", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Special Action: Simulate an inbound portal inquiry for testing Unified Inbox reception
    if (body.action === "simulate_inbound") {
      const simName = body.customer_name || "Adewale Adeleke";
      const simEmail = body.from_email || "adewale.candidate@example.com";
      const simPhone = body.phone || "+234 802 345 6789";
      const simSubject = body.subject || "Inquiry: How to access JAMB 2026 CBT Mock Practice PIN";
      const simMessage =
        body.message ||
        `Good day BrainLab Academy Support,\n\nI just registered on the portal and would like to confirm how the JAMB UTME CBT mock scheduling works and how to get my candidate PIN.\n\nPhone: ${simPhone}\nCandidate: ${simName}`;
      const nowIso = new Date().toISOString();

      // Upsert contact
      await supabase.from("mail_contacts").upsert(
        {
          email: simEmail,
          full_name: simName,
          first_name: simName.split(" ")[0],
          phone: simPhone,
          subscription_tier: "free",
          marketing_consent: true,
          tags: ["portal_inquiry", "simulation"],
          updated_at: nowIso,
        },
        { onConflict: "email" }
      );

      // Create conversation
      const { data: conv, error: convErr } = await supabase
        .from("mail_conversations")
        .insert({
          recipient_inbox: "support@brainlabacademy.com.ng",
          customer_email: simEmail,
          customer_name: simName,
          subject: simSubject,
          status: "open",
          priority: "normal",
          message_count: 1,
          last_message_at: nowIso,
        })
        .select()
        .single();

      if (convErr || !conv) {
        return NextResponse.json({ error: convErr?.message || "Failed to create conversation" }, { status: 500 });
      }

      // Record inbound message
      const { data: msg } = await supabase
        .from("mail_messages")
        .insert({
          conversation_id: conv.id,
          direction: "inbound",
          from_email: simEmail,
          from_name: simName,
          to_email: "support@brainlabacademy.com.ng",
          subject: simSubject,
          body_text: simMessage,
          body_html: `<div style="font-family:sans-serif;line-height:1.6;"><p><strong>Sender:</strong> ${simName} (${simEmail})<br/><strong>Phone:</strong> ${simPhone}</p><hr/><p style="white-space:pre-wrap;">${simMessage}</p></div>`,
          raw_headers: { source: "portal_inbound_simulation", simulated: true },
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        simulated: true,
        message: "Test inbound portal inquiry successfully received into Unified Inbox!",
        conversation: conv,
        messageItem: msg,
      });
    }

    if (!body.to_email || !body.subject || !body.message) {
      return NextResponse.json({ error: "Recipient email, subject, and message are required." }, { status: 400 });
    }

    const {
      from_inbox = "support@brainlabacademy.com.ng",
      to_email,
      customer_name,
      subject,
      message,
      priority = "normal",
    } = body;

    // 1. Create conversation
    const { data: conv, error: convErr } = await supabase
      .from("mail_conversations")
      .insert({
        recipient_inbox: from_inbox,
        customer_email: to_email.toLowerCase(),
        customer_name: customer_name || to_email.split("@")[0],
        subject,
        status: "open",
        priority,
        assigned_to: admin.id,
        assigned_admin_name: admin.email,
        message_count: 1,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convErr || !conv) {
      return NextResponse.json({ error: convErr?.message || "Failed to create conversation" }, { status: 500 });
    }

    // 2. Dispatch email via Resend
    const htmlBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:24px;">
        <h2 style="color:#0B1536;margin-top:0;font-size:20px;font-weight:800;">${subject}</h2>
        <div style="font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">${message}</div>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0;" />
        <p style="font-size:12px;color:#94A3B8;">
          BrainLab Academy Support Desk &bull; Reply to this email directly to continue the conversation.
        </p>
      </div>
    `;

    const sendRes = await sendEmail({
      from: `BrainLab Support <${from_inbox}>`,
      to: to_email,
      replyTo: from_inbox,
      subject,
      html: htmlBody,
      text: message,
    });

    if (!sendRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Email delivery failed: ${sendRes.error}`,
          conversation: conv,
          simulated: false,
        },
        { status: 400 }
      );
    }

    // 3. Record outbound message
    await supabase.from("mail_messages").insert({
      conversation_id: conv.id,
      direction: "outbound",
      from_email: from_inbox,
      from_name: admin.email,
      to_email,
      subject,
      body_html: htmlBody,
      body_text: message,
      resend_id: sendRes.messageId,
      sender_admin_id: admin.id,
    });

    // 4. Audit log
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "inbox.create_thread",
      resource_type: "mail_conversations",
      resource_id: conv.id,
      details: { to_email, subject, from_inbox, simulated: Boolean(sendRes.simulated) },
    });

    return NextResponse.json({
      success: true,
      simulated: Boolean(sendRes.simulated),
      message: sendRes.simulated
        ? "⚠️ Outbound thread recorded, but email dispatch was SIMULATED (no Resend API key configured)."
        : `✓ Direct email successfully delivered to ${to_email} via Resend.`,
      conversation: conv,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
