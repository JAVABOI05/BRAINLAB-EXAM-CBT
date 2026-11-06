"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type Competition = { id: string; title: string; code: string };
type AccessCode = { id: string; label?: string | null; expires_at?: string | null; max_uses: number | null; used_count: number; is_active: boolean; created_at: string; round_id?: string | null };

export default function ArenaAccessCodesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState("");
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [singleUse, setSingleUse] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCodes = useCallback(async (accessToken: string, id: string) => {
    if (!id) { setCodes([]); return; }
    const response = await fetch(`/api/competition/competitions/${id}/access-codes`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load codes.");
    setCodes(data.codes || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) { router.replace("/auth/signin?redirect=/admin/competitions/access-codes"); return; }
      setToken(accessToken);
      const response = await fetch("/api/competition/competitions", { headers: { Authorization: `Bearer ${accessToken}` } });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to load competitions."); return; }
      const list = (result.competitions || []) as Competition[];
      setCompetitions(list);
      if (list[0]) {
        setCompetitionId(list[0].id);
        try { await loadCodes(accessToken, list[0].id); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load codes."); }
      }
    });
  }, [loadCodes, router]);

  const createCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!competitionId) return;
    setBusy(true); setError(""); setNotice(""); setNewCode("");
    try {
      const response = await fetch(`/api/competition/competitions/${competitionId}/access-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, single_use: singleUse, max_uses: singleUse ? 1 : (maxUses.trim() ? Number(maxUses) : null), expires_at: expiresAt ? new Date(expiresAt).toISOString() : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create access code.");
      setNewCode(data.redeemable_code || "");
      setNotice(data.warning || "Access code created. Copy it now.");
      setLabel(""); setExpiresAt("");
      await loadCodes(token, competitionId);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create code."); }
    finally { setBusy(false); }
  };

  const deactivate = async (codeId: string) => {
    try {
      const response = await fetch(`/api/competition/competitions/${competitionId}/access-codes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code_id: codeId, is_active: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to revoke code.");
      setNotice("Access code revoked.");
      await loadCodes(token, competitionId);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to revoke code."); }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#060b18] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header><Link href="/admin/competitions" className="text-sm font-bold text-blue-600">← Competition Admin</Link><h1 className="mt-2 text-3xl font-black">Competition Access Codes</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Create single-use or reusable codes with expiry and usage limits. Redeemable codes are displayed only once; the database stores hashes.</p></header>
        {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {newCode && <div className="rounded-2xl border border-blue-300 bg-blue-50 p-5 text-blue-950"><p className="text-xs font-black uppercase">Copy this code now — it will not be shown again</p><div className="mt-2 flex flex-wrap items-center gap-3"><code className="text-lg font-black tracking-wider">{newCode}</code><button onClick={() => navigator.clipboard.writeText(newCode)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Copy code</button></div></div>}
        <form onSubmit={createCode} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7 space-y-4">
          <h2 className="text-lg font-black">Generate access code</h2>
          <label className="block text-sm font-bold">Competition<select required value={competitionId} onChange={async e => { setCompetitionId(e.target.value); try { await loadCodes(token, e.target.value); } catch (err) { setError(err instanceof Error ? err.message : "Unable to load codes."); } }} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3">{competitions.map(item => <option key={item.id} value={item.id}>{item.title} ({item.code})</option>)}</select></label>
          <label className="block text-sm font-bold">Label (optional)<input value={label} onChange={e => setLabel(e.target.value)} maxLength={100} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" placeholder="e.g. November school cohort" /></label>
          <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={singleUse} onChange={e => setSingleUse(e.target.checked)} />Single-use code</label>
          {!singleUse && <label className="block text-sm font-bold">Maximum redemptions<input type="number" min="1" max="100000" value={maxUses} onChange={e => setMaxUses(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" placeholder="Leave blank for unlimited uses" /></label>}
          <label className="block text-sm font-bold">Expiry (optional)<input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-3" /></label>
          <button disabled={busy || !competitionId} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Generating…" : "Generate secure code"}</button>
        </form>
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d172e] p-5 sm:p-7">
          <h2 className="text-lg font-black">Issued codes</h2>
          <div className="mt-4 space-y-3">
            {codes.length === 0 && <p className="rounded-xl bg-slate-100 dark:bg-slate-900 p-5 text-sm text-slate-600 dark:text-slate-300">No access codes have been generated for this competition.</p>}
            {codes.map(code => <article key={code.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div><p className="font-bold">{code.label || "Unlabelled code"}</p><p className="mt-1 text-xs text-slate-500">{code.used_count} / {code.max_uses ?? "∞"} uses · {code.expires_at ? `Expires ${new Date(code.expires_at).toLocaleString()}` : "No expiry"}</p><p className="mt-1 text-xs text-slate-500">{new Date(code.created_at).toLocaleString()}</p></div>
              <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${code.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{code.is_active ? "Active" : "Revoked"}</span>{code.is_active && <button onClick={() => deactivate(code.id)} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700">Revoke</button>}</div>
            </article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
