"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type TeamRequest = { id: string; is_requester: boolean; proposed_name: string; motto?: string | null; status: string; submitted_at: string; review_notes?: string | null; created_team_id?: string | null; founding_member_count: number };
type Membership = { id: string; request_id: string; is_me: boolean; status: string };

export default function ArenaTeamRequestsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/competition/teams/requests", { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load team requests.");
    setRequests(data.requests || []);
    setMemberships(data.members || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) { router.replace("/auth/signin?redirect=/challenge-arena/team-requests"); return; }
      setToken(accessToken);
      try { await load(accessToken); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load requests."); }
    });
  }, [load, router]);

  const respond = async (requestId: string, decision: "accepted" | "declined") => {
    setBusyId(requestId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/competition/teams/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "respond", request_id: requestId, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to respond to invitation.");
      setNotice(decision === "accepted" ? "Founding invitation accepted. The team request will proceed to administrator review." : "Founding invitation declined.");
      await load(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to respond."); }
    finally { setBusyId(""); }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-4xl space-y-6">
      <header><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← Back to Arena</Link><h1 className="mt-2 text-3xl font-black">Team Requests & Invitations</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review founding invitations and track your permanent-team request.</p></header>
      {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <section className="space-y-3">
        {requests.length === 0 && <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-7 text-sm text-slate-500">You have no pending team invitations or requests.</div>}
        {requests.map(request => {
          const membership = memberships.find(item => item.request_id === request.id);
          const isRequester = request.is_requester;
          const canRespond = membership?.status === "pending" && request.status === "pending";
          return <article key={request.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{request.proposed_name}</h2><p className="mt-1 text-sm text-slate-500">{request.motto || "Permanent BrainLab Arena team"}</p><p className="mt-2 text-xs text-slate-500">Submitted {new Date(request.submitted_at).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold uppercase">{request.status.replace("_", " ")}</span></div>
            {request.review_notes && <p className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-900 p-3 text-sm">{request.review_notes}</p>}
            {membership && <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-xs text-slate-500">Your founding-member response</p><p className="mt-1 text-sm font-bold capitalize">{membership.status}</p></div>}
            {canRespond && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busyId === request.id} onClick={() => respond(request.id, "accepted")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">Accept invitation</button><button disabled={busyId === request.id} onClick={() => respond(request.id, "declined")} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700">Decline</button></div>}
            {request.created_team_id && <Link href={`/challenge-arena/teams/${request.created_team_id}`} className="mt-4 inline-flex text-sm font-bold text-blue-600">Open approved team →</Link>}
            {isRequester && request.status === "pending" && <p className="mt-3 text-xs text-blue-600">Your request is awaiting founding-member consent and administrator approval.</p>}
          </article>;
        })}
      </section>
    </div></main>
  );
}
