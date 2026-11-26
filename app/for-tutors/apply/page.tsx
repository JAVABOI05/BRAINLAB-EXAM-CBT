import type { Metadata } from "next";
import Link from "next/link";
import { TutorApplicationForm } from "@/app/components/public/TutorApplicationForm";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";

export const metadata: Metadata = {
  title: "Apply to Teach | BrainLab Academy Educator Recruitment",
  description:
    "Official application form for prospective BrainLab Academy educators, secondary masterclass teachers, and UTME subject matter experts. Evaluated under the Nigeria Data Protection Act (NDPA) 2023.",
  alternates: { canonical: "/for-tutors/apply" },
};

export default function TutorApplicationPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: "For Tutors", href: "/for-tutors" },
            { label: "Apply to Teach", href: "/for-tutors/apply" },
          ]}
        />

        <TutorApplicationForm />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 text-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Educator Vetting Process &amp; Role Governance
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            BrainLab Academy maintains strict academic and child safety standards. Submitting this application stores your credentials for administrative vetting only. It does not automatically grant system privileges, teacher role access, or classroom hosting permissions. Shortlisted applicants undergo reference verification and a mandatory interactive whiteboard mock teaching audition.
          </p>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500">
            <span>Regulated under Nigeria Data Protection Act 2023</span>
            <Link href="/about/trust-centre" className="font-bold text-blue-600 dark:text-cyan-400 hover:underline">
              View Trust &amp; Quality Standards →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
