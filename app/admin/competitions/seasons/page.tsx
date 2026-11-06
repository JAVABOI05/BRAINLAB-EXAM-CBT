"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Season = { id: string; name: string; description?: string | null; starts_at: string; ends_at: string; status: string; rating_carryover_mode: string; rating_carryover_percent: number };

export default function ArenaSeasonsAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [carryoverMode, setCarryoverMode] = useState("partial");
  const [carryoverPercent, setCarryoverPercent] = useState("75");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/competition/seasons", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load seasons.");
    setSeasons(data.seasons || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) { router.replace("/auth/signin?redirect=/admin/competitions/seasons"); return; }
      setToken(accessToken);
      try { await load(accessToken); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load seasons."); }
    });
  }, [load, router]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/competition/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), rating_carryover_mode: carryoverMode, rating_carryover_percent: Number(carryoverPercent) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create season.");
      setNotice("Season created.");
      setName(""); setDescription(""); setStartsAt(""); setEndsAt("");
      await load(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create season."); }
    finally { setBusy(false); }
  };

  const update = async (seasonId: string, status: string) => {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/competition/seasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ season_id: seasonId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update season.");
      setNotice("Season status updated.");
      await load(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update season."); }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header><Link href="/admin/competitions" className="text-sm font-bold text-blue-600">← Competition Admin</Link><h1 className="mt-2 text-3xl font-black">Arena Seasons</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create time-bounded seasons and configure rating carryover while preserving lifetime achievements.</p></header>
        {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <form onSubmit={create} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7 space-y-4">
          <h2 className="text-lg font-black">Create season</h2>
          <label className="block text-sm font-bold">Season name<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" placeholder="e.g. BrainLab Arena Season 1" /></label>
          <label className="block text-sm font-bold">Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Starts<input required type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label><label className="text-sm font-bold">Ends<input required type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Rating carryover<select value={carryoverMode} onChange={e => setCarryoverMode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3"><option value="full">Full carryover</option><option value="partial">Partial carryover</option><option value="reset">Reset rating</option><option value="none">No carryover</option></select></label><label className="text-sm font-bold">Carryover percentage<input type="number" min="0" max="100" value={carryoverPercent} onChange={e => setCarryoverPercent(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label></div>
          <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Creating…" : "Create season"}</button>
        </form>
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7">
          <h2 className="text-lg font-black">Season history</h2>
          <div className="mt-4 space-y-3">{seasons.length === 0 && <p className="text-sm text-slate-500">No seasons created yet.</p>}
            {seasons.map(season => <article key={season.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"><div><p className="font-bold">{season.name}</p><p className="mt-1 text-xs text-slate-500">{new Date(season.starts_at).toLocaleString()} — {new Date(season.ends_at).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Carryover: {season.rating_carryover_mode} ({season.rating_carryover_percent}%)</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase">{season.status}</span>{season.status === "scheduled" && <button onClick={() => update(season.id, "active")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Activate</button>}{season.status === "active" && <button onClick={() => update(season.id, "completed")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Complete</button>}{season.status === "completed" && <button onClick={() => update(season.id, "archived")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Archive</button>}</div></article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
