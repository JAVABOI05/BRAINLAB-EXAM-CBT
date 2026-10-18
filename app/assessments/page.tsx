"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Assessment = { id: string; assessment_type: string; title: string; description: string | null; organisation_id: string | null; question_count: number; duration_seconds: number | null; max_attempts: number; starts_at: string | null; ends_at: string | null; access_code_required: boolean; result_release: string; };

export default function AssessmentsPage() {
  const router=useRouter();
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>{
    let active=true;
    async function load(){
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(!active)return;
      if(authError||!auth.user){router.replace("/account");return;}
      const {data,error:queryError}=await supabase.from("learning_assessments")
        .select("id,assessment_type,title,description,organisation_id,question_count,duration_seconds,max_attempts,starts_at,ends_at,access_code_required,result_release")
        .eq("is_published",true).order("starts_at",{ascending:true});
      if(!active)return;
      if(queryError)setError("Could not load assessments. Check that you are signed in and the assessment system is available.");
      setAssessments((data??[]) as Assessment[]);setLoading(false);
    }
    void load().catch(()=>{if(active){setError("Could not load assessments.");setLoading(false);}});
    return()=>{active=false;};
  },[router]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const status=(a:Assessment)=>{
    if(now===null)return "Checking";
    if(a.starts_at&&new Date(a.starts_at).getTime()>now)return "Scheduled";
    if(a.ends_at&&new Date(a.ends_at).getTime()<=now)return "Closed";
    return "Available";
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6"><div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-2xl bg-white p-7 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-indigo-700">BrainLab Academy</p><h1 className="mt-2 text-3xl font-extrabold">Quizzes & Competitions</h1><p className="mt-3 max-w-3xl text-slate-600">Published organisation quizzes and competition assessments available to your account. Some assessments require an access code; question papers do not include answer keys before submission.</p><Link href="/dashboard" className="mt-5 inline-flex font-semibold text-indigo-700 underline">Learner dashboard</Link></header>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {loading?<div className="rounded-xl bg-white p-6">Loading assessments…</div>:assessments.length===0?<div className="rounded-xl bg-white p-8"><h2 className="text-xl font-bold">No published assessments yet</h2><p className="mt-2 text-slate-600">When an administrator publishes a quiz or competition you are eligible to take, it will appear here.</p></div>:<div className="grid gap-4 md:grid-cols-2">{assessments.map((a)=>{const currentStatus=status(a);return <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-indigo-700">{a.assessment_type.replaceAll("_"," ")}</span><span className={currentStatus==="Available"?"rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800":currentStatus==="Closed"?"rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600":"rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"}>{currentStatus}</span></div><h2 className="mt-3 text-xl font-bold">{a.title}</h2><p className="mt-2 text-sm text-slate-600">{a.description||"Assessment instructions will be shown before you begin."}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="rounded bg-slate-100 px-2 py-1">{a.question_count} questions</span><span className="rounded bg-slate-100 px-2 py-1">{a.duration_seconds?Math.round(a.duration_seconds/60)+" minutes":"Untimed"}</span><span className="rounded bg-slate-100 px-2 py-1">{a.max_attempts} attempt(s)</span>{a.access_code_required&&<span className="rounded bg-amber-50 px-2 py-1 text-amber-800">Code required</span>}</div>{(a.starts_at||a.ends_at)&&<p className="mt-3 text-xs text-slate-500">{a.starts_at?new Date(a.starts_at).toLocaleString():"Opens immediately"} – {a.ends_at?new Date(a.ends_at).toLocaleString():"No closing time"}</p>}<Link aria-disabled={currentStatus!=="Available"} href={currentStatus==="Available"?`/assessments/${a.id}`:"#"} className={`mt-5 inline-flex rounded-xl px-4 py-3 text-sm font-semibold ${currentStatus==="Available"?"bg-indigo-700 text-white":"pointer-events-none bg-slate-100 text-slate-400"}`}>{currentStatus==="Available"?"View and start":"Not available"}</Link></article>})}</div>}
  </div></main>;
}
