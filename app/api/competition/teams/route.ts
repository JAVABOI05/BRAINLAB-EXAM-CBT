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
        .select("id, public_member_id, user_id, role, joined_at, is_active")
        .eq("team_id", teamId);

      const memberUserIds = members?.map((m) => m.user_id) || [];
      let profilesMap: Record<string, { full_name?: string; username?: string; avatar_url?: string }> = {};

      if (memberUserIds.length > 0) {
        let profileQuery = supabase
          .from("competition_public_profiles")
          .select("user_id, display_name, avatar_url, visibility")
          .in("user_id", memberUserIds)
          .eq("visibility", "public");
        if (user) profileQuery = profileQuery.or(`visibility.eq.public,user_id.eq.${user.id}`);
        const { data: profiles } = await profileQuery;

        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map((profile) => [profile.user_id, {
            full_name: profile.display_name,
            username: profile.display_name,
            avatar_url: profile.avatar_url || undefined,
          }]));
        }
      }

      const publicMemberByUserId = new Map((members || []).map((member) => [member.user_id, member.public_member_id]));
      const enrichedMembers = (members || []).map((member) => {
        const { user_id: _privateUserId, ...safeMember } = member;
        return {
          ...safeMember,
          is_me: Boolean(user && member.user_id === user.id),
          profile: profilesMap[member.user_id] || { full_name: "Private member" },
        };
      });

      // Fetch active elections
      const { data: activeElection } = await supabase
        .from("competition_team_elections")
        .select("*")
        .eq("team_id", teamId)
        .eq("status", "active")
        .maybeSingle();

      // If captain or co-captain, fetch pending applications
      let applications: Array<{ id: string; user_id: string; message: string; created_at: string; profile?: unknown }> = [];
      const isLeader = members?.some((m) => m.user_id === user?.id && m.is_active === true && (m.role === "captain" || m.role === "co_captain"));
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

          const { data: publicAppProfiles } = await supabase
            .from("competition_public_profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", appUserIds)
            .eq("visibility", "public");
          const appProfilesMap = Object.fromEntries((publicAppProfiles || []).map((profile) => [profile.user_id, profile]));
          applications = apps.map((application) => {
            const { user_id: _privateApplicantId, ...safeApplication } = application;
            const profile = appProfilesMap[application.user_id];
            return {
              ...safeApplication,
              profile: profile
                ? { full_name: profile.display_name, username: profile.display_name, avatar_url: profile.avatar_url }
                : { full_name: "Private player" },
            };
          });
        }
      }

      let hasVoted = false;
      if (user && activeElection) {
        const { data: ownBallot, error: ballotError } = await supabase
          .from("competition_team_votes")
          .select("id")
          .eq("election_id", activeElection.id)
          .eq("voter_id", user.id)
          .maybeSingle();
        if (ballotError) throw ballotError;
        hasVoted = Boolean(ownBallot);
      }

      const { captain_id: _privateCaptainId, co_captain_id: _privateCoCaptainId, ...safeTeam } = team;
      const safeElection = activeElection ? (() => {
        const { candidate_ids: _privateCandidateIds, winner_id: _privateWinnerId, ...publicElection } = activeElection;
        return {
          ...publicElection,
          candidate_member_ids: (activeElection.candidate_ids || []).map((id: string) => publicMemberByUserId.get(id)).filter(Boolean),
          winner_member_id: activeElection.winner_id ? publicMemberByUserId.get(activeElection.winner_id) || null : null,
        };
      })() : null;

      return NextResponse.json({
        team: {
          ...safeTeam,
          captain_member_id: publicMemberByUserId.get(team.captain_id) || null,
          co_captain_member_id: team.co_captain_id ? publicMemberByUserId.get(team.co_captain_id) || null : null,
        },
        members: enrichedMembers,
        activeElection: safeElection,
        has_voted: hasVoted,
        applications,
        is_my_team: members?.some((member) => member.user_id === user?.id && member.is_active === true) || false,
        my_role: members?.find((member) => member.user_id === user?.id && member.is_active === true)?.role || null,
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
    const { name, motto, avatar_url, description } = body;
    if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 60) {
      return NextResponse.json({ error: "Team name must be between 3 and 60 characters." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const founderIds = Array.from(new Set([
      user.id,
      ...(Array.isArray(body.founding_member_ids)
        ? body.founding_member_ids.filter((id: unknown): id is string => typeof id === "string")
        : []),
    ])).slice(0, 10);

    const { data: existingMember } = await supabase
      .from("competition_team_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (existingMember) {
      return NextResponse.json({ error: "You are already a member of an active team." }, { status: 409 });
    }

    const { data: occupiedFounders } = await supabase
      .from("competition_team_members")
      .select("user_id")
      .in("user_id", founderIds)
      .eq("is_active", true);
    if (occupiedFounders?.length) {
      return NextResponse.json({ error: "One or more proposed founding members already belong to an active team." }, { status: 409 });
    }

    const { data: duplicateTeam } = await supabase
      .from("competition_teams")
      .select("id")
      .ilike("name", name.trim())
      .limit(1)
      .maybeSingle();
    if (duplicateTeam) {
      return NextResponse.json({ error: "A team with this name already exists." }, { status: 409 });
    }

    const { data: pendingRequest } = await supabase
      .from("competition_team_requests")
      .select("id")
      .eq("requested_by", user.id)
      .in("status", ["pending", "needs_changes"])
      .limit(1)
      .maybeSingle();
    if (pendingRequest) {
      return NextResponse.json({ error: "You already have a team request awaiting review." }, { status: 409 });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: requestRecord, error: requestError } = await supabase
      .from("competition_team_requests")
      .insert({
        requested_by: user.id,
        proposed_name: name.trim(),
        proposed_slug: `${slug}-${Date.now().toString(36)}`,
        motto: typeof motto === "string" ? motto.trim().slice(0, 120) : null,
        avatar_url: typeof avatar_url === "string" ? avatar_url : null,
        description: typeof description === "string" ? description.trim().slice(0, 1000) : null,
        founding_member_ids: founderIds,
        recruitment_mode: ["open", "invitation_only", "closed"].includes(body.recruitment_mode)
          ? body.recruitment_mode
          : "invitation_only",
      })
      .select()
      .single();
    if (requestError || !requestRecord) throw new Error(requestError?.message || "Unable to submit team request.");

    const memberRows = founderIds.map((userId) => ({
      request_id: requestRecord.id,
      user_id: userId,
      status: userId === user.id ? "accepted" : "pending",
      responded_at: userId === user.id ? new Date().toISOString() : null,
    }));
    const { error: memberError } = await supabase.from("competition_team_request_members").insert(memberRows);
    if (memberError) throw memberError;

    const inviteNotifications = founderIds.filter((id) => id !== user.id).map((id) => ({
      user_id: id,
      title: "Founding team invitation",
      message: `You have been invited to become a founding member of ${name.trim()}.`,
      type: "competition_team_founder_invite",
      metadata: { team_request_id: requestRecord.id },
    }));
    if (inviteNotifications.length) await supabase.from("notifications").insert(inviteNotifications);

    return NextResponse.json({
      ok: true,
      request: requestRecord,
      message: "Team request submitted. Founding members must accept and an Arena administrator must approve it before the permanent team is created.",
    }, { status: 202 });
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
      if (decision === "approved") {
        const { data: activeElection } = await supabase
          .from("competition_team_elections")
          .select("id")
          .eq("team_id", app.team_id)
          .eq("status", "active")
          .maybeSingle();
        if (activeElection) {
          return NextResponse.json({ error: "Team membership is locked while a democratic election is active." }, { status: 409 });
        }
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
        return NextResponse.json({ error: "The captain must initiate a leadership transfer or resignation election before leaving." }, { status: 409 });
      }

      const { data: activeElection } = await supabase
        .from("competition_team_elections")
        .select("id")
        .eq("team_id", member.team_id)
        .eq("status", "active")
        .maybeSingle();
      if (activeElection) {
        return NextResponse.json({ error: "You cannot leave while a democratic team election is active. Please vote or wait for the election to conclude." }, { status: 409 });
      }

      const { error: leaveError } = await supabase
        .from("competition_team_members")
        .update({ is_active: false })
        .eq("id", member.id)
        .eq("is_active", true);
      if (leaveError) throw leaveError;

      return NextResponse.json({ ok: true, message: "You have left the active roster. Your historical team attribution is preserved." });
    }

    // ACTION: START DEMOCRATIC ELECTION (Captaincy or No-Confidence)
    if (action === "start_election") {
      const { election_type } = body;
      if (!team_id || !["captaincy", "no_confidence"].includes(election_type)) {
        return NextResponse.json({ error: "Choose a valid team election type." }, { status: 400 });
      }

      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id, role")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member) return NextResponse.json({ error: "Only active team members can call an election." }, { status: 403 });

      const { data: team } = await supabase
        .from("competition_teams")
        .select("id, name, captain_id")
        .eq("id", team_id)
        .maybeSingle();
      if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

      const { data: activeElection } = await supabase
        .from("competition_team_elections")
        .select("id")
        .eq("team_id", team_id)
        .eq("status", "active")
        .maybeSingle();
      if (activeElection) return NextResponse.json({ error: "An election is already active for this team." }, { status: 409 });

      const { data: activeMembers, error: memberListError } = await supabase
        .from("competition_team_members")
        .select("user_id")
        .eq("team_id", team_id)
        .eq("is_active", true);
      if (memberListError) throw memberListError;
      if (!activeMembers?.length || activeMembers.length < 2) {
        return NextResponse.json({ error: "At least two active members are required to hold a team election." }, { status: 409 });
      }

      const candidateIds = election_type === "captaincy"
        ? activeMembers.map((item) => item.user_id)
        : [team.captain_id];

      const { data: election, error: electErr } = await supabase
        .from("competition_team_elections")
        .insert({
          team_id,
          election_type,
          initiated_by: user.id,
          candidate_ids: candidateIds,
          eligible_voter_count: activeMembers.length,
          support_threshold_percent: 50,
          status: "active",
          end_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      if (electErr) throw electErr;

      await supabase.from("notifications").insert(activeMembers.map((item) => ({
        user_id: item.user_id,
        title: election_type === "captaincy" ? "Team captain election opened" : "Team no-confidence vote opened",
        message: election_type === "captaincy"
          ? `A confidential captaincy ballot is open for ${team.name}. Each active member has one vote.`
          : `A confidential no-confidence ballot is open for ${team.name}. Each active member may support or oppose the motion.`,
        type: "competition_team_election_started",
        metadata: { team_id, election_id: election.id, election_type },
      })));

      return NextResponse.json({ ok: true, election });
    }

    // ACTION: FINALISE AN EXPIRED TEAM ELECTION
    if (action === "finalize_election") {
      const { election_id } = body;
      if (!election_id) return NextResponse.json({ error: "Missing election_id." }, { status: 400 });

      const { data: election, error: electionError } = await supabase
        .from("competition_team_elections")
        .select("id, team_id, status, end_time")
        .eq("id", election_id)
        .maybeSingle();
      if (electionError) throw electionError;
      if (!election) return NextResponse.json({ error: "Election not found." }, { status: 404 });
      if (new Date(election.end_time) > new Date()) {
        return NextResponse.json({ error: "This election is still open." }, { status: 409 });
      }

      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id")
        .eq("team_id", election.team_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member) return NextResponse.json({ error: "Only active team members can finalise an expired election." }, { status: 403 });

      const { data: resultRows, error: finalizeError } = await supabase.rpc("finalize_competition_team_election", {
        p_election_id: election_id,
      });
      if (finalizeError) throw finalizeError;
      const result = Array.isArray(resultRows) ? resultRows[0] : resultRows;

      const { data: members } = await supabase
        .from("competition_team_members")
        .select("user_id")
        .eq("team_id", election.team_id)
        .eq("is_active", true);
      const message = result?.election_status === "completed"
        ? "The team captain election has concluded. The elected captain is now in office."
        : result?.election_status === "passed"
          ? "The no-confidence motion passed. An interim captain has been appointed and a new captaincy election is open."
          : result?.election_status === "tied"
            ? "The captaincy vote was tied. A runoff election has opened."
            : result?.election_status === "failed"
              ? "The team election concluded without a successful outcome."
              : "The team election has been finalised.";
      if (members?.length) {
        await supabase.from("notifications").insert(members.map((item) => ({
          user_id: item.user_id,
          title: "Team election finalised",
          message,
          type: "competition_team_election_result",
          metadata: { team_id: election.team_id, election_id, status: result?.election_status, followup_election_id: result?.followup_election_id },
        })));
      }

      return NextResponse.json({ ok: true, result });
    }

    // ACTION: CAST A CONFIDENTIAL TEAM BALLOT
    if (action === "vote") {
      const { election_id, candidate_id } = body;
      const voteChoice = body.vote_choice === "support" || body.vote_choice === "oppose" ? body.vote_choice : "candidate";
      if (!election_id || !candidate_id) {
        return NextResponse.json({ error: "Missing election_id or candidate_id." }, { status: 400 });
      }

      const { data: election, error: electionError } = await supabase
        .from("competition_team_elections")
        .select("id, team_id, election_type, candidate_ids, end_time, status")
        .eq("id", election_id)
        .eq("status", "active")
        .maybeSingle();
      if (electionError) throw electionError;
      if (!election) return NextResponse.json({ error: "No active election found." }, { status: 404 });

      const { data: member } = await supabase
        .from("competition_team_members")
        .select("id")
        .eq("team_id", election.team_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!member) return NextResponse.json({ error: "Only active team members may vote." }, { status: 403 });

      if (new Date(election.end_time) <= new Date()) {
        return NextResponse.json({ error: "The election deadline has passed. Ask a team administrator to finalise the ballot." }, { status: 409 });
      }

      const { data: team } = await supabase
        .from("competition_teams")
        .select("id, name, captain_id")
        .eq("id", election.team_id)
        .maybeSingle();
      if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

      if (election.election_type === "captaincy" &&
          (voteChoice !== "candidate" || !(election.candidate_ids || []).includes(candidate_id))) {
        return NextResponse.json({ error: "Select a valid active candidate." }, { status: 400 });
      }
      if (election.election_type === "no_confidence" &&
          (candidate_id !== team.captain_id || !["support", "oppose"].includes(voteChoice))) {
        return NextResponse.json({ error: "Choose support or oppose for the current captain." }, { status: 400 });
      }

      const { data: tallyRows, error: voteError } = await supabase.rpc("cast_competition_team_election_vote", {
        p_election_id: election_id,
        p_voter_id: user.id,
        p_candidate_id: candidate_id,
        p_vote_choice: voteChoice,
      });
      if (voteError) {
        if (voteError.code === "23505") return NextResponse.json({ error: "You have already cast your confidential vote." }, { status: 409 });
        throw voteError;
      }

      const tally = Array.isArray(tallyRows) ? tallyRows[0] : tallyRows;
      if (tally?.election_status && tally.election_status !== "active") {
        const { data: teamMembers } = await supabase
          .from("competition_team_members")
          .select("user_id")
          .eq("team_id", election.team_id)
          .eq("is_active", true);
        const resultMessage = tally.election_status === "completed"
          ? "The captaincy election is complete. The elected captain is now active."
          : tally.election_status === "passed"
            ? "The no-confidence motion passed. A new captaincy ballot has opened."
            : tally.election_status === "failed"
              ? "The no-confidence motion did not reach its required support threshold."
              : "The captaincy ballot ended in a tie. A runoff election has opened.";
        if (teamMembers?.length) {
          await supabase.from("notifications").insert(teamMembers.map((item) => ({
            user_id: item.user_id,
            title: "Team election result",
            message: resultMessage,
            type: "competition_team_election_result",
            metadata: { team_id: election.team_id, election_id, status: tally.election_status, followup_election_id: tally.followup_election_id },
          })));
        }
      }

      return NextResponse.json({
        ok: true,
        message: "Confidential vote recorded.",
        vote_count: tally?.vote_count ?? null,
        eligible_count: tally?.eligible_count ?? null,
        election_status: tally?.election_status ?? "active",
        followup_election_id: tally?.followup_election_id ?? null,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
