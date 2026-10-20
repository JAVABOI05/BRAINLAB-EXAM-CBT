"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type RedeemResult = { ok: boolean; message?: string; error?: string; scope_type?: string; already_redeemed?: boolean; permanent?: boolean; expires_at?: string | null; max_questions?: number };

export default function RedeemAccessPage() {
  const router = useRouter();
  const [code,setCode] = useState("");
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState(false);
  const [result,setResult] = useState<RedeemResult | null>(null);
  const [error,setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({data,error:authError}) => {
      if (!active) return;
      if (authError || !data.user) router.replace("/account");
      else setLoading(false);
    });
    return () => { active = false; };
  },[router]);

  async function redeem(event: { preventDefault: () => void }) {
    event.preventDefault();
    setWorking(true); setError(""); setResult(null);
    const {data,error:rpcError} = await supabase.rpc("redeem_learning_access_code",{p_code:code.trim()});
    if (rpcError) setError("Could not redeem this code. Confirm that you are signed in and the code belongs to the current BrainLab Academy access system.");
    else if (!data?.ok) setError(data?.message || "This code could not be redeemed.");
    else { setResult(data as RedeemResult); setCode(""); }
    setWorking(false);
  }

  if (loading) return <main className="mx-auto max-w-2xl px-5 py-16">Checking your account…</main>;
  return <main className="min-h-[65vh] bg-slate-50 px-4 py-12 sm:px-6"><div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
    <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">BrainLab Academy</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Redeem an access code</h1>
    <p className="mt-3 text-slate-600">Enter your BrainLab Tutorial, organisation, resource, or assessment code while signed in. Permanent codes bind to this account and can be redeemed only once; temporary codes expire according to their settings.</p>
    <form className="mt-7 space-y-4" onSubmit={redeem}><label className="block font-semibold" htmlFor="access-code">Access code</label><input id="access-code" className="w-full rounded-xl border border-slate-300 p-4 font-mono uppercase" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} required minLength={8} maxLength={128} placeholder="BLT-…" />
      <button className="w-full rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={working || !code.trim()}>{working ? "Checking code…" : "Redeem code"}</button>
    </form>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}
    {result && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-950" role="status"><h2 className="font-bold">{result.already_redeemed ? "This account already has this access" : "Access code redeemed successfully"}</h2><p className="mt-2 text-sm">Access type: {result.scope_type?.replaceAll("_"," ")}{result.permanent ? " · Permanent access" : result.expires_at ? ` · Expires ${new Date(result.expires_at).toLocaleString()}` : ""}{typeof result.max_questions === "number" ? ` · Up to ${result.max_questions} practice questions per attempt` : ""}</p><Link href="/self-practice" className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white">Go to Self Practice</Link></div>}
    <div className="mt-7 flex flex-wrap gap-4 text-sm"><Link href="/dashboard" className="font-semibold text-indigo-700 underline">Learner dashboard</Link><Link href="/login" className="font-semibold text-indigo-700 underline">CBT and exam practice</Link></div>
  </div></main>;
}
