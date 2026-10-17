"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

function learnerName(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.full_name ?? metadata.name;
  if (typeof value === "string" && value.trim()) return value.trim().split(/\s+/)[0];
  return user.email?.split("@")[0] || "learner";
}

const spaces = [
  { number: "01", eyebrow: "BUILD YOUR FOUNDATION", title: "Learning Hub", description: "Explore subjects and lessons, strengthen understanding, and practise topic by topic.", href: "/learn", action: "Explore the Hub", tone: "hub" },
  { number: "02", eyebrow: "LEARN WITH INTENTION", title: "AI Learning", description: "Shape a study mission around a difficult idea, a mistake, or your next exam goal.", href: "/ai-learning", action: "Plan a learning mission", tone: "ai" },
  { number: "03", eyebrow: "PRACTISE WITH PURPOSE", title: "CBT practice", description: "Enter the existing exam portal and follow its access-code and exam instructions.", href: "/login", action: "Open CBT practice", tone: "cbt" },
];

export default function LearnerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !currentUser) {
        router.replace("/account");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }
    void loadAccount().catch(() => {
      if (active) {
        setLoading(false);
        router.replace("/account");
      }
    });
    return () => { active = false; };
  }, [router]);

  if (loading) {
    return <main id="main" className="min-h-[70vh] bg-[#f5f7fb] px-5 py-16"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-5 w-40 rounded bg-slate-200" /><div className="mt-5 h-12 max-w-xl rounded-xl bg-slate-200" /><div className="mt-3 h-5 max-w-lg rounded bg-slate-200" /><div className="mt-10 grid gap-5 md:grid-cols-3"><div className="h-64 rounded-3xl bg-slate-200" /><div className="h-64 rounded-3xl bg-slate-200" /><div className="h-64 rounded-3xl bg-slate-200" /></div></div></main>;
  }

  if (!user) return null;
  const name = learnerName(user);
  const avatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;

  return (
    <main id="main" className="min-h-[75vh] bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> YOUR LEARNING SPACE</div>
          <Link href="/profile" className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-extrabold text-[#12346b]">{name.charAt(0).toUpperCase()}</span>}
            <span className="text-sm font-semibold text-slate-700">Your profile</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-0.5">↗</span>
          </Link>
        </div>

        <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-[#071c43] px-6 py-8 text-white shadow-[0_24px_70px_rgba(7,28,67,0.16)] sm:px-10 sm:py-11 lg:px-12 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 sm:h-96 sm:w-96" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 top-10 h-48 w-48 rounded-full border border-white/10 sm:right-16 sm:top-6 sm:h-64 sm:w-64" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 bg-gradient-to-tl from-cyan-400/20 to-transparent blur-3xl" />
          <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-cyan-200">A little progress, repeated, changes everything.</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Welcome back,<br /><span className="text-cyan-200">{name}.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100/85 sm:text-lg">Your next breakthrough starts with one good learning session. Choose a path, focus on what matters, and keep moving forward.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/learn" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#071c43] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50">Explore Learning Hub <span aria-hidden="true">↗</span></Link>
                <Link href="/learning/revision" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Open my study planner</Link>
              </div>
            </div>
            <div className="relative rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-blue-100">Your next step</span><span className="rounded-full bg-cyan-200/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-100">Start here</span></div>
              <p className="mt-5 text-2xl font-extrabold">Pick one thing to master.</p>
              <p className="mt-2 text-sm leading-6 text-blue-100/75">Choose a topic you find challenging and give it 15 focused minutes.</p>
              <Link href="/ai-learning" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-200 hover:text-white">Build a study mission <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="spaces-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Made for your next step</p><h2 id="spaces-heading" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Choose your learning path</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Three ways to make today count. Start wherever you are, and return whenever you are ready.</p></div>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {spaces.map((space) => (
              <article key={space.href} className="group flex min-h-[270px] flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_5px_25px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-900">{space.number}</span><span className="text-xs font-bold tracking-wider text-slate-400">BRAINLAB ACADEMY</span></div>
                <p className="mt-6 text-[10px] font-extrabold tracking-[0.17em] text-blue-800">{space.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{space.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{space.description}</p>
                <Link href={space.href} className="mt-6 inline-flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm font-extrabold text-[#0b2a5b]">{space.action}<span aria-hidden="true" className="transition group-hover:translate-x-1">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Your personal rhythm</p><h2 className="mt-2 text-xl font-extrabold">Make a plan you can keep</h2></div><span aria-hidden="true" className="text-2xl">◷</span></div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">A realistic revision plan can help you turn a big goal into small, manageable sessions. Your current planner stores its checklist in this browser on this device.</p>
            <Link href="/learning/revision" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a5b] px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900">Create or continue a plan</Link>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-[#eaf2ff] p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">A note on progress</p>
            <h2 className="mt-2 text-xl font-extrabold text-[#0b2450]">Your journey, honestly measured.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">Account-linked lesson completion, cross-device study history, and verified achievement totals are not available yet. We will show real numbers here when those records are connected—not guessed scores.</p>
            <Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-blue-900 hover:underline">Review your learner profile <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <span>Signed in as <span className="font-semibold text-slate-700">{user.email}</span></span>
          <div className="flex flex-wrap gap-4"><Link href="/profile" className="font-semibold text-slate-700 hover:text-blue-800">Profile</Link><Link href="/settings" className="font-semibold text-slate-700 hover:text-blue-800">Settings</Link><Link href="/support" className="font-semibold text-slate-700 hover:text-blue-800">Get help</Link></div>
        </footer>
      </div>
    </main>
  );
}
