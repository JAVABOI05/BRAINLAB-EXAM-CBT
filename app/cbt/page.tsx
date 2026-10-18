import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBT and Exam Practice | BrainLab Academy",
  description: "Prepare with the existing BrainLab CBT portal or create a personalised Self Practice attempt from the active question bank.",
};

export default function CbtOverviewPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">BrainLab Academy · Exam preparation</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Practise with purpose.</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600">Use the existing CBT portal for its current examination flow, or sign in to build a practice attempt around the subjects you want to improve. Your Self Practice paper is randomly selected and never repeats a question within the same attempt.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-indigo-700">Personal practice</div>
          <h2 className="mt-2 text-2xl font-semibold">Self Practice</h2>
          <p className="mt-3 text-slate-600">Choose subjects, set a question count within your access limit, practise timed or untimed, and review corrections after submission.</p>
          <Link href="/self-practice" className="mt-6 inline-flex rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white">Start Self Practice</Link>
          <p className="mt-3 text-sm text-slate-500">Requires a signed-in learner account. Free accounts currently have a 50-question-per-attempt limit.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-emerald-700">Existing CBT portal</div>
          <h2 className="mt-2 text-2xl font-semibold">Current examination</h2>
          <p className="mt-3 text-slate-600">Open the current candidate examination workflow. Organised quizzes and competitions are being added as part of the wider overhaul and are not advertised as live until their end-to-end flow is ready.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-900">Open current CBT</Link>
        </article>
      </div>
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <h2 className="font-semibold">Platform overhaul notice</h2>
        <p className="mt-1 text-sm">BrainLab Academy is undergoing a staged upgrade. Some features may change or be temporarily unavailable while the new learning and assessment systems are validated.</p>
      </div>
    </div>
  </main>;
}
