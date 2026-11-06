"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type TeamRequest = {
  id: string; requested_by: string; proposed_name: string; proposed_slug: string;
  motto?: string | null; description?: string | null; founding_member_ids: string[];
  recruitment_mode: string; status: string; submitted_at: string; review_notes?: string | null;
};
type Founder = { id: string; request_id: string; user_id: string; status: string };

export default function ArenaTeamRequestsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/competition/teams/requests", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load team requests.");
    setRequests(data.requests || []);
    setFounders(data.members || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) { router.replace("/auth/signin?redirect=/admin/competitions/team-requests"); return; }
      setToken(accessToken);
      try { await load(accessToken); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load requests."); }
    });
  }, [load, router]);

  const decide = async (requestId: string, decision: "approved" | "rejected" | "needs_changes") => {
    const reviewNotes = decision === "approved" ? "" : (window.prompt("Add a note for the team requester:") || "");
    if (decision !== "approved" && reviewNotes.trim().length < 5) return;
    setBusyId(requestId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/competition/teams/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "review", request_id: requestId, decision, review_notes: reviewNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to review request.");
      setNotice(decision === "approved" ? "Permanent team approved and created." : "Team request decision saved.");
      await load(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to review request."); }
    finally { setBusyId(""); }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/admin/competitions" className="text-sm font-bold text-blue-600">← Competition Admin</Link><h1 className="mt-2 text-3xl font-black">Permanent Team Requests</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review founding-member consent before creating permanent Arena teams.</p></div>
          <button onClick={() => token && load(token)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-bold">Refresh</button>
        </header>
        {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <section className="space-y-4">
          {requests.length === 0 && <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-8 text-sm text-slate-600 dark:text-slate-300">There are no team requests to review.</div>}
          {requests.map(request => {
            const members = founders.filter(member => member.request_id === request.id);
            const allAccepted = members.length > 0 && members.every(member => member.status === "accepted");
            return <article key={request.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-xl font-black">{request.proposed_name}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{request.motto || "No motto supplied"}</p><p className="mt-2 text-xs text-slate-500">Submitted {new Date(request.submitted_at).toLocaleString()} · Recruitment: {request.recruitment_mode.replace("_", " ")}</p></div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase">{request.status.replace("_", " ")}</span>
              </div>
              {request.description && <p className="mt-4 text-sm">{request.description}</p>}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map(member => <div key={member.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">Founder</p><p className="mt-1 break-all text-sm font-semibold">{member.user_id}</p><p className={`mt-1 text-xs font-bold ${member.status === "accepted" ? "text-emerald-600" : member.status === "declined" ? "text-rose-600" : "text-amber-600"}`}>{member.status}</p></div>)}
              </div>
              {request.review_notes && <p className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-900 p-3 text-sm">{request.review_notes}</p>}
              {["pending", "needs_changes"].includes(request.status) && <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={!allAccepted || busyId === request.id} onClick={() => decide(request.id, "approved")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Approve & create team</button>
                <button disabled={busyId === request.id} onClick={() => decide(request.id, "needs_changes")} className="rounded-xl border border-amber-400 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300">Request changes</button>
                <button disabled={busyId === request.id} onClick={() => decide(request.id, "rejected")} className="rounded-xl border border-rose-400 px-4 py-2.5 text-sm font-bold text-rose-700 dark:text-rose-300">Reject</button>
                {!allAccepted && <p className="basis-full text-xs text-amber-700 dark:text-amber-300">Approval is disabled until every proposed founder accepts.</p>}
              </div>}
            </article>;
          })}
        </section>
      </div>
    </main>
  );
}
