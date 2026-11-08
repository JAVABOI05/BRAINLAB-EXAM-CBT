"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

type Appeal = {
  id: string;
  match_id: string;
  submitted_by: string;
  appeal_reason: string;
  status: "submitted" | "under_review" | "upheld" | "rejected" | "withdrawn";
  decision_reason?: string | null;
  submitted_at: string;
};

export default function ArenaAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [token, setToken] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAppeals = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/competition/appeals", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load appeals.");
    setAppeals(data.appeals || []);
    setCanReview(Boolean(data.can_review));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      setToken(accessToken);
      if (accessToken) {
        try { await loadAppeals(accessToken); }
        catch (err) { setError(err instanceof Error ? err.message : "Unable to load appeals."); }
      }
    });
    return () => { active = false; };
  }, [loadAppeals]);

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/competition/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ match_id: matchId.trim(), appeal_reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Appeal submission failed.");
      setMessage("Your appeal has been submitted for independent review.");
      setMatchId(""); setReason("");
      await loadAppeals(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Appeal submission failed.");
    } finally { setBusy(false); }
  };

  const reviewAppeal = async (appealId: string, status: "under_review" | "upheld" | "rejected") => {
    const decisionReason = status === "under_review" ? "Assigned for independent review." : window.prompt("Enter the reason for this decision:") || "";
    if (status !== "under_review" && decisionReason.trim().length < 10) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/competition/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appeal_id: appealId, status, decision_reason: decisionReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to process appeal.");
      setMessage("Appeal record updated.");
      await loadAppeals(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process appeal.");
    }
  };

  if (!token) return <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] p-6 text-slate-900 dark:text-slate-100"><div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-8"><h1 className="text-2xl font-black">Arena Appeals Centre</h1><p className="mt-2 text-slate-600 dark:text-slate-300">Sign in to submit or track a match-result appeal.</p><Link className="inline-flex mt-5 rounded-xl bg-blue-600 px-5 py-3 text-white font-bold" href="/auth/signin?redirect=/challenge-arena/appeals">Sign in</Link></div></main>;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← Back to Arena</Link><h1 className="mt-2 text-3xl font-black">Appeals Centre</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">A separate review path for disputed competition outcomes.</p></div>
          <span className="rounded-full border border-blue-200 dark:border-blue-900 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">{canReview ? "Reviewer access" : "Participant access"}</span>
        </header>

        {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        {!canReview && <form onSubmit={submitAppeal} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7 space-y-4">
          <div><h2 className="text-lg font-black">Submit a match appeal</h2><p className="text-sm text-slate-600 dark:text-slate-300">Only match participants can appeal a completed or disputed match. Explain the issue clearly and include the match ID.</p></div>
          <label className="block text-sm font-bold">Match ID<input value={matchId} onChange={e => setMatchId(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-3" placeholder="Paste the match ID" /></label>
          <label className="block text-sm font-bold">Reason for appeal<textarea value={reason} onChange={e => setReason(e.target.value)} required minLength={20} maxLength={5000} rows={5} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-3" placeholder="Describe the result, rule, scoring or conduct issue and what you believe should be reviewed." /></label>
          <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit appeal"}</button>
        </form>}

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7">
          <h2 className="text-lg font-black">{canReview ? "Appeals awaiting review" : "Your appeal history"}</h2>
          <div className="mt-4 space-y-3">
            {appeals.length === 0 && <p className="rounded-xl bg-slate-100 dark:bg-slate-900 p-5 text-sm text-slate-600 dark:text-slate-300">No appeals have been recorded here yet.</p>}
            {appeals.map(appeal => <article key={appeal.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Match {appeal.match_id.slice(0, 8)}…</strong><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase">{appeal.status.replace("_", " ")}</span></div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{appeal.appeal_reason}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(appeal.submitted_at).toLocaleString()}</p>
              {appeal.decision_reason && <p className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-900 p-3 text-sm">{appeal.decision_reason}</p>}
              {canReview && !["upheld", "rejected", "withdrawn"].includes(appeal.status) && <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => reviewAppeal(appeal.id, "under_review")} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300">Assign for review</button><button onClick={() => reviewAppeal(appeal.id, "upheld")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Uphold</button><button onClick={() => reviewAppeal(appeal.id, "rejected")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Reject</button></div>}
            </article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
