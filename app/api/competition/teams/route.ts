import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const supabase = getSupabaseServerClient();
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get("teamId");

    // Single team detail view
    if (teamId) {
      const { data: team, error: teamErr } = await supabase
        .from("competition_teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamErr || !team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }

      // Fetch members
      const { data: members } = await supabase
        .from("competition_team_members")
        .select("id, user_id, role, joined_at, is_active")
        .eq("team_id", teamId);

      const memberUserIds = members?.map((m) => m.user_id) || [];
      let profilesMap: Record<string, { full_name?: string; username?: string; avatar_url?: string }> = {};

      if (memberUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", memberUserIds);

        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
        }
      }

      const enrichedMembers = (members || []).map((m) => ({
        ...m,
        profile: profilesMap[m.user_id] || { full_name: "Member" },
      }));

      // Fetch active elections
      const { data: activeElection } = await supabase
        .from("competition_team_elections")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "active")
        .maybeSingle();

      // If captain or co-captain, fetch pending applications
      let applications: Array<{ id: string; user_id: string; message: string; created_at: string; profile?: unknown }> = [];
      const isLeader = members?.some((m) => m.user_id === user?.id && (m.role === "captain" || m.role === "co_captain"));
      if (isLeader) {
        const { data: apps } = await supabase
          .from("competition_team_applications")
          .select("*")
          .eq("team_id", teamId)
          .eq("status", "pending");

        if (apps && apps.length > 0) {
          const appUserIds = apps.map((a) => a.user_id);
          const { data: appProfiles } = await supabase
            .from("user_profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", appUserIds);

          const appProfilesMap = Object.fromEntries((appProfiles || []).map((p) => [p.id, p]));
          applications = apps.map((a) => ({
            ...a,
            profile: appProfilesMap[a.user_id] || { full_name: "Applicant" },
          }));
        }
      }

      return NextResponse.json({
        team,
        members: enrichedMembers,
        activeElection,
        applications,
        is_my_team: members?.some((m) => m.user_id === user?.id) || false,
        my_role: members?.find((m) => m.user_id === user?.id)?.role || null,
      });
    }

    // List all teams
    const { data: teams, error: listErr } = await supabase
      .from("competition_teams")
      .select(`
        id, name, slug, motto, avatar_url, captain_id, co_captain_id,
        is_recruiting, elo_rating, matches_played, matches_won, matches_drawn, matches_lost, total_xp,
        created_at
      `)
      .order("elo_rating", { ascending: false })
      .limit(50);

    if (listErr) throw listErr;

    // Get member counts for each team
    const { data: allMembers } = await supabase
      .from("competition_team_members")
      .select("team_id, user_id, role")
      .eq("is_active", true);

    const countsByTeam: Record<string, number> = {};
    let myTeamId: string | null = null;

    allMembers?.forEach((m) => {
      countsByTeam[m.team_id] = (countsByTeam[m.team_id] || 0) + 1;
      if (user && m.user_id === user.id) {
        myTeamId = m.team_id;
      }
    });

    const enrichedTeams = (teams || []).map((t) => ({
      ...t,
      member_count: countsByTeam[t.id] || 1,
      is_my_team: t.id === myTeamId,
    }));

    return NextResponse.json({
      teams: enrichedTeams,
      my_team_id: myTeamId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing teams";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in to form a team." }, { status: 401 });
    }

    const body = await req.json();
    const { name, motto, avatar_url } = body;

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: "Team name must be at least 3 characters" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Check if user is already in a team
    const { data: existingMember } = await supabase
      .from("competition_team_members")
      .select("id, team_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: "You are already a member of an active team. Leave your current team first." }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Insert team
    const { data: team, error: teamErr } = await supabase
      .from("competition_teams")
      .insert({
        name: name.trim(),
        slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
        motto: motto?.trim() || "Rise Together, Win Together",
        avatar_url: avatar_url || null,
        captain_id: user.id,
        is_recruiting: true,
        elo_rating: 1200,
      })
      .select()
      .single();

    if (teamErr || !team) {
      throw new Error(teamErr?.message || "Failed to create team. Name might already be taken.");
    }

    // Insert captain as first member
    await supabase.from("competition_team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "captain",
      is_active: true,
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, team_id } = body;
    const supabase = getSupabaseServerClient();

    // ACTION: APPLY TO JOIN TEAM
    if (action === "apply") {
      if (!team_id) return NextResponse.json({ error: "Missing team_id" }, { status: 400 });

      // Check if already in a team
      const { data: inTeam } = await supabase
        .from("competition_team_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (inTeam) {
        return NextResponse.json({ error: "You are already in a team" }, { status: 400 });
      }

      // Check if team exists and is recruiting
      const { data: team } = await supabase
        .from("competition_teams")
        .select("id, name, is_recruiting, captain_id")
        .eq("id", team_id)
        .single();

      if (!team || !team.is_recruiting) {
        return NextResponse.json({ error: "This team is currently not recruiting" }, { status: 400 });
      }

      const { data: app, error: appErr } = await supabase
        .from("competition_team_applications")
        .insert({
          team_id,
          user_id: user.id,
          message: body.message || "I would love to join the team and compete!",
          status: "pending",
        })
        .select()
        .single();

      if (appErr) throw appErr;

      // Notify captain
      await supabase.from("notifications").insert({
        user_id: team.captain_id,
        title: "🛡️ New Team Application",
        message: `A candidate has applied to join ${team.name}.`,
        type: "team_application",
        metadata: { team_id, application_id: app.id },
      });

      return NextResponse.json({ ok: true, message: "Application submitted" });
    }

    // ACTION: REVIEW APPLICATION (Captain / Co-Captain approve/reject)
    if (action === "review_application") {
      const { application_id, decision } = body; // 'approved' | 'rejected'
      if (!application_id || !decision) {
        return NextResponse.json({ error: "Missing application_id or decision" }, { status: 400 });
      }

      const { data: app } = await supabase
        .from("competition_team_applications")
        .select("*, team:competition_teams(id, name, captain_id, co_captain_id)")
        .eq("id", application_id)
        .single();

      if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

      // Check leadership
      if (app.team.captain_id !== user.id && app.team.co_captain_id !== user.id) {
        return NextResponse.json({ error: "Only team leaders can review applications" }, { status: 403 });
      }

      await supabase
        .from("competition_team_applications")
        .update({ status: decision })
        .eq("id", application_id);

      if (decision === "approved") {
        await supabase.from("competition_team_members").insert({
          team_id: app.team_id,
          user_id: app.user_id,
          role: "member",
          is_active: true,
        });

        await supabase.from("notifications").insert({
          user_id: app.user_id,
          title: "🎉 Team Application Accepted!",
          message: `Welcome to ${app.team.name}! You are now an active team member.`,
          type: "team_application_accepted",
          metadata: { team_id: app.team_id },
        });
      }

      return NextResponse.json({ ok: true, decision });
    }

    // ACTION: LEAVE TEAM
    if (action === "leave") {
      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id, role, team_id")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "You are not a member of this team" }, { status: 400 });
      }

      if (member.role === "captain") {
        return NextResponse.json({ error: "Captains cannot leave their team without transferring leadership or disbanding." }, { status: 400 });
      }

      await supabase
        .from("competition_team_members")
        .delete()
        .eq("id", member.id);

      return NextResponse.json({ ok: true, message: "Left team" });
    }

    // ACTION: START DEMOCRATIC ELECTION (Captaincy or No-Confidence)
    if (action === "start_election") {
      const { election_type, candidate_ids = [] } = body; // 'captaincy' | 'no_confidence'
      if (!team_id || !election_type) {
        return NextResponse.json({ error: "Missing team_id or election_type" }, { status: 400 });
      }

      // Check membership
      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id, role")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "Only team members can call an election" }, { status: 403 });
      }

      // Check if an election is already active
      const { data: activeElection } = await supabase
        .from("competition_team_elections")
        .select("id")
        .eq("team_id", team_id)
        .eq("status", "active")
        .maybeSingle();

      if (activeElection) {
        return NextResponse.json({ error: "An election is already actively underway for this team" }, { status: 400 });
      }

      const { data: election, error: electErr } = await supabase
        .from("competition_team_elections")
        .insert({
          team_id,
          election_type,
          initiated_by: user.id,
          candidate_ids: candidate_ids.length > 0 ? candidate_ids : [user.id],
          status: "active",
        })
        .select()
        .single();

      if (electErr) throw electErr;

      return NextResponse.json({ ok: true, election });
    }

    // ACTION: VOTE IN ELECTION
    if (action === "vote") {
      const { election_id, candidate_id } = body;
      if (!election_id || !candidate_id) {
        return NextResponse.json({ error: "Missing election_id or candidate_id" }, { status: 400 });
      }

      const { data: election } = await supabase
        .from("competition_team_elections")
        .select("*, team:competition_teams(id, name)")
        .eq("id", election_id)
        .eq("status", "active")
        .maybeSingle();

      if (!election) {
        return NextResponse.json({ error: "No active election found" }, { status: 404 });
      }

      // Verify voter is a member of the team
      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id")
        .eq("team_id", election.team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "Only team members can vote in this election" }, { status: 403 });
      }

      const { error: voteErr } = await supabase
        .from("competition_team_votes")
        .insert({
          election_id,
          voter_id: user.id,
          candidate_id,
        });

      if (voteErr) {
        if (voteErr.code === "23505") {
          return NextResponse.json({ error: "You have already cast your vote in this election" }, { status: 400 });
        }
        throw voteErr;
      }

      return NextResponse.json({ ok: true, message: "Vote cast successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
