import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail } from "@/app/lib/emailService";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.inbox.view", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch conversation
    const { data: conversation, error: convErr } = await supabase
      .from("mail_conversations")
      .select("*")
      .eq("id", params.id)
      .single();

    if (convErr || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // 2. Fetch all messages in conversation
    const { data: messages, error: msgErr } = await supabase
      .from("mail_messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Send a reply or add an internal note
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.inbox.reply", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden: You cannot reply to inbox threads." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.body_text) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const {
      type = "outbound", // 'outbound' (email to user) or 'internal_note'
      body_text,
      body_html,
      new_status,
    } = body;

    const supabase = getSupabaseServerClient();

    // 1. Fetch conversation
    const { data: conversation, error: convErr } = await supabase
      .from("mail_conversations")
      .select("*")
      .eq("id", params.id)
      .single();

    if (convErr || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    let resendId: string | undefined;

    // 2. If outbound, send real email via Resend
    if (type === "outbound") {
      const emailHtml = body_html || `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:20px;">
          <div style="font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">${body_text}</div>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
          <p style="font-size:12px;color:#94A3B8;">
            BrainLab Support Desk (${conversation.recipient_inbox}) &bull; Reply to this email to continue.
          </p>
        </div>
      `;

      const sendRes = await sendEmail({
        from: `BrainLab Support <${conversation.recipient_inbox}>`,
        to: conversation.customer_email,
        replyTo: conversation.recipient_inbox,
        subject: conversation.subject.startsWith("Re:") ? conversation.subject : `Re: ${conversation.subject}`,
        html: emailHtml,
        text: body_text,
      });

      resendId = sendRes.messageId;
    }

    // 3. Record message
    const nowIso = new Date().toISOString();
    const { data: message, error: msgErr } = await supabase
      .from("mail_messages")
      .insert({
        conversation_id: conversation.id,
        direction: type === "internal_note" ? "internal_note" : "outbound",
        from_email: admin.email || conversation.recipient_inbox,
        from_name: admin.email,
        to_email: type === "internal_note" ? "internal" : conversation.customer_email,
        subject: `Re: ${conversation.subject}`,
        body_html: body_html || null,
        body_text,
        resend_id: resendId,
        sender_admin_id: admin.id,
      })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // 4. Update conversation metadata
    const convUpdates: Record<string, unknown> = {
      message_count: (conversation.message_count || 1) + 1,
      last_message_at: nowIso,
      updated_at: nowIso,
    };
    if (new_status) {
      convUpdates.status = new_status;
    }

    await supabase.from("mail_conversations").update(convUpdates).eq("id", params.id);

    // 5. Audit log
    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: type === "internal_note" ? "inbox.internal_note" : "inbox.reply",
      resource_type: "mail_conversations",
      resource_id: params.id,
      details: { direction: type, to: conversation.customer_email },
    });

    return NextResponse.json({ success: true, message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update conversation assignment, status, or priority
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.inbox.manage", admin.role);
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) updatePayload.status = body.status;
    if (body.priority) updatePayload.priority = body.priority;
    if (body.assigned_to !== undefined) {
      updatePayload.assigned_to = body.assigned_to || null;
      updatePayload.assigned_admin_name = body.assigned_admin_name || null;
    }
    if (Array.isArray(body.tags)) updatePayload.tags = body.tags;

    const { data: updated, error } = await supabase
      .from("mail_conversations")
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
      action: "inbox.update_conversation",
      resource_type: "mail_conversations",
      resource_id: params.id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update conversation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
