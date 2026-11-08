import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Tutors & Educators | BrainLab Academy",
  description:
    "Discover educator opportunities at BrainLab Academy: host live interactive whiteboard masterclasses, author syllabus-aligned lessons, monitor candidate diagnostic analytics, and join verified educators.",
  alternates: { canonical: "/for-tutors" },
  openGraph: {
    title: "Educator & Tutor Suite — BrainLab Academy",
    description:
      "Empower ambitious Nigerian secondary and UTME candidates with modern teaching tools: vector whiteboard masterclasses, curriculum authoring, and student diagnostics.",
    url: "https://www.brainlabacademy.com.ng/for-tutors",
  },
};

const TUTOR_TOOLS = [
  {
    icon: "🎨",
    title: "Vector Academic Whiteboard",
    description:
      "Host low-latency live lectures with specialized surfaces: coordinate graphing grids for calculus/mechanics, dark chalkboards, and ruled notebook lines.",
  },
  {
    icon: "📐",
    title: "Formula & Science Diagram Stamps",
    description:
      "Insert instant KaTeX mathematical equations and vector science components (DC circuits, batteries, beakers, benzene rings) without tedious freehand drawing.",
  },
  {
    icon: "📊",
    title: "Real-Time Student Checkpoint Polling",
    description:
      "Fire rapid checkpoint questions during lectures to gauge comprehension instantly and pinpoint which derivation step students need clarified.",
  },
  {
    icon: "✍️",
    title: "Curriculum Lesson Authoring Studio",
    description:
      "Design structured syllabus lessons, author standardized multiple-choice questions with worked solutions, and set diagnostic difficulty ratings.",
  },
  {
    icon: "🔬",
    title: "STEM Simulation Masterclass Presenter",
    description:
      "Import virtual laboratory simulations directly onto your presentation stage, manipulate parameters live, and switch to student-exploration mode.",
  },
  {
    icon: "📈",
    title: "Cohort Diagnostic Analytics",
    description:
      "Track attendance, average test scores, and specific topic misconceptions across your entire cohort to guide high-impact revision sessions.",
  },
];

const TUTOR_VALUES = [
  {
    step: "01",
    title: "Academic Pedagogy Over Rote Tricks",
    description: "We partner with educators who prioritize conceptual understanding and critical thinking over superficial cramming shortcuts.",
  },
  {
    step: "02",
    title: "Low-Bandwidth Mobile Accessibility",
    description: "Our lecture technology runs smoothly on modest networks so your teaching reaches students regardless of location or carrier.",
  },
  {
    step: "03",
    title: "Verified Teacher Recognition",
    description: "Approved educators receive dedicated verified tutor profiles, authoring attributions, and public bio listings.",
  },
  {
    step: "04",
    title: "Transparent Institutional Governance",
    description: "Protected by strict role-based access control, ensuring lesson authoring and student data remain secure and confidential.",
  },
];

export default function ForTutorsPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">For Tutors</span>
          </div>
          <Link
            href="/tutors"
            className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Meet Verified Tutors →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(37,99,235,0.08),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Educator Workspace &amp; Teaching Tools
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
            Amplify your teaching with <br />
            <span className="text-blue-700 dark:text-cyan-400">modern academic technology.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            BrainLab Academy equips passionate subject educators with specialized authoring studios, multi-surface whiteboard stages, and real-time student diagnostic analytics to elevate teaching across Nigeria.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/for-tutors/apply"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Apply to Teach on BrainLab <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link
              href="/products/live-classroom"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Explore Whiteboard Technology
            </Link>
          </div>
        </div>
      </section>

      {/* Teaching Tools Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Specialized Educator Tools
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Built specifically to address the unique complexities of secondary and UTME STEM, Commercial, and Art curricula.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TUTOR_TOOLS.map((tool, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950/60">
                  {tool.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {tool.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching Pillars */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Our Educator Standards
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The principles that unite our teaching community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TUTOR_VALUES.map((val, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50 space-y-3"
              >
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400 font-mono">
                  {val.step}
                </span>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {val.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 sm:py-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#070e1b] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Interested in teaching with BrainLab?
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Submit your subject specialization, teaching background, and credentials to our academic review committee.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/for-tutors/apply"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Submit Tutor Application →
            </Link>
            <Link
              href="/contact?subject=Tutor+Application"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Contact Educator Desk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
