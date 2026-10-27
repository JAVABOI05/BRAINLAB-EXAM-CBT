"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";
import DifficultySlider from "../../components/DifficultySlider";
import type { DifficultyAllocationResult } from "../../lib/difficultyEngine";

type Organisation = { id: string; name: string; status: string };
type Subject = { name: string; question_count: number; categories: string[] };
type Assessment = { id: string; assessment_type: string; title: string; organisation_id: string | null; question_count: number; duration_seconds: number | null; max_attempts: number; starts_at: string | null; ends_at: string | null; access_code_required: boolean; result_release: string; is_published: boolean };

export default function OrganisedAssessmentsAdminPage() {
  const router = useRouter();
  const [admin,setAdmin] = useState<AdminUser|null>(null);
  const [organisations,setOrganisations] = useState<Organisation[]>([]);
  const [subjects,setSubjects] = useState<Subject[]>([]);
  const [assessments,setAssessments] = useState<Assessment[]>([]);
  const [kind,setKind] = useState<"organisation_quiz"|"competition">("organisation_quiz");
  const [organisationId,setOrganisationId] = useState("");
  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [selectedSubjects,setSelectedSubjects] = useState<string[]>([]);
  const [categories,setCategories] = useState("");
  const [questionCount,setQuestionCount] = useState(20);
  const [durationMinutes,setDurationMinutes] = useState(30);
  const [maxAttempts,setMaxAttempts] = useState(1);
  const [startsAt,setStartsAt] = useState("");
  const [endsAt,setEndsAt] = useState("");
  const [accessRequired,setAccessRequired] = useState(false);
  const [resultRelease,setResultRelease] = useState<"after_submit"|"after_close"|"admin_only">("after_submit");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [difficultyAllocation, setDifficultyAllocation] = useState<DifficultyAllocationResult | null>(null);

  const load = useCallback(async () => {
    setError("");
    const [o,a,catalog] = await Promise.all([
      supabase.from("learning_organisations").select("id,name,status").order("name"),
      supabase.from("learning_assessments").select("id,assessment_type,title,organisation_id,question_count,duration_seconds,max_attempts,starts_at,ends_at,access_code_required,result_release,is_published").order("created_at",{ascending:false}),
      supabase.rpc("get_self_practice_catalog"),
    ]);
    if (o.error || a.error || catalog.error) setError("Could not load organisation assessment settings.");
    setOrganisations((o.data ?? []) as Organisation[]);
    setAssessments((a.data ?? []) as Assessment[]);
    setSubjects((catalog.data?.subjects ?? []) as Subject[]);
    setOrganisationId((v) => v || o.data?.find((x) => x.status==="active")?.id || "");
  },[]);

  useEffect(() => {
    let active=true;
    async function init() {
      const session=await getAdminSession();
      if(!active)return;
      if(!session){router.replace("/account");return;}
      setAdmin(session);
      const allowed=await adminHasPermission("institution.manage");
      const global=await adminHasPermission("learning.content.manage");
      if(!active)return;
      if(!allowed && !global){setError("This workspace requires institution management or Learning Hub administration permission.");setLoading(false);return;}
      await load();if(active)setLoading(false);
    }
    void init().catch(()=>{if(active){setError("Could not verify administrator access.");setLoading(false);}});
    return()=>{active=false;};
  },[router,load]);

  async function createAssessment(event:{preventDefault:()=>void}) {
    event.preventDefault();setError("");setMessage("");
    if(!title.trim()){setError("Enter an assessment title.");return;}
    if(kind==="organisation_quiz" && !organisationId){setError("Choose an organisation for an organisation quiz.");return;}
    if(!selectedSubjects.length){setError("Choose at least one question-bank subject.");return;}
    if(endsAt && startsAt && new Date(endsAt)<=new Date(startsAt)){setError("End time must be later than start time.");return;}
    if(difficultyAllocation && difficultyAllocation.policyApplied === "strict" && !difficultyAllocation.ok){
      setError(difficultyAllocation.errorMessage || "Strict difficulty distribution requirements cannot be satisfied.");
      return;
    }
    setSaving(true);
    try {
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw new Error("Sign in again to continue.");
      const {error:insertError}=await supabase.from("learning_assessments").insert({
        assessment_type:kind,title:title.trim(),description:description.trim()||null,
        organisation_id:organisationId||null,question_source:"legacy_questions",
        subjects:selectedSubjects,categories:categories.split(",").map((x)=>x.trim()).filter(Boolean),
        question_count:Math.min(500,Math.max(1,questionCount)),
        duration_seconds:durationMinutes?Math.min(28800,Math.max(60,durationMinutes*60)):null,
        max_attempts:Math.min(100,Math.max(1,maxAttempts)),
        starts_at:startsAt?new Date(startsAt).toISOString():null,
        ends_at:endsAt?new Date(endsAt).toISOString():null,
        access_code_required:accessRequired,result_release:resultRelease,
        is_published:false,created_by:auth.user.id,
      });
      if(insertError)throw insertError;
      setTitle("");setDescription("");setCategories("");setMessage("Assessment saved as a draft. Publish after confirming the question pool and access settings.");
      await load();
    } catch(e){setError(e instanceof Error?e.message:"Could not create assessment.");}
    finally{setSaving(false);}
  }

  async function togglePublished(a:Assessment) {
    if(!a.is_published && a.starts_at && new Date(a.starts_at)>new Date()){ /* scheduled draft can still be published */ }
    if(!a.is_published && !window.confirm("Publish this assessment configuration? Learners may be able to start it as soon as its schedule and access rules permit."))return;
    setSaving(true);setError("");setMessage("");
    const {error:updateError}=await supabase.from("learning_assessments").update({is_published:!a.is_published}).eq("id",a.id);
    if(updateError)setError(updateError.message);else{setMessage(a.is_published?"Assessment unpublished.":"Assessment published.");await load();}
    setSaving(false);
  }

  const orgName=(id:string|null)=>id?organisations.find((o)=>o.id===id)?.name??"Organisation": "Open competition";
  if(loading)return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading organised assessments…</section></div></main>;

  return <main className="admin-page"><div className="admin-container">
    <section className="admin-hero"><div className="admin-hero-top"><div><div className="admin-badge">BrainLab Academy · Assessment administration</div><h1 className="admin-title">Organisation Quizzes & Competitions</h1><p className="admin-subtitle">Configure the assessment rules, subjects, question count, duration, schedule, access-code requirement, attempt limit, and result-release policy. Drafts are not available to learners.</p>{admin&&<div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_"," ")}</div>}</div><div className="admin-actions"><button className="admin-btn-light" onClick={()=>router.push("/admin/dashboard")}>Dashboard</button><button className="admin-btn-light" onClick={()=>router.push("/admin/academy-access")}>Access codes</button></div></div></section>
    {error&&<div className="admin-message" role="alert">{error}</div>}{message&&<div className="admin-message" role="status">{message}</div>}
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={createAssessment}><h2 className="admin-card-title">Create assessment draft</h2>
        <label className="admin-label">Assessment type</label><select className="admin-input" value={kind} onChange={(e)=>setKind(e.target.value as typeof kind)}><option value="organisation_quiz">Organisation quiz</option><option value="competition">Competition</option></select>
        {kind==="organisation_quiz"&&<><label className="admin-label">Organisation</label><select className="admin-input" value={organisationId} onChange={(e)=>setOrganisationId(e.target.value)} required><option value="">Choose organisation</option>{organisations.filter((o)=>o.status==="active").map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></>}
        {kind==="competition"&&<><label className="admin-label">Organisation (optional)</label><select className="admin-input" value={organisationId} onChange={(e)=>setOrganisationId(e.target.value)}><option value="">Open competition</option>{organisations.filter((o)=>o.status==="active").map((o)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></>}
        <label className="admin-label">Title</label><input className="admin-input" value={title} onChange={(e)=>setTitle(e.target.value)} required maxLength={255} />
        <label className="admin-label">Description and instructions</label><textarea className="admin-input" value={description} onChange={(e)=>setDescription(e.target.value)} rows={3}/>
        <fieldset className="mt-4"><legend className="admin-label">Question subjects</legend><div className="grid grid-cols-2 gap-2">{subjects.map((s)=><label key={s.name} className="flex gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={selectedSubjects.includes(s.name)} onChange={(e)=>setSelectedSubjects((old)=>e.target.checked?[...old,s.name]:old.filter((x)=>x!==s.name))}/><span>{s.name} ({s.question_count})</span></label>)}</div></fieldset>
        <label className="admin-label">Categories (optional, comma separated)</label><input className="admin-input" value={categories} onChange={(e)=>setCategories(e.target.value)} placeholder="e.g. algebra, geometry"/>
        <label className="admin-label">Question count</label><input className="admin-input" type="number" min={1} max={500} value={questionCount} onChange={(e)=>setQuestionCount(Number(e.target.value)||1)}/>
        <div className="mt-4 mb-2">
          <DifficultySlider
            totalQuestions={Math.min(500, Math.max(1, questionCount))}
            onChange={setDifficultyAllocation}
          />
        </div>
        <label className="admin-label">Duration (minutes; 0 = untimed)</label><input className="admin-input" type="number" min={0} max={480} value={durationMinutes} onChange={(e)=>setDurationMinutes(Number(e.target.value)||0)}/>
        <label className="admin-label">Maximum attempts</label><input className="admin-input" type="number" min={1} max={100} value={maxAttempts} onChange={(e)=>setMaxAttempts(Number(e.target.value)||1)}/>
        <label className="admin-label">Start time (optional)</label><input className="admin-input" type="datetime-local" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)}/>
        <label className="admin-label">End time (optional)</label><input className="admin-input" type="datetime-local" value={endsAt} onChange={(e)=>setEndsAt(e.target.value)}/>
        <label className="admin-toggle mt-3"><input type="checkbox" checked={accessRequired} onChange={(e)=>setAccessRequired(e.target.checked)}/><span>Require an assessment-specific access code</span></label>
        <label className="admin-label">Result release</label><select className="admin-input" value={resultRelease} onChange={(e)=>setResultRelease(e.target.value as typeof resultRelease)}><option value="after_submit">After submission</option><option value="after_close">After assessment closes</option><option value="admin_only">Administrator only</option></select>
        <button className="admin-btn-primary mt-4" disabled={saving||!title.trim()||!selectedSubjects.length}>{saving?"Saving…":"Save draft"}</button>
      </form>
      <div className="admin-card"><h2 className="admin-card-title">Configured assessments</h2>{assessments.length===0?<p className="admin-help">No organisation quizzes or competitions yet.</p>:assessments.map((a)=><article key={a.id} className="border-b py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{a.title}</strong><p className="admin-help">{a.assessment_type.replaceAll("_"," ")} · {orgName(a.organisation_id)}</p></div><button className={a.is_published?"admin-btn-light":"admin-btn-primary"} disabled={saving} onClick={()=>void togglePublished(a)}>{a.is_published?"Unpublish":"Publish"}</button></div><p className="admin-help mt-2">{a.question_count} questions · {a.duration_seconds?Math.round(a.duration_seconds/60)+" min":"untimed"} · {a.max_attempts} attempt(s) · {a.access_code_required?"Code required":"No code required"} · results: {a.result_release.replaceAll("_"," ")}</p>{(a.starts_at||a.ends_at)&&<p className="admin-help">{a.starts_at?new Date(a.starts_at).toLocaleString():"No start"} → {a.ends_at?new Date(a.ends_at).toLocaleString():"No end"}</p>}</article>)}</div>
    </section>
  </div></main>;
}
