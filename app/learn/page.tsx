"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
};

export default function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadSubjects() {
      const { data, error: queryError } = await supabase
        .from("learning_subjects")
        .select("id,name,slug,description,icon_url")
        .eq("is_published", true)
        .order("order_index", { ascending: true });
      if (!active) return;
      if (queryError) setError("We could not load the Learning Hub yet. Please try again shortly.");
      else setSubjects((data ?? []) as Subject[]);
      setLoading(false);
    }
    void loadSubjects();
    return () => { active = false; };
  }, []);

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.15em] text-blue-800">BrainLab Academy · Learning Hub</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Learn it. Practise it. Make it yours.</h1>
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">Explore structured lessons, work through examples, and check your understanding as you go. Start with a subject and follow a topic one step at a time.</p>
      </div>

      <section className="mt-10" aria-labelledby="subjects-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="subjects-heading" className="text-2xl font-extrabold text-slate-950">Explore subjects</h2>
            <p className="mt-1 text-sm text-slate-600">Only reviewed and published learning content appears here.</p>
          </div>
          <Link href="/learning" className="text-sm font-bold text-blue-800 underline underline-offset-4">Open Learning Lab</Link>
        </div>

        {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading published subjects…</p>}
        {!loading && error && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><p className="font-bold">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 font-bold underline underline-offset-4">Try again</button></div>}
        {!loading && !error && subjects.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 sm:p-12">
            <p className="text-sm font-extrabold uppercase tracking-wider text-blue-800">Your learning space is ready</p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">New lessons are being prepared.</h3>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">Published subjects will appear here when a tutor has created and reviewed the learning material. We will not show sample content as if it were an official course.</p>
            <Link href="/login" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-bold text-white">Practise with CBT</Link>
          </div>
        )}
        {!loading && !error && subjects.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Link key={subject.id} href={`/learn/${subject.slug}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-900" aria-hidden="true">{subject.name.slice(0, 1).toUpperCase()}</div>
                <h3 className="mt-5 text-xl font-extrabold text-slate-950 group-hover:text-blue-800">{subject.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{subject.description || "Explore lessons and practise the key ideas in this subject."}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-800">Explore subject <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
