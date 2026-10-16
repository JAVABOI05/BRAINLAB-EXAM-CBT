"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type ComingSoonPageProps = {
  title: string;
  description: string;
  category?: string;
  requiresAuth?: boolean;
  nextSteps?: { label: string; href: string }[];
};

export default function ComingSoonPage({
  title,
  description,
  category = "Academy roadmap",
  requiresAuth = false,
  nextSteps = [],
}: ComingSoonPageProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(requiresAuth);

  useEffect(() => {
    if (!requiresAuth) return;
    let active = true;
    async function verifySession() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) {
        router.replace("/account");
        return;
      }
      setChecking(false);
    }
    void verifySession();
    return () => { active = false; };
  }, [requiresAuth, router]);

  if (checking) {
    return <main id="main" className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16"><p className="text-slate-600">Checking your BrainLab account…</p></main>;
  }

  return (
    <main id="main">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">Coming soon</span>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">{category}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <h2 className="font-extrabold text-slate-950">This space is being prepared.</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">This page establishes the intended place in BrainLab Academy. The feature is not active yet, and no information is being saved or processed here. We will build and verify it in stages without disrupting the existing CBT experience.</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {nextSteps.map((step) => <Link key={step.href} href={step.href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 font-bold text-white hover:bg-[#0a2f72]">{step.label}</Link>)}
            <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:border-slate-500">Back to Academy home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
