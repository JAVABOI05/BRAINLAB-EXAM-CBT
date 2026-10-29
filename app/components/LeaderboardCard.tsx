"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type LeaderboardEntry = {
  id: string;
  name: string;
  phone: string;
  subject: string;
  score: number;
  total: number;
  created_at?: string;
};

interface LeaderboardCardProps {
  limit?: number;
}

export default function LeaderboardCard({ limit = 10 }: LeaderboardCardProps = {}) {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      setErrorText("");

      // Settings may be absent on fresh/partially migrated environments, and
      // duplicate legacy rows must not make this optional feature crash.
      const { data: settingRow, error: settingError } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "leaderboard_enabled")
        .limit(1)
        .maybeSingle();

      if (settingError) {
        setErrorText(settingError.message);
        setLoading(false);
        return;
      }

      const isEnabled =
        settingRow?.value === true || settingRow?.value === "true";
      setEnabled(isEnabled);

      if (!isEnabled) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("results")
        .select("id, name, phone, subject, score, total, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      setLeaders((data || []) as LeaderboardEntry[]);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-5">
        <p className="text-sm font-medium text-slate-600">
          Loading leaderboard...
        </p>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5">
        <p className="text-sm font-medium text-red-700">{errorText}</p>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-5">
        <p className="text-sm font-medium text-slate-600">
          Leaderboard is currently unavailable.
        </p>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 px-4 py-5">
        <p className="text-sm font-medium text-slate-600">
          No leaderboard data yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaders.map((leader, index) => {
        const percentage =
          leader.total > 0
            ? ((Number(leader.score) / Number(leader.total)) * 100).toFixed(1)
            : "0.0";

        const rankBadge =
          index === 0
            ? "🥇"
            : index === 1
            ? "🥈"
            : index === 2
            ? "🥉"
            : `#${index + 1}`;

        const rankStyles =
          index === 0
            ? "bg-yellow-100 text-yellow-800"
            : index === 1
            ? "bg-slate-200 text-slate-700"
            : index === 2
            ? "bg-orange-100 text-orange-700"
            : "bg-blue-50 text-blue-700";

        return (
          <div
            key={leader.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankStyles}`}
              >
                {rankBadge}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-800">
                  {leader.name}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {leader.subject}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-base font-bold text-blue-700">
                {leader.score}/{leader.total}
              </p>
              <p className="text-xs text-slate-500">{percentage}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}