import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseRawMime(raw: string): { text: string; html: string | null } {
  if (!raw) return { text: "", html: null };
  const splitIndex = raw.search(/\r?\n\r?\n/);
  if (splitIndex === -1) {
    return { text: raw.trim(), html: null };
  }
  const headersPart = raw.slice(0, splitIndex);
  let bodyPart = raw.slice(splitIndex).trim();

  // Check for multipart boundary
  const boundaryMatch = headersPart.match(/boundary=["']?([^"';\r\n]+)["']?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const escapedBoundary = boundary.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = bodyPart.split(new RegExp(`--${escapedBoundary}`));
    let extractedText = "";
    let extractedHtml: string | null = null;

    for (const part of parts) {
      if (part.trim() === "" || part.startsWith("--")) continue;
      const partSplit = part.search(/\r?\n\r?\n/);
      if (partSplit !== -1) {
        const partHeaders = part.slice(0, partSplit);
        let partContent = part.slice(partSplit).trim();

        if (/content-transfer-encoding:\s*base64/i.test(partHeaders)) {
          try {
            partContent = Buffer.from(partContent.replace(/\s+/g, ""), "base64").toString("utf-8");
          } catch {}
        } else if (/content-transfer-encoding:\s*quoted-printable/i.test(partHeaders)) {
          partContent = decodeQuotedPrintable(partContent);
        }

        if (/content-type:\s*text\/html/i.test(partHeaders)) {
          extractedHtml = partContent;
        } else if (/content-type:\s*text\/plain/i.test(partHeaders) && !extractedText) {
          extractedText = partContent;
        }
      }
    }

    return {
      text: extractedText || (extractedHtml ? extractedHtml.replace(/<[^>]*>/g, "") : bodyPart.slice(0, 2000)),
      html: extractedHtml,
    };
  }

  // Single part
  if (/content-transfer-encoding:\s*base64/i.test(headersPart)) {
    try {
      bodyPart = Buffer.from(bodyPart.replace(/\s+/g, ""), "base64").toString("utf-8");
    } catch {}
  } else if (/content-transfer-encoding:\s*quoted-printable/i.test(headersPart)) {
    bodyPart = decodeQuotedPrintable(bodyPart);
  }

  const isHtml = /content-type:\s*text\/html/i.test(headersPart);
  return {
    text: isHtml ? bodyPart.replace(/<[^>]*>/g, "") : bodyPart,
    html: isHtml ? bodyPart : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Secret Verification (Cloudflare Email Worker header)
    const configuredSecret = process.env.INBOUND_MAIL_WEBHOOK_SECRET;
    const providedSecret = request.headers.get("x-inbound-secret");
    if (configuredSecret && configuredSecret !== providedSecret) {
      return NextResponse.json({ error: "Unauthorized inbound webhook" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || (!body.from && !body.from_email) || (!body.to && !body.to_email)) {
      return NextResponse.json({ error: "Sender (from) and recipient (to) are required." }, { status: 400 });
    }

    const fromEmail = String(body.from_email || body.from).toLowerCase().trim();
    const fromName = body.from_name || fromEmail.split("@")[0];
    const toEmail = String(body.to_email || body.to).toLowerCase().trim();
    const subject = body.subject || "(No Subject)";

    // Parse Body: Support text/html OR raw MIME payload from Cloudflare Worker
    let bodyText = body.text || body.body || "";
    let bodyHtml: string | null = body.html || null;

    if (!bodyText && !bodyHtml && body.raw) {
      const parsed = parseRawMime(String(body.raw));
      bodyText = parsed.text;
      bodyHtml = parsed.html;
    }

    if (!bodyText && bodyHtml) {
      bodyText = bodyHtml.replace(/<[^>]*>/g, "").trim();
    }

    if (!bodyText) {
      bodyText = "(No message text provided)";
    }

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

    // 3. Find active conversation with this customer or thread subject / inReplyTo
    let existingConv: { id: string; message_count: number } | null = null;

    if (body.inReplyTo) {
      const cleanInReplyTo = String(body.inReplyTo).replace(/[<>]/g, "").trim();
      const { data: parentMsg } = await supabase
        .from("mail_messages")
        .select("conversation_id")
        .or(`resend_id.eq.${cleanInReplyTo},raw_headers->>messageId.eq.${cleanInReplyTo}`)
        .limit(1)
        .maybeSingle();

      if (parentMsg?.conversation_id) {
        const { data: matched } = await supabase
          .from("mail_conversations")
          .select("id, message_count")
          .eq("id", parentMsg.conversation_id)
          .maybeSingle();
        if (matched) existingConv = matched;
      }
    }

    if (!existingConv) {
      const cleanSubject = subject.replace(/^(re|fwd):\s*/i, "").trim();
      const { data: matched } = await supabase
        .from("mail_conversations")
        .select("id, message_count")
        .eq("customer_email", fromEmail)
        .eq("recipient_inbox", matchedInbox)
        .ilike("subject", `%${cleanSubject}%`)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (matched) existingConv = matched;
    }

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
        raw_headers: {
          messageId: body.messageId || null,
          inReplyTo: body.inReplyTo || null,
          references: body.references || null,
          headers: body.headers || {},
          size: body.size || null,
          receivedAt: body.receivedAt || nowIso,
        },
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
