import type { Metadata } from "next";
import Link from "next/link";
import PublicStemDemo from "@/app/components/public/PublicStemDemo";

export const metadata: Metadata = {
  title: "STEM Studio & Virtual Laboratory Suite | BrainLab Academy",
  description:
    "Interactive virtual STEM laboratories and multi-curriculum simulations: experiment with quadratic parabolas, projectile kinematics, DC circuits, acid-base titration, and genetics Punnett squares in real time.",
  alternates: { canonical: "/products/stem-studio" },
  openGraph: {
    title: "STEM Studio Virtual Labs — BrainLab Academy",
    description:
      "Interactive 2D virtual laboratories for Physics, Chemistry, Biology, Mathematics, and Logic Gates. Bridge theoretical formulas with practical experimentation.",
    url: "https://www.brainlabacademy.com.ng/products/stem-studio",
  },
};

const LAB_BENCHES = [
  {
    discipline: "Physics & Mechanics",
    title: "Projectile Motion & Ballistics Lab",
    badge: "Kinematics",
    icon: "🚀",
    color: "border-blue-500/30 bg-blue-500/5",
    description:
      "Adjust velocity, launch angle (0° to 90°), and gravitational acceleration (Earth 9.8 m/s² vs Moon 1.62 m/s²). Observe instantaneous trajectory curves, time of flight, and maximum range in real time.",
  },
  {
    discipline: "Physics & Electricity",
    title: "DC Circuit & Ohm's Law Bench",
    badge: "Circuits",
    icon: "⚡",
    color: "border-amber-500/30 bg-amber-500/5",
    description:
      "Wire resistors in series and parallel, vary battery voltage (0V to 48V), and inspect current flow, equivalent resistance, and thermal power dissipation with automatic overload warnings.",
  },
  {
    discipline: "Chemistry & Volumetrics",
    title: "Acid-Base Titration & pH Curve",
    badge: "Titration",
    icon: "🧪",
    color: "border-pink-500/30 bg-pink-500/5",
    description:
      "Titrate strong and weak acids with standardized burette titrant volumes. Watch the interactive pH curve rise and observe the phenolphthalein indicator shift sharply from colorless to vibrant pink at equivalence.",
  },
  {
    discipline: "Biology & Heredity",
    title: "Mendelian Genetics Punnett Lab",
    badge: "Genetics",
    icon: "🧬",
    color: "border-emerald-500/30 bg-emerald-500/5",
    description:
      "Cross homozygous and heterozygous parental alleles (BB, Bb, bb). Calculate theoretical genotypic and phenotypic ratios (3:1 dominant vs recessive) and verify test cross outcomes.",
  },
  {
    discipline: "Mathematics & Analysis",
    title: "Quadratic Parabola & Roots Explorer",
    badge: "Algebra",
    icon: "📐",
    color: "border-indigo-500/30 bg-indigo-500/5",
    description:
      "Manipulate quadratic coefficients (a, b, c) using continuous sliders. Observe the parabola reflect and shift, calculate the discriminant Δ = b² - 4ac, and inspect real versus complex roots.",
  },
  {
    discipline: "Engineering & Computer Science",
    title: "Boolean Logic Gates Bench",
    badge: "Digital Electronics",
    icon: "🤖",
    color: "border-cyan-500/30 bg-cyan-500/5",
    description:
      "Toggle digital binary inputs (0 and 1) across AND, OR, NOT, NAND, NOR, and XOR gates. Verify dynamic truth tables and understand the foundational building blocks of microprocessors.",
  },
];

const STEM_MODES = [
  {
    mode: "Mode A",
    title: "Tutor-Authoritative Demonstration",
    description:
      "During live masterclasses, the tutor controls the laboratory sliders. All parameter adjustments, graphs, and telemetry labels synchronize instantaneously to every student terminal with zero lag.",
  },
  {
    mode: "Mode B",
    title: "Guided Student Exploration",
    description:
      "The tutor unlocks student control. Candidates freely manipulate experiment parameters on their own screens, test hypothetical 'what if' scenarios, and record lab observations.",
  },
  {
    mode: "Bridge to CBT",
    title: "Direct Exam Past Question Linkage",
    description:
      "Every experiment bench connects directly to verified JAMB and WAEC examination past questions, showing students exactly how practical lab concepts appear on exam day.",
  },
];

