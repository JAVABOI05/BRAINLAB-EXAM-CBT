"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useLearnerTheme } from "../components/LearnerThemeProvider";
import ArenaThemeToggle from "../components/arena/ArenaThemeToggle";

interface Competition {
  id: string;
  title: string;
  description: string;
  code: string;
  competition_type: string;
  status: "draft" | "pending_approval" | "scheduled" | "published" | "active" | "paused" | "cancelled" | "concluded";
  start_time: string | null;
  end_time: string | null;
  entry_fee?: number;
  entry_fee_kobo?: number;
  access_mode?: "free" | "code" | "request" | "paid";
  approval_mode?: "automatic" | "manual";
  prize_pool?: string;
  current_participants?: number;
  max_participants?: number;
  rules?: {
    question_count?: number;
    duration_seconds?: number;
  };
}

interface Challenge {
  id: string;
  is_outgoing: boolean;
  subject: string;
  question_count: number;
  duration_minutes: number;
  difficulty: string;
  status: "pending" | "accepted" | "declined" | "expired" | "completed" | "cancelled";
  challenge_type?: "individual" | "team";
  challenger_team_id?: string | null;
  challenged_team_id?: string | null;
  challenger_team?: { id: string; name: string; slug: string; avatar_url: string | null } | null;
  challenged_team?: { id: string; name: string; slug: string; avatar_url: string | null } | null;
  match_id?: string | null;
  created_at: string;
  challenger?: {
    display_name?: string;
    avatar_url?: string | null;
  };
  challenged?: {
    display_name?: string;
    avatar_url?: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  motto: string;
  avatar_url: string | null;
  is_recruiting: boolean;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  member_count?: number;
  is_my_team?: boolean;
}

type FounderSearchResult = { display_name: string; slug: string; avatar_url: string | null };

interface LeaderboardEntry {
  rank: number | string;
  is_me: boolean;
  elo_rating: number;
  peak_elo: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  win_rate: number;
  win_streak: number;
  tier: string;
  profile?: {
    full_name?: string;
    username?: string;
  };
}

interface SpectatorMatch {
  id: string;
  match_type: string;
  status: string;
  score_a: number;
  score_b: number;
  duration_seconds: number;
  started_at: string;
  spectators_count: number;
  metadata?: {
    subject?: string;
    player_a_name?: string;
    player_b_name?: string;
  };
}

export default function ChallengeArenaPage() {
  const router = useRouter();
  const { isDark } = useLearnerTheme();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"tournaments" | "challenges" | "teams" | "leaderboard" | "spectate">("tournaments");

  // User state
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [myRating, setMyRating] = useState<LeaderboardEntry | null>(null);

  // Data states
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myTeamRole, setMyTeamRole] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [spectatorMatches, setSpectatorMatches] = useState<SpectatorMatch[]>([]);

  // Emergency Banner
  const [emergencyAlert, setEmergencyAlert] = useState<{ is_paused: boolean; announcement: string } | null>(null);

  // Challenge modal
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [newChallengeSubject, setNewChallengeSubject] = useState("Mathematics");
  const [newChallengeQCount, setNewChallengeQCount] = useState(10);
  const [newChallengeDuration, setNewChallengeDuration] = useState(5);
  const [newChallengeDifficulty, setNewChallengeDifficulty] = useState("medium");
  const [newChallengeMatchMode, setNewChallengeMatchMode] = useState<"ranked" | "friendly">("ranked");
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [showTeamChallengeModal, setShowTeamChallengeModal] = useState(false);
  const [teamChallengeTargetId, setTeamChallengeTargetId] = useState("");
  const [teamChallengeRosterSize, setTeamChallengeRosterSize] = useState(2);
  const [submittingTeamChallenge, setSubmittingTeamChallenge] = useState(false);

