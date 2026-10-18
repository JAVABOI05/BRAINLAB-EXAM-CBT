"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type { PaperQuestion, Option, ResultItem } from "../../lib/examApi";

type Assessment = { id: string; assessment_type: string; title: string; description: string|null; question_count: number; duration_seconds: number|null; max_attempts: number; starts_at: string|null; ends_at: string|null; access_code_required: boolean; result_release: string };
type Attempt = { attempt_id:string; attempt_token:string; deadline_at:string|null; questions:PaperQuestion[] };
type Submission = { ok:true; results_available:boolean; message?:string; score?:number; total?:number; percentage?:number; items?:ResultItem[]; auto_submitted?:boolean };
type Failure = { ok:false; message?:string; error?:string };

const safeImageUrl=(value:string|null|undefined)=>{try{const u=new URL(value??"");return u.protocol==="https:"?u.toString():null;}catch{return null;}};
const fmt=(seconds:number)=>`${Math.floor(Math.max(0,seconds)/60).toString().padStart(2,"0")}:${(Math.max(0,seconds)%60).toString().padStart(2,"0")}`;

export default function OrganisedAssessmentPage(){
  const router=useRouter();
  const params=useParams<{id:string}>();
  const assessmentId=String(params.id??"");
  const [assessment,setAssessment]=useState<Assessment|null>(null);
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [answers,setAnswers]=useState<Record<string,Option>>({});
  const [code,setCode]=useState("");
  const [result,setResult]=useState<Submission|null>(null);
  const [secondsLeft,setSecondsLeft]=useState<number|null>(null);
  const [pendingSaves,setPendingSaves]=useState(0);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    async function load(){
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(!active)return;
      if(authError||!auth.user){router.replace("/account");return;}
      const {data,error:queryError}=await supabase.from("learning_assessments")
        .select("id,assessment_type,title,description,question_count,duration_seconds,max_attempts,starts_at,ends_at,access_code_required,result_release")
        .eq("id",assessmentId).eq("is_published",true).maybeSingle();
      if(!active)return;
      if(queryError||!data)setError("This assessment is not available to your account, or the assessment system is not deployed in this environment.");
      else setAssessment(data as Assessment);
      setLoading(false);
    }
    if(assessmentId)void load().catch(()=>{if(active){setError("Could not load assessment.");setLoading(false);}});
    return()=>{active=false;};
  },[router,assessmentId]);

  useEffect(()=>{
    if(!attempt?.deadline_at||result)return;
    const deadline=new Date(attempt.deadline_at).getTime();
    const tick=()=>setSecondsLeft(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
    const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);
  },[attempt?.deadline_at,result]);

  async function start(event:{preventDefault:()=>void}){
    event.preventDefault();if(!assessment)return;
    setWorking(true);setError("");setMessage("");
    const {data,error:rpcError}=await supabase.rpc("start_organisation_assessment",{p_assessment_id:assessment.id,p_access_code:code.trim()||null});
    if(rpcError)setError(rpcError.message);
    else if(!data?.ok)setError((data as Failure).message||"Could not start this assessment.");
    else{
      const nextAttempt={attempt_id:data.attempt_id,attempt_token:data.attempt_token,deadline_at:data.deadline_at??null,questions:(data.questions??[]) as PaperQuestion[]};
      setAttempt(nextAttempt);setSecondsLeft(nextAttempt.deadline_at?Math.max(0,Math.ceil((new Date(nextAttempt.deadline_at).getTime()-Date.now())/1000)):null);
      setAnswers({});setMessage("Assessment started. Answers are saved to your account; the answer key stays server-side.");
    }
    setWorking(false);
  }

  const chooseAnswer=useCallback(async(questionId:number,option:Option)=>{
    if(!attempt||result||secondsLeft===0)return;
    const key=String(questionId);setAnswers((old)=>({...old,[key]:option}));setPendingSaves((n)=>n+1);
    try{
      const {data,error:saveError}=await supabase.rpc("save_organisation_assessment_progress",{
        p_attempt_id:attempt.attempt_id,p_attempt_token:attempt.attempt_token,p_answers:{[key]:option},
      });
      if(saveError||!data?.ok)setError(saveError?.message||(data as Failure|null)?.message||"Answer could not be saved.");
    }finally{setPendingSaves((n)=>Math.max(0,n-1));}
  },[attempt,result,secondsLeft]);

  const submit=useCallback(async()=>{
    if(!attempt||result||working||pendingSaves>0)return;
    setWorking(true);setError("");setMessage("");
    const {data,error:submitError}=await supabase.rpc("submit_organisation_assessment",{
      p_attempt_id:attempt.attempt_id,p_attempt_token:attempt.attempt_token,p_answers:answers,
    });
    if(submitError)setError(submitError.message);
    else if(!data?.ok)setError((data as Failure).message||"Could not submit this assessment.");
    else{
      const submission=data as Submission;setResult(submission);setAttempt(null);
      setMessage(submission.message||(submission.auto_submitted?"Time expired; saved answers were submitted.":"Assessment submitted."));
    }
    setWorking(false);
  },[attempt,result,working,pendingSaves,answers]);

  if(loading)return <main className="mx-auto max-w-4xl px-5 py-16">Loading assessment…</main>;
  if(!assessment)return <main className="mx-auto max-w-3xl px-5 py-12"><div className="rounded-2xl bg-white p-7"><h1 className="text-2xl font-bold">Assessment unavailable</h1><p className="mt-3 text-slate-600">{error||"This assessment is not available."}</p><button className="mt-5 rounded-xl bg-indigo-700 px-4 py-3 text-white" onClick={()=>router.push("/assessments")}>Back to assessments</button></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl space-y-5">
    <header className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-indigo-700">{assessment.assessment_type.replaceAll("_"," ")}</p><h1 className="mt-2 text-3xl font-extrabold">{assessment.title}</h1><p className="mt-3 text-slate-600">{assessment.description||"Read each question carefully and submit before the time limit expires."}</p><div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded bg-slate-100 px-3 py-1">{assessment.question_count} questions</span><span className="rounded bg-slate-100 px-3 py-1">{assessment.duration_seconds?Math.round(assessment.duration_seconds/60)+" minutes":"Untimed"}</span><span className="rounded bg-slate-100 px-3 py-1">Maximum attempts: {assessment.max_attempts}</span></div><button className="mt-4 text-sm font-semibold text-indigo-700 underline" onClick={()=>router.push("/assessments")}>Back to assessment list</button></header>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}{message&&<div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900" role="status">{message}</div>}
    {!attempt&&!result&&<form className="rounded-2xl bg-white p-6 shadow-sm" onSubmit={start}>{assessment.access_code_required&&<><label className="mb-2 block font-semibold" htmlFor="assessment-code">Assessment access code</label><input id="assessment-code" className="w-full rounded-xl border border-slate-300 p-3 font-mono uppercase" value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())} required placeholder="Enter the code issued for this assessment"/></>}<button className="mt-2 rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={working}>{working?"Preparing assessment…":"Start assessment"}</button></form>}
    {attempt&&<section className="space-y-5"><div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm"><div><strong>{attempt.questions.length} questions</strong><p className="text-sm text-slate-500">{Object.keys(answers).length} answered{pendingSaves? " · saving answers…":""}</p></div><div className="flex items-center gap-3">{secondsLeft!==null&&<strong className={secondsLeft<60?"text-red-700":""}>Time: {fmt(secondsLeft)}</strong>}<button className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={working||pendingSaves>0} onClick={()=>void submit()}>{working?"Submitting…":pendingSaves?"Saving…":"Submit"}</button></div></div>
      {attempt.questions.map((q,i)=><article key={q.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-semibold text-indigo-700">Question {i+1} of {attempt.questions.length}</span><span className="text-sm text-slate-500">{q.subject} · {q.section}</span></div>{q.passage_text&&<div className="mt-4 rounded-lg bg-slate-50 p-4"><strong>{q.passage_title||"Passage"}</strong><p className="mt-2 whitespace-pre-wrap">{q.passage_text}</p></div>}<h2 className="mt-4 whitespace-pre-wrap text-lg font-semibold">{q.question}</h2>{safeImageUrl(q.question_image_url)&&<img src={safeImageUrl(q.question_image_url)!} alt={q.question_image_alt||"Question illustration"} className="mt-3 block max-h-96 max-w-full rounded-lg border object-contain" loading="lazy"/>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{(["A","B","C","D"] as const).map((k)=>{const key=`option_${k.toLowerCase()}` as "option_a"|"option_b"|"option_c"|"option_d";const imageKey=`${key}_image_url` as "option_a_image_url"|"option_b_image_url"|"option_c_image_url"|"option_d_image_url";const altKey=`${key}_image_alt` as "option_a_image_alt"|"option_b_image_alt"|"option_c_image_alt"|"option_d_image_alt";return <label key={k} className={`flex gap-3 rounded-xl border p-4 ${answers[String(q.id)]===k?"border-indigo-600 bg-indigo-50":"border-slate-200"}`}><input className="mt-1" type="radio" name={`q-${q.id}`} checked={answers[String(q.id)]===k} disabled={secondsLeft===0||working} onChange={()=>void chooseAnswer(q.id,k)}/><span><strong>{k}.</strong> {q[key]||""}{safeImageUrl(q[imageKey])&&<img src={safeImageUrl(q[imageKey])!} alt={q[altKey]||`Option ${k} illustration`} className="mt-2 block max-h-56 max-w-full object-contain" loading="lazy"/>}</span></label>})}</div></article>)}
      {secondsLeft===0&&<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">Time is up. Submit your saved answers to finish.</div>}<button className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={working||pendingSaves>0} onClick={()=>void submit()}>{working?"Submitting…":"Submit assessment"}</button></section>}
    {result&&<section className="space-y-5"><div className="rounded-2xl bg-white p-7 shadow-sm"><h2 className="text-2xl font-bold">{result.results_available?"Assessment results":"Submission received"}</h2>{result.results_available?<p className="mt-2 text-lg">{result.score} / {result.total} · {result.percentage}%</p>:<p className="mt-2 text-slate-600">{result.message||"Your submission was recorded."}</p>}<button className="mt-5 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white" onClick={()=>router.push("/assessments")}>Back to assessments</button></div>{result.results_available&&(result.items??[]).map((item,i)=><article key={item.id} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex justify-between gap-3"><strong>Question {i+1}</strong><span className={item.isCorrect?"text-green-700":"text-red-700"}>{item.isCorrect?"Correct":"Review"}</span></div><h3 className="mt-3 text-lg font-semibold">{item.text}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{(["A","B","C","D"] as const).map((k)=><div key={k} className={`rounded-lg border p-3 ${item.correctAnswer===k?"border-green-400 bg-green-50":item.userAnswer===k?"border-red-300 bg-red-50":"border-slate-200"}`}><strong>{k}.</strong> {item.options?.[k]||""}</div>)}</div><p className="mt-3 text-sm">Your answer: {item.userAnswer||"Not answered"} · Correct answer: {item.correctAnswer}</p>{item.explanation&&<p className="mt-3 rounded-lg bg-blue-50 p-4">{item.explanation}</p>}</article>)}</section>}
  </div></main>;
}