export default function StemStudioProductPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-700 dark:hover:text-cyan-400">Products</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">STEM Studio</span>
          </div>
          <Link
            href="/classroom/stem"
            className="font-bold text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Enter STEM Studio Hub →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(6,182,212,0.1),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              Virtual Laboratory Suite
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              See science happen. <br />
              <span className="text-cyan-700 dark:text-cyan-400">Virtual experiments, real understanding.</span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
              Don&apos;t just memorize textbook definitions for Physics, Chemistry, and Biology. BrainLab&apos;s STEM Studio lets you interact with virtual laboratory benches, manipulate variables in real time, and observe the immediate mathematical results.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link
                href="/classroom/stem"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 hover:bg-cyan-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Launch Virtual STEM Labs <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/products/cbt"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                Explore Connected CBT Drills
              </Link>
            </div>
          </div>

          {/* Visual Simulation Canvas Mock */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-[#070e1b] p-6 text-white shadow-2xl dark:border-slate-800 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-cyan-400 font-bold">PROJECTILE TRAJECTORY BENCH</span>
                <span className="text-emerald-400 font-bold">v1.0 ACTIVE</span>
              </div>

              <div className="h-44 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4 flex flex-col justify-between relative">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Angle: 45.0°</span>
                  <span>Velocity: 25.0 m/s</span>
                  <span>Gravity: 9.8 m/s²</span>
                </div>
                {/* SVG Curve Mock */}
                <div className="my-auto text-center">
                  <svg className="w-full h-20 text-cyan-400" viewBox="0 0 300 80" fill="none">
                    <path d="M 10 75 Q 150 10 290 75" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 2" />
                    <circle cx="150" cy="10" r="4" fill="#38bdf8" />
                    <text x="135" y="30" fill="#94a3b8" fontSize="9" fontFamily="monospace">H_max: 15.9m</text>
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-900 pt-1">
                  <span>Range (R): 63.8 m</span>
                  <span>Flight Time (T): 3.61 s</span>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-[11px] flex items-center justify-between">
                <span className="text-slate-300">UTME Exam Connection:</span>
                <span className="text-cyan-300 font-bold">Physics 2024 Q18 Link Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive STEM Preview Section */}
      <section className="border-b border-slate-200/80 bg-slate-100/50 py-12 sm:py-16 dark:border-slate-800/80 dark:bg-[#070f20]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="max-w-2xl space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Interactive Experimentation Preview
            </span>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Test the Simulation Engine Directly
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Adjust parameters below to see how mathematical formulas react in real time. Works with touch, mouse, or keyboard navigation.
            </p>
          </div>

          <PublicStemDemo />
        </div>
      </section>

      {/* 6 Multidisciplinary Benches */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Six Virtual Laboratory Benches
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Designed around the most heavily calculated and conceptual topics in Nigerian examination syllabi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LAB_BENCHES.map((lab, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border ${lab.color} bg-white p-6 shadow-xs dark:bg-slate-900/80 space-y-3 flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{lab.icon}</span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                      {lab.badge}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      {lab.discipline}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                      {lab.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {lab.description}
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/classroom/stem"
                    className="text-xs font-bold text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-300"
                  >
                    Open Simulator Bench →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching & Exploration Modes */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Flexible Modes for Tutors &amp; Independent Learners
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Whether observing a masterclass lecture or conducting personal experimentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEM_MODES.map((sm, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60 space-y-3"
              >
                <span className="rounded-md bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300">
                  {sm.mode}
                </span>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {sm.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {sm.description}
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
            Experience virtual laboratory simulations today.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Experiment with physics kinematics, circuits, and titration curves directly inside your browser.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/classroom/stem"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-700 hover:bg-cyan-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Open STEM Studio Hub →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
