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

    // 1. Direct message deduplication
    if (type === "direct" && recipientId) {
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvs && myConvs.length > 0) {
        const cIds = myConvs.map((c: any) => c.conversation_id);
        const { data: shared } = await supabase
          .from("conversation_participants")
          .select("conversation_id, conversations!inner(id, type, title, last_message_at)")
          .eq("user_id", recipientId)
          .in("conversation_id", cIds);

        const directMatch = shared?.find((s: any) => s.conversations?.type === "direct");
        if (directMatch) {
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("*, messages(content, created_at, sender_id, message_type)")
            .eq("id", directMatch.conversation_id)
            .single();

          if (existingConv) {
            return NextResponse.json({ success: true, conversation: existingConv, isExisting: true });
          }
        }
      }
    }

    // 2. Group conversation find or add member
    if (type === "group" && title && recipientId) {
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvs && myConvs.length > 0) {
        const cIds = myConvs.map((c: any) => c.conversation_id);
        const { data: existingGroup } = await supabase
          .from("conversations")
          .select("*, messages(content, created_at, sender_id, message_type)")
          .in("id", cIds)
          .eq("type", "group")
          .eq("title", title)
          .maybeSingle();

        if (existingGroup) {
          const { data: alreadyIn } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", existingGroup.id)
            .eq("user_id", recipientId)
            .maybeSingle();

          if (!alreadyIn) {
            await supabase.from("conversation_participants").insert({
              conversation_id: existingGroup.id,
              user_id: recipientId,
              role: "member",
            });
          }

          try {
            await supabase.from("notifications").insert({
              user_id: recipientId,
              title: `👥 Added to Study Group: ${title}`,
              message: `${user.user_metadata?.full_name || user.email || "A classmate"} added you to ${title}.`,
              type: "message",
              link_url: "/messages",
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Could not dispatch study group notification:", e);
          }

          return NextResponse.json({ success: true, conversation: existingGroup, isExisting: true });
        }
      }
    }

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        type,
        title: title || (type === "direct" ? "Direct Message" : "Study Circle"),
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

    if (recipientId && recipientId !== user.id) {
      try {
        await supabase.from("notifications").insert({
          user_id: recipientId,
          title: type === "group" ? `👥 Added to Study Group: ${conv.title}` : `💬 New Message Connection`,
          message: `${user.user_metadata?.full_name || user.email || "A peer"} connected with you on BrainLab.`,
          type: "message",
          link_url: "/messages",
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Could not dispatch notification:", e);
      }
    }

    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
