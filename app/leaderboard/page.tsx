"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UserBadges from "../components/UserBadges";
import {
  getGamificationLeaderboard,
  type LeaderboardEntry,
} from "../lib/gamification";

export default function GlobalLeaderboardPage() {
  const [period, setPeriod] = useState<"all_time" | "monthly" | "weekly">("all_time");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void getGamificationLeaderboard(period, 50).then((data) => {
      if (active) {
        setEntries(data);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [period]);

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <main className="flex-1 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              ← Back to My Learning Space
            </Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900">
                  🏆 Academic Honor Roll
                </span>
                <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                  Global Leaderboard
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Recognizing consistency, excellence, and mastery across all BrainLab subjects and examinations.
                </p>
              </div>

              <Link
                href="/learning/achievements"
                className="rounded-xl bg-[#071c43] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-950 flex items-center gap-1"
              >
                🏅 My Badges &amp; Level →
              </Link>
            </div>
          </div>

          {/* Period Selector Tabs */}
          <div className="mb-8 flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm max-w-md">
            {[
              { id: "all_time", label: "All-Time" },
              { id: "monthly", label: "Monthly (30d)" },
              { id: "weekly", label: "Weekly (7d)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as typeof period)}
                className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                  period === tab.id
                    ? "bg-[#071c43] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Weekly Academic Prize Pool & Challenge Arena Trigger */}
          <div className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-amber-50 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 text-2xl text-white shadow shrink-0">
                🎁
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Weekly Academic Prize Pool &amp; Streak Multipliers
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                  Top 3 learners at Sunday midnight win 1-Month Premium CBT Access + Official UTME Champion Badges! Play the 10-Question Challenge Arena to boost your XP score.
                </p>
              </div>
            </div>
            <Link
              href="/challenge-arena"
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition whitespace-nowrap flex items-center gap-1.5"
            >
              <span>🔥 Play Arena (+2x XP) →</span>
            </Link>
          </div>

          {/* Podium for Top 3 */}
          {!loading && topThree.length >= 3 && (
            <div className="mb-10 grid grid-cols-3 gap-3 text-center sm:gap-6 items-end">
              {/* 2nd Place */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 pt-8 shadow-sm">
                <span className="text-3xl">🥈</span>
                <span className="mt-1 block text-[11px] font-bold uppercase text-slate-400">2nd Place</span>
                <p className="mt-2 text-sm font-black text-slate-900 truncate">
                  {topThree[1].display_name}
                </p>
                <div className="mt-1 flex justify-center">
                  <UserBadges userId={topThree[1].user_id} size="xs" maxVisible={2} />
                </div>
                <p className="mt-2 text-base font-black text-blue-700">
                  {topThree[1].score.toLocaleString()} XP
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{topThree[1].level_name}</p>
              </div>

              {/* 1st Place */}
              <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white p-6 shadow-md -translate-y-3">
                <span className="text-4xl">👑</span>
                <span className="mt-1 block text-xs font-black uppercase text-amber-900">Champion</span>
                <p className="mt-2 text-base font-black text-slate-950 truncate">
                  {topThree[0].display_name}
                </p>
                <div className="mt-1 flex justify-center">
                  <UserBadges userId={topThree[0].user_id} size="sm" maxVisible={3} />
                </div>
                <p className="mt-2 text-2xl font-black text-amber-700">
                  {topThree[0].score.toLocaleString()} XP
                </p>
                <p className="text-xs text-amber-800 font-bold">{topThree[0].level_name}</p>
              </div>

              {/* 3rd Place */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 pt-6 shadow-sm">
                <span className="text-3xl">🥉</span>
                <span className="mt-1 block text-[11px] font-bold uppercase text-slate-400">3rd Place</span>
                <p className="mt-2 text-sm font-black text-slate-900 truncate">
                  {topThree[2].display_name}
                </p>
                <div className="mt-1 flex justify-center">
                  <UserBadges userId={topThree[2].user_id} size="xs" maxVisible={2} />
                </div>
                <p className="mt-2 text-base font-black text-blue-700">
                  {topThree[2].score.toLocaleString()} XP
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{topThree[2].level_name}</p>
              </div>
            </div>
          )}

          {/* Full Standings Table */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Leaderboard Rankings</h2>
              <span className="text-xs font-semibold text-slate-500">
                {entries.length} learners listed
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 animate-pulse">
                Loading official standings...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No activity recorded for this period yet. Complete lessons or quizzes to be first on the board!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Learner</th>
                      <th className="py-3 px-4">Tier &amp; Level</th>
                      <th className="py-3 px-4">Streak</th>
                      <th className="py-3 px-4 text-right">XP Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry, idx) => {
                      const rankNum = idx + 1;
                      const isPodium = rankNum <= 3;

                      return (
                        <tr
                          key={entry.user_id + idx}
                          className={`transition ${
                            entry.is_caller
                              ? "bg-amber-50/70 font-bold"
                              : "hover:bg-slate-50/60"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-black text-slate-800">
                            {rankNum === 1
                              ? "🥇 1"
                              : rankNum === 2
                              ? "🥈 2"
                              : rankNum === 3
                              ? "🥉 3"
                              : `#${rankNum}`}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-slate-900 ${
                                  entry.is_caller
                                    ? "font-black text-amber-900"
                                    : "font-semibold"
                                }`}
                              >
                                {entry.display_name}
                              </span>
                              {entry.is_caller && (
                                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">
                                  YOU
                                </span>
                              )}
                              <UserBadges userId={entry.user_id} size="xs" maxVisible={2} />
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 border border-blue-100">
                              Lvl {entry.current_level} · {entry.level_name}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {entry.streak_days > 0 ? (
                              <span className="font-bold text-rose-600">
                                🔥 {entry.streak_days}d
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                            {entry.score.toLocaleString()} XP
                          </td>
                        </tr>
                      );
                    })}
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
