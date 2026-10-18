"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Subject={id:string;name:string;slug:string;description:string|null;icon_url:string|null;order_index:number};
type Topic={id:string;subject_id:string;title:string;slug:string;description:string|null;order_index:number};
type Lesson={id:string;topic_id:string;title:string;summary:string|null;estimated_duration_mins:number;order_index:number};
type Block={id:string;lesson_id:string;block_type:string;content:Record<string,unknown>;order_index:number};
type Progress={status:string;completed_at:string|null};

const safeUrl=(value:unknown)=>{try{const u=new URL(typeof value==="string"?value:"");return u.protocol==="https:"?u.toString():null;}catch{return null;}};

export default function LearningHubPage(){
  const [subjects,setSubjects]=useState<Subject[]>([]);
  const [topics,setTopics]=useState<Topic[]>([]);
  const [lessons,setLessons]=useState<Lesson[]>([]);
  const [selectedSubject,setSelectedSubject]=useState("");
  const [selectedTopic,setSelectedTopic]=useState("");
  const [selectedLesson,setSelectedLesson]=useState("");
  const [blocks,setBlocks]=useState<Block[]>([]);
  const [progress,setProgress]=useState<Progress|null>(null);
  const [userId,setUserId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    async function load(){
      const [s,t,l,auth]=await Promise.all([
        supabase.from("learning_subjects").select("id,name,slug,description,icon_url,order_index").eq("is_published",true).order("order_index").order("name"),
        supabase.from("learning_topics").select("id,subject_id,title,slug,description,order_index").eq("is_published",true).order("order_index").order("title"),
        supabase.from("learning_lessons").select("id,topic_id,title,summary,estimated_duration_mins,order_index").eq("is_published",true).order("order_index").order("title"),
        supabase.auth.getUser(),
      ]);
      if(!active)return;
      if(s.error||t.error||l.error){setError("Learning content could not be loaded. Published content may not yet be available.");}
      const ss=(s.data??[]) as Subject[];const tt=(t.data??[]) as Topic[];const ll=(l.data??[]) as Lesson[];
      setSubjects(ss);setTopics(tt);setLessons(ll);setSelectedSubject(ss[0]?.id??"");setSelectedTopic(tt.find((x)=>x.subject_id===ss[0]?.id)?.id??"");setSelectedLesson(ll.find((x)=>x.topic_id===tt.find((x)=>x.subject_id===ss[0]?.id)?.id)?.id??"");
      setUserId(auth.data.user?.id??null);setLoading(false);
    }
    void load().catch(()=>{if(active){setError("Could not load Learning Hub.");setLoading(false);}});
    return()=>{active=false;};
  },[]);

  const currentTopics=topics.filter((t)=>t.subject_id===selectedSubject);
  const currentLessons=lessons.filter((l)=>l.topic_id===selectedTopic);
  const loadLesson=useCallback(async(id:string)=>{
    if(!id){setBlocks([]);setProgress(null);return;}
    const [b,p]=await Promise.all([
      supabase.from("learning_lesson_blocks").select("id,lesson_id,block_type,content,order_index").eq("lesson_id",id).order("order_index"),
      userId?supabase.from("learning_lesson_progress").select("status,completed_at").eq("student_id",userId).eq("lesson_id",id).maybeSingle():Promise.resolve({data:null,error:null}),
    ]);
    if(b.error){setError("Could not load this lesson.");setBlocks([]);}else setBlocks((b.data??[]) as Block[]);
    setProgress((p.data as Progress|null)??null);
  },[userId]);

  useEffect(()=>{void loadLesson(selectedLesson);},[selectedLesson,loadLesson]);

  async function markComplete(){
    if(!userId||!selectedLesson){setMessage("Sign in to save your learning progress.");return;}
    setSaving(true);setError("");setMessage("");
    const last=blocks[blocks.length-1]?.id??null;
    const {error:saveError}=await supabase.from("learning_lesson_progress").upsert({
      student_id:userId,lesson_id:selectedLesson,status:"completed",completed_at:new Date().toISOString(),last_block_id:last,updated_at:new Date().toISOString(),
    });
    if(saveError)setError("Progress could not be saved. Confirm your account is signed in and the Learning Hub policies are installed.");
    else{setProgress({status:"completed",completed_at:new Date().toISOString()});setMessage("Lesson marked complete.");}
    setSaving(false);
  }

  const selectedSubjectRow=subjects.find((s)=>s.id===selectedSubject);
  const selectedLessonRow=lessons.find((l)=>l.id===selectedLesson);

  if(loading)return <main className="mx-auto max-w-6xl px-5 py-12">Loading Learning Hub…</main>;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-3xl bg-white p-7 shadow-sm sm:p-10"><p className="text-sm font-bold uppercase tracking-wide text-indigo-700">BrainLab Academy</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Learning Hub</h1><p className="mt-3 max-w-3xl text-slate-600">Explore published subjects, follow structured topics, and work through lessons at your pace. Your progress can be saved to your signed-in account.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/self-practice" className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white">Practise questions</Link><Link href="/assessments" className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-900">Quizzes & competitions</Link><Link href="/dashboard" className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-900">My dashboard</Link></div></header>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}{message&&<div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">{message}</div>}
    {subjects.length===0?<section className="rounded-2xl bg-white p-8"><h2 className="text-xl font-bold">Learning content is being prepared</h2><p className="mt-2 text-slate-600">Administrators are setting up the first published subjects and lessons. You can use Self Practice in the meantime.</p></section>:<section className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Subjects</h2><div className="mt-3 space-y-2">{subjects.map((s)=><button key={s.id} onClick={()=>{setSelectedSubject(s.id);const topic=topics.find((t)=>t.subject_id===s.id);setSelectedTopic(topic?.id??"");setSelectedLesson(lessons.find((l)=>l.topic_id===topic?.id)?.id??"");}} className={`w-full rounded-xl p-3 text-left ${selectedSubject===s.id?"bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200":"bg-slate-50 hover:bg-slate-100"}`}><strong>{s.name}</strong>{s.description&&<span className="mt-1 block text-xs text-slate-500">{s.description}</span>}</button>)}</div></div>
      {selectedSubjectRow&&<div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Topics</h2><div className="mt-3 space-y-2">{currentTopics.length===0?<p className="text-sm text-slate-500">No published topics in this subject yet.</p>:currentTopics.map((t)=><button key={t.id} onClick={()=>{setSelectedTopic(t.id);setSelectedLesson(lessons.find((l)=>l.topic_id===t.id)?.id??"");}} className={`w-full rounded-xl p-3 text-left text-sm ${selectedTopic===t.id?"bg-indigo-50 font-semibold text-indigo-900":"bg-slate-50 hover:bg-slate-100"}`}>{t.title}</button>)}</div></div>}</aside>
      <div className="space-y-5">{selectedTopic&&<div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Lessons</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{currentLessons.length===0?<p className="text-sm text-slate-500">No published lessons in this topic yet.</p>:currentLessons.map((l)=><button key={l.id} onClick={()=>setSelectedLesson(l.id)} className={`rounded-xl border p-4 text-left ${selectedLesson===l.id?"border-indigo-500 bg-indigo-50":"border-slate-200 hover:border-indigo-300"}`}><strong>{l.title}</strong><span className="mt-1 block text-xs text-slate-500">{l.estimated_duration_mins} min{progress?.status==="completed"&&selectedLesson===l.id?" · Completed":""}</span>{l.summary&&<span className="mt-2 block text-sm text-slate-600">{l.summary}</span>}</button>)}</div></div>}
        {selectedLessonRow&&<article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-indigo-700">{selectedSubjectRow?.name}</p><h2 className="mt-1 text-2xl font-bold">{selectedLessonRow.title}</h2><p className="mt-2 text-sm text-slate-500">{selectedLessonRow.estimated_duration_mins} minutes · {blocks.length} content blocks</p></div>{progress?.status==="completed"&&<span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">Completed</span>}</div>{selectedLessonRow.summary&&<p className="mt-4 text-slate-600">{selectedLessonRow.summary}</p>}
          <div className="mt-6 space-y-5">{blocks.length===0?<p className="rounded-xl bg-slate-50 p-4 text-slate-600">This lesson has no published content blocks yet.</p>:blocks.map((b,i)=>{const c=b.content??{};const url=safeUrl(c.url??c.src);return <section key={b.id} className="rounded-xl border border-slate-200 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Part {i+1} · {b.block_type.replaceAll("_"," ")}</p>{b.block_type==="text"&&<div className="whitespace-pre-wrap leading-7 text-slate-800">{String(c.text??c.body??"")}</div>}{b.block_type==="image"&&url&&<img src={url} alt={String(c.alt??"Lesson illustration")} className="block max-h-[32rem] max-w-full rounded-lg object-contain" loading="lazy"/>}{b.block_type==="voice_note"&&url&&<audio controls preload="metadata" className="w-full" src={url}>Audio playback is not supported by this browser.</audio>}{["short_video","long_video"].includes(b.block_type)&&url&&<video controls preload="metadata" className="max-h-[32rem] w-full rounded-lg" src={url}>Video playback is not supported by this browser.</video>}{b.block_type==="inline_mcq"&&<InlineQuestion content={c}/>}</section>})}</div>
          <div className="mt-7 border-t border-slate-200 pt-5"><button className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={saving||progress?.status==="completed"} onClick={()=>void markComplete()}>{saving?"Saving progress…":progress?.status==="completed"?"Lesson completed":"Mark lesson complete"}</button>{!userId&&<p className="mt-2 text-sm text-slate-500">Sign in to save lesson progress across devices.</p>}</div>
        </article>}
      </div>
    </section>}
  </div></main>;
}

function InlineQuestion({content}:{content:Record<string,unknown>}){
  const [choice,setChoice]=useState("");
  const [revealed,setRevealed]=useState(false);
  const options=(content.options&&typeof content.options==="object"?content.options:{}) as Record<string,string>;
  return <div><p className="font-semibold">{String(content.prompt??"Quick practice question")}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(options).map(([key,value])=><label key={key} className={`flex gap-2 rounded-lg border p-3 ${choice===key?"border-indigo-500 bg-indigo-50":"border-slate-200"}`}><input type="radio" name={String(content.prompt??"inline-question")} checked={choice===key} onChange={()=>{setChoice(key);setRevealed(false);}}/><span><strong>{key}.</strong> {String(value)}</span></label>)}</div><button className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={()=>setRevealed(true)}>Check answer</button>{revealed&&<p className="mt-2 text-sm">Correct answer: <strong>{String(content.answer??"Check the lesson notes")}</strong></p>}</div>;
}
