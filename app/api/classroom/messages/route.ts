import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

// In-memory fallback message registry for dynamic/ad-hoc sessions
const memoryMessageStore = new Map<string, any[]>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId parameter" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Try to find the class conversation
    try {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("class_id", classId)
        .maybeSingle();

      if (conv) {
        const { data: dbMessages } = await supabase
          .from("messages")
          .select("id, sender_id, content, message_type, is_pinned, metadata, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (dbMessages && dbMessages.length > 0) {
          const formatted = dbMessages.map((m) => {
            const meta = (m.metadata as any) || {};
            return {
              id: m.id,
              senderId: m.sender_id,
              senderName: meta.senderName || "Class Participant",
              text: m.content,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isHost: Boolean(meta.isHost),
              type: meta.type || (m.message_type === "audio_note" ? "audio" : "text"),
              mediaUrl: meta.mediaUrl,
              duration: meta.duration,
              isPinned: Boolean(m.is_pinned || meta.isPinned),
            };
          });

          return NextResponse.json({ success: true, messages: formatted });
        }
      }
    } catch {
      // ignore db error, proceed to fallback
    }

    // Fallback to memory store
    const memList = memoryMessageStore.get(classId) || [];
    return NextResponse.json({ success: true, messages: memList });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      classId,
      senderName,
      text,
      type = "text",
      mediaUrl,
      duration,
      isHost = false,
      isPinned = false,
    } = body;

    if (!classId || (!text && !mediaUrl)) {
      return NextResponse.json({ error: "classId and text/media are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const messageObj = {
      id: msgId,
      senderId: user.id,
      senderName: senderName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Me",
      text: text || (type === "audio" ? "🎙️ Voice Note" : "📷 Shared Diagram"),
      timestamp: timestampStr,
      isHost: Boolean(isHost),
      type,
      mediaUrl: mediaUrl || undefined,
      duration: duration || undefined,
      isPinned: Boolean(isPinned),
      createdAt: nowIso,
    };

    // Store in memory store immediately
    const existing = memoryMessageStore.get(classId) || [];
    existing.push(messageObj);
    if (existing.length > 200) existing.shift();
    memoryMessageStore.set(classId, existing);

    // Attempt to persist to database if table exists and classId is UUID
    try {
      let convId: string | null = null;
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("class_id", classId)
        .maybeSingle();

      if (conv) {
        convId = conv.id;
      } else {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            type: "class",
            class_id: classId,
            title: `Classroom Session ${classId}`,
            created_by: user.id,
          })
          .select("id")
          .maybeSingle();
        if (newConv) convId = newConv.id;
      }

      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: user.id,
          message_type: type === "audio" ? "audio_note" : type === "image" ? "file" : "text",
          content: messageObj.text,
          is_pinned: isPinned,
          metadata: {
            senderName: messageObj.senderName,
            type: messageObj.type,
            mediaUrl: messageObj.mediaUrl,
            duration: messageObj.duration,
            isHost: messageObj.isHost,
            isPinned: messageObj.isPinned,
          },
        });
      }
    } catch (dbErr) {
      console.warn("Could not persist message to DB, kept in active session store:", dbErr);
    }

    return NextResponse.json({ success: true, message: messageObj });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message || "Failed to post message" }, { status: 500 });
  }
}
