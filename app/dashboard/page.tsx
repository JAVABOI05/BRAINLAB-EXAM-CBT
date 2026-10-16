"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LearnerDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) {
        router.replace("/account");
        return;
      }
      setEmail(user.email ?? "");
      setLoading(false);
    }
    void loadAccount();
    return () => { active = false; };
  }, [router]);

  async function signOut() {
    try {
      await fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Complete account sign-out even if gate-cookie cleanup fails.
    }
    await supabase.auth.signOut();
    router.replace("/account");
  }

  if (loading) return <main id="main" className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16"><p className="text-slate-600">Loading your learning space…</p></main>;

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Your BrainLab account</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">Welcome to your learning space.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">You are signed in as <span className="font-semibold text-slate-900">{email}</span>. Your account is ready for the learning tools currently available to you.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="text-2xl" aria-hidden="true">✎</div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">CBT practice</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Continue to the existing exam portal and follow its access-code instructions.</p>
            <Link href="/login" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white">Open CBT portal</Link>
          </article>
          <article className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
            <div className="text-2xl" aria-hidden="true">✓</div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">Revision planner</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Set a study goal, add topics and track your revision checklist. Your plan is saved in this browser on this device.</p>
            <Link href="/learning/revision" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-sm font-bold text-white">Build a revision plan</Link>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="text-2xl" aria-hidden="true">↗</div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">The wider Academy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">AI learning support, account-linked progress and moderated community tools remain planned upgrades.</p>
            <Link href="/about" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800">Explore BrainLab</Link>
          </article>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <Link href="/" className="text-sm font-semibold text-blue-800 underline underline-offset-4">Back to homepage</Link>
          <button type="button" onClick={() => void signOut()} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Sign out</button>
        </div>
      </div>
    </main>
  );
}
