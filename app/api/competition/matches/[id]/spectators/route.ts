import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

type Params = { params: Promise<{ id: string }> };
const MODERATOR_ROLES = new Set(["super_admin", "platform_admin", "competition_admin", "competition_moderator"]);
const ALLOWED_REACTIONS = new Set(["👏", "🔥", "⚡", "💙", "🎯", "🏆", "😮", "💪"]);

async function getMatchAccess(matchId: string, userId: string | null, supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data: match, error } = await supabase
    .from("competition_matches")
    .select("id, competition_id, status")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!match) return { match: null, competition: null, isParticipant: false };

  const { data: participant } = userId
    ? await supabase.from("competition_match_participants").select("id").eq("match_id", matchId).eq("user_id", userId).maybeSingle()
    : { data: null };
  let competition: Record<string, unknown> | null = null;
  if (match.competition_id) {
    const { data } = await supabase.from("competitions")
      .select("id, visibility, allow_spectators, spectator_mode")
      .eq("id", match.competition_id).maybeSingle();
    competition = data;
  }
  return { match, competition, isParticipant: Boolean(participant) };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: matchId } = await params;
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const access = await getMatchAccess(matchId, user?.id || null, supabase);
    if (!access.match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    const role = user ? await resolveAdminRole(user.id) : null;
    const isModerator = MODERATOR_ROLES.has(role || "");
    const canSpectate = access.competition?.visibility === "public" && access.competition?.allow_spectators === true;
    if (!access.isParticipant && !isModerator && !canSpectate) {
      return NextResponse.json({ error: "Spectator access is not enabled for this match." }, { status: 403 });
    }

    const { data, error } = await supabase.from("competition_spectator_messages")
      .select("id, user_id, display_name, message, message_type, is_hidden, created_at")
      .eq("match_id", matchId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ messages: data || [], spectator_mode: access.competition?.spectator_mode || "view_only", can_moderate: isModerator });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load spectator messages." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: matchId } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to interact with this match." }, { status: 401 });

    const body = await req.json();
    const messageType = body.message_type === "reaction" ? "reaction" : "chat";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 400) {
      return NextResponse.json({ error: "Message must be between 1 and 400 characters." }, { status: 400 });
    }
    if (messageType === "reaction" && !ALLOWED_REACTIONS.has(message)) {
      return NextResponse.json({ error: "Unsupported Arena reaction." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const access = await getMatchAccess(matchId, user.id, supabase);
    if (!access.match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
    if (access.match.status === "completed" || access.match.status === "cancelled") {
      return NextResponse.json({ error: "This match is no longer accepting spectator interaction." }, { status: 409 });
    }
    const role = await resolveAdminRole(user.id);
    const isModerator = MODERATOR_ROLES.has(role || "");
    const canSpectate = access.competition?.visibility === "public" && access.competition?.allow_spectators === true;
    if (!access.isParticipant && !isModerator && !canSpectate) {
      return NextResponse.json({ error: "You are not authorised to interact with this match." }, { status: 403 });
    }

    const spectatorMode = String(access.competition?.spectator_mode || "view_only");
    if (!isModerator && spectatorMode === "view_only") {
      return NextResponse.json({ error: "This event is view-only for spectators." }, { status: 403 });
    }
    if (!isModerator && messageType === "chat" && spectatorMode !== "moderated_chat") {
      return NextResponse.json({ error: "Chat is disabled. Reactions may still be available." }, { status: 403 });
    }
    const { data: profile } = await supabase.from("user_profiles")
      .select("full_name, username").eq("id", user.id).maybeSingle();
    const displayName = profile?.full_name || profile?.username || "Arena Contender";

    const { data, error } = await supabase.from("competition_spectator_messages")
      .insert({
        match_id: matchId,
        user_id: user.id,
        display_name: displayName,
        message,
        message_type: messageType,
      })
      .select("id, user_id, display_name, message, message_type, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, message: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send spectator message." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: matchId } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const role = await resolveAdminRole(user.id);
    if (!MODERATOR_ROLES.has(role || "")) {
      return NextResponse.json({ error: "Only an authorised Arena moderator may hide or restore messages." }, { status: 403 });
    }

    const body = await req.json();
    const messageId = typeof body.message_id === "string" ? body.message_id : "";
    if (!messageId) return NextResponse.json({ error: "Message ID is required." }, { status: 400 });
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("competition_spectator_messages")
      .update({ is_hidden: body.is_hidden !== false, moderated_by: user.id })
      .eq("id", messageId)
      .eq("match_id", matchId)
      .select("id, is_hidden, moderated_by")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Message not found." }, { status: 404 });
    return NextResponse.json({ ok: true, message: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to moderate spectator message." }, { status: 500 });
  }
}
