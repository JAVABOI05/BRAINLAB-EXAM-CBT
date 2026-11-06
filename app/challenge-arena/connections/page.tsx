"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Connection = { id: string; status: "pending" | "approved" | "blocked"; direction: "incoming" | "outgoing"; created_at: string; player: { display_name: string; slug: string | null; avatar_url: string | null } };

export default function ArenaConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/competition/connections");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load connections.");
    setConnections(data.connections || []);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/competition/connections").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load connections.");
      if (active) setConnections(data.connections || []);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load connections."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const act = async (id: string, action: "accept" | "decline" | "remove") => {
    setBusyId(id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/competition/connections", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update connection.");
      setNotice(action === "accept" ? "Player added to your approved connections." : action === "decline" ? "Connection request declined." : "Connection removed.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update connection."); }
    finally { setBusyId(""); }
  };

  const pendingIncoming = connections.filter(item => item.status === "pending" && item.direction === "incoming");
  const approved = connections.filter(item => item.status === "approved");
  const pendingOutgoing = connections.filter(item => item.status === "pending" && item.direction === "outgoing");

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#060b18] dark:text-slate-100 sm:px-6"><div className="mx-auto max-w-4xl space-y-6">
    <header><Link href="/challenge-arena" className="text-sm font-bold text-blue-600">← Back to Arena</Link><h1 className="mt-2 text-3xl font-black">Arena Connections</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Approve players who may challenge you when your profile is set to approved players only.</p></header>
    {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p className="rounded-2xl bg-white p-6 text-sm dark:bg-[#0d172e]">Loading connections…</p> : <>
      <section className="space-y-3"><h2 className="text-lg font-black">Incoming requests ({pendingIncoming.length})</h2>
        {pendingIncoming.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0d172e]">No pending incoming requests.</p>}
        {pendingIncoming.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d172e]"><div><p className="font-bold">{item.player.display_name}</p><p className="text-xs text-slate-500">Requested {new Date(item.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button disabled={busyId===item.id} onClick={() => act(item.id,"accept")} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Approve</button><button disabled={busyId===item.id} onClick={() => act(item.id,"decline")} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">Decline</button></div></article>)}
      </section>
      <section className="space-y-3"><h2 className="text-lg font-black">Approved players ({approved.length})</h2>
        {approved.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0d172e]">You have not approved any players yet.</p>}
        {approved.map(item => <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d172e]"><div><p className="font-bold">{item.player.display_name}</p>{item.player.slug && <Link href={`/challenge-arena/players/${item.player.slug}`} className="text-xs text-blue-600">View profile</Link>}</div><button disabled={busyId===item.id} onClick={() => act(item.id,"remove")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700">Remove</button></article>)}
      </section>
      <section className="space-y-3"><h2 className="text-lg font-black">Sent requests ({pendingOutgoing.length})</h2>
        {pendingOutgoing.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0d172e]">No outgoing requests.</p>}
        {pendingOutgoing.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-[#0d172e]"><span className="font-bold">{item.player.display_name}</span><span className="ml-2 text-xs text-slate-500">Awaiting approval</span></article>)}
      </section>
    </>}
  </div></main>;
}
