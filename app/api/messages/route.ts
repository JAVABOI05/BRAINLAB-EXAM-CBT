import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";
import { getConversationMessages, sendChatMessage } from "@/app/lib/communicationStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const messages = await getConversationMessages(conversationId, user.id, user);
    return NextResponse.json({ success: true, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CONVERSATION_ACCESS_DENIED") {
      return NextResponse.json({ error: "You are not a participant in this conversation." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { conversationId, content, messageType = "text", audioAssetId, audioUrl, durationSeconds, replyToId } = body;

    if (!conversationId || (!content?.trim() && !audioAssetId && !audioUrl)) {
      return NextResponse.json({ error: "Missing required message parameters." }, { status: 400 });
    }

    const message = await sendChatMessage(conversationId, user, {
      content: content?.trim() || "",
      messageType,
      audioAssetId,
      audioUrl,
      durationSeconds,
      replyToId,
    });

    return NextResponse.json({ success: true, message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CONVERSATION_ACCESS_DENIED") {
      return NextResponse.json({ error: "You are not a participant in this conversation." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
