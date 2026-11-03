"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLearnerTheme } from "@/app/components/LearnerThemeProvider";
import ArenaThemeToggle from "@/app/components/arena/ArenaThemeToggle";

interface Member {
  id: string;
  user_id: string;
  role: "captain" | "co_captain" | "member" | "substitute";
  joined_at: string;
  profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  motto: string;
  avatar_url: string | null;
  captain_id: string;
  co_captain_id: string | null;
  is_recruiting: boolean;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  total_xp: number;
  created_at: string;
}

interface ElectionData {
  id: string;
  team_id: string;
  election_type: "captaincy" | "no_confidence";
  initiated_by: string;
  candidate_ids: string[];
  status: string;
  start_time: string;
  end_time: string;
}

interface ApplicationData {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: {
    full_name?: string;
    username?: string;
  };
}

export default function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.teamId;
  const router = useRouter();
  const { isDark } = useLearnerTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeElection, setActiveElection] = useState<ElectionData | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [isMyTeam, setIsMyTeam] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);

  // Modals & form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [showElectionModal, setShowElectionModal] = useState(false);
  const [electionType, setElectionType] = useState<"captaincy" | "no_confidence">("captaincy");

  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/competition/teams?teamId=${teamId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load team");
      }
      const data = await res.json();
      setTeam(data.team);
      setMembers(data.members || []);
      setActiveElection(data.activeElection || null);
      setApplications(data.applications || []);
      setIsMyTeam(data.is_my_team);
      setMyRole(data.my_role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading team");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Handle Apply
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/competition/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", team_id: teamId, message: applyMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");
      alert("Application sent to team leadership!");
      setShowApplyModal(false);
      setApplyMessage("");
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error applying");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Review Application
  const handleReviewApp = async (applicationId: string, decision: "approved" | "rejected") => {
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/competition/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review_application", application_id: applicationId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update application");
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error reviewing application");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Leave Team
  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team?")) return;
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/competition/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", team_id: teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave team");
      router.push("/challenge-arena");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error leaving team");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Start Election
  const handleStartElection = async () => {
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/competition/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_election",
          team_id: teamId,
          election_type: electionType,
          candidate_ids: members.map((m) => m.user_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate election");
      setShowElectionModal(false);
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error starting election");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Cast Vote
  const handleVote = async () => {
    if (!activeElection || !selectedCandidate) return;
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/competition/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          election_id: activeElection.id,
          candidate_id: selectedCandidate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cast vote");
      setVoteSubmitted(true);
      setTimeout(() => setVoteSubmitted(false), 2000);
      fetchTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error casting vote");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-[#060B18] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">LOADING TEAM DATA...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-[#060B18] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
          <h2 className="text-2xl font-black mb-2">Team Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "This team does not exist or has been disbanded."}</p>
          <Link href="/challenge-arena" className="inline-flex px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm">
            Back to Arena
          </Link>
        </div>
      </div>
    );
  }

  const winRate = team.matches_played > 0 ? Math.round((team.matches_won / team.matches_played) * 100) : 0;
  const isLeader = myRole === "captain" || myRole === "co_captain";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${isDark ? "bg-[#060B18] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* NAVBAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-3.5 flex items-center justify-between ${isDark ? "bg-[#0B1536]/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <Link href="/challenge-arena" className="p-2 rounded-lg hover:bg-slate-700/20 text-slate-400 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Team Squad Roster</h1>
            <p className="text-[11px] text-slate-400">{team.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ArenaThemeToggle />
          {isMyTeam && myRole !== "captain" && (
            <button
              onClick={handleLeaveTeam}
              disabled={submittingAction}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/30 transition"
            >
              Leave Squad
            </button>
          )}
        </div>
      </header>

      {/* TEAM PROFILE BANNER */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
          {/* Subtle gradient splash */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-600/20">
              {team.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-black">{team.name}</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  team.is_recruiting ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/30 text-slate-400"
                }`}>
                  {team.is_recruiting ? "Recruiting" : "Closed"}
                </span>
              </div>
              <p className="text-slate-400 text-sm italic mb-4">&ldquo;{team.motto}&rdquo;</p>

              {/* STATS CHIPS */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs font-bold">
                <div className={`px-3 py-1.5 rounded-xl border ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-400">Elo Rating: </span>
                  <span className="text-blue-500 text-sm font-black">{team.elo_rating}</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-400">Win Rate: </span>
                  <span className="text-emerald-400 text-sm font-black">{winRate}%</span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-slate-400">Record: </span>
                  <span className="text-slate-200 text-sm font-black">{team.matches_won}W - {team.matches_lost}L</span>
                </div>
              </div>
            </div>

            {/* ACTION CTA */}
            {!isMyTeam && team.is_recruiting && (
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition transform active:scale-95"
              >
                Apply to Join Squad
              </button>
            )}

            {isMyTeam && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowElectionModal(true)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                    isDark ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200" : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  Call Democratic Election
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            ACTIVE DEMOCRATIC ELECTION BANNER & BALLOT
           ========================================================================= */}
        {activeElection && (
          <div className="p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🗳️</span>
              <div>
                <h3 className="text-lg font-black text-amber-400">
                  {activeElection.election_type === "captaincy" ? "Democratic Captaincy Election" : "Vote of No-Confidence"}
                </h3>
                <p className="text-xs text-slate-400">All registered team members are eligible to cast 1 confidential vote.</p>
              </div>
            </div>

            {voteSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold text-center mt-3">
                ✓ Ballot submitted successfully! Thank you for participating in squad democracy.
              </div>
            ) : isMyTeam ? (
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={selectedCandidate || ""}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  className={`flex-1 p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}
                >
                  <option value="">Select candidate nominee...</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.username || "Member"} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleVote}
                  disabled={submittingAction || !selectedCandidate}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm transition shadow-lg shadow-amber-500/25"
                >
                  Cast Official Vote
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Only squad members may cast a ballot in this internal election.</p>
            )}
          </div>
        )}

        {/* =========================================================================
            APPLICATIONS QUEUE (FOR TEAM CAPTAIN / LEADERSHIP)
           ========================================================================= */}
        {isLeader && applications.length > 0 && (
          <div className={`p-6 rounded-3xl border shadow-xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              <span>📋</span> Pending Recruitment Applications ({applications.length})
            </h3>
            <div className="flex flex-col gap-3">
              {applications.map((app) => (
                <div key={app.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  <div>
                    <h4 className="font-bold text-sm">{app.profile?.full_name || app.profile?.username || "Applicant"}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">&ldquo;{app.message}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewApp(app.id, "approved")}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                    >
                      Accept Member
                    </button>
                    <button
                      onClick={() => handleReviewApp(app.id, "rejected")}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TEAM ROSTER
           ========================================================================= */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black">Active Roster</h3>
              <p className="text-slate-400 text-xs">Squad composition and member roles</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">
              {members.length} Members
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map((m) => {
              const isCap = m.role === "captain";
              const isCoCap = m.role === "co_captain";

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                    isCap
                      ? "border-amber-500/40 bg-amber-500/5 shadow-md"
                      : isDark
                      ? "border-slate-800 bg-[#0B1536]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                    isCap ? "bg-gradient-to-tr from-amber-500 to-amber-600 shadow-amber-500/20 shadow-md" : "bg-blue-600"
                  }`}>
                    {m.profile?.full_name?.slice(0, 2).toUpperCase() || "MB"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate">{m.profile?.full_name || m.profile?.username || "Squad Member"}</h4>
                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                      isCap
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : isCoCap
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-slate-700/40 text-slate-400"
                    }`}>
                      {m.role.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* APPLICATION MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">Apply to Join {team.name}</h3>
            <p className="text-slate-400 text-xs mb-4">Introduce yourself and let the captain know why you want to join.</p>
            <form onSubmit={handleApply} className="flex flex-col gap-4">
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                required
                rows={3}
                placeholder="I specialize in Mathematics and have a 1400 Elo rating..."
                className={`w-full p-3 rounded-xl border text-sm font-medium ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !applyMessage.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg shadow-blue-600/25"
                >
                  {submittingAction ? "Submitting..." : "Send Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALL ELECTION MODAL */}
      {showElectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">Call Squad Democratic Election</h3>
            <p className="text-slate-400 text-xs mb-4">Initiate an internal vote among all registered members.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Election Type</label>
                <select
                  value={electionType}
                  onChange={(e) => setElectionType(e.target.value as "captaincy" | "no_confidence")}
                  className={`w-full p-3 rounded-xl border text-sm font-semibold ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                >
                  <option value="captaincy">Captaincy Election (Elect New Leader)</option>
                  <option value="no_confidence">Vote of No-Confidence in Current Leadership</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowElectionModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartElection}
                  disabled={submittingAction}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-black transition shadow-lg shadow-amber-500/25"
                >
                  {submittingAction ? "Opening Ballot..." : "Open Squad Ballot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
