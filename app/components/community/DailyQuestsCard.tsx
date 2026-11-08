"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import type { LearningQuest } from "@/app/lib/community/types";

interface DailyQuestsCardProps {
  compact?: boolean;
  className?: string;
  onRewardClaimed?: (questId: string, xp: number) => void;
}

export default function DailyQuestsCard({
  compact = false,
  className = "",
  onRewardClaimed,
}: DailyQuestsCardProps) {
  const [quests, setQuests] = useState<LearningQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadQuests() {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/community/quests", { headers });
        const json = await res.json();
        if (active && json.ok && Array.isArray(json.data)) {
          setQuests(json.data);
        }
      } catch {
        // Handled gracefully with fallback
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadQuests();
    return () => {
      active = false;
    };
  }, []);

  const handleClaim = async (questId: string) => {
    try {
      setClaimingId(questId);
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        setQuests((prev) =>
          prev.map((q) => (q.id === questId ? { ...q, is_claimed: true } : q))
        );
        if (onRewardClaimed) {
          onRewardClaimed(questId, json.xp_earned || 50);
        }
      }
    } catch {
      // Handled
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 animate-pulse ${className}`}
      >
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-16 rounded-xl bg-slate-100 dark:bg-slate-800/50" />
      </div>
    );
  }

  if (quests.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Daily Academic Quests
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>🎯</span> Active Quests ({quests.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-400">Resets 00:00 UTC</span>
      </div>

      <div className="mt-4 space-y-3">
        {quests.map((quest) => {
          const current = quest.current_count || 0;
          const target = quest.target_count || 1;
          const percent = Math.min(Math.round((current / target) * 100), 100);
          const isDone = quest.is_completed || current >= target;

          return (
            <div
              key={quest.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {quest.title}
                  </h4>
                  {!compact && (
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                      {quest.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  +{quest.xp_reward} XP
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-[80px]">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>
                      {current} / {target}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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
                      onClick={() => handleClaim(quest.id)}
                      disabled={claimingId === quest.id}
                      className="rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white hover:bg-amber-600 transition shrink-0 disabled:opacity-50"
                    >
                      {claimingId === quest.id ? "..." : "Claim XP"}
                    </button>
                  )
                ) : (
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {percent}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
