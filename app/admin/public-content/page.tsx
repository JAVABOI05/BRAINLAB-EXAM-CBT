"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Tutor = { id: string; name: string; slug: string; title: string; bio: string; qualifications: string; photo_url: string | null; subject_slugs: string[]; is_published: boolean; sort_order: number };
type Story = { id: string; student_name: string; student_context: string; story: string; quote: string; attribution: string; is_approved: boolean; show_on_homepage: boolean; show_on_pricing: boolean; sort_order: number };
const blankTutor = { name:"", slug:"", title:"", bio:"", qualifications:"", photo_url:"", subject_slugs:"", is_published:false, sort_order:0 };
const blankStory = { student_name:"", student_context:"", story:"", quote:"", attribution:"", is_approved:false, show_on_homepage:false, show_on_pricing:false, sort_order:0 };

export default function AdminPublicContentPage() {
  const [tab,setTab] = useState<"tutors"|"stories">("tutors");
  const [tutors,setTutors] = useState<Tutor[]>([]);
  const [stories,setStories] = useState<Story[]>([]);
  const [tutor,setTutor] = useState({...blankTutor});
  const [story,setStory] = useState({...blankStory});
  const [tutorId,setTutorId] = useState<string|null>(null);
  const [storyId,setStoryId] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [allowed,setAllowed] = useState<boolean|null>(null);

  async function load() {
    const {data: auth} = await supabase.auth.getUser();
    if (!auth.user) { setAllowed(false); return; }
    const {data: permission,error} = await supabase.rpc("admin_has_permission",{permission_key:"learning.content.manage"});
    if (error || permission !== true) { setAllowed(false); return; }
    setAllowed(true);
    const [t,s] = await Promise.all([
      supabase.from("tutor_profiles").select("*").order("sort_order"),
      supabase.from("student_testimonials").select("*").order("sort_order")
    ]);
    if (t.error || s.error) setMessage("Could not load content. Confirm the tutors/testimonials database migration has been applied.");
    setTutors((t.data ?? []) as Tutor[]); setStories((s.data ?? []) as Story[]);
  }
  useEffect(() => { void load(); }, []);

  async function saveTutor(e:FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const payload = {...tutor, slug:tutor.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""), photo_url:tutor.photo_url.trim()||null, subject_slugs:tutor.subject_slugs.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean)};
    const result = tutorId ? await supabase.from("tutor_profiles").update(payload).eq("id",tutorId) : await supabase.from("tutor_profiles").insert(payload);
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    setTutor({...blankTutor}); setTutorId(null); setMessage("Tutor profile saved."); await load();
  }
  async function saveStory(e:FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const payload = {...story, show_on_homepage:story.is_approved && story.show_on_homepage, show_on_pricing:story.is_approved && story.show_on_pricing};
    const result = storyId ? await supabase.from("student_testimonials").update(payload).eq("id",storyId) : await supabase.from("student_testimonials").insert(payload);
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    setStory({...blankStory}); setStoryId(null); setMessage("Student story saved."); await load();
  }
  if (allowed === null) return <div className="mx-auto max-w-5xl p-8 text-slate-600">Checking content-management permission…</div>;
  if (!allowed) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">Access restricted</h1><p className="mt-2 text-slate-600">This workspace requires the learning content management permission.</p></div>;

  return <div className="mx-auto max-w-6xl p-5 sm:p-8">
    <div><p className="text-xs font-black uppercase tracking-widest text-blue-700">Website content</p><h1 className="mt-2 text-3xl font-black text-slate-950">Tutors & testimonials</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage public tutor profiles and approve genuine student stories. Only published/approved content appears on public pages.</p></div>
    <div className="mt-6 flex gap-2"><button onClick={()=>setTab("tutors")} className={"rounded-xl px-4 py-2.5 text-sm font-bold "+(tab==="tutors"?"bg-[#0B1536] text-white":"border border-slate-300 bg-white text-slate-700")}>Tutor profiles ({tutors.length})</button><button onClick={()=>setTab("stories")} className={"rounded-xl px-4 py-2.5 text-sm font-bold "+(tab==="stories"?"bg-[#0B1536] text-white":"border border-slate-300 bg-white text-slate-700")}>Student stories ({stories.length})</button></div>
    {message && <p role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">{message}</p>}
    {tab==="tutors" ? <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
      <section className="space-y-3">{tutors.map(t=><article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold">{t.name}</h2><p className="text-sm text-slate-500">{t.title||"Tutor"} · {t.is_published?"Published":"Draft"}</p></div><button className="text-sm font-bold text-blue-800 underline" onClick={()=>{setTutorId(t.id);setTutor({...t,photo_url:t.photo_url??"",subject_slugs:(t.subject_slugs??[]).join(", ")});window.scrollTo({top:0,behavior:"smooth"});}}>Edit</button></div></article>)}{!tutors.length&&<p className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No profiles yet. Add your first verified tutor.</p>}</section>
      <form onSubmit={saveTutor} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-extrabold">{tutorId?"Edit tutor":"Add tutor"}</h2>
        <input required value={tutor.name} onChange={e=>setTutor({...tutor,name:e.target.value})} placeholder="Tutor's full name" className="w-full rounded-xl border p-3 text-sm"/>
        <input required value={tutor.slug} onChange={e=>setTutor({...tutor,slug:e.target.value})} placeholder="URL slug (e.g. ada-okafor)" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={tutor.title} onChange={e=>setTutor({...tutor,title:e.target.value})} placeholder="Role / teaching title" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={tutor.qualifications} onChange={e=>setTutor({...tutor,qualifications:e.target.value})} placeholder="Qualifications" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={tutor.photo_url} onChange={e=>setTutor({...tutor,photo_url:e.target.value})} placeholder="Public photo URL (optional)" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={tutor.subject_slugs} onChange={e=>setTutor({...tutor,subject_slugs:e.target.value})} placeholder="Subject slugs, comma-separated" className="w-full rounded-xl border p-3 text-sm"/>
        <textarea required rows={5} value={tutor.bio} onChange={e=>setTutor({...tutor,bio:e.target.value})} placeholder="Tutor biography" className="w-full rounded-xl border p-3 text-sm"/>
        <input type="number" value={tutor.sort_order} onChange={e=>setTutor({...tutor,sort_order:Number(e.target.value)})} aria-label="Display order" className="w-full rounded-xl border p-3 text-sm" placeholder="Display order"/>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={tutor.is_published} onChange={e=>setTutor({...tutor,is_published:e.target.checked})}/> Publish profile</label>
        <div className="flex gap-2"><button disabled={busy} className="rounded-xl bg-[#0B1536] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save tutor"}</button><button type="button" onClick={()=>{setTutor({...blankTutor});setTutorId(null);}} className="rounded-xl border px-4 py-3 text-sm font-bold">Clear</button></div>
      </form>
    </div> : <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
      <section className="space-y-3">{stories.map(s=><article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><h2 className="font-extrabold">{s.student_name}</h2><p className="text-sm text-slate-500">{s.is_approved?"Approved":"Awaiting approval"}{s.show_on_homepage?" · Homepage":""}{s.show_on_pricing?" · Pricing":""}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.story}</p></div><button className="text-sm font-bold text-blue-800 underline" onClick={()=>{setStoryId(s.id);setStory({...s});window.scrollTo({top:0,behavior:"smooth"});}}>Edit</button></div></article>)}{!stories.length&&<p className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">No stories yet. Add a real student story with permission to publish it.</p>}</section>
      <form onSubmit={saveStory} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-extrabold">{storyId?"Edit story":"Add student story"}</h2>
        <input required value={story.student_name} onChange={e=>setStory({...story,student_name:e.target.value})} placeholder="Student name / approved display name" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={story.student_context} onChange={e=>setStory({...story,student_context:e.target.value})} placeholder="Context (e.g. UTME candidate)" className="w-full rounded-xl border p-3 text-sm"/>
        <textarea required minLength={10} maxLength={3000} rows={5} value={story.story} onChange={e=>setStory({...story,story:e.target.value})} placeholder="Real student story (with consent)" className="w-full rounded-xl border p-3 text-sm"/>
        <textarea maxLength={320} rows={2} value={story.quote} onChange={e=>setStory({...story,quote:e.target.value})} placeholder="Short quote for homepage/pricing (optional)" className="w-full rounded-xl border p-3 text-sm"/>
        <input value={story.attribution} onChange={e=>setStory({...story,attribution:e.target.value})} placeholder="Attribution (optional)" className="w-full rounded-xl border p-3 text-sm"/>
        <input type="number" value={story.sort_order} onChange={e=>setStory({...story,sort_order:Number(e.target.value)})} aria-label="Display order" className="w-full rounded-xl border p-3 text-sm" placeholder="Display order"/>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={story.is_approved} onChange={e=>setStory({...story,is_approved:e.target.checked})}/> Approve for public display</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={story.show_on_homepage} onChange={e=>setStory({...story,show_on_homepage:e.target.checked})}/> Feature on homepage</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={story.show_on_pricing} onChange={e=>setStory({...story,show_on_pricing:e.target.checked})}/> Feature on pricing page</label>
        <p className="text-xs leading-5 text-slate-500">Only use genuine feedback and confirm the student's consent before publishing their name or story.</p>
        <div className="flex gap-2"><button disabled={busy} className="rounded-xl bg-[#0B1536] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save story"}</button><button type="button" onClick={()=>{setStory({...blankStory});setStoryId(null);}} className="rounded-xl border px-4 py-3 text-sm font-bold">Clear</button></div>
      </form>
    </div>}
  </div>;
}
