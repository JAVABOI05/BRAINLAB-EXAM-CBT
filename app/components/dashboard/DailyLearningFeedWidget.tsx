"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export interface LearningQuest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: string;
  target_count: number;
  current_count: number;
  is_completed: boolean;
  is_claimed: boolean;
}

export interface DailyAssessmentNotice {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
  question_count: number;
}

export interface StudentDailyFeed {
  user_id: string;
  streak_days: number;
  total_xp: number;
  today_assessments: DailyAssessmentNotice[];
  active_quests: LearningQuest[];
}

export default function DailyLearningFeedWidget() {
  const [feed, setFeed] = useState<StudentDailyFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    questId?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/dashboard/daily-feed", { headers });
        if (res.ok) {
          const json = await res.json();
          if (active && json) {
            setFeed({
              user_id: json.user_id || session?.user?.id || "guest",
              streak_days: json.streak_days ?? 0,
              total_xp: json.total_xp ?? 0,
              today_assessments: json.today_assessments || [],
              active_quests: json.active_quests || [],
            });
            return;
          }
        }

        // Fallback to community quests endpoint if feed endpoint returned non-200
        const questsRes = await fetch("/api/community/quests", { headers });
        if (questsRes.ok) {
          const qJson = await questsRes.json();
          if (active && qJson.ok && Array.isArray(qJson.data)) {
            setFeed({
              user_id: session?.user?.id || "guest",
              streak_days: 0,
              total_xp: 0,
              today_assessments: [],
              active_quests: qJson.data,
            });
          }
        }
      } catch {
        // Leave feed empty/null or handle gracefully
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFeed();

    // Listen to external XP updates to keep widget count in sync
    const handleXpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ lifetime_xp?: number; current_streak_days?: number }>;
      if (customEvent.detail) {
        setFeed((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            total_xp: customEvent.detail.lifetime_xp ?? prev.total_xp,
            streak_days: customEvent.detail.current_streak_days ?? prev.streak_days,
          };
        });
      }
    };

    window.addEventListener("brainlab_xp_awarded", handleXpUpdate);

    return () => {
      active = false;
      window.removeEventListener("brainlab_xp_awarded", handleXpUpdate);
    };
  }, []);

  async function handleClaimReward(questId: string) {
    if (claimingId) return; // Prevent concurrent claims
    setClaimingId(questId);
    setFeedback(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      let res = await fetch("/api/gamification/quests/claim", {
        method: "POST",
        headers,
        body: JSON.stringify({ quest_id: questId }),
      });

      let data = await res.json().catch(() => null);

      if (!res.ok && (res.status === 404 || !data?.ok)) {
        // Fallback to community quests endpoint
        try {
          const fallbackRes = await fetch(`/api/community/quests/${questId}/claim`, {
            method: "POST",
            headers,
          });
          const fallbackData = await fallbackRes.json().catch(() => null);
          if (fallbackRes.ok && fallbackData?.ok) {
            res = fallbackRes;
            data = fallbackData;
          }
        } catch {}
      }

      if (res.ok && data?.ok) {
        const earnedXp = Number(data.xp_earned) || 0;
        const newLifetimeXp = data.lifetime_xp != null ? Number(data.lifetime_xp) : undefined;

        // Update local feed state
        setFeed((prev) => {
          if (!prev) return null;
          const updatedXp = newLifetimeXp !== undefined ? newLifetimeXp : prev.total_xp + earnedXp;
          return {
            ...prev,
            total_xp: updatedXp,
            active_quests: prev.active_quests.map((q) =>
              q.id === questId ? { ...q, is_claimed: true, is_completed: true } : q
            ),
          };
        });

        // Synchronize global application gamification state
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("bl_student_xp_cache");
            const cached = raw ? JSON.parse(raw) : {};
            const finalXp = newLifetimeXp !== undefined ? newLifetimeXp : ((cached.lifetime_xp || 0) + earnedXp);
            const updatedProfile = {
              ...cached,
              lifetime_xp: finalXp,
              current_level: data.current_level ?? cached.current_level ?? 1,
              level_name: data.level_name ?? cached.level_name ?? "Beginner",
              updated_at: new Date().toISOString(),
            };
            localStorage.setItem("bl_student_xp_cache", JSON.stringify(updatedProfile));
            window.dispatchEvent(new Event("brainlab-local-storage"));
            window.dispatchEvent(new CustomEvent("brainlab_xp_awarded", { detail: updatedProfile }));
          } catch {}
        }

        setFeedback({
          type: "success",
          message: `Reward claimed! +${earnedXp} XP added to your balance.`,
          questId,
        });
      } else {
        const errMessage =
          data?.message ||
          (data?.error === "already_claimed"
            ? "This quest reward has already been claimed."
            : data?.error === "quest_incomplete"
            ? "Quest incomplete: Complete all required questions before claiming."
            : "Could not claim reward. Please verify quest completion.");

        setFeedback({
          type: "error",
          message: errMessage,
          questId,
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Network error. Please check your connection and try again.",
        questId,
      });
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-indigo-100/80 bg-white/60 p-6 shadow-xs animate-pulse dark:border-white/[0.08] dark:bg-[#070D18]/60">
        <div className="h-4 w-48 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="mt-4 h-20 bg-slate-100 rounded-2xl dark:bg-slate-800/50" />
      </div>
    );
  }

  if (!feed) return null;

  return (
    <section className="rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 p-6 sm:p-7 shadow-sm dark:border-white/[0.08] dark:from-[#0B132B]/85 dark:via-[#070D18]/90 dark:to-[#040813]/90 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/60 pb-4 dark:border-white/[0.08]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
            Daily Academic Engine
          </span>
          <h2 className="mt-0.5 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Daily Learning Feed &amp; Verified Quests</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 py-1 text-xs font-black text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-300 shadow-xs">
            <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span>{feed.streak_days} Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3 py-1 text-xs font-black text-indigo-900 dark:border-indigo-700/60 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-xs">
            <svg className="h-3.5 w-3.5 text-indigo-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{feed.total_xp} XP</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl p-3 text-xs font-bold transition flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[10px] uppercase font-mono tracking-wider opacity-70 hover:opacity-100 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Left Col: Today's Cohort Tests & Announcements */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Scheduled Cohort Assessment
          </h3>

          {feed.today_assessments.length > 0 ? (
            feed.today_assessments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-indigo-200/80 bg-white/95 p-4 shadow-xs dark:border-white/[0.08] dark:bg-[#0E172A]/90 flex items-center justify-between gap-3 hover:border-indigo-400 transition"
              >
                <div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200 dark:border-blue-800/60">
                    {a.subject}
                  </span>
                  <h4 className="mt-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                    {a.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {a.question_count} Qs &bull; {a.duration_minutes} Mins
                  </p>
                </div>

                <Link
                  href={`/cbt?assessment=${a.id}`}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 shrink-0"
                >
                  Start &rarr;
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-xs text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <p className="font-bold text-slate-800 dark:text-slate-200">No scheduled tests right now</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Join academic cohorts to receive tutor-scheduled sprint assessments.</p>
              <Link href="/community" className="mt-2 inline-flex items-center gap-1 font-bold text-blue-600 dark:text-cyan-400 hover:underline">
                <span>Explore Student Communities</span>
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Col: Daily Learning Quests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today&apos;s Quests ({feed.active_quests.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Resets daily at 00:00 UTC</span>
          </div>

          <div className="space-y-3">
            {feed.active_quests.map((quest: LearningQuest) => {
              const current = quest.current_count || 0;
              const target = quest.target_count || 1;
              const percent = Math.min(Math.round((current / target) * 100), 100);
              const isDone = quest.is_completed || current >= target;
              const isCurrentlyClaiming = claimingId === quest.id;

              return (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 dark:border-white/[0.08] dark:bg-[#0E172A]/90 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {quest.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {quest.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                      +{quest.xp_reward} XP
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{current} / {target}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {isDone ? (
                      quest.is_claimed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Claimed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimReward(quest.id)}
                          disabled={Boolean(claimingId)}
                          aria-busy={isCurrentlyClaiming}
                          className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-[11px] font-black text-slate-950 transition shrink-0 disabled:opacity-50 active:scale-95 cursor-pointer shadow-xs disabled:cursor-not-allowed"
                        >
                          {isCurrentlyClaiming ? "Claiming..." : "Claim XP"}
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">In Progress</span>
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
