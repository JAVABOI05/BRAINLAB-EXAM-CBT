"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

interface AssessmentLandingInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  assessment_type: string;
  question_count: number;
  duration_seconds: number | null;
  max_attempts: number;
  access_code_required: boolean;
  requires_sign_in: boolean;
}

export default function AssessmentLandingPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;
  const [assessment, setAssessment] = useState<AssessmentLandingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAssessment() {
      setLoading(true);
      setError("");
      const lookup = supabase
        .from("public_learning_assessment_metadata")
        .select("id, slug, title, description, instructions, assessment_type, question_count, duration_seconds, max_attempts, access_code_required, requires_sign_in");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assessmentId);
      const { data, error: queryError } = await (isUuid
        ? lookup.eq("id", assessmentId)
        : lookup.eq("slug", assessmentId)
      ).single();

      if (!active) return;
      if (queryError || !data) {
        setError("This assessment could not be found or is not currently available.");
      } else {
        const { data: auth } = await supabase.auth.getUser();
        if (data.requires_sign_in && !auth.user) {
          router.replace(`/login?next=/assessments/${encodeURIComponent(assessmentId)}`);
          return;
        }
        setAssessment(data as AssessmentLandingInfo);
      }
      setLoading(false);
    }
    if (assessmentId) void loadAssessment();
    return () => { active = false; };
  }, [assessmentId, router]);

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07152f] px-6 text-white">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#8cc9ff_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex flex-col items-center text-center" aria-live="polite" aria-busy="true">
          <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-300/20 border-t-cyan-300 motion-safe:animate-spin" />
            <img src="/app-icon-512.png" alt="BrainLab Academy" width="72" height="72" className="h-[72px] w-[72px] object-contain motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">BrainLab Academy</p>
          <h1 className="mt-3 text-xl font-black">Preparing your assessment</h1>
        </div>
      </main>
    );
  }

  if (error || !assessment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl text-rose-600">!</div>
          <h1 className="mt-4 text-xl font-black text-slate-950">Assessment unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error || "Please check the link and try again."}</p>
          <Link href="/assessments" className="mt-6 inline-flex rounded-xl bg-[#0B1536] px-5 py-3 text-sm font-bold text-white">Browse assessments</Link>
        </section>
      </main>
    );
  }

  const isCompetition = assessment.assessment_type === "competition";
  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="border-b border-white/10 bg-[#07152f] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/assessments" className="flex items-center gap-3">
            <img src="/app-icon-512.png" alt="" width="38" height="38" className="h-10 w-10 object-contain" />
            <span className="text-sm font-black tracking-tight">BrainLab <span className="text-cyan-300">Assessments</span></span>
          </Link>
          <span className="rounded-full border border-cyan-200/20 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-cyan-100">Assessment information</span>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#07152f] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(#8cc9ff_1px,transparent_1px)] [background-size:30px_30px]" />
        <div aria-hidden="true" className="absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
              {isCompetition ? "Official competition" : "Learning assessment"}
            </span>
            <h1 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">{assessment.title}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {assessment.description || "Review the assessment details and instructions before you begin."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/assessments/${encodeURIComponent(assessment.slug || assessment.id)}/take`} className="inline-flex items-center justify-center rounded-xl bg-cyan-300 px-7 py-4 text-sm font-black text-[#07152f] shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200">
                Continue to assessment <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link href="/assessments" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10">Back to assessments</Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">You will review the assessment rules before your attempt begins.</p>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/10 backdrop-blur sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Assessment overview</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Questions</p><p className="mt-2 text-2xl font-black">{assessment.question_count}</p></div>
              <div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Duration</p><p className="mt-2 text-2xl font-black">{assessment.duration_seconds ? Math.round(assessment.duration_seconds / 60) : "—"}<span className="ml-1 text-xs font-bold text-slate-400">{assessment.duration_seconds ? "mins" : "Untimed"}</span></p></div>
              <div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Attempts</p><p className="mt-2 text-2xl font-black">{assessment.max_attempts}</p></div>
              <div className="rounded-2xl bg-white/[0.07] p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Access</p><p className="mt-2 text-sm font-black">{assessment.access_code_required ? "Code required" : "No code required"}</p></div>
            </div>
            <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.06] p-4">
              <p className="text-xs font-bold text-cyan-100">Before you begin</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">Make sure you have a stable connection and enough time to complete the assessment.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_320px]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Candidate instructions</div>
          {assessment.instructions ? (
            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{assessment.instructions}</div>
          ) : (
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <li className="flex gap-3"><span className="font-black text-cyan-600">01</span> Read each question carefully before selecting an answer.</li>
              <li className="flex gap-3"><span className="font-black text-cyan-600">02</span> Review your responses before submitting your attempt.</li>
              <li className="flex gap-3"><span className="font-black text-cyan-600">03</span> Do not close the examination page while an attempt is in progress.</li>
              <li className="flex gap-3"><span className="font-black text-cyan-600">04</span> Your submission is final once it has been successfully recorded.</li>
            </ul>
          )}
        </article>
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-950">Ready to begin?</h2>
          <p className="mt-2 text-xs leading-6 text-slate-600">Continue to the secure assessment entry screen. Any required access code will be requested there.</p>
          <Link href={`/assessments/${encodeURIComponent(assessment.slug || assessment.id)}/take`} className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#0B1536] px-5 py-3.5 text-sm font-black text-white hover:bg-[#14295b]">Enter assessment</Link>
          <p className="mt-4 text-[11px] leading-5 text-slate-500">Your assessment access and attempt limits are checked by BrainLab when you start.</p>
        </aside>
      </section>
      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-xs text-slate-500">Powered by BrainLab Academy</footer>
    </main>
  );
}
