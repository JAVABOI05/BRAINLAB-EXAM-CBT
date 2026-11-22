import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail } from "@/app/lib/emailService";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.inbox.view");
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.compose");
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.to_email || !body.subject || !body.message) {
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

    const supabase = getSupabaseServerClient();

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
      details: { to_email, subject, from_inbox },
    });

    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
