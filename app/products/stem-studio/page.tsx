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

interface LabBenchItem {
  discipline: string;
  title: string;
  badge: string;
  iconId: "projectile" | "circuit" | "titration" | "genetics" | "math" | "logic";
  color: string;
  description: string;
}

const LAB_BENCHES: LabBenchItem[] = [
  {
    discipline: "Physics & Mechanics",
    title: "Projectile Motion & Ballistics Lab",
    badge: "Kinematics",
    iconId: "projectile",
    color: "border-blue-500/30 bg-blue-500/5",
    description:
      "Adjust velocity, launch angle (0° to 90°), and gravitational acceleration (Earth 9.8 m/s² vs Moon 1.62 m/s²). Observe instantaneous trajectory curves, time of flight, and maximum range in real time.",
  },
  {
    discipline: "Physics & Electricity",
    title: "DC Circuit & Ohm's Law Bench",
    badge: "Circuits",
    iconId: "circuit",
    color: "border-amber-500/30 bg-amber-500/5",
    description:
      "Wire resistors in series and parallel, vary battery voltage (0V to 48V), and inspect current flow, equivalent resistance, and thermal power dissipation with automatic overload warnings.",
  },
  {
    discipline: "Chemistry & Volumetrics",
    title: "Acid-Base Titration & pH Curve",
    badge: "Titration",
    iconId: "titration",
    color: "border-pink-500/30 bg-pink-500/5",
    description:
      "Titrate strong and weak acids with standardized burette titrant volumes. Watch the interactive pH curve rise and observe the phenolphthalein indicator shift sharply from colorless to vibrant pink at equivalence.",
  },
  {
    discipline: "Biology & Heredity",
    title: "Mendelian Genetics Punnett Lab",
    badge: "Genetics",
    iconId: "genetics",
    color: "border-emerald-500/30 bg-emerald-500/5",
    description:
      "Cross homozygous and heterozygous parental alleles (BB, Bb, bb). Calculate theoretical genotypic and phenotypic ratios (3:1 dominant vs recessive) and verify test cross outcomes.",
  },
  {
    discipline: "Mathematics & Analysis",
    title: "Quadratic Parabola & Roots Explorer",
    badge: "Algebra",
    iconId: "math",
    color: "border-indigo-500/30 bg-indigo-500/5",
    description:
      "Manipulate quadratic coefficients (a, b, c) using continuous sliders. Observe the parabola reflect and shift, calculate the discriminant Δ = b² - 4ac, and inspect real versus complex roots.",
  },
  {
    discipline: "Engineering & Computer Science",
    title: "Boolean Logic Gates Bench",
    badge: "Digital Electronics",
    iconId: "logic",
    color: "border-cyan-500/30 bg-cyan-500/5",
    description:
      "Toggle digital binary inputs (0 and 1) across AND, OR, NOT, NAND, NOR, and XOR gates. Verify dynamic truth tables and understand the foundational building blocks of microprocessors.",
  },
];

