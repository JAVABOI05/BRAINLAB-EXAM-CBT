import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";
import { getCommunicationConfig } from "@/app/lib/platformConfig";
import {
  getUserConversations,
  createOrGetDirectChat,
  createGroupChat,
  updateConversationRequestStatus,
} from "@/app/lib/communicationStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await getUserConversations(user.id);
    return NextResponse.json({ success: true, conversations });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getCommunicationConfig();
    if (!config.private_messaging_enabled) {
      return NextResponse.json(
        { error: "Private messaging is currently disabled by administrators." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { recipientId, title, type = "direct", memberIds = [] } = body;

    if (type === "direct") {
      if (!recipientId) {
        return NextResponse.json({ error: "recipientId is required for direct chat." }, { status: 400 });
      }

      if (recipientId === user.id) {
        return NextResponse.json({ error: "Cannot start conversation with yourself." }, { status: 400 });
      }

      const conversation = await createOrGetDirectChat(user.id, recipientId);
      return NextResponse.json({ success: true, conversation });
    }

    if (type === "group") {
      if (!title?.trim()) {
        return NextResponse.json({ error: "Title is required for study groups." }, { status: 400 });
      }

      const allMembers = recipientId ? [recipientId, ...memberIds] : memberIds;
      const conversation = await createGroupChat(user.id, title.trim(), allMembers);
      return NextResponse.json({ success: true, conversation });
    }

    return NextResponse.json({ error: "Invalid conversation type" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { conversationId, action } = body;

    if (!conversationId || !action) {
      return NextResponse.json({ error: "conversationId and action are required." }, { status: 400 });
    }

    if (!["accept", "decline", "accept_group", "decline_group"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const conversation = await updateConversationRequestStatus(user.id, conversationId, action);
    return NextResponse.json({ success: true, conversation });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
