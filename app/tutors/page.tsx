"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Tutor = { id: string; name: string; slug: string; title: string; bio: string; qualifications: string; photo_url: string | null; subject_slugs: string[] };

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void supabase.from("tutor_profiles").select("id,name,slug,title,bio,qualifications,photo_url,subject_slugs")
      .eq("is_published", true).order("sort_order", { ascending: true })
      .then(({ data }) => { if (active) { setTutors((data ?? []) as Tutor[]); setLoading(false); } });
    return () => { active = false; };
  }, []);
  return <main id="main" className="min-h-[65vh] bg-slate-50 px-5 py-14 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="text-sm font-bold text-blue-800 underline underline-offset-4">← BrainLab Academy</Link>
      <header className="mx-auto mt-8 max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Meet the people behind the lessons</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Meet our tutors</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">Get to know the educators supporting your learning journey, one subject at a time.</p>
      </header>
      {loading ? <p className="py-16 text-center text-slate-500" role="status">Loading tutor profiles…</p> :
        tutors.length ? <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tutors.map(t => <article key={t.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {t.photo_url ? <img src={t.photo_url} alt={t.name} className="h-56 w-full object-cover" loading="lazy" /> : <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#0B1536] to-[#1356E8] text-5xl font-black text-white">{t.name.slice(0,1).toUpperCase()}</div>}
          <div className="p-6"><h2 className="text-xl font-extrabold">{t.name}</h2>{t.title && <p className="mt-1 font-semibold text-blue-800">{t.title}</p>}
          {t.qualifications && <p className="mt-3 text-sm font-semibold text-slate-500">{t.qualifications}</p>}
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{t.bio}</p>
          {!!t.subject_slugs?.length && <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Subjects: {t.subject_slugs.join(", ")}</p>}</div>
        </article>)}</div> : <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-xl font-extrabold">Tutor profiles are coming soon</h2><p className="mt-3 leading-7 text-slate-600">Our team is preparing verified tutor profiles. Please check back soon.</p><Link href="/learn" className="mt-5 inline-flex rounded-xl bg-[#0B1536] px-5 py-3 font-bold text-white">Explore lessons</Link></div>}
    </div>
  </main>;
}
