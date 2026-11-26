import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/app/components/public/Breadcrumbs";
import { ProgrammeCardLink } from "@/app/components/public/ProgrammeCardLink";

export const metadata: Metadata = {
  title: "Academic Programmes & Examination Prep | BrainLab Academy",
  description:
    "Explore BrainLab Academy's structured preparation programmes for Nigerian students: JAMB UTME, WAEC SSCE, NECO, Post-UTME, STEM Studio, and School-Based CBT.",
  alternates: { canonical: "/programmes" },
};

const PROGRAMMES = [
  {
    slug: "utme",
    title: "JAMB UTME Comprehensive Masterclass",
    badge: "Official Exam Prep",
    tagline: "Target 300+ with 180-question mock exams, 4-subject combos, and adaptive AI drills.",
    status: "active",
    subjects: "Use of English, Mathematics, Physics, Chemistry, Biology, Economics, Government, Literature",
    duration: "3 to 6 Months",
    href: "/programmes/utme",
  },
  {
    slug: "post-utme",
    title: "Post-UTME Screening Accelerator",
    badge: "University Screening",
    tagline: "Institution-specific screening simulations for UNILAG, UI, OAU, UNIBEN, ABU, and more.",
    status: "active",
    subjects: "General Paper, Verbal & Numerical Reasoning, Faculty-Specific Subject Combinations",
    duration: "4 to 8 Weeks",
    href: "/programmes/post-utme",
  },
  {
    slug: "waec",
    title: "WAEC SSCE Senior School Mastery",
    badge: "O-Level Certification",
    tagline: "Rigorous objective and theoretical past-paper practice aligned with WAEC Chief Examiner guidelines.",
    status: "active",
    subjects: "Sciences, Arts, and Commercial O-Level subjects with step-by-step working",
    duration: "6 to 9 Months",
    href: "/programmes/waec",
  },
  {
    slug: "neco",
    title: "NECO SSCE Preparation Track",
    badge: "National Examination",
    tagline: "Target 9 credits in June/July and Nov/Dec NECO senior school examination series.",
    status: "active",
    subjects: "Core Science, Commercial, and Humanities syllabi",
    duration: "6 Months",
    href: "/programmes/neco",
  },
  {
    slug: "stem",
    title: "STEM Studio Virtual Laboratory Track",
    badge: "Practical Science",
    tagline: "Interactive 2D virtual simulations covering physics kinematics, DC circuits, and acid-base titration.",
    status: "active",
    subjects: "Physics Labs, Chemistry Simulations, Biology Genetics, Digital Logic Gates",
    duration: "Flexible Modular",
    href: "/programmes/stem",
  },
  {
    slug: "schools",
    title: "School & Tutorial Centre Institutional Programme",
    badge: "Institutional Licensing",
    tagline: "Enterprise CBT examination runtime, bulk student registration, and cohort analytics for secondary schools.",
    status: "active",
    subjects: "All Secondary School Schemes of Work with Teacher Authoring Studio",
    duration: "Termly / Annual",
    href: "/programmes/schools",
  },
  {
    slug: "nursing",
    title: "Nursing & Health Sciences Professional Entrance",
    badge: "Professional Track",
    tagline: "Preparation for Basic Nursing, Midwifery, and College of Health Technology entrance exams.",
    status: "planned",
    statusBadge: "Planned / In Active Development",
    subjects: "Anatomy & Physiology, English, Chemistry, Physics, Biology, Health Science",
    duration: "Curriculum In Review",
    href: "/programmes/nursing",
  },
];

export default function ProgrammesIndexPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Programmes" }]} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            BrainLab Curriculum Directory
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Academic Programmes <br />
            <span className="text-blue-700 dark:text-cyan-400">Engineered for Decisive Mastery.</span>
          </h1>

          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Every programme combines official syllabus alignment, authentic examination simulations, interactive concept notes, and targeted AI revision drills. Select your examination track below.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PROGRAMMES.map((prog) => {
              const isPlanned = prog.status === "planned";
              return (
                <div
                  key={prog.slug}
                  className={`flex flex-col justify-between rounded-3xl border bg-white p-7 shadow-xs transition hover:shadow-md dark:bg-slate-900/80 ${
                    isPlanned
                      ? "border-amber-200 dark:border-amber-900/40"
                      : "border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-cyan-500"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 dark:text-cyan-300 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                        {prog.badge}
                      </span>
                      {isPlanned && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60 px-2.5 py-1 rounded-md">
                          Planned
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-black text-slate-950 dark:text-white">
                      {prog.title}
                    </h2>

                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {prog.tagline}
                    </p>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <p>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Subjects:</span>{" "}
                        {prog.subjects}
                      </p>
                      <p>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Duration:</span>{" "}
                        {prog.duration}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={prog.href}
                      className={`inline-flex w-full items-center justify-center rounded-xl py-3 text-xs font-black transition ${
                        isPlanned
                          ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          : "bg-blue-700 text-white hover:bg-blue-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                      }`}
                    >
                      {isPlanned ? "View Development Roadmap →" : "Explore Programme Details →"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
