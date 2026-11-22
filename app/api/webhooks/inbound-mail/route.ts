import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    // 1. Optional Secret Verification (Cloudflare Email Worker header)
    const configuredSecret = process.env.INBOUND_MAIL_WEBHOOK_SECRET;
    const providedSecret = request.headers.get("x-inbound-secret");
    if (configuredSecret && configuredSecret !== providedSecret) {
      return NextResponse.json({ error: "Unauthorized inbound webhook" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.from || !body.to) {
      return NextResponse.json({ error: "Sender (from) and recipient (to) are required." }, { status: 400 });
    }

    const fromEmail = String(body.from_email || body.from).toLowerCase().trim();
    const fromName = body.from_name || fromEmail.split("@")[0];
    const toEmail = String(body.to_email || body.to).toLowerCase().trim();
    const subject = body.subject || "(No Subject)";
    const bodyHtml = body.html || null;
    const bodyText = body.text || body.body || (bodyHtml ? bodyHtml.replace(/<[^>]*>/g, "") : "");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    const supabase = getSupabaseServerClient();

    // 2. Identify target inbox: fallback to support@brainlabacademy.com.ng
    const knownInboxes = [
      "hello@brainlabacademy.com.ng",
      "support@brainlabacademy.com.ng",
      "admin@brainlabacademy.com.ng",
      "info@brainlabacademy.com.ng",
    ];

    const matchedInbox = knownInboxes.find((ib) => toEmail.includes(ib)) || "support@brainlabacademy.com.ng";

    // 3. Find active conversation with this customer or thread subject
    // Clean subject (strip "Re: ", "Fwd: ")
    const cleanSubject = subject.replace(/^(re|fwd):\s*/i, "").trim();

    const { data: existingConv } = await supabase
      .from("mail_conversations")
      .select("*")
      .eq("customer_email", fromEmail)
      .eq("recipient_inbox", matchedInbox)
      .ilike("subject", `%${cleanSubject}%`)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    const nowIso = new Date().toISOString();

    if (existingConv) {
      conversationId = existingConv.id;
      // Reopen conversation and update last message timestamp
      await supabase
        .from("mail_conversations")
        .update({
          status: "open",
          message_count: (existingConv.message_count || 1) + 1,
          last_message_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", conversationId);
    } else {
      // Create new conversation
      const { data: newConv, error: newConvErr } = await supabase
        .from("mail_conversations")
        .insert({
          recipient_inbox: matchedInbox,
          customer_email: fromEmail,
          customer_name: fromName,
          subject,
          status: "open",
          priority: "normal",
          message_count: 1,
          last_message_at: nowIso,
        })
        .select()
        .single();

      if (newConvErr || !newConv) {
        return NextResponse.json({ error: "Failed to create conversation thread" }, { status: 500 });
      }
      conversationId = newConv.id;
    }

    // 4. Record Inbound Message
    const { data: message, error: msgErr } = await supabase
      .from("mail_messages")
      .insert({
        conversation_id: conversationId,
        direction: "inbound",
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        attachments,
        raw_headers: body.headers || {},
      })
      .select()
      .single();

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // 5. Ensure contact exists in mail_contacts
    await supabase.from("mail_contacts").upsert(
      {
        email: fromEmail,
        full_name: fromName,
        first_name: fromName.split(" ")[0] || "Learner",
        updated_at: nowIso,
      },
      { onConflict: "email" }
    );

    return NextResponse.json({
      success: true,
      conversationId,
      messageId: message.id,
      inbox: matchedInbox,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Inbound ingestion failed";
    console.error("[Inbound Email Error]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
