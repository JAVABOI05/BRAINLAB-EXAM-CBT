"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useLearnerTheme } from "@/app/components/LearnerThemeProvider";
import ArenaThemeToggle from "@/app/components/arena/ArenaThemeToggle";
import ArenaSpectatorChat from "@/app/components/arena/ArenaSpectatorChat";

interface QuestionSnapshot {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  question_image_url?: string | null;
  passage_id?: string | null;
  passage_title?: string | null;
  passage_text?: string | null;
  marks: number;
}

interface Participant {
  id: string;
  display_name: string;
  seat: "A" | "B";
  team_id?: string | null;
  is_me: boolean;
  is_ready: boolean;
  score: number | null;
  current_question_index: number;
  ping_ms: number;
  profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface MatchState {
  id: string;
  match_type: string;
  status: "waiting" | "lobby" | "in_progress" | "paused" | "completed" | "cancelled" | "disputed";
  winner_is_me: boolean;
  winner_team_is_mine?: boolean;
  winner_team_id?: string | null;
  has_winner: boolean;
  score_a: number;
  score_b: number;
  duration_seconds: number;
  remaining_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  questions_snapshot: QuestionSnapshot[];
  metadata?: {
    subject?: string;
    question_count?: number;
    player_a_name?: string;
    player_b_name?: string;
    match_mode?: "ranked" | "friendly";
    team_a_name?: string;
    team_b_name?: string;
    roster_size?: number;
  };
}

export default function MatchRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSpectator = searchParams.get("spectator") === "true";
  const { isDark } = useLearnerTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});

  // Active game play state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [qStartTime, setQStartTime] = useState<number>(Date.now());

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Fetch match details
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/competition/matches/${matchId}${isSpectator ? "?spectator=true" : ""}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load match room");
      }
      const data = await res.json();
      setMatch(data.match);
      setParticipants(data.participants || []);
      setMyAnswers(data.my_answers || {});
      setTimeLeft(data.match.remaining_seconds);

      // Set user's current question index if in_progress
      const me = (data.participants || []).find((participant: Participant) => participant.is_me);
      if (me && me.current_question_index !== undefined) {
        setCurrentQIndex(me.current_question_index);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading match");
    } finally {
      setLoading(false);
    }
  }, [matchId, isSpectator]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 2500); // Poll match state every 2.5s
    return () => clearInterval(interval);
  }, [fetchMatch]);

  // Sync countdown timer locally
  useEffect(() => {
    if (match?.status !== "in_progress" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [match?.status, timeLeft, fetchMatch]);

  // Send periodic heartbeat
  useEffect(() => {
    if (!matchId || isSpectator) return;
    const pingStart = Date.now();
    const hb = setInterval(async () => {
      const ping = Date.now() - pingStart;
      await fetch(`/api/competition/matches/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", ping_ms: Math.min(ping, 200) }),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(hb);
  }, [matchId, isSpectator]);

  // Handle Ready Up
  const handleToggleReady = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/competition/matches/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_ready" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update readiness");
      await fetchMatch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error toggling readiness");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Answer
  const handleSubmitAnswer = async (optKey: string) => {
    if (!match || match.status !== "in_progress" || submitting) return;
    const questions = match.questions_snapshot || [];
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    try {
      setSubmitting(true);
      setSelectedOption(optKey);
      const timeTaken = Math.max(1, Math.round((Date.now() - qStartTime) / 1000));

      const res = await fetch(`/api/competition/matches/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          question_id: currentQ.id,
          selected_option: optKey,
          time_taken_seconds: timeTaken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit answer");

      setMyAnswers((prev) => ({ ...prev, [currentQ.id]: optKey }));
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setSelectedOption(null);
      setQStartTime(Date.now());

      if (nextIdx >= questions.length) {
        // Player has finished questions!
        await fetch(`/api/competition/matches/${matchId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "finish" }),
        });
      }

      await fetchMatch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Dispute Submission
  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      setDisputeSubmitting(true);
      const res = await fetch("/api/competition/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          reason: disputeReason,
          evidence_notes: disputeNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit dispute");
      setDisputeSuccess(true);
      setTimeout(() => {
        setShowDisputeModal(false);
        setDisputeSuccess(false);
      }, 2000);
      fetchMatch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error filing dispute");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const participantA = participants.find((participant) => participant.seat === "A") || participants[0];
  const participantB = participants.find((participant) => participant.seat === "B") || participants[1];
  const myParticipant = isSpectator ? participantA : participants.find((participant) => participant.is_me);
  const opponentParticipant = isSpectator ? participantB : participants.find((participant) => !participant.is_me);
  const isTeamMatch = match.match_type === "team_vs_team";
  const teamRosterA = participants.filter((participant) => participant.seat === "A");
  const teamRosterB = participants.filter((participant) => participant.seat === "B");
  const myTeamName = myParticipant?.seat === "A" ? match.metadata?.team_a_name : match.metadata?.team_b_name;
  const winningTeamName = match.winner_team_id
    ? (match.winner_team_id === participants.find((participant) => participant.seat === "A")?.team_id
      ? match.metadata?.team_a_name : match.metadata?.team_b_name)
    : null;

  // Formatting time display
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-200 ${isDark ? "bg-[#060B18] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-400">CONNECTING TO MATCH ROOM...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-[#060B18] text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border text-center shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-3xl font-bold">!</div>
          <h2 className="text-2xl font-black mb-2">Match Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "This match room does not exist or has expired."}</p>
          <Link href="/challenge-arena" className="inline-flex px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition">
            Return to Arena
          </Link>
        </div>
      </div>
    );
  }

  const questions = match.questions_snapshot || [];
  const currentQ = questions[currentQIndex];
  const isFinishedMyQuestions = currentQIndex >= questions.length;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDark ? "bg-[#060B18] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* ARENA MATCH NAVBAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-3 flex items-center justify-between ${isDark ? "bg-[#0B1536]/80 border-slate-800" : "bg-white/80 border-slate-200"}`}>
        <div className="flex items-center gap-3">
          <Link href="/challenge-arena" className="p-2 rounded-lg hover:bg-slate-700/20 text-slate-400 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {match.match_type.toUpperCase()}
              </span>
              <h1 className="text-sm font-bold tracking-tight">
                {match.metadata?.subject || "General"} Arena Showdown
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">Match ID: {match.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* TIMER & STATUS PILL */}
        <div className="flex items-center gap-4">
          {match.status === "in_progress" && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-black text-sm border shadow-inner ${
              timeLeft <= 60
                ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
                : "bg-blue-600/10 text-blue-400 border-blue-500/30"
            }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          {match.status === "completed" && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              CONCLUDED
            </span>
          )}

          <ArenaThemeToggle />

          {isSpectator && <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[10px] font-black tracking-wider text-cyan-500">SPECTATOR VIEW</span>}
          {/* Report / Dispute Button */}
          {!isSpectator && <button
            onClick={() => setShowDisputeModal(true)}
            title="Report Match Issue"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>}
        </div>
      </header>

      {/* MATCH CONTENT AREA */}
      <main className="arena-match-canvas flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">

        {/* =========================================================================
            STATE 1: MATCH LOBBY (WAITING FOR READINESS)
           ========================================================================= */}
        {!isSpectator && match.status === "lobby" && (
          <div className="flex flex-col items-center justify-center flex-1 my-auto">
            <div className={`max-w-2xl w-full rounded-3xl p-8 border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
              <div className="text-center mb-8">
                <span className="text-xs font-black tracking-widest text-blue-500 uppercase">{isTeamMatch ? "TEAM BATTLE ROOM" : "1V1 BATTLE ROOM"}</span>
                <h2 className="text-3xl font-black mt-1">Get Ready to Compete</h2>
                <p className="text-slate-400 text-sm mt-1">{isTeamMatch ? "Every locked roster member must ready up before the team match begins." : "Both participants must ready up before the examination begins."}</p>
              </div>

              {/* VERSUS ROSTERS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  { label: isTeamMatch ? (match.metadata?.team_a_name || "Team A") : "Player A", roster: isTeamMatch ? teamRosterA : [participantA], tone: "blue" },
                  { label: isTeamMatch ? (match.metadata?.team_b_name || "Team B") : "Player B", roster: isTeamMatch ? teamRosterB : [participantB], tone: "coral" },
                ].map((side) => (
                  <section key={side.label} className={`rounded-2xl border p-4 ${isDark ? "border-slate-800 bg-[#0B1536]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-black text-sm">{side.label}</h3>
                      <span className="text-[10px] text-slate-400">{side.roster.filter((player) => player.is_ready).length}/{side.roster.length} READY</span>
                    </div>
                    <div className="space-y-2">
                      {side.roster.map((player) => (
                        <div key={player.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${player.is_ready ? "border-emerald-500/40 bg-emerald-500/5" : isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white"}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${side.tone === "blue" ? "bg-blue-600" : "bg-[#FF5238]"}`}>{player.display_name.slice(0,2).toUpperCase()}</div>
                            <div className="min-w-0"><p className="text-xs font-bold truncate">{player.display_name}{player.is_me ? " (You)" : ""}</p><p className="text-[10px] text-slate-400">{player.is_me ? `Your connection · ${player.ping_ms || 0}ms` : `Ping ${player.ping_ms || 0}ms`}</p></div>
                          </div>
                          <span className={`text-[10px] font-black ${player.is_ready ? "text-emerald-500" : "text-slate-400"}`}>{player.is_ready ? "READY" : "WAITING"}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* READY ACTION BUTTON */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleToggleReady}
                  disabled={submitting}
                  className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition shadow-xl transform active:scale-95 ${
                    myParticipant?.is_ready
                      ? "bg-slate-700 hover:bg-slate-600 text-white"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25"
                  }`}
                >
                  {myParticipant?.is_ready ? "UNREADY (STANDBY)" : "READY UP FOR BATTLE"}
                </button>
                <p className="text-xs text-slate-400">{isTeamMatch ? "The server starts the battle when every locked player is ready." : "Match will start automatically once both fighters click Ready."}</p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 2: ACTIVE MATCH (IN PROGRESS)
           ========================================================================= */}
        {match.status === "in_progress" && (
          <div className="flex flex-col gap-6">
            {/* SCORE TRACKER BAR */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-md ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
              {/* Me */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {myParticipant?.display_name?.slice(0, 2).toUpperCase() || "YOU"}
                </div>
                <div>
                  <p className="text-xs font-bold">{isSpectator ? (participantA?.display_name || "Player 1") : (myParticipant?.display_name || "You")}</p>
                  <p className="text-lg font-black text-blue-500">{myParticipant?.score ?? (isSpectator ? "Hidden" : 0)} {myParticipant?.score === null && isSpectator ? "" : "PTS"}</p>
                </div>
              </div>

              {/* Progress counter */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">PROGRESS</span>
                <span className="font-mono font-bold text-sm">
                  {Math.min(currentQIndex + 1, questions.length)} / {questions.length}
                </span>
              </div>

              {/* Opponent */}
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-xs font-bold">{isSpectator ? (participantB?.display_name || "Player 2") : (opponentParticipant?.display_name || "Opponent")}</p>
                  <p className="text-lg font-black text-[#FF5238]">{opponentParticipant?.score ?? (isSpectator ? "Hidden" : 0)} {opponentParticipant?.score === null && isSpectator ? "" : "PTS"}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#FF5238] text-white flex items-center justify-center font-bold text-sm">
                  {opponentParticipant?.display_name?.slice(0, 2).toUpperCase() || "OP"}
                </div>
              </div>
            </div>

            {/* WAITING FOR OPPONENT OR ACTIVE QUESTION CARD */}
            {isSpectator && questions.length === 0 ? (
              <div className={`rounded-3xl border p-10 text-center ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="text-4xl mb-3">👁️</div>
                <h3 className="text-xl font-black">Live match in progress</h3>
                <p className="mt-2 text-sm text-slate-400">The organiser has hidden live questions from spectators. Follow the match status and permitted reactions below.</p>
              </div>
            ) : isFinishedMyQuestions && !isSpectator ? (
              <div className={`p-12 rounded-3xl border text-center shadow-xl flex flex-col items-center gap-4 ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-3xl">✓</div>
                <h3 className="text-2xl font-black">All Questions Completed!</h3>
                <p className="text-slate-400 text-sm max-w-md">
                  You have submitted all answers. Waiting for your opponent to finish or the round clock to expire to finalize official Elo results.
                </p>
                <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mt-2" />
              </div>
            ) : currentQ ? (
              <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col gap-6 ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
                {/* Passage header if comprehension */}
                {currentQ.passage_text && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed max-h-48 overflow-y-auto ${isDark ? "bg-[#0B1536] border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    {currentQ.passage_title && <h4 className="font-bold mb-1 text-blue-400 uppercase tracking-wide">{currentQ.passage_title}</h4>}
                    <p>{currentQ.passage_text}</p>
                  </div>
                )}

                {/* Question Text */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black text-blue-500 uppercase tracking-wider">QUESTION {currentQIndex + 1}</span>
                    <span className="text-xs text-slate-400">• {currentQ.marks || 10} Points</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold leading-snug">{currentQ.question}</h3>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-3">
                  {(["A", "B", "C", "D", "E"] as const).map((key) => {
                    const optionVal = currentQ[`option_${key.toLowerCase()}` as keyof QuestionSnapshot];
                    if (!optionVal) return null;

                    const isChosen = selectedOption === key || myAnswers[currentQ.id] === key;

                    return (
                      <button
                        key={key}
                        onClick={() => handleSubmitAnswer(key)}
                        disabled={isSpectator || submitting || !!myAnswers[currentQ.id]}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 font-semibold text-sm transition-all transform active:scale-99 ${
                          isChosen
                            ? "border-blue-500 bg-blue-500/15 text-blue-400 shadow-md ring-2 ring-blue-500/20"
                            : isDark
                            ? "border-slate-800 bg-[#0B1536] hover:border-slate-700 hover:bg-[#0f1d44] text-slate-200"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isChosen ? "bg-blue-600 text-white" : isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                        }`}>
                          {key}
                        </span>
                        <span className="flex-1 leading-snug">{String(optionVal)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* =========================================================================
            STATE 3: MATCH COMPLETED (VICTORY / DEFEAT BANNER & STATS)
           ========================================================================= */}
        {match.status === "completed" && (
          <div className="flex flex-col items-center justify-center my-auto">
            <div className={`max-w-xl w-full p-8 rounded-3xl border text-center shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800" : "bg-white border-slate-200"}`}>
              {/* Winner Splash */}
              {isSpectator ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-4xl shadow-xl">🏁</div>
                  <h2 className="text-3xl font-black text-blue-400 tracking-tight">MATCH CONCLUDED</h2>
                  <p className="text-slate-400 text-sm">The official result is displayed according to the organiser&apos;s spectator visibility settings.</p>
                </div>
              ) : match.winner_is_me ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center text-4xl shadow-xl shadow-amber-500/20 animate-bounce">
                    🏆
                  </div>
                  <h2 className="text-3xl font-black text-amber-400 tracking-tight">VICTORY!</h2>
                  <p className="text-slate-400 text-sm">Phenomenal performance! You emerged victorious in the Arena.</p>
                </div>
              ) : match.has_winner ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-600 to-slate-800 text-white flex items-center justify-center text-4xl shadow-xl">
                    ⚔️
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">DEFEAT</h2>
                  <p className="text-slate-400 text-sm">Tough battle! Analyze the concepts and come back stronger.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-4xl shadow-xl">
                    🤝
                  </div>
                  <h2 className="text-3xl font-black text-blue-400 tracking-tight">HONORABLE DRAW</h2>
                  <p className="text-slate-400 text-sm">Both gladiators tied in points! Equal skill demonstrated.</p>
                </div>
              )}

              {/* FINAL SCORES SUMMARY */}
              <div className={`grid grid-cols-2 gap-4 p-5 rounded-2xl border my-6 ${isDark ? "bg-[#0B1536] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <div className="text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold">{isSpectator ? (participantA?.display_name || "Player 1") : (myParticipant?.display_name || "You")}</p>
                  <p className="text-2xl font-black text-blue-500 mt-1">{match.score_a === null ? "Hidden" : `${match.score_a} PTS`}</p>
                </div>
                <div className="text-center border-l border-slate-700/40">
                  <p className="text-xs text-slate-400 uppercase font-bold">{isSpectator ? (participantB?.display_name || "Player 2") : (opponentParticipant?.display_name || "Opponent")}</p>
                  <p className="text-2xl font-black text-[#FF5238] mt-1">{match.score_b === null ? "Hidden" : `${match.score_b} PTS`}</p>
                </div>
              </div>

              {/* XP & RATING REWARDS NOTIFICATION */}
              {!isSpectator && <div className="flex items-center justify-center gap-6 text-sm font-bold text-slate-300 mb-8">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span>★</span> +{match.winner_is_me ? "50" : "20"} Arena XP
                </span>
                {match.metadata?.match_mode === "friendly" ? (
                  <span className="flex items-center gap-1.5 text-slate-400"><span>🤝</span> Friendly match · No rating change</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-blue-400"><span>⚡</span> Rating Updated</span>
                )}
              </div>}

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/challenge-arena"
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition text-center shadow-lg shadow-blue-600/25"
                >
                  Return to Arena Hub
                </Link>
                {!isSpectator && <button
                  onClick={() => setShowDisputeModal(true)}
                  className="px-5 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-sm transition"
                >
                  File Dispute / Appeal
                </button>}
              </div>
            </div>
          </div>
        )}
        {(isSpectator || myParticipant) && <div className="mx-auto w-full max-w-5xl px-4 pb-8"><ArenaSpectatorChat matchId={match.id} /></div>}
      </main>

      {/* DISPUTE / APPEAL MODAL */}
      {!isSpectator && showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? "bg-[#0D172E] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
            <h3 className="text-xl font-black mb-1">File Official Match Dispute</h3>
            <p className="text-slate-400 text-xs mb-4">
              Disputes are sent immediately to Competition Moderators for formal audit review.
            </p>

            {disputeSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 text-center text-sm font-bold">
                ✓ Dispute logged successfully. An invigilator will review the logs.
              </div>
            ) : (
              <form onSubmit={handleFileDispute} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Reason for Dispute</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    required
                    className={`w-full p-3 rounded-xl border text-sm font-medium ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Question / Answer Key Discrepancy">Question / Answer Key Discrepancy</option>
                    <option value="Network / Disconnection Anomaly">Network / Disconnection Anomaly</option>
                    <option value="Unfair Play / External Assistance">Unfair Play / External Assistance</option>
                    <option value="Timer Synchronization Issue">Timer Synchronization Issue</option>
                    <option value="Other Technical Defect">Other Technical Defect</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Evidence & Notes (Optional)</label>
                  <textarea
                    value={disputeNotes}
                    onChange={(e) => setDisputeNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe question number or what happened..."
                    className={`w-full p-3 rounded-xl border text-sm font-medium ${isDark ? "bg-[#0B1536] border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                  />
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeModal(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disputeSubmitting || !disputeReason}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition shadow-lg shadow-red-600/25"
                  >
                    {disputeSubmitting ? "Submitting..." : "Submit Dispute"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
