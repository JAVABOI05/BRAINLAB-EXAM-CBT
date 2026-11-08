"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type RatingEntry = { id: string; match_id?: string | null; rating_kind: string; rating_before: number; rating_after: number; rating_delta: number; reason: string; created_at: string };

export default function ArenaRatingHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<RatingEntry[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/competition/ratings/history", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load rating history.");
    setHistory(data.history || []);
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) { router.replace("/auth/signin?redirect=/challenge-arena/rating-history"); return; }
      try { await load(accessToken); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load history."); }
    });
  }, [load, router]);
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl space-y-6">
      <header><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← Back to Arena</Link><h1 className="mt-2 text-3xl font-black">Rating History</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">A record of verified competitive rating changes. Friendly matches do not appear here.</p></header>
      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7"><div className="space-y-3">{history.length === 0 && <p className="text-sm text-slate-500">No verified rating changes have been recorded yet.</p>}
        {history.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"><div><p className="text-sm font-bold">{item.reason.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} · {item.rating_kind}</p>{item.match_id && <p className="mt-1 text-xs text-slate-500">Match {item.match_id.slice(0, 8)}…</p>}</div><div className="text-right"><p className="text-xs text-slate-500">{item.rating_before} → {item.rating_after}</p><p className={`text-lg font-black ${item.rating_delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{item.rating_delta > 0 ? "+" : ""}{item.rating_delta}</p></div></article>)}
      </div></section>
    </div></main>
  );
}
