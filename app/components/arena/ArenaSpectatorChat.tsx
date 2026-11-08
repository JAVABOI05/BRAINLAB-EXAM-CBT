"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type SpectatorMessage = {
  id: string; user_id: string | null; display_name: string; message: string;
  message_type: "chat" | "reaction" | "system" | "moderation"; created_at: string;
};

const REACTIONS = ["👏", "🔥", "⚡", "💙", "🎯", "🏆", "😮", "💪"];

export default function ArenaSpectatorChat({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<SpectatorMessage[]>([]);
  const [mode, setMode] = useState("view_only");
  const [canModerate, setCanModerate] = useState(false);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/competition/matches/${matchId}/spectators`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Spectator interaction is unavailable.");
    setMessages(data.messages || []);
    setMode(data.spectator_mode || "view_only");
    setCanModerate(Boolean(data.can_moderate));
  }, [matchId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      setToken(accessToken);
      try { await load(accessToken); }
      catch (err) { if (active) setError(err instanceof Error ? err.message : "Unable to load spectator interaction."); }
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(token).catch(() => {}), 5000);
    return () => clearInterval(interval);
  }, [load, token]);

  const send = async (event: { preventDefault: () => void }, content = message, messageType: "chat" | "reaction" = "chat") => {
    event.preventDefault();
    if (!token || !content.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/competition/matches/${matchId}/spectators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, message_type: messageType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send.");
      setMessage("");
      await load(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send."); }
    finally { setBusy(false); }
  };

  const hideMessage = async (messageId: string) => {
    const response = await fetch(`/api/competition/matches/${matchId}/spectators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message_id: messageId, is_hidden: true }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to moderate message."); return; }
    await load(token);
  };

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-lg">Live Arena Reactions</h2><p className="text-xs text-slate-500 dark:text-slate-400">{mode === "moderated_chat" ? "Moderated spectator chat is enabled." : mode === "reactions" ? "Quick reactions are enabled." : "This match is view-only for spectators."}</p></div><span className="rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">{messages.length} messages</span></div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-900 p-3">
        {messages.length === 0 && <p className="py-5 text-center text-sm text-slate-500">No reactions or messages yet.</p>}
        {messages.map(item => <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl bg-white dark:bg-[#111d36] p-3">
          <div className="min-w-0"><p className="text-[11px] font-bold text-blue-600 dark:text-blue-300">{item.display_name} <span className="ml-2 font-normal text-slate-400">{new Date(item.created_at).toLocaleTimeString()}</span></p><p className="mt-1 break-words text-sm">{item.message}</p></div>
          {canModerate && <button onClick={() => hideMessage(item.id)} className="shrink-0 text-xs font-bold text-rose-600">Hide</button>}
        </div>)}
      </div>
      {mode === "reactions" && <div className="flex flex-wrap gap-2">{REACTIONS.map(reaction => <button key={reaction} disabled={busy || !token} onClick={event => send(event, reaction, "reaction")} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-lg disabled:opacity-40">{reaction}</button>)}</div>}
      {mode === "moderated_chat" && <form onSubmit={event => send(event)} className="flex gap-2"><input value={message} onChange={event => setMessage(event.target.value)} maxLength={400} placeholder="Write a respectful message…" className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /><button disabled={busy || !token || !message.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? "Sending…" : "Send"}</button></form>}
    </section>
  );
}
