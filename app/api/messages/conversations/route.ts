import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getCommunicationConfig } from "@/app/lib/platformConfig";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, role, last_read_at")
      .eq("user_id", user.id);

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    if (!participations || participations.length === 0) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const convIds = participations.map((p: any) => p.conversation_id);
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*, messages(content, created_at, sender_id, message_type)")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversations: conversations ?? [] });
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

    const config = await getCommunicationConfig();
    if (!config.private_messaging_enabled) {
      return NextResponse.json(
        { error: "Private messaging is currently disabled by administrators." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recipientId, title, type = "direct", courseId } = body;

    const supabase = getSupabaseServerClient();

    if (type === "direct" && !config.student_can_message_tutor) {
      return NextResponse.json(
        { error: "Direct student-to-tutor conversations are disabled by platform policy." },
        { status: 403 }
      );
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        type,
        title: title || (type === "direct" ? "Direct Message" : "Group Discussion"),
        course_id: courseId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError) {
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    const participants = [{ conversation_id: conv.id, user_id: user.id, role: "admin" }];

    if (recipientId && recipientId !== user.id) {
      participants.push({ conversation_id: conv.id, user_id: recipientId, role: "member" });
    }

    await supabase.from("conversation_participants").insert(participants);

    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
