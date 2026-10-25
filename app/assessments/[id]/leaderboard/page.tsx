"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import UserBadges from "../../../components/UserBadges";

interface LeaderboardEntry {
  rank: number;
  attempt_id: string;
  user_id: string;
  score: number;
  total_score: number;
  percentage: number;
  duration_seconds: number;
  submitted_at: string;
  is_current_user: boolean;
  masked_handle: string;
}

export default function AssessmentLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;

  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth.user?.id;

    // Fetch assessment title
    const { data: assess } = await supabase
      .from("learning_assessments")
      .select("title, result_release")
      .eq("id", assessmentId)
      .single();

    if (assess) setAssessmentTitle(assess.title);

    // Fetch submitted attempts
    const { data: attempts, error: attError } = await supabase
      .from("learning_practice_attempts")
      .select("id, user_id, score, total_score, percentage, started_at, ended_at, submitted_at, updated_at")
      .eq("assessment_id", assessmentId)
      .in("status", ["submitted", "auto_submitted", "completed"])
      .not("score", "is", null);

    if (attError) {
      setError("Could not load competition leaderboard at this time.");
      setLoading(false);
      return;
    }

    if (!attempts || attempts.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Sort by score desc, then by duration asc (fair tie-breaking)
    const sorted = attempts
      .map((att) => {
        const start = new Date(att.started_at).getTime();
        const end = new Date(att.ended_at || att.submitted_at || att.updated_at).getTime();
        const duration = Math.max(1, Math.round((end - start) / 1000));
        const isCurrent = currentUserId === att.user_id;

        // Masked handle for privacy (e.g. Candidate BL-98A)
        const masked = isCurrent
          ? "You (Current Candidate)"
          : `Candidate #BL-${att.id.substring(0, 4).toUpperCase()}`;

        return {
          attempt_id: att.id,
          user_id: att.user_id,
          score: Number(att.score || 0),
          total_score: Number(att.total_score || 0),
          percentage: Number(att.percentage || 0),
          duration_seconds: duration,
          submitted_at: att.submitted_at || att.updated_at,
          is_current_user: isCurrent,
          masked_handle: masked,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.duration_seconds - b.duration_seconds; // Faster completion breaks tie
      });

    const ranked: LeaderboardEntry[] = sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    setEntries(ranked);
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) loadLeaderboard();
  }, [assessmentId, loadLeaderboard]);

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-8">
            <Link
              href="/assessments"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back to All Competitions &amp; Quizzes
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-amber-800 border border-amber-200">
                🏆 Official Standings
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {assessmentTitle ? `${assessmentTitle} — Leaderboard` : "Competition Leaderboard"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Fair scoring with algorithmic tie-breaking based on verified completion speed. Candidate privacy is preserved.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {/* Podium for Top 3 */}
          {!loading && entries.length >= 3 && (
            <div className="mb-8 grid grid-cols-3 gap-3 text-center sm:gap-6">
              {/* 2nd Place */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm pt-8">
                <span className="text-3xl">🥈</span>
                <span className="mt-1 block text-xs font-bold uppercase text-slate-500">2nd Place</span>
                <p className="mt-2 font-black text-slate-900 text-sm truncate">{entries[1].masked_handle}</p>
                <p className="text-lg font-black text-indigo-700 mt-1">{entries[1].score} pts</p>
                <p className="text-[11px] text-slate-400 font-mono">{formatDuration(entries[1].duration_seconds)}</p>
              </div>

              {/* 1st Place */}
              <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/60 p-6 shadow-md -translate-y-2">
                <span className="text-4xl">👑</span>
                <span className="mt-1 block text-xs font-black uppercase text-amber-900">Champion</span>
                <p className="mt-2 font-black text-slate-950 text-base truncate">{entries[0].masked_handle}</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{entries[0].score} pts</p>
                <p className="text-xs text-amber-800 font-mono font-bold">{formatDuration(entries[0].duration_seconds)}</p>
              </div>

              {/* 3rd Place */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm pt-8">
                <span className="text-3xl">🥉</span>
                <span className="mt-1 block text-xs font-bold uppercase text-slate-500">3rd Place</span>
                <p className="mt-2 font-black text-slate-900 text-sm truncate">{entries[2].masked_handle}</p>
                <p className="text-lg font-black text-indigo-700 mt-1">{entries[2].score} pts</p>
                <p className="text-[11px] text-slate-400 font-mono">{formatDuration(entries[2].duration_seconds)}</p>
              </div>
            </div>
          )}

          {/* Full Table */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Rankings &amp; Performance Ledger</h2>

            {loading ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-500">
                Loading official leaderboard...
              </p>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No verified attempts recorded for this competition yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Candidate</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Percentage</th>
                      <th className="py-3 px-3">Time Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => (
                      <tr
                        key={entry.attempt_id}
                        className={entry.is_current_user ? "bg-indigo-50/70 font-bold" : "hover:bg-slate-50/50"}
                      >
                        <td className="py-3 px-3 font-mono font-black text-slate-900">
                          {entry.rank === 1 ? "🥇 1" : entry.rank === 2 ? "🥈 2" : entry.rank === 3 ? "🥉 3" : `#${entry.rank}`}
                        </td>
                        <td className="py-3 px-3">
                          <span className={entry.is_current_user ? "text-indigo-800 font-extrabold" : "text-slate-900 font-medium"}>
                            {entry.masked_handle}</span>
                          {entry.user_id && <UserBadges userId={entry.user_id} size="xs" maxVisible={2} className="ml-2" />}<span style={{ display: "none" }}>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {entry.score} / {entry.total_score}
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800 font-bold">
                            {entry.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {formatDuration(entry.duration_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

          </div>
  );
}
