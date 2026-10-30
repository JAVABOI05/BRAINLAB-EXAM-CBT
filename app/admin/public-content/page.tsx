"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Tutor = {
  id: string; user_id: string | null; name: string; slug: string; title: string; bio: string;
  qualifications: string; education: string; certifications: string; years_experience: number;
  subject_slugs: string[]; specialties: string[]; languages: string[]; teaching_approach: string;
  photo_url: string | null; profile_status: string; is_published: boolean; review_note: string;
  created_at: string; updated_at: string;
};

const statusStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
  suspended: "bg-slate-100 text-slate-700 border-slate-200",
  draft: "bg-blue-50 text-blue-800 border-blue-200",
};

export default function AdminPublicContentPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [filter, setFilter] = useState("all");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAllowed(false); return; }
    const { data: permission, error: permissionError } = await supabase.rpc("admin_has_permission", { permission_key: "learning.content.manage" });
    if (permissionError || permission !== true) { setAllowed(false); return; }
    setAllowed(true);
    const { data, error } = await supabase.from("tutor_profiles").select("*").order("updated_at", { ascending: false });
    if (error) { setMessage("Unable to load tutor profiles: " + error.message); return; }
    setTutors((data ?? []) as Tutor[]);
  }
  useEffect(() => { void load(); }, []);

  async function moderate(tutor: Tutor, status: "approved" | "rejected" | "suspended" | "pending") {
    setBusyId(tutor.id); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const approved = status === "approved";
    const { error } = await supabase.from("tutor_profiles").update({
      profile_status: status,
      is_published: approved,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
      review_note: reviewNotes[tutor.id]?.trim() ?? "",
    }).eq("id", tutor.id);
    setBusyId(null);
    if (error) { setMessage("Could not update profile: " + error.message); return; }
    setMessage(approved ? tutor.name + "'s profile is now published." : tutor.name + "'s profile status was updated.");
    await load();
  }

  const visible = filter === "all" ? tutors : tutors.filter((t) => t.profile_status === filter);
  if (allowed === null) return <div className="p-8 text-slate-600">Checking content-management permission…</div>;
  if (!allowed) return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">Access restricted</h1><p className="mt-2 text-slate-600">This workspace requires the learning content management permission.</p></div>;

  return <main className="mx-auto max-w-7xl p-5 sm:p-8">
    <header><p className="text-xs font-black uppercase tracking-widest text-blue-700">Website content governance</p><h1 className="mt-2 text-3xl font-black text-slate-950">Tutor profiles</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Tutors create and maintain their own profiles from their BrainLab accounts. Administrators review qualifications and control public publication here.</p></header>
    {message && <p role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">{message}</p>}
    <section className="mt-6 grid gap-3 sm:grid-cols-4">
      {["all","pending","approved","suspended"].map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={"rounded-2xl border p-4 text-left " + (filter === status ? "border-blue-700 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:border-blue-300")}><span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{status === "all" ? "All profiles" : status}</span><span className="mt-1 block text-2xl font-black text-slate-950">{status === "all" ? tutors.length : tutors.filter((t) => t.profile_status === status).length}</span></button>)}
    </section>
    <section className="mt-6 space-y-4">
      {visible.map((tutor) => <article key={tutor.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row">
          <div className="flex shrink-0 items-start gap-4 lg:w-72">
            {tutor.photo_url ? <img src={tutor.photo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0B1536] text-3xl font-black text-white">{tutor.name.slice(0,1)}</div>}
            <div className="min-w-0"><h2 className="font-extrabold text-slate-950">{tutor.name}</h2><p className="mt-1 text-sm text-slate-600">{tutor.title || "Tutor"}</p><span className={"mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize " + (statusStyle[tutor.profile_status] ?? statusStyle.draft)}>{tutor.profile_status}</span><p className="mt-2 text-xs text-slate-500">{tutor.user_id ? "Linked to tutor account" : "Unlinked legacy profile"}</p></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{tutor.bio}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Qualifications</p><p className="mt-1 whitespace-pre-line text-sm text-slate-700">{tutor.qualifications || "Not supplied"}</p></div>
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Education &amp; certifications</p><p className="mt-1 whitespace-pre-line text-sm text-slate-700">{[tutor.education,tutor.certifications].filter(Boolean).join("\n\n") || "Not supplied"}</p></div>
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Subjects &amp; expertise</p><p className="mt-1 text-sm text-slate-700">{[...(tutor.subject_slugs ?? []), ...(tutor.specialties ?? [])].join(" · ") || "Not supplied"}</p></div>
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Experience &amp; languages</p><p className="mt-1 text-sm text-slate-700">{tutor.years_experience} years · {(tutor.languages ?? []).join(", ") || "Languages not supplied"}</p></div>
            </div>
            {tutor.review_note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Previous review note: {tutor.review_note}</p>}
            <textarea value={reviewNotes[tutor.id] ?? ""} onChange={(e) => setReviewNotes((old) => ({...old,[tutor.id]:e.target.value}))} rows={2} maxLength={1000} placeholder="Optional review note for this tutor" className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={busyId === tutor.id} onClick={() => void moderate(tutor,"approved")} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Approve &amp; publish</button>
              <button disabled={busyId === tutor.id} onClick={() => void moderate(tutor,"rejected")} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 disabled:opacity-50">Reject</button>
              {tutor.profile_status === "approved" && <button disabled={busyId === tutor.id} onClick={() => void moderate(tutor,"suspended")} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">Suspend public profile</button>}
              {tutor.profile_status !== "approved" && <button disabled={busyId === tutor.id} onClick={() => void moderate(tutor,"pending")} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">Keep pending</button>}
              {tutor.profile_status === "approved" && <Link href={"/tutors/" + tutor.slug} target="_blank" className="inline-flex items-center rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-bold text-blue-800">View public page ↗</Link>}
            </div>
          </div>
        </div>
      </article>)}
      {!visible.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-extrabold text-slate-900">No tutor profiles in this view</h2><p className="mt-2 text-sm text-slate-500">Profiles submitted by teachers will appear here for review.</p></div>}
    </section>
    <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-amber-800">Temporarily suspended</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">Student testimonials</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">Student testimonials are hidden from public pages and new submissions are disabled. Existing records are preserved but cannot be approved or published while this pause is active.</p></div><span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-900">Paused</span></div></section>
  </main>;
}
