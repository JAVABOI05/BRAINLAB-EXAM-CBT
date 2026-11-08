"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import type { StudentDailyFeed, LearningQuest } from "@/app/lib/community/types";

export default function DailyLearningFeedWidget() {
  const [feed, setFeed] = useState<StudentDailyFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/community/feed", { headers });
        const json = await res.json();
        if (active && json.ok && json.data) {
          setFeed(json.data);
        }
      } catch {
        // Fallback gracefully handled
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFeed();
    return () => {
      active = false;
    };
  }, []);

  const handleClaimReward = async (questId: string) => {
    try {
      setClaimingId(questId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/quests/${questId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (json.ok) {
        setFeed((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            total_xp: prev.total_xp + (json.xp_earned || 50),
            active_quests: prev.active_quests.map((q) =>
              q.id === questId ? { ...q, is_claimed: true } : q
            ),
          };
        });
      }
    } catch {
      // Handled
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="mt-4 h-20 bg-slate-100 rounded-2xl dark:bg-slate-800/50" />
      </div>
    );
  }

  if (!feed) return null;

  return (
    <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 p-6 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/60 pb-4 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Daily Academic Engine
          </span>
          <h2 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>⚡</span> Daily Learning Feed &amp; Verified Quests
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <span>🔥</span> {feed.streak_days} Day Streak
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span>⭐</span> {feed.total_xp} XP
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Left Col: Today's Cohort Tests & Announcements */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Scheduled Cohort Assessment
          </h3>

          {feed.today_assessments.length > 0 ? (
            feed.today_assessments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {a.subject}
                  </span>
                  <h4 className="mt-1 text-xs font-extrabold text-slate-900 dark:text-white">
                    {a.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {a.question_count} Qs • {a.duration_minutes} Mins
                  </p>
                </div>

                <Link
                  href={`/cbt?assessment=${a.id}`}
                  className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition dark:bg-blue-600 shrink-0"
                >
                  Start →
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-bold text-slate-800 dark:text-slate-200">No scheduled tests right now</p>
              <p className="mt-0.5 text-[11px]">Join academic cohorts to receive tutor-scheduled sprint assessments.</p>
              <Link href="/community" className="mt-2 inline-block font-bold text-blue-600 hover:underline">
                Explore Student Communities →
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: Daily Learning Quests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today&apos;s Quests ({feed.active_quests.length})
            </h3>
            <span className="text-[10px] text-slate-400">Resets daily at 00:00 UTC</span>
          </div>

          <div className="space-y-3">
            {feed.active_quests.map((quest: LearningQuest) => {
              const current = quest.current_count || 0;
              const target = quest.target_count || 1;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              const isDone = quest.is_completed || current >= target;

              return (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {quest.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {quest.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      +{quest.xp_reward} XP
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{current} / {target}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {isDone ? (
                      quest.is_claimed ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          ✓ Claimed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimReward(quest.id)}
                          disabled={claimingId === quest.id}
                          className="rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white hover:bg-amber-600 transition shrink-0 disabled:opacity-50"
                        >
                          {claimingId === quest.id ? "Claiming..." : "Claim XP"}
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0">In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
