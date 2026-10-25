"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Story = { id: string; student_name: string; student_context: string; story: string; quote: string; attribution: string };
export default function TestimonialsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void supabase.from("student_testimonials").select("id,student_name,student_context,story,quote,attribution")
      .eq("is_approved", true).order("sort_order", { ascending: true })
      .then(({ data }) => { if (active) { setStories((data ?? []) as Story[]); setLoading(false); } });
    return () => { active = false; };
  }, []);
  return <main id="main" className="min-h-[65vh] bg-white px-5 py-14 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="text-sm font-bold text-blue-800 underline underline-offset-4">← BrainLab Academy</Link>
      <header className="mx-auto mt-8 max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Learner experiences</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Student stories</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">Hear directly from learners about their study journeys and how they use BrainLab Academy.</p></header>
      {loading ? <p className="py-16 text-center text-slate-500" role="status">Loading student stories…</p> :
        stories.length ? <div className="mt-12 grid gap-5 md:grid-cols-2">{stories.map(s => <article key={s.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-7 sm:p-9">
          {s.quote && <p className="text-lg font-bold leading-8 text-[#0B1536]">“{s.quote}”</p>}
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{s.story}</p>
          <div className="mt-6 border-t border-slate-200 pt-4"><p className="font-extrabold">{s.student_name}</p>{(s.student_context || s.attribution) && <p className="mt-1 text-sm text-slate-500">{[s.student_context,s.attribution].filter(Boolean).join(" · ")}</p>}</div>
        </article>)}</div> : <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-slate-300 p-10 text-center"><h2 className="text-xl font-extrabold">Student stories are being prepared</h2><p className="mt-3 leading-7 text-slate-600">We publish stories only after they have been reviewed and approved. Check back soon.</p><Link href="/learn" className="mt-5 inline-flex rounded-xl bg-[#0B1536] px-5 py-3 font-bold text-white">Start learning</Link></div>}
    </div>
  </main>;
}
