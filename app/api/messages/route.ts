import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getCommunicationConfig } from "@/app/lib/platformConfig";

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

    const supabase = getSupabaseServerClient();

    const { data: member } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Access denied to this conversation." }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, audio_assets(*), message_reactions(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, messages: messages ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, content, messageType = "text", audioAssetId, replyToId } = body;

    if (!conversationId || (!content && !audioAssetId)) {
      return NextResponse.json({ error: "Missing required message parameters." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: member } = await supabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "You are not a member of this conversation." }, { status: 403 });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || "Voice note attachment",
        message_type: audioAssetId ? "audio_note" : messageType,
        audio_asset_id: audioAssetId || null,
        reply_to_id: replyToId || null,
      })
      .select("*, audio_assets(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
