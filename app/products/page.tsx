import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Products & Educational Ecosystem | BrainLab Academy",
  description:
    "Explore BrainLab Academy's complete educational technology ecosystem: authentic JAMB UTME CBT simulations, curriculum lessons, AI diagnostics, live classrooms, virtual STEM labs, and competitive academic arenas.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Educational Products & Learning Suite | BrainLab Academy",
    description:
      "A unified academic ecosystem engineered for Nigerian secondary and UTME candidates: CBT practice, syllabus notes, virtual laboratories, AI diagnostics, and live tutor masterclasses.",
    url: "https://www.brainlabacademy.com.ng/products",
  },
};

interface ProductPillar {
  slug: string;
  href: string;
  badge: string;
  badgeColor: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  keyFeatures: string[];
  ctaLabel: string;
  portalTarget: string;
}

const PRODUCTS: ProductPillar[] = [
  {
    slug: "cbt",
    href: "/products/cbt",
    badge: "Examination Simulation",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    icon: "✍️",
    title: "JAMB UTME CBT Simulator",
    subtitle: "Authentic timed 4-subject combination examinations",
    description:
      "Replicate the exact interface and cognitive pressure of the JAMB CBT centre. Featuring authentic 4-subject papers, 2-hour countdown timers, built-in digital calculators, offline answer caching, and step-by-step post-exam worked explanations.",
    keyFeatures: [
      "Standard 180-question 4-subject papers",
      "Standardized 400-mark scoring with percentile rank",
      "Offline auto-sync queue for unstable Nigerian 3G/4G",
      "Integrated on-screen scientific calculator",
    ],
    ctaLabel: "Learn about CBT Practice",
    portalTarget: "/cbt",
  },
  {
    slug: "learning-hub",
    href: "/products/learning-hub",
    badge: "Curriculum Mastery",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: "📚",
    title: "Curriculum Learning Hub",
    subtitle: "Structured syllabus notes & textbook alignments",
    description:
      "Master difficult secondary and UTME subjects through structured modules aligned directly to official examination boards. Review detailed topic summaries, specific learning objectives, and recommended reading texts across Science, Commercial, and Art disciplines.",
    keyFeatures: [
      "Full coverage of Science, Commercial & Art subjects",
      "Specific learning goals and subtopic breakdowns",
      "Official recommended textbook bibliographies",
      "Seamless deep-links to relevant CBT past questions",
    ],
    ctaLabel: "Learn about Learning Hub",
    portalTarget: "/learn",
  },
  {
    slug: "ai-learning",
    href: "/products/ai-learning",
    badge: "Adaptive AI Diagnostics",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    icon: "🤖",
    title: "AI Study Studio & Diagnostics",
    subtitle: "Automated weakness detection & targeted drills",
    description:
      "Transform mock examination mistakes into permanent mastery. Our AI diagnostic engine analyzes your answer patterns, flags specific topic blind spots, and automatically generates targeted 5-question reinforcement drills to close gaps before exam day.",
    keyFeatures: [
      "Automated misconception analysis on mock errors",
      "Targeted 5-question reinforcement drills",
      "SM-2 spaced repetition daily formula flashcards",
      "Step-by-step mathematical & scientific reasoning",
    ],
    ctaLabel: "Learn about AI Diagnostics",
    portalTarget: "/ai-learning",
  },
  {
    slug: "live-classroom",
    href: "/products/live-classroom",
    badge: "Synchronized Live Stage",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    icon: "🎥",
    title: "Live Classroom & Whiteboard Stage",
    subtitle: "Tutor masterclasses with real-time vector whiteboard",
    description:
      "Join scheduled interactive classes hosted by experienced subject educators. Experience multi-surface digital chalkboards, coordinate graphing planes, live checkpoint comprehension quizzes, and low-data recorded audio breakdowns.",
    keyFeatures: [
      "Multi-canvas whiteboard: chalkboard, grid & lined notebook",
      "Ultra-low latency live presentation sync",
      "Instant student comprehension checkpoint polls",
      "Low-bandwidth audio recordings for offline replay",
    ],
    ctaLabel: "Learn about Live Classroom",
    portalTarget: "/classroom",
  },
  {
    slug: "stem-studio",
    href: "/products/stem-studio",
    badge: "Virtual Laboratory Suite",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
    icon: "🔬",
    title: "STEM Studio Virtual Labs",
    subtitle: "Interactive mathematical, physics & chemistry simulations",
    description:
      "Bridge the gap between theoretical textbook formulas and practical understanding. Experiment with real-time interactive models covering parabolic kinematics, DC circuit resistance, acid-base pH curves, genetics Punnett squares, and Boolean logic gates.",
    keyFeatures: [
      "5 interactive multi-disciplinary simulation benches",
      "Real-time slider parameter controls & mathematical telemetry",
      "Synchronized tutor presentation and student exploration modes",
      "Direct linkage from experiment findings to UTME CBT drills",
    ],
    ctaLabel: "Learn about STEM Studio",
    portalTarget: "/classroom/stem",
  },
  {
    slug: "challenge-arena",
    href: "/products/challenge-arena",
    badge: "Gamified Academic Arena",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
    icon: "⚔️",
    title: "Academic Challenge Arena",
    subtitle: "Daily sprints, 1v1 duels & national leaderboard",
    description:
      "Gamify examination preparation without losing academic rigor. Compete in 10-question rapid sprint challenges against fellow candidates nationwide, protect your daily learning streaks, and climb the verified national merit leaderboard.",
    keyFeatures: [
      "Daily 10-question timed speed sprints",
      "Real-time 1v1 live candidate academic duels",
      "Daily streak protection with automated alerts",
      "National merit leaderboard and verifiable badges",
    ],
    ctaLabel: "Learn about Challenge Arena",
    portalTarget: "/challenge-arena",
  },
];

