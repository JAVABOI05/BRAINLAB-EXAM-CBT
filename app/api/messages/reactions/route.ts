import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { assertConversationParticipant, toggleMessageReaction } from "@/app/lib/communicationStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { conversationId, messageId, reaction } = body;

    const allowed = ["👍", "❤️", "😂", "👏", "🤔", "✅"];
    if (!conversationId || !messageId || !allowed.includes(reaction)) {
      return NextResponse.json({ error: "conversationId, messageId and a supported reaction are required." }, { status: 400 });
    }

    await assertConversationParticipant(conversationId, user.id);
    const supabase = getSupabaseServerClient();
    const { data: nativeMessage, error: messageLookupError } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .eq("id", messageId)
      .maybeSingle();

    if (!messageLookupError && nativeMessage && nativeMessage.conversation_id !== conversationId) {
      return NextResponse.json({ error: "This message does not belong to the selected conversation." }, { status: 403 });
    }
    if (messageLookupError && messageLookupError.code !== "22P02") {
      return NextResponse.json({ error: "Could not verify the message." }, { status: 500 });
    }
    if (!nativeMessage) {
      const fallback = await toggleMessageReaction(conversationId, messageId, user.id, reaction);
      if (!fallback.success) return NextResponse.json({ error: "Message not found in this conversation." }, { status: 404 });
      return NextResponse.json({ success: true, reactions: fallback.reactions });
    }

    try {
      const { data: existing, error: findError } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("reaction", reaction)
        .maybeSingle();

      if (!findError) {
        if (existing) {
          await supabase.from("message_reactions").delete().eq("id", existing.id);
          return NextResponse.json({ success: true, action: "removed", reaction });
        } else {
          const { data, error } = await supabase
            .from("message_reactions")
            .insert({
              message_id: messageId,
              user_id: user.id,
              reaction,
            })
            .select()
            .single();

          if (!error && data) {
            return NextResponse.json({ success: true, action: "added", reaction: data });
          }
        }
      }
    } catch {
      // Fallback
    }

    if (conversationId) {
      const res = await toggleMessageReaction(conversationId, messageId, user.id, reaction);
      return NextResponse.json({ success: true, reactions: res.reactions });
    }

    return NextResponse.json({ success: true, action: "updated" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CONVERSATION_ACCESS_DENIED") {
      return NextResponse.json({ error: "You are not a participant in this conversation." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