function BenchIcon({ id }: { id: LabBenchItem["iconId"] }) {
  switch (id) {
    case "projectile":
      return (
        <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
      );
    case "circuit":
      return (
        <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "titration":
      return (
        <svg className="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v7.31L4.2 18.24A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.66-2.76L14 9.31V2" />
          <path d="M8.5 2h7M7 16h10" />
        </svg>
      );
    case "genetics":
      return (
        <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 0-4 18M12 2a10 10 0 0 1 4 18" />
        </svg>
      );
    case "math":
      return (
        <svg className="h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
          <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
        </svg>
      );
    case "logic":
      return (
        <svg className="h-6 w-6 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
  }
}

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

      {/* Multidisciplinary Laboratory Benches - Compact Alternating Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/80 dark:bg-cyan-950/60 px-4 py-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span>VIRTUAL SIMULATION BENCHES</span>
            </div>
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight sm:text-4xl">
              Specialized Laboratory Benches
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
              Designed around the most heavily calculated and conceptual topics in Nigerian examination syllabi.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {/* Row 1: Projectile Motion & Ballistics Lab (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-blue-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 dark:border-blue-700/60 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-cyan-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Physics &amp; Mechanics</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Projectile Motion &amp; Ballistics Lab
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Adjust velocity, launch angle (0° to 90°), and gravitational acceleration (Earth 9.8 m/s² vs Moon 1.62 m/s²). Observe instantaneous trajectory curves, time of flight, and maximum range in real time.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Real-time vector decomposition into horizontal vx and vertical vy components</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Direct verification of Range R = (u² sin 2&theta;) / g at 45° launch optimum</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Linked directly to official JAMB UTME kinematics past questions</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/classroom/stem"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Launch Kinematics Bench</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-blue-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          BALLISTICS TELEMETRY
                        </span>
                      </div>
                      <span className="text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded text-[11px]">
                        &theta; = 45.0&deg;
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                      <svg viewBox="0 0 300 80" className="w-full h-16 text-cyan-400" fill="none">
                        <path d="M 10 75 Q 150 10 290 75" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 2" />
                        <circle cx="150" cy="10" r="4" fill="#38bdf8" />
                        <text x="135" y="28" fill="#94a3b8" fontSize="9" fontFamily="monospace">H_max: 15.9m</text>
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Max Range</span>
                        <span className="text-white font-bold">R = 63.8 m</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Flight Time</span>
                        <span className="text-emerald-400 font-bold">T = 3.61 s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Optics Thin-Lens Ray Tracing (Visual Preview Left, Text Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-cyan-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="rounded-2xl border border-cyan-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          RAY TRACING BENCH
                        </span>
                      </div>
                      <span className="text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded text-[11px]">
                        f = 10 cm
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                      <svg viewBox="0 0 320 110" className="w-full h-auto text-slate-300">
                        <line x1="10" y1="55" x2="310" y2="55" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                        <ellipse cx="160" cy="55" rx="7" ry="44" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
                        <circle cx="100" cy="55" r="3" fill="#38bdf8" />
                        <circle cx="220" cy="55" r="3" fill="#38bdf8" />
                        <circle cx="40" cy="55" r="3" fill="#94a3b8" />
                        <circle cx="280" cy="55" r="3" fill="#94a3b8" />
                        <line x1="40" y1="55" x2="40" y2="25" stroke="#f43f5e" strokeWidth="2.5" />
                        <polygon points="37,29 40,23 43,29" fill="#f43f5e" />
                        <line x1="40" y1="25" x2="160" y2="25" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="160" y1="25" x2="280" y2="85" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="40" y1="25" x2="280" y2="85" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1="280" y1="55" x2="280" y2="85" stroke="#10b981" strokeWidth="2.5" />
                        <polygon points="277,81 280,87 283,81" fill="#10b981" />
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Object Position</span>
                        <span className="text-white font-bold">do = 2F (Equal Size)</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase">Image Nature</span>
                        <span className="text-emerald-400 font-bold">Real &amp; Inverted</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
                <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>Physics &amp; Geometrical Optics</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Thin-Lens Ray-Tracing &amp; Optical Geometry
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Move real-time sliders for focal length f and object distance do. Watch three principal rays refract dynamically, instantly rendering real vs virtual, inverted vs upright images.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Real-time verification of Gaussian lens equation: 1/f = 1/do + 1/di</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Dynamic magnification and optical device mapping (Camera, Eye, Magnifier)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Silky 60fps SVG rendering on any low-power smartphone browser</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/classroom/stem"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Launch Optics Ray Bench</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Acid-Base Titration & pH Curve (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-pink-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-pink-300 dark:border-pink-700/60 bg-pink-50 dark:bg-pink-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-pink-800 dark:text-pink-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                    <span>Chemistry &amp; Volumetric Analysis</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Acid-Base Titration &amp; pH Curve Bench
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Titrate strong and weak acids with standardized burette titrant volumes. Watch the interactive pH curve rise and observe the phenolphthalein indicator shift sharply from colorless to vibrant pink at equivalence.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 text-xs font-bold">✓</span>
                      <span>Real-time sigmoidal pH curve graphing as burette drops are dispensed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 text-xs font-bold">✓</span>
                      <span>Instant molarity stoichiometric calculation: CaVa / CbVb = na / nb</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-400 text-xs font-bold">✓</span>
                      <span>Prepares students for WAEC Alternative to Practical Chemistry papers</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/classroom/stem"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-pink-700 hover:bg-pink-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Launch Titration Bench</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-pink-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          TITRATION ANALYZER
                        </span>
                      </div>
                      <span className="text-pink-400 font-bold bg-pink-950/80 border border-pink-800/80 px-2 py-0.5 rounded text-[11px]">
                        pH = 8.4 Equivalence
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
                      <div className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>Burette Titrant (0.1M NaOH):</span>
                        <span className="text-pink-400 font-bold">25.00 cm³</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>Conical Flask (0.1M HCl):</span>
                        <span className="text-cyan-400 font-bold">25.00 cm³</span>
                      </div>
                      <div className="p-2 rounded-lg bg-pink-950/60 border border-pink-800/70 text-center text-pink-200 text-[11px]">
                        Indicator: Phenolphthalein (Sharp Pink Transition)
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Equivalence Ratio: 1:1</span>
                      <span className="text-emerald-400 font-bold">Endpoint Verified ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Digital Electronics & Logic Gates (Visual Preview Left, Text Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-emerald-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="rounded-2xl border border-emerald-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                          LOGIC GATE BENCH
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded text-[11px]">
                        XOR GATE ACTIVE
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Binary Input A:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 font-bold border border-blue-800">1 (HIGH)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Binary Input B:</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">0 (LOW)</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-200 font-bold">XOR Output Y:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">1 (HIGH)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Truth Table Rule: A &ne; B &rArr; 1</span>
                      <span className="text-emerald-400 font-bold">Valid ✓</span>
                    </div>
                  </div>
                </div>

                {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
                <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Digital Electronics &amp; Logic</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Boolean Logic Gates &amp; Microprocessor Logic
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Toggle digital binary inputs (0 and 1) across AND, OR, NOT, NAND, NOR, and XOR gates. Verify dynamic truth tables and understand the foundational building blocks of microprocessors.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Interactive binary switch toggling with immediate output propagation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Automated truth table verification for all 6 foundational logic gates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Essential preparation for UTME Physics &amp; Computer Studies papers</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/classroom/stem"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Launch Logic Gate Bench</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