export default function ProductsOverviewPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.08),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Connected Educational Architecture
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
            The BrainLab <span className="text-blue-700 dark:text-cyan-400">Learning Suite</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
            Every major learning dimension — examination simulations, curriculum notes, interactive laboratories, AI diagnosis, and live masterclasses — connected inside one seamless platform.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span> JAMB UTME Aligned
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span> Low-Bandwidth Optimized
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">✓</span> Daily Free Practice
            </span>
          </div>
        </div>
      </section>

      {/* Product Pillars Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Explore Our Six Core Product Engines
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Each product is engineered to solve a specific academic challenge, from time management to conceptual depth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PRODUCTS.map((product) => (
              <article
                key={product.slug}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-xs hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90 transition-all duration-200 hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl" aria-hidden="true">
                      {product.icon}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${product.badgeColor}`}>
                      {product.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white group-hover:text-blue-700 dark:group-hover:text-cyan-400 transition-colors">
                      {product.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-blue-800 dark:text-cyan-300">
                      {product.subtitle}
                    </p>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {product.description}
                  </p>

                  <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Key Capabilities:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {product.keyFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-cyan-400 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <Link
                    href={product.href}
                    className="inline-flex items-center text-xs font-black text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{product.ctaLabel}</span>
                    <span className="ml-1" aria-hidden="true">→</span>
                  </Link>

                  <Link
                    href={product.portalTarget}
                    className="rounded-xl bg-slate-100 hover:bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:text-blue-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition"
                  >
                    Open Tool
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Product Integration Architecture Banner */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-8 sm:p-12 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950/30">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                  Interconnected Workflows
                </span>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
                  How the Ecosystem Works Together
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  BrainLab avoids the fragmentation of having past questions on one website, lessons on another, and tutors on YouTube. When you miss a physics projectile question in CBT practice, you can launch the STEM Studio simulation to experiment with the angle, review the worked solution, and generate a 5-question AI reinforcement drill in one flow.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href="/for-students"
                    className="rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2.5 text-xs font-black text-white shadow-xs transition"
                  >
                    Read Student Guide →
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
                  >
                    Compare Plans &amp; Access
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="font-black text-blue-700 dark:text-cyan-400">1. Practise</div>
                  <div className="mt-1 font-bold text-slate-800 dark:text-slate-200">CBT Exam Engine</div>
                  <div className="mt-1 text-[11px] text-slate-500">Timed 4-subject exam under authentic conditions.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="font-black text-emerald-700 dark:text-emerald-400">2. Review</div>
                  <div className="mt-1 font-bold text-slate-800 dark:text-slate-200">Curriculum Notes</div>
                  <div className="mt-1 text-[11px] text-slate-500">Official syllabus subtopics and core learning objectives.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="font-black text-cyan-700 dark:text-cyan-400">3. Visualize</div>
                  <div className="mt-1 font-bold text-slate-800 dark:text-slate-200">STEM Virtual Labs</div>
                  <div className="mt-1 text-[11px] text-slate-500">Interactive physics, chemistry, and circuit models.</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="font-black text-purple-700 dark:text-purple-400">4. Retain</div>
                  <div className="mt-1 font-bold text-slate-800 dark:text-slate-200">AI Weak-Topic Drills</div>
                  <div className="mt-1 text-[11px] text-slate-500">Targeted reinforcement until misconceptions are gone.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
