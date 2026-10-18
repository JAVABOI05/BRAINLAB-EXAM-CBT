"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type RedeemResponse={ok:boolean;message?:string;scope_type?:string;already_redeemed?:boolean;permanent?:boolean;expires_at?:string|null;max_questions?:number;entitlement_id?:string;};
export default function RedeemAccessPage(){
 const router=useRouter();
 const [code,setCode]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 const [result,setResult]=useState<RedeemResponse|null>(null);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data,error:authError})=>{if(!active)return;if(authError||!data.user){router.replace("/account");return;}setLoading(false);}).catch(()=>{if(active){setError("Could not verify your sign-in.");setLoading(false);}});return()=>{active=false;};},[router]);
 async function redeem(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setWorking(true);setError("");setResult(null);
  const {data,error:rpcError}=await supabase.rpc("redeem_learning_access_code",{p_code:code.trim().toUpperCase()});
  if(rpcError)setError(rpcError.message);
  else if(!data?.ok)setError((data as RedeemResponse).message||"This code could not be redeemed.");
  else{setResult(data as RedeemResponse);setCode("");}
  setWorking(false);
 }
 if(loading)return <main className="mx-auto max-w-2xl px-5 py-12">Checking your account…</main>;
 return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-2xl space-y-5">
  <header className="rounded-2xl bg-white p-7 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-indigo-700">BrainLab Academy</p><h1 className="mt-2 text-3xl font-extrabold">Redeem an access code</h1><p className="mt-3 text-slate-600">Use a code issued by BrainLab Tutorial or an organisation administrator to unlock the specific membership, resource, or assessment it was created for. Codes never grant unrestricted administrator access.</p></header>
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}
  {result&&<div className="rounded-2xl border border-green-200 bg-green-50 p-6"><h2 className="text-xl font-bold text-green-950">{result.already_redeemed?"This code is already linked to your account":"Access code accepted"}</h2><p className="mt-2 text-green-900">Access type: <strong>{(result.scope_type||"access").replaceAll("_"," ")}</strong></p><p className="mt-1 text-green-900">Question limit: <strong>{result.max_questions??"As configured"}</strong></p><p className="mt-1 text-green-900">Duration: <strong>{result.permanent?"Permanent":result.expires_at?new Date(result.expires_at).toLocaleString():"As configured"}</strong></p><p className="mt-3 text-sm text-green-900">The code is now associated with your account. Access remains limited to its configured scope and can be revoked by an authorised administrator.</p></div>}
  <form onSubmit={redeem} className="rounded-2xl bg-white p-6 shadow-sm"><label htmlFor="access-code" className="mb-2 block font-semibold">Access code</label><input id="access-code" className="w-full rounded-xl border border-slate-300 p-4 font-mono uppercase tracking-wide" value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} required minLength={8} maxLength={128} placeholder="BLT-…" autoComplete="off"/><button className="mt-4 w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={working}>{working?"Checking code…":"Redeem code"}</button></form>
  <div className="flex flex-wrap gap-4 text-sm font-semibold"><Link href="/dashboard" className="text-indigo-700 underline">Learner dashboard</Link><Link href="/assessments" className="text-indigo-700 underline">Browse assessments</Link><Link href="/learning-hub" className="text-indigo-700 underline">Learning Hub</Link></div>
 </div></main>;
}
