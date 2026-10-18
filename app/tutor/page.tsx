"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Subject = { id: string; name: string; slug: string; description: string | null; membership_role: "tutor" | "reviewer" | "admin" };

export default function TutorHomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAssignments() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (sessionError || !user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      const { data: memberships, error: membershipError } = await supabase
        .from("learning_subject_memberships")
        .select("subject_id,membership_role")
        .eq("user_id", user.id);
      if (!active) return;
      if (membershipError) {
        setError("We could not load your teaching assignments. Please try again later.");
        setLoading(false);
        return;
      }
      const adminRole = await supabase.rpc("get_admin_role");
      const canManageAll = !adminRole.error && ["super_admin", "platform_admin"].includes(String(adminRole.data ?? ""));
      const rows = memberships ?? [];
      const ids = rows.map((item) => item.subject_id);
      const { data: subjectRows, error: subjectError } = canManageAll
        ? await supabase.from("learning_subjects").select("id,name,slug,description").order("name")
        : ids.length
          ? await supabase.from("learning_subjects").select("id,name,slug,description").in("id", ids).order("name")
          : { data: [], error: null };
      if (!active) return;
      if (subjectError) {
        setError("We could not load your assigned subjects.");
        setLoading(false);
        return;
      }
      const roleBySubject = new Map(rows.map((item) => [item.subject_id, item.membership_role as "tutor" | "reviewer"]));
      setSubjects((subjectRows ?? []).map((subject) => ({
        ...subject,
        membership_role: roleBySubject.get(subject.id) ?? "admin",
      })) as Subject[]);
      setLoading(false);
    }
    void loadAssignments();
    return () => { active = false; };
  }, []);

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-800">BrainLab Academy · Authoring Portal</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Teach with structure. Help learners progress.</h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Create lessons from reusable content blocks, organize topics, and build assessments that check understanding. Published content is separated from drafts.</p>

      {!signedIn && !loading && <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-xl font-extrabold text-slate-950">Sign in to access authoring tools</h2><p className="mt-2 leading-7 text-slate-600">Tutor access is assigned by a BrainLab administrator. Signing in alone does not grant permission to edit learning content.</p><Link href="/account" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Sign in</Link></section>}

      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading your assignments…</p>}
      {error && <p role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}</p>}
      {signedIn && !loading && !error && subjects.length === 0 && <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8"><h2 className="text-xl font-extrabold text-slate-950">No subjects assigned yet</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">Your account is signed in, but no learning subjects have been assigned to you. Ask a BrainLab administrator to assign a subject and an authoring role.</p></section>}

      {signedIn && !loading && !error && subjects.length > 0 && <section className="mt-10" aria-labelledby="assigned-subjects"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="assigned-subjects" className="text-2xl font-extrabold text-slate-950">Your subjects</h2><p className="mt-1 text-sm text-slate-600">Only assigned subjects are available for authoring.</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-900">{subjects.length} subjects</span></div><div className="mt-5 grid gap-4 md:grid-cols-2">{subjects.map((subject) => <article key={subject.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-950">{subject.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{subject.description || "Organize topics, lessons, and assessments for this subject."}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{subject.membership_role === "admin" ? "Admin" : subject.membership_role}</span></div><Link href={`/tutor/subjects/${subject.id}/topics`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Manage topics →</Link></article>)}</div></section>}
    </main>
  );
}
