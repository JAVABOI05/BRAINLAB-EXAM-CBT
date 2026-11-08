import React from "react";
import Link from "next/link";
import { Breadcrumbs } from "./Breadcrumbs";

export interface ProgrammeSubject {
  name: string;
  category: "Compulsory" | "Science" | "Arts & Humanities" | "Commercial & Social Sciences" | "Technical";
  coverage: string;
  topicCount?: number;
}

export interface IncludedProduct {
  name: string;
  badge: string;
  description: string;
  href: string;
}

export interface EnrolmentStep {
  step: number;
  title: string;
  description: string;
}

export interface ProgrammeFAQ {
  question: string;
  answer: string;
}

export interface ProgrammeData {
  id: string;
  slug: string;
  title: string;
  badge: string;
  tagline: string;
  summary: string;
  status: "active" | "planned" | "in_development";
  statusNote?: string;
  whoItIsFor: string[];
  objectives: string[];
  subjects: ProgrammeSubject[];
  includedProducts: IncludedProduct[];
  teachingFormat: string;
  schedule: string;
  duration: string;
  priceNote: string;
  checkoutHref: string;
  enrolmentSteps: EnrolmentStep[];
  faqs: ProgrammeFAQ[];
}

interface ProgrammePageTemplateProps {
  data: ProgrammeData;
}

export function ProgrammePageTemplate({ data }: ProgrammePageTemplateProps) {
  const isPlanned = data.status === "planned" || data.status === "in_development";

  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Programmes", href: "/programmes" },
          { label: data.title },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(37,99,235,0.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              {data.badge}
            </span>
            {isPlanned && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                ⚠️ {data.status === "planned" ? "Planned Curriculum" : "In Active Development"}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            {data.title}
          </h1>

          <p className="text-lg font-semibold text-blue-700 dark:text-cyan-400">
            {data.tagline}
          </p>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            {data.summary}
          </p>

          {isPlanned && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-200 max-w-3xl">
              <span className="font-bold block mb-1">Curriculum Availability Notice:</span>
              <p>
                {data.statusNote ||
                  "This programme is currently in curriculum design and question validation. Registration is not yet open for live examinations. You can register your interest below to receive priority access upon launch."}
              </p>
            </div>
          )}

          {/* Quick Specifications Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 max-w-4xl border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teaching Format</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">{data.teachingFormat}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Schedule</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">{data.schedule}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Typical Duration</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">{data.duration}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pricing / Access</span>
              <p className="text-sm font-extrabold text-blue-700 dark:text-cyan-400">{data.priceNote}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
            {isPlanned ? (
              <Link
                href="/contact?subject=Programme+Waitlist"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95"
              >
                Register Interest for Updates →
              </Link>
            ) : (
              <Link
                href={data.checkoutHref}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Enrol in Programme →
              </Link>
            )}
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Compare All Access Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audience & Syllabus Objectives */}
      <section className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Who It Is For */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Who This Programme Is For
            </h2>
            <ul className="space-y-3">
              {data.whoItIsFor.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Objectives */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Syllabus &amp; Exam Objectives
            </h2>
            <ul className="space-y-3">
              {data.objectives.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="text-blue-600 dark:text-cyan-400 font-bold shrink-0 mt-0.5">🎯</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Subject Coverage */}
      <section className="py-16 sm:py-20 bg-slate-100/60 dark:bg-[#060c18] border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Curriculum &amp; Subject Coverage
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Aligned with official examination board syllabi and grading criteria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.subjects.map((subj, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 dark:text-cyan-300 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                    {subj.category}
                  </span>
                  {subj.topicCount && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {subj.topicCount} modules
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {subj.name}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {subj.coverage}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Included Platform Products */}
      <section className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Included BrainLab Tools &amp; Workspaces
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Every programme connects candidates to our integrated suite of academic technologies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.includedProducts.map((prod, idx) => (
              <Link
                key={idx}
                href={prod.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 hover:border-blue-600 dark:hover:border-cyan-500 transition space-y-2.5"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {prod.badge}
                </span>
                <h3 className="text-base font-bold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition">
                  {prod.name} →
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {prod.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Enrolment Flow */}
      <section className="py-16 sm:py-20 bg-slate-100/60 dark:bg-[#060c18] border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              How to Enrol &amp; Get Started
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Three straightforward steps from registration to full curriculum access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.enrolmentSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3 relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700 dark:bg-blue-950/60 dark:text-cyan-300">
                  {step.step}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum FAQs */}
      <section className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Key questions about this programme, exams, and platform access.
            </p>
          </div>

          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 open:ring-1 open:ring-blue-500/20"
              >
                <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>{faq.question}</span>
                  <span className="ml-2 text-blue-600 dark:text-cyan-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final Action CTA */}
      <section className="py-16 sm:py-24 bg-white dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            {isPlanned ? "Stay updated on this curriculum release." : "Ready to begin your preparation?"}
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {isPlanned
              ? "Join our academic waitlist to receive priority access and syllabus updates when this module is certified."
              : "Access simulated examinations, structured notes, and diagnostic AI drills designed for your target score."}
          </p>
          <div className="flex justify-center gap-3.5">
            {isPlanned ? (
              <Link
                href="/contact?subject=Programme+Waitlist"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-8 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95"
              >
                Register Interest →
              </Link>
            ) : (
              <Link
                href={data.checkoutHref}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Start Preparation Today →
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProgrammePageTemplate;
