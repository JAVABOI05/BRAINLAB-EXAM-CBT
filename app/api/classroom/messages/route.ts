import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

// In-memory fallback message registry for dynamic/ad-hoc sessions
type ClassroomMemoryMessage = {
  id?: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  timestamp?: string;
  isHost?: boolean;
  type?: string;
  mediaUrl?: string;
  duration?: number;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
};

const globalMessages = globalThis as unknown as {
  _classroomMemoryStore?: Map<string, ClassroomMemoryMessage[]>;
};
if (!globalMessages._classroomMemoryStore) {
  globalMessages._classroomMemoryStore = new Map<string, ClassroomMemoryMessage[]>();
}
const memoryMessageStore = globalMessages._classroomMemoryStore;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeSenderName(name?: string | null): string {
  if (!name) return "Learner";
  if (name.includes("@")) {
    const handle = name.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    return handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : "Scholar";
  }
  return name;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "Missing classId parameter" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const collected: ClassroomMemoryMessage[] = [];

    // 1. Check persistent exam_config store for classroom messages (supports any class code like BL-LIVE-101)
    try {
      const { data: configRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", `classroom_messages_${classId}`)
        .maybeSingle();

      if (configRow && Array.isArray(configRow.config_value)) {
        for (const item of configRow.config_value) {
          collected.push({
            ...item,
            senderName: sanitizeSenderName(item.senderName),
          });
        }
      }
    } catch {
      // ignore
    }

    // 2. If classId is a UUID, also check native conversations table
    if (UUID_REGEX.test(classId)) {
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
            .limit(200);

          if (dbMessages && dbMessages.length > 0) {
            for (const m of dbMessages) {
              const meta = (m.metadata && typeof m.metadata === "object" ? m.metadata : {}) as Record<string, unknown>;
              collected.push({
                id: m.id,
                senderId: m.sender_id,
                senderName: sanitizeSenderName(typeof meta.senderName === "string" ? meta.senderName : "Class Participant"),
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                isHost: Boolean(meta.isHost),
                type: (meta.type as string) || (m.message_type === "audio_note" ? "audio" : "text"),
                mediaUrl: meta.mediaUrl as string | undefined,
                duration: typeof meta.duration === "number" ? meta.duration : undefined,
                isPinned: Boolean(m.is_pinned || meta.isPinned),
                createdAt: m.created_at,
              });
            }
          }
        }
      } catch {
        // ignore db error
      }
    }

    // 3. Fallback to memory store if DB empty
    const memList = memoryMessageStore.get(classId) || [];
    for (const m of memList) {
      collected.push({
        ...m,
        senderName: sanitizeSenderName(m.senderName),
      });
    }

    // Deduplicate by message ID
    const seen = new Set<string>();
    const uniqueMessages: ClassroomMemoryMessage[] = [];
    for (const msg of collected) {
      const id = msg.id || `${msg.senderId}_${msg.timestamp}_${msg.text?.slice(0, 15)}`;
      if (!seen.has(id)) {
        seen.add(id);
        uniqueMessages.push(msg);
      }
    }

    return NextResponse.json({ success: true, messages: uniqueMessages });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
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

    const safeSenderName = sanitizeSenderName(
      senderName || user?.user_metadata?.full_name || user?.user_metadata?.name || "Learner"
    );

    const messageObj: ClassroomMemoryMessage = {
      id: msgId,
      senderId: user?.id || "participant",
      senderName: safeSenderName,
      text: text || (type === "audio" ? "🎙️ Voice Note" : "📷 Shared Diagram"),
      timestamp: timestampStr,
      isHost: Boolean(isHost),
      type,
      mediaUrl: mediaUrl || undefined,
      duration: duration || undefined,
      isPinned: Boolean(isPinned),
      createdAt: nowIso,
    };

    // 1. Store in memory store immediately
    const existingMem = memoryMessageStore.get(classId) || [];
    existingMem.push(messageObj);
    if (existingMem.length > 250) existingMem.shift();
    memoryMessageStore.set(classId, existingMem);

    // 2. Persist to exam_config so all workers and newly joining students see it
    try {
      const { data: configRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", `classroom_messages_${classId}`)
        .maybeSingle();

      let history: ClassroomMemoryMessage[] = [];
      if (configRow && Array.isArray(configRow.config_value)) {
        history = configRow.config_value;
      }
      history.push(messageObj);
      if (history.length > 300) history = history.slice(-300);

      await supabase.from("exam_config").upsert(
        {
          config_key: `classroom_messages_${classId}`,
          config_value: history,
        },
        { onConflict: "config_key" }
      );
    } catch (confErr) {
      console.warn("Could not persist message to exam_config:", confErr);
    }

    // 3. Attempt to persist to database if classId is UUID and user is authenticated
    if (user && UUID_REGEX.test(classId)) {
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
            content: messageObj.text || "",
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
        console.warn("Could not persist message to DB:", dbErr);
      }
    }

    return NextResponse.json({ success: true, message: messageObj });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to post message" }, { status: 500 });
  }
}
