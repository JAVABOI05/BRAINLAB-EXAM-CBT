import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to manage player connections." }, { status: 401 });
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("competition_player_connections")
      .select("id, user_id, connected_user_id, status, created_at")
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const otherIds = Array.from(new Set((data || []).map(row => row.user_id === user.id ? row.connected_user_id : row.user_id)));
    const { data: profiles } = otherIds.length
      ? await supabase.from("competition_public_profiles").select("user_id, display_name, slug, avatar_url, visibility").in("user_id", otherIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map(profile => [profile.user_id, profile]));
    const connections = (data || []).map(row => {
      const isIncoming = row.user_id === user.id;
      const otherId = isIncoming ? row.connected_user_id : row.user_id;
      const profile = profileMap[otherId];
      return {
        id: row.id,
        status: row.status,
        direction: isIncoming ? "incoming" : "outgoing",
        created_at: row.created_at,
        player: {
          display_name: profile?.visibility === "public" ? profile.display_name : "Private player",
          slug: profile?.visibility === "public" ? profile.slug : null,
          avatar_url: profile?.visibility === "public" ? profile.avatar_url : null,
        },
      };
    });
    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load connections." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in before connecting with a player." }, { status: 401 });
    const body = await req.json();
    const slug = typeof body.target_slug === "string" ? body.target_slug.trim() : "";
    if (!slug) return NextResponse.json({ error: "A public player profile link is required." }, { status: 400 });
    const supabase = getSupabaseServerClient();
    const { data: target, error: targetError } = await supabase.from("competition_public_profiles")
      .select("user_id, display_name, visibility")
      .eq("slug", slug).eq("visibility", "public").maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: "Public player profile not found." }, { status: 404 });
    if (target.user_id === user.id) return NextResponse.json({ error: "You cannot connect with yourself." }, { status: 400 });

    const { data: existing } = await supabase.from("competition_player_connections")
      .select("id, status, user_id")
      .eq("user_id", target.user_id)
      .eq("connected_user_id", user.id)
      .maybeSingle();
    if (existing?.status === "approved") return NextResponse.json({ error: "You are already an approved connection." }, { status: 409 });
    if (existing?.status === "blocked") return NextResponse.json({ error: "This connection request is not available." }, { status: 403 });
    if (existing) return NextResponse.json({ ok: true, message: "Your connection request is already pending." });

    const { error } = await supabase.from("competition_player_connections").insert({
      user_id: target.user_id,
      connected_user_id: user.id,
      status: "pending",
    });
    if (error) throw error;
    await supabase.from("notifications").insert({
      user_id: target.user_id,
      title: "New Arena connection request",
      message: "A BrainLab Arena player would like to connect with you.",
      type: "competition_connection_request",
      metadata: { profile_slug: slug },
    });
    return NextResponse.json({ ok: true, message: "Connection request sent." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send connection request." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Sign in to update connections." }, { status: 401 });
    const body = await req.json();
    const connectionId = typeof body.connection_id === "string" ? body.connection_id : "";
    const action = body.action;
    if (!connectionId || !["accept", "decline", "remove"].includes(action)) {
      return NextResponse.json({ error: "Provide a connection and a valid action." }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { data: connection, error: readError } = await supabase.from("competition_player_connections")
      .select("id, user_id, connected_user_id, status")
      .eq("id", connectionId).maybeSingle();
    if (readError) throw readError;
    if (!connection) return NextResponse.json({ error: "Connection request not found." }, { status: 404 });

    if (action === "accept" || action === "decline") {
      if (connection.user_id !== user.id || connection.status !== "pending") {
        return NextResponse.json({ error: "Only the recipient can respond to a pending request." }, { status: 403 });
      }
      const { error } = await supabase.from("competition_player_connections")
        .update({ status: action === "accept" ? "approved" : "blocked", updated_at: new Date().toISOString() })
        .eq("id", connectionId).eq("status", "pending");
      if (error) throw error;
    } else {
      if (connection.user_id !== user.id && connection.connected_user_id !== user.id) {
        return NextResponse.json({ error: "You are not part of this connection." }, { status: 403 });
      }
      const { error } = await supabase.from("competition_player_connections").delete().eq("id", connectionId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update connection." }, { status: 500 });
  }
}