  // Squad modal
  const [showCreateSquadModal, setShowCreateSquadModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadMotto, setNewSquadMotto] = useState("");
  const [founderSearch, setFounderSearch] = useState("");
  const [founderSearchResults, setFounderSearchResults] = useState<FounderSearchResult[]>([]);
  const [selectedFounders, setSelectedFounders] = useState<FounderSearchResult[]>([]);
  const [founderSearchLoading, setFounderSearchLoading] = useState(false);
  const [submittingSquad, setSubmittingSquad] = useState(false);

  // Tournament registration state
  const [registeringCompId, setRegisteringCompId] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Fetch initial user & arena data
  const loadArenaData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get current auth user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user ? { id: user.id, email: user.email } : null);

      // 2. Fetch emergency status
      fetch("/api/competition/emergency-controls")
        .then((r) => r.json())
        .then((data) => {
          if (data.controls && (data.controls.is_paused || data.controls.announcement)) {
            setEmergencyAlert(data.controls);
          }
        })
        .catch(() => {});

      // 3. Fetch Competitions
      const compRes = await fetch("/api/competition/competitions");
      if (compRes.ok) {
        const compJson = await compRes.json();
        setCompetitions(compJson.competitions || []);
      }

      // 4. Fetch Challenges
      const [chalRes, openChallengeRes] = await Promise.all([
        fetch("/api/competition/challenges?filter=all"),
        fetch("/api/competition/challenges?filter=open"),
      ]);
      const ownChallengeJson = chalRes.ok ? await chalRes.json() : { challenges: [] };
      const openChallengeJson = openChallengeRes.ok ? await openChallengeRes.json() : { challenges: [] };
      const challengeRows = [...(ownChallengeJson.challenges || []), ...(openChallengeJson.challenges || [])];
      setChallenges(Array.from(new Map(challengeRows.map((challenge) => [challenge.id, challenge])).values()));

      // 5. Fetch Teams
      const teamRes = await fetch("/api/competition/teams");
      if (teamRes.ok) {
        const teamJson = await teamRes.json();
        setTeams(teamJson.teams || []);
        setMyTeamId(teamJson.my_team_id || null);
        setMyTeamRole(teamJson.my_team_role || null);
      }

      // 6. Fetch Leaderboard & User Rating
      const leadRes = await fetch("/api/competition/leaderboards?type=all");
      if (leadRes.ok) {
        const leadJson = await leadRes.json();
        setLeaderboard(leadJson.individuals || []);
        if (leadJson.my_rank) {
          setMyRating(leadJson.my_rank);
        }
      }

      // 7. Fetch Spectator Matches
      const specRes = await fetch("/api/competition/spectators");
      if (specRes.ok) {
        const specJson = await specRes.json();
        setSpectatorMatches(specJson.matches || []);
      }
    } catch (err) {
      console.error("Error loading arena data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArenaData();
    const refreshInterval = setInterval(loadArenaData, 15000); // 15s auto-refresh
    return () => clearInterval(refreshInterval);
  }, [loadArenaData]);

  // Handle Create Challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push("/auth/signin?redirect=/challenge-arena");
      return;
    }

    try {
      setSubmittingChallenge(true);
      const res = await fetch("/api/competition/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newChallengeSubject,
          question_count: newChallengeQCount,
          duration_minutes: newChallengeDuration,
          difficulty: newChallengeDifficulty,
          match_mode: newChallengeMatchMode,
          challenged_id: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create challenge");

      setShowCreateChallengeModal(false);
      loadArenaData();
      alert("⚔️ Challenge created and posted to the Arena!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating challenge");
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleCreateTeamChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !myTeamId) {
      alert("You must be an active member of a team before issuing a team challenge.");
      return;
    }
    if (myTeamRole !== "captain" && myTeamRole !== "co_captain") {
      alert("Only your team's captain or co-captain can issue a team challenge.");
      return;
    }
    try {
      setSubmittingTeamChallenge(true);
      const response = await fetch("/api/competition/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_type: "team",
          challenger_team_id: myTeamId,
          challenged_team_id: teamChallengeTargetId || null,
          roster_size: teamChallengeRosterSize,
          subject: newChallengeSubject,
          question_count: newChallengeQCount,
          duration_minutes: newChallengeDuration,
          difficulty: newChallengeDifficulty,
          match_mode: newChallengeMatchMode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to issue team challenge.");
      setShowTeamChallengeModal(false);
      setTeamChallengeTargetId("");
      await loadArenaData();
      alert(teamChallengeTargetId
        ? "Team challenge sent to the selected team."
        : "Open team challenge published to the Arena.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to issue team challenge.");
    } finally {
      setSubmittingTeamChallenge(false);
    }
  };

  // Handle Accept Challenge
  const handleAcceptChallenge = async (challengeId: string, acceptingTeamId?: string) => {
    if (!currentUser) {
      router.push("/auth/signin?redirect=/challenge-arena");
      return;
    }

    try {
      const res = await fetch("/api/competition/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          action: "accept",
          ...(acceptingTeamId ? { accepting_team_id: acceptingTeamId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept challenge");

      if (data.match_id) {
        // Direct redirect to live match lobby!
        router.push(`/challenge-arena/matches/${data.match_id}`);
      } else {
        loadArenaData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error accepting challenge");
    }
  };

  const searchFoundingMembers = async () => {
    if (founderSearch.trim().length < 2) return;
    setFounderSearchLoading(true);
    try {
      const response = await fetch(`/api/competition/profiles/search?q=${encodeURIComponent(founderSearch.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to search players.");
      setFounderSearchResults(data.players || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to search players.");
    } finally {
      setFounderSearchLoading(false);
    }
  };

  const addFoundingMember = (player: FounderSearchResult) => {
    setSelectedFounders(current => {
      if (current.some(item => item.slug === player.slug)) return current;
      if (current.length >= 9) {
        alert("A team request can invite up to nine other founding members.");
        return current;
      }
      return [...current, player];
    });
    setFounderSearchResults([]);
    setFounderSearch("");
  };

  // Handle Create Squad
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push("/auth/signin?redirect=/challenge-arena");
      return;
    }

    try {
      setSubmittingSquad(true);
      const res = await fetch("/api/competition/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSquadName,
          motto: newSquadMotto,
          founding_member_slugs: selectedFounders.map((founder) => founder.slug),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to form squad");

      setShowCreateSquadModal(false);
      setNewSquadName("");
      setNewSquadMotto("");
      setSelectedFounders([]);
      setFounderSearch("");
      setFounderSearchResults([]);
      loadArenaData();
      alert(data.message || "Your team request has been submitted for review.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating squad");
    } finally {
      setSubmittingSquad(false);
    }
  };

  // Handle Tournament Registration (with BACHS payment support)
  const handleRegisterTournament = async (competitionId: string) => {
    if (!currentUser) {
      router.push(`/auth/signin?redirect=/challenge-arena`);
      return;
    }

    try {
      setRegisteringCompId(competitionId);
      setRegistrationMessage(null);

      const competition = competitions.find((item) => item.id === competitionId);
      let accessCode: string | undefined;
      if (competition?.access_mode === "code") {
        const enteredCode = window.prompt("Enter the access code supplied by the competition organiser:");
        if (!enteredCode?.trim()) {
          setRegisteringCompId(null);
          return;
        }
        accessCode = enteredCode.trim().toUpperCase();
      }

      const res = await fetch(`/api/competition/competitions/${competitionId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register for competition");

      if (data.requiresPayment && data.checkoutUrl) {
        // Redirect to BACHS hosted checkout
        window.location.href = data.checkoutUrl;
        return;
      }

      setRegistrationMessage({
        text: data.message || (competition?.access_mode === "request" || competition?.approval_mode === "manual"
          ? "✓ Registration request submitted for organiser approval."
          : "✓ Registered successfully for this competition!"),
        ok: true,
      });
      loadArenaData();
    } catch (err: unknown) {
      setRegistrationMessage({ text: err instanceof Error ? err.message : "Registration failed", ok: false });
    } finally {
      setRegisteringCompId(null);
    }
  };

  // Helper for tier color
  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "grandmaster":
        return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      case "master":
        return "text-purple-400 bg-purple-400/10 border-purple-400/30";
      case "diamond":
        return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
      case "platinum":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      case "gold":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
      case "silver":
        return "text-slate-300 bg-slate-400/10 border-slate-400/30";
      default:
        return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${isDark ? "bg-[#060B18] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* ARENA TOP BAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-3.5 flex items-center justify-between ${isDark ? "bg-[#0B1536]/85 border-slate-800" : "bg-white/85 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-slate-700/20 text-slate-400 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-[#FF5238] uppercase">BRAINLAB</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">COMPETITION ARENA</span>
              </div>
              <p className="text-[11px] text-slate-400">Competitive Examination & Esports Learning Hub</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className={`hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-2xl border text-xs font-bold ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-slate-100 border-slate-200"}`}>
              <span className={`px-2 py-0.5 rounded-md border font-black uppercase text-[10px] ${getTierColor(myRating?.tier || "Bronze")}`}>
                {myRating?.tier || "Bronze"}
              </span>
              <span className="text-blue-500 font-mono font-black">{myRating?.elo_rating || 1200} ELO</span>
              <span className="text-orange-500 font-mono">🔥 {myRating?.win_streak || 0} Streak</span>
            </div>
          ) : (
            <Link href="/auth/signin?redirect=/challenge-arena" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition">
              Sign In to Compete
            </Link>
          )}

          <Link href="/challenge-arena/appeals" className="hidden sm:inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-300 transition">
            Appeals Centre
          </Link>
          <Link href="/challenge-arena/team-requests" className="hidden md:inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition">Team Requests</Link>
          <Link href="/challenge-arena/rating-history" className="hidden md:inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition">Rating History</Link>
          {currentUser && <Link href="/challenge-arena/profile" className="hidden md:inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition">My Profile</Link>}
          {currentUser && <Link href="/challenge-arena/connections" className="hidden lg:inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 transition">Connections</Link>}
          <ArenaThemeToggle />
        </div>
      </header>

      {/* EMERGENCY ANNOUNCEMENT BANNER */}
      {emergencyAlert && (
        <div className="bg-gradient-to-r from-red-600 to-[#FF5238] text-white px-6 py-2.5 text-center text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md">
          <span>⚠️ ARENA ADVISORY:</span>
          <span>{emergencyAlert.announcement || "Match generation temporarily paused for scheduled maintenance."}</span>
        </div>
      )}

      {/* CONTENDER HERO STRIP */}
      <section className={`border-b py-8 px-6 relative overflow-hidden ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-black tracking-widest text-blue-400 uppercase">OFFICIAL COMPETITIVE LEAGUE</span>
            <h1 className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">Prove Your Academic Mastery</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Compete in official tournaments, challenge fellow candidates in real-time 1v1 showdowns, assemble squad teams, and climb the Grandmaster Elo leaderboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateChallengeModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/25 transition transform active:scale-95 flex items-center gap-2"
            >
              <span>⚔️</span> Issue 1v1 Challenge
            </button>

            <button
              onClick={() => setShowCreateSquadModal(true)}
              className={`px-5 py-3 rounded-2xl border font-bold text-sm transition transform active:scale-95 flex items-center gap-2 ${
                isDark ? "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200" : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              <span>🛡️</span> Form Squad Team
            </button>
          </div>
        </div>
      </section>

      {/* ARENA NAVIGATION TABS */}
      <div className={`border-b sticky top-[61px] z-30 backdrop-blur-md px-6 ${isDark ? "bg-[#060B18]/90 border-slate-800" : "bg-slate-50/90 border-slate-200"}`}>
        <div className="max-w-6xl mx-auto flex overflow-x-auto gap-2 py-2.5 no-scrollbar">
          {[
            { id: "tournaments", label: "Official Tournaments", icon: "🏆", count: competitions.length },
            { id: "challenges", label: "1v1 Battle Arena", icon: "⚔️", count: challenges.filter((c) => c.status === "pending").length },
            { id: "teams", label: "Squad Teams", icon: "🛡️", count: teams.length },
            { id: "leaderboard", label: "Elo Leaderboards", icon: "👑" },
            { id: "spectate", label: "Live Spectate", icon: "👁️", count: spectatorMatches.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-blue-500/20 text-blue-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT CONTAINER */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">

        {/* =========================================================================
            TAB 1: OFFICIAL TOURNAMENTS & COMPETITIONS
           ========================================================================= */}
        {activeTab === "tournaments" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Official Grand Prix & Tournaments</h2>
                <p className="text-slate-400 text-xs">Structured competitive exams with verified leaderboards and awards</p>
              </div>
            </div>

            {registrationMessage && (
              <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold text-center ${
                registrationMessage.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}>
                {registrationMessage.text}
              </div>
            )}

            {competitions.length === 0 ? (
              <div className={`p-12 rounded-3xl border text-center shadow-lg ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-3xl">🏆</div>
                <h3 className="text-lg font-black">No Active Tournaments Scheduled</h3>
                <p className="text-slate-400 text-xs mt-1">Official BrainLab championships will appear here once published by administrators.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {competitions.map((comp) => {
                  const entryFee = Number(comp.entry_fee) || 0;
                  const isFree = entryFee === 0;

                  return (
                    <div
                      key={comp.id}
                      className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-2xl ${
                        isDark ? "bg-[#0D172E] border-slate-800 hover:border-blue-500/40" : "bg-white border-slate-200 hover:border-blue-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            comp.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                              : comp.status === "scheduled" || comp.status === "published"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-slate-700/30 text-slate-400"
                          }`}>
                            {comp.status.toUpperCase()}
                          </span>
                          <span className={`text-xs font-black ${isFree ? "text-emerald-400" : "text-amber-400"}`}>
                            {isFree ? "FREE ENTRY" : `₦${entryFee.toLocaleString()}`}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold line-clamp-1">{comp.title}</h3>
                        <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                          {comp.description || "Official competitive examination testing core curriculum knowledge."}
                        </p>

                        <div className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border my-4 text-[11px] font-semibold ${
                          isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Questions</span>
                            <span className="font-bold">{comp.rules?.question_count || 40} Items</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
                            <span className="font-bold">{Math.round((comp.rules?.duration_seconds || 1800) / 60)} Mins</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Prize Pool</span>
                            <span className="font-bold text-amber-400">{comp.prize_pool || "XP & Trophy"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Contenders</span>
                            <span className="font-bold text-blue-400">{comp.current_participants || 0} Registered</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRegisterTournament(comp.id)}
                        disabled={registeringCompId === comp.id}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-blue-600/20 active:scale-95"
                      >
                        {registeringCompId === comp.id
                          ? "Processing..."
                          : isFree
                          ? "Register Free Now"
                          : `Pay ₦${entryFee.toLocaleString()} (BACHS) & Enter`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: 1V1 BATTLE ARENA & OPEN CHALLENGES
           ========================================================================= */}
        {activeTab === "challenges" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">1v1 Direct & Open Challenges</h2>
                <p className="text-slate-400 text-xs">Compete in individual duels and coordinated team battles.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCreateChallengeModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2"
                >
                  <span>⚔️</span> Issue 1v1
                </button>
                {myTeamId && (myTeamRole === "captain" || myTeamRole === "co_captain") && <button
                  onClick={() => setShowTeamChallengeModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#FF5238] hover:bg-[#e9432d] text-white font-bold text-xs transition flex items-center gap-2"
                >
                  <span>🛡️</span> Challenge a Team
                </button>}
              </div>
            </div>

            {/* OPEN CHALLENGES BOARD */}
            <div className={`p-6 rounded-3xl border shadow-xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <span>🔥</span> Pending Challenges ({challenges.filter((c) => c.status === "pending").length})
              </h3>

              {challenges.filter((c) => c.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No open challenges currently pending. Be the first to issue a duel!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {challenges
                    .filter((c) => c.status === "pending")
                    .map((chal) => (
                      <div
                        key={chal.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition hover:border-blue-500/50 ${
                          isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-black uppercase text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                              {chal.subject}
                            </span>
                            <span className="text-[11px] text-slate-400">{chal.duration_minutes} Mins</span>
                          </div>
                          <h4 className="font-bold text-sm">
                            {chal.challenge_type === "team"
                              ? (chal.challenger_team?.name || "Arena team")
                              : (chal.challenger?.display_name || "Private player")}
                          </h4>
                          {chal.challenge_type === "team" && <p className="text-[11px] font-bold text-[#FF5238] mt-1">TEAM BATTLE · {chal.challenged_team?.name || "OPEN CHALLENGE"}</p>}
                          <p className="text-xs text-slate-400 mt-1">
                            {chal.question_count} Questions • {chal.difficulty.toUpperCase()} Difficulty
                          </p>
                        </div>

                        {chal.is_outgoing ? (
                          <span className="text-xs text-slate-400 italic text-center py-2">Your challenge is awaiting acceptance</span>
                        ) : chal.challenge_type === "team" ? (
                          <button
                            disabled={!myTeamId || submittingTeamChallenge}
                            onClick={() => myTeamId && handleAcceptChallenge(chal.id, myTeamId)}
                            className="w-full py-2.5 rounded-xl bg-[#FF5238] hover:bg-[#e9432d] disabled:opacity-40 text-white font-bold text-xs transition"
                          >
                            {myTeamId ? "Accept with My Team" : "Join a team to accept"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAcceptChallenge(chal.id)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 transform active:scale-95"
                          >
                            Accept & Enter Room ⚔️
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: SQUADS & TEAMS
           ========================================================================= */}
        {activeTab === "teams" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Squad Teams & Democratic Guilds</h2>
                <p className="text-slate-400 text-xs">Assemble or join competitive squads with democratic leadership</p>
              </div>
              <button
                onClick={() => setShowCreateSquadModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto"
              >
                <span>🛡️</span> Form New Squad
              </button>
            </div>

            {myTeamId && (
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h4 className="font-bold text-sm">You are an active Squad member!</h4>
                    <p className="text-xs text-slate-400">View roster, match records, and vote in squad elections.</p>
                  </div>
                </div>
                <Link
                  href={`/challenge-arena/teams/${myTeamId}`}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                >
                  Open Squad Profile →
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                    isDark ? "bg-[#0D172E] border-slate-800 hover:border-slate-700" : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-base">{team.name}</h3>
                        <p className="text-xs text-slate-400">{team.member_count || 1} Members</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 italic mb-4">&ldquo;{team.motto}&rdquo;</p>

                    <div className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border text-xs font-semibold mb-4 ${
                      isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Squad Elo</span>
                        <span className="text-blue-500 font-black">{team.elo_rating}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Record</span>
                        <span className="text-slate-200 font-bold">{team.matches_won}W - {team.matches_lost}L</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/challenge-arena/teams/${team.id}`}
                    className="w-full py-2.5 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold text-xs text-center transition"
                  >
                    View Roster & Details →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: ELO LEADERBOARDS
           ========================================================================= */}
        {activeTab === "leaderboard" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Arena Hall of Fame</h2>
                <p className="text-slate-400 text-xs">Global contender ratings calculated via server-authoritative Elo</p>
              </div>
            </div>

            <div className={`rounded-3xl border shadow-xl overflow-hidden ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className={`border-b text-slate-400 font-bold uppercase text-[10px] tracking-wider ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Contender</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Elo Rating</th>
                      <th className="py-3 px-4">Win Rate</th>
                      <th className="py-3 px-4">Streak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {leaderboard.map((item) => {
                      const isMe = item.is_me;
                      return (
                        <tr
                          key={item.rank}
                          className={`transition ${
                            isMe
                              ? "bg-blue-500/10 font-bold"
                              : isDark
                              ? "hover:bg-slate-800/30"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {item.rank === 1 ? "🥇 1" : item.rank === 2 ? "🥈 2" : item.rank === 3 ? "🥉 3" : `#${item.rank}`}
                          </td>
                          <td className="py-3.5 px-4 font-semibold">
                            {item.profile?.full_name || item.profile?.username || "Private player"}
                            {isMe && <span className="text-xs text-blue-400 ml-1.5">(You)</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getTierColor(item.tier)}`}>
                              {item.tier}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-blue-500">{item.elo_rating}</td>
                          <td className="py-3.5 px-4 font-mono text-emerald-400">{item.win_rate}%</td>
                          <td className="py-3.5 px-4 font-mono text-orange-400">🔥 {item.win_streak}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: LIVE SPECTATOR ARENA
           ========================================================================= */}
        {activeTab === "spectate" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-black">Live Spectator Broadcasts</h2>
              <p className="text-slate-400 text-xs">Watch active matches with 30-second anti-cheat broadcast latency</p>
            </div>

            {spectatorMatches.length === 0 ? (
              <div className={`p-12 rounded-3xl border text-center shadow-lg ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-3xl">👁️</div>
                <h3 className="text-lg font-black">No Live Matches In Progress</h3>
                <p className="text-slate-400 text-xs mt-1">Ongoing 1v1 showdowns and squad battles will appear here live.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {spectatorMatches.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-3xl border p-6 flex flex-col justify-between gap-4 ${
                      isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE
                        </span>
                        <span className="text-xs text-slate-400">👁️ {m.spectators_count} Watching</span>
                      </div>

                      <h4 className="font-bold text-sm mb-3">{m.metadata?.subject || "General"} Duel</h4>

                      {/* Score comparison */}
                      <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                        isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span>{m.metadata?.player_a_name || "Player 1"}: {m.score_a}</span>
                        <span className="text-slate-500">VS</span>
                        <span>{m.metadata?.player_b_name || "Player 2"}: {m.score_b}</span>
                      </div>
                    </div>

                    <Link
                      href={`/challenge-arena/matches/${m.id}?spectator=true`}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center transition"
                    >
                      Enter Spectator Stream →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE 1V1 CHALLENGE MODAL */}
      {showCreateChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">Issue 1v1 Challenge</h3>
            <p className="text-slate-400 text-xs mb-4">Set up challenge rules and broadcast to the Arena.</p>

            <form onSubmit={handleCreateChallenge} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Examination Subject</label>
                <select
                  value={newChallengeSubject}
                  onChange={(e) => setNewChallengeSubject(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                >
                  {["Mathematics", "English", "Physics", "Chemistry", "Biology", "Economics", "Government", "General"].map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Questions</label>
                  <select
                    value={newChallengeQCount}
                    onChange={(e) => setNewChallengeQCount(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Duration</label>
                  <select
                    value={newChallengeDuration}
                    onChange={(e) => setNewChallengeDuration(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  >
                    <option value={3}>3 Minutes</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Match Type</label>
                <select
                  value={newChallengeMatchMode}
                  onChange={(e) => setNewChallengeMatchMode(e.target.value as "ranked" | "friendly")}
                  className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                >
                  <option value="ranked">Ranked — affects competitive rating</option>
                  <option value="friendly">Friendly — practice, no rating change</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 block">Invite founding members (at least one other player)</label>
                <div className="flex gap-2">
                  <input value={founderSearch} onChange={(e) => setFounderSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchFoundingMembers(); } }} placeholder="Search public Arena players…" className={`min-w-0 flex-1 p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`} />
                  <button type="button" onClick={searchFoundingMembers} disabled={founderSearchLoading || founderSearch.trim().length < 2} className="rounded-xl bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-50">{founderSearchLoading ? "Searching…" : "Search"}</button>
                </div>
                {founderSearchResults.length > 0 && <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-700/30">
                  {founderSearchResults.map(player => <button type="button" key={player.slug} onClick={() => addFoundingMember(player)} className="flex w-full items-center justify-between gap-3 border-b border-slate-700/20 px-3 py-2 text-left last:border-0 hover:bg-blue-500/10"><span className="text-sm font-semibold">{player.display_name}</span><span className="text-xs font-bold text-blue-500">Invite +</span></button>)}
                </div>}
                {selectedFounders.length > 0 && <div className="flex flex-wrap gap-2">{selectedFounders.map(player => <span key={player.slug} className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-300">{player.display_name}<button type="button" onClick={() => setSelectedFounders(current => current.filter(item => item.slug !== player.slug))} aria-label={`Remove ${player.display_name}`} className="text-base leading-none">×</button></span>)}</div>}
                <p className="text-[11px] text-slate-500">Every invited founder must accept. The Arena administrator then approves the request, and the founding members elect their captain. Only players with public Arena profiles appear in search.</p>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChallenge}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-blue-600/25"
                >
                  {submittingChallenge ? "Posting..." : "Broadcast Challenge ⚔️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEAM CHALLENGE MODAL */}
      {showTeamChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className={`max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">Create a Team Battle</h3>
            <p className="text-slate-400 text-xs mb-5">Only your team captain or co-captain can publish the challenge. Rosters are locked when the opposing team accepts.</p>
            <form onSubmit={handleCreateTeamChallenge} className="flex flex-col gap-4">
              <label className="text-xs font-bold text-slate-400">Opposing team
                <select value={teamChallengeTargetId} onChange={(event) => setTeamChallengeTargetId(event.target.value)} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  <option value="">Open challenge — any eligible team</option>
                  {teams.filter((team) => team.id !== myTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-400">Battle format
                <select value={teamChallengeRosterSize} onChange={(event) => setTeamChallengeRosterSize(Number(event.target.value))} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  <option value={2}>2 vs 2</option><option value={3}>3 vs 3</option><option value={4}>4 vs 4</option><option value={5}>5 vs 5</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-400">Subject
                <select value={newChallengeSubject} onChange={(event) => setNewChallengeSubject(event.target.value)} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  {["Mathematics","English","Physics","Chemistry","Biology","Economics","Government","General"].map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-400">Questions
                  <select value={newChallengeQCount} onChange={(event) => setNewChallengeQCount(Number(event.target.value))} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                    {[5,10,15,20].map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-400">Duration
                  <select value={newChallengeDuration} onChange={(event) => setNewChallengeDuration(Number(event.target.value))} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                    {[3,5,10].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                  </select>
                </label>
              </div>
              <label className="text-xs font-bold text-slate-400">Match type
                <select value={newChallengeMatchMode} onChange={(event) => setNewChallengeMatchMode(event.target.value as "ranked" | "friendly")} className={`mt-1 w-full p-3 rounded-xl border text-sm ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                  <option value="ranked">Ranked — affects team rating</option><option value="friendly">Friendly — no rating change</option>
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTeamChallengeModal(false)} className="px-4 py-2.5 rounded-xl text-slate-400 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={submittingTeamChallenge} className="px-5 py-2.5 rounded-xl bg-[#FF5238] hover:bg-[#e9432d] text-white text-sm font-bold disabled:opacity-50">{submittingTeamChallenge ? "Publishing…" : "Publish Team Challenge"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SQUAD MODAL */}
      {showCreateSquadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">Form New Squad Team</h3>
            <p className="text-slate-400 text-xs mb-4">You will be designated as the founding Captain.</p>

            <form onSubmit={handleCreateSquad} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Squad Name</label>
                <input
                  type="text"
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  placeholder="e.g. Apex Scholars"
                  required
                  className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Motto / Battle Cry</label>
                <input
                  type="text"
                  value={newSquadMotto}
                  onChange={(e) => setNewSquadMotto(e.target.value)}
                  placeholder="e.g. Rise Together, Win Together"
                  className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSquadModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSquad || !newSquadName.trim() || selectedFounders.length < 1}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg shadow-blue-600/25"
                >
                  {submittingSquad ? "Submitting..." : "Submit team request 🛡️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
