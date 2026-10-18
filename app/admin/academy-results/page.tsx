"use client";

import { useCallback,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession,type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Assessment={id:string;title:string;assessment_type:string;organisation_id:string|null;is_published:boolean};
type AttemptResult={attempt_id:string;user_id:string;attempt_number:number;status:string;score:number|null;total:number|null;percentage:number|null;started_at:string;submitted_at:string|null;deadline_at:string|null;auto_submitted:boolean;answer_count:number};

export default function AcademyResultsAdminPage(){
 const router=useRouter();
 const [admin,setAdmin]=useState<AdminUser|null>(null);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [assessmentId,setAssessmentId]=useState("");
 const [attempts,setAttempts]=useState<AttemptResult[]>([]);
 const [resultRelease,setResultRelease]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 const loadAssessments=useCallback(async()=>{
   const {data,error:queryError}=await supabase.from("learning_assessments").select("id,title,assessment_type,organisation_id,is_published").order("created_at",{ascending:false});
   if(queryError){setError("Could not load assessment records for this administrator.");return;}
   const rows=(data??[]) as Assessment[];setAssessments(rows);setAssessmentId((old)=>old||rows[0]?.id||"");
   return rows[0]?.id||"";
 },[]);

 const loadResults=useCallback(async(id:string)=>{
   if(!id)return;
   const {data,error:rpcError}=await supabase.rpc("get_organisation_assessment_results",{p_assessment_id:id});
   if(rpcError){setError(rpcError.message);setAttempts([]);}
   else if(!data?.ok){setError(data?.message||"Could not load results.");setAttempts([]);}
   else{setAttempts((data.attempts??[]) as AttemptResult[]);setResultRelease(data.result_release||"");setMessage(`Loaded ${(data.attempts??[]).length} attempt record(s).`);}
   setWorking(false);
 },[]);

 useEffect(()=>{
   let active=true;
   async function init(){
     const session=await getAdminSession();if(!active)return;
     if(!session){router.replace("/account");return;}
     setAdmin(session);
     const checks=await Promise.all([adminHasPermission("analytics.read"),adminHasPermission("cbt.results.read"),adminHasPermission("institution.manage"),adminHasPermission("learning.content.manage")]);
     if(!active)return;
     if(!checks.some(Boolean)&&!["super_admin","platform_admin"].includes(session.role)){setError("This workspace requires assessment-results, institution, or Learning Hub administration permission.");setLoading(false);return;}
     const firstId=await loadAssessments();if(firstId)await loadResults(firstId);if(active)setLoading(false);
   }
   void init().catch(()=>{if(active){setError("Could not verify administrator access.");setLoading(false);}});
   return()=>{active=false;};
 },[router,loadAssessments,loadResults]);
 const selected=assessments.find((a)=>a.id===assessmentId);
 if(loading)return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading assessment results…</section></div></main>;
 return <main className="admin-page"><div className="admin-container">
  <section className="admin-hero"><div className="admin-hero-top"><div><div className="admin-badge">BrainLab Academy · Results administration</div><h1 className="admin-title">Assessment Results</h1><p className="admin-subtitle">Review attempts, scores, submission times, saved-answer counts, and auto-submissions. Learner result-release settings do not restrict authorised administrators.</p>{admin&&<div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_"," ")}</div>}</div><div className="admin-actions"><button className="admin-btn-light" onClick={()=>router.push("/admin/dashboard")}>Dashboard</button><button className="admin-btn-light" onClick={()=>router.push("/admin/organised-assessments")}>Assessment settings</button></div></div></section>
  {error&&<div className="admin-message" role="alert">{error}</div>}{message&&<div className="admin-message" role="status">{message}</div>}
  <section className="admin-section admin-card"><label className="admin-label">Assessment</label><select className="admin-input" value={assessmentId} onChange={(e)=>{const id=e.target.value;setAssessmentId(id);if(id){setWorking(true);void loadResults(id);}else{setAttempts([]);setResultRelease("");}}}><option value="">Choose assessment</option>{assessments.map((a)=><option key={a.id} value={a.id}>{a.title} · {a.assessment_type.replaceAll("_"," ")}</option>)}</select>
   {selected&&<p className="admin-help mt-2">Release policy: {resultRelease||"Loading…"} · {selected.is_published?"Published":"Draft"}</p>}
   <div className="mt-5 flex flex-wrap gap-3"><div className="admin-stat-card"><p className="admin-stat-label">Attempts</p><p className="admin-stat-value">{attempts.length}</p></div><div className="admin-stat-card"><p className="admin-stat-label">Submitted</p><p className="admin-stat-value">{attempts.filter((a)=>a.status==="submitted").length}</p></div><div className="admin-stat-card"><p className="admin-stat-label">Auto-submitted</p><p className="admin-stat-value">{attempts.filter((a)=>a.auto_submitted).length}</p></div></div>
   <div className="mt-6 flex justify-end"><button className="admin-btn-primary" disabled={working||!assessmentId} onClick={()=>{setWorking(true);void loadResults(assessmentId);}}>{working?"Loading…":"Refresh results"}</button></div>
  </section>
  <section className="admin-section admin-card"><h2 className="admin-card-title">Attempt records</h2>{attempts.length===0?<p className="admin-help">No attempts recorded for this assessment yet.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2 pr-3">Learner account ID</th><th className="py-2 pr-3">Attempt</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Answers saved</th><th className="py-2 pr-3">Started</th><th className="py-2 pr-3">Submitted</th><th className="py-2">Auto</th></tr></thead><tbody>{attempts.map((a)=><tr key={a.attempt_id} className="border-t"><td className="py-3 pr-3 font-mono text-xs">{a.user_id}</td><td className="py-3 pr-3">{a.attempt_number}</td><td className="py-3 pr-3">{a.status}</td><td className="py-3 pr-3">{a.score===null?"—":`${a.score} / ${a.total} (${a.percentage}%)`}</td><td className="py-3 pr-3">{a.answer_count}</td><td className="py-3 pr-3">{new Date(a.started_at).toLocaleString()}</td><td className="py-3 pr-3">{a.submitted_at?new Date(a.submitted_at).toLocaleString():"—"}</td><td className="py-3">{a.auto_submitted?"Yes":"No"}</td></tr>)}</tbody></table></div>}</section>
 </div></main>;
}
