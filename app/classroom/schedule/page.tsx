"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

type LiveClass = {
  id: string;
  title: string;
  description?: string | null;
  subject_id?: string | null;
  tutor_id: string;
  status: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  room_name?: string;
  learning_subjects?: { name?: string } | null;
  courses?: { title?: string } | null;
};

function countdown(target: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return days > 0
    ? `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function prettyDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClassroomSchedulePage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sessionData }, response] = await Promise.all([
      supabase.auth.getSession(),
      fetch("/api/classroom/classes", { cache: "no-store" }),
    ]);
    const user = sessionData.session?.user;
    if (user) {
      setUserId(user.id);
      const { data: roleRow } = await supabase.from("admin_user_roles").select("role").eq("user_id", user.id).maybeSingle();
      setRole(roleRow?.role || "");
    }
    const data = await response.json();
    setClasses(Array.isArray(data.classes) ? data.classes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.clearInterval(refresh);
    };
  }, [load]);

  const runAction = async (item: LiveClass, action: "start" | "end") => {
    setBusyId(item.id);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again to manage this class.");
      const response = await fetch("/api/classroom/classes/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId: item.id, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The class could not be updated.");
      setMessage(action === "start" ? "Class started. Students can now join." : "Class ended successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusyId("");
    }
  };

  const isAdmin = ["super_admin", "platform_admin"].includes(role);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/classroom" className="text-sm font-semibold text-blue-300 hover:text-blue-200">← Live Classroom</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Class Schedule</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Scheduled classes, tutor start controls and live-session status. All times are shown in West Africa Time (WAT).</p>
          </div>
          <button onClick={() => void load()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-900">Refresh schedule</button>
        </header>

        {message && <div role="status" className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-100">{message}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading scheduled classes…</div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-lg font-bold">No classes scheduled yet</h2>
            <p className="mt-2 text-sm text-slate-400">When a tutor schedules a class, it will appear here with its start time and countdown.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map((item) => {
              const isLeadTutor = item.tutor_id === userId;
              const canManage = isLeadTutor || isAdmin;
              const startsIn = new Date(item.scheduled_start_at).getTime() - now;
              const ended = ["ended", "completed", "cancelled", "failed"].includes(item.status);
              const canStart = canManage && ["scheduled", "open"].includes(item.status) && startsIn <= 0;
              return (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${item.status === "live" ? "bg-rose-500/15 text-rose-300" : ended ? "bg-slate-700 text-slate-300" : "bg-blue-500/15 text-blue-300"}`}>{item.status === "live" ? "Live now" : item.status}</span>
                        {item.learning_subjects?.name && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300">{item.learning_subjects.name}</span>}
                      </div>
                      <h2 className="text-xl font-extrabold">{item.title}</h2>
                      {item.description && <p className="mt-1 text-sm text-slate-400">{item.description}</p>}
                    </div>
                    <div className="min-w-36 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.status === "live" ? "Session started" : ended ? "Session status" : startsIn > 0 ? "Starts in" : "Waiting for tutor"}</p>
                      <p className="mt-1 font-mono text-lg font-black text-white">{item.status === "live" ? "LIVE" : ended ? item.status.toUpperCase() : startsIn > 0 ? countdown(item.scheduled_start_at, now) : "Ready"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-2">
                    <div><p className="text-xs font-semibold text-slate-500">Scheduled start</p><p className="mt-1 text-slate-200">{prettyDate(item.scheduled_start_at)}</p></div>
                    <div><p className="text-xs font-semibold text-slate-500">Scheduled end</p><p className="mt-1 text-slate-200">{prettyDate(item.scheduled_end_at)}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.status === "live" ? (
                      <Link href={`/classroom/${encodeURIComponent(item.id)}`} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">Join / Rejoin class</Link>
                    ) : null}
                    {canManage && canStart && <button disabled={busyId === item.id} onClick={() => void runAction(item, "start")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{busyId === item.id ? "Starting…" : "Start class"}</button>}
                    {canManage && item.status === "live" && <button disabled={busyId === item.id} onClick={() => { if (window.confirm("End this class for all participants? Students will no longer be able to join.")) void runAction(item, "end"); }} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50">{busyId === item.id ? "Ending…" : "End class"}</button>}
                    {!ended && item.status !== "live" && !canStart && <p className="self-center text-xs text-slate-500">{startsIn > 0 ? "The tutor can start this class at its scheduled time." : "The tutor has not started this session yet."}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
