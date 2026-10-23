import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { toggleMessageReaction } from "@/app/lib/communicationStore";

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
    if (!messageId || !allowed.includes(reaction)) {
      return NextResponse.json({ error: "Invalid messageId or unsupported reaction emoji." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
