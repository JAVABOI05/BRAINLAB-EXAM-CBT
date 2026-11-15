import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Academic Challenge Arena & Daily Sprints",
  description:
    "Gamified examination preparation: daily 10-question timed speed sprints, real-time 1v1 academic duels, daily streak milestones, and the verified national merit leaderboard.",
  alternates: { canonical: "https://www.brainlabacademy.com.ng/products/challenge-arena" },
  openGraph: {
    title: "Challenge Arena & Competitions — BrainLab Academy",
    description:
      "Compete with top UTME and secondary school candidates nationwide. 10-question speed sprints, 1v1 duels, and daily streak protection.",
    url: "https://www.brainlabacademy.com.ng/products/challenge-arena",
  },
};

interface ArenaModeItem {
  iconId: "sprint" | "duel" | "streak" | "leaderboard" | "passport" | "fairplay";
  title: string;
  badge?: string;
  description: string;
}

const ARENA_MODES: ArenaModeItem[] = [
  {
    iconId: "sprint",
    title: "Daily 10-Question Speed Sprint",
    badge: "Solo Challenge",
    description:
      "A lightning-fast, high-intensity daily quiz across your chosen subject. 10 questions in 5 minutes designed to sharpen rapid decision-making and eliminate hesitation.",
  },
  {
    iconId: "duel",
    title: "1v1 Live Academic Duels",
    badge: "Head-to-Head",
    description:
      "Match live with ambitious peers across Nigeria. Both candidates answer identical questions under simultaneous countdown clocks to see who achieves higher accuracy in less time.",
  },
  {
    iconId: "streak",
    title: "Daily Learning Streak Protection",
    badge: "Habit Builder",
    description:
      "Consistent daily revision beats last-minute cramming. Protect your practice streak, unlock reward XP multipliers, and receive automated rescue alerts before midnight.",
  },
  {
    iconId: "leaderboard",
    title: "National Merit Leaderboard",
    badge: "National Ranking",
    description:
      "Benchmark your academic standing against candidates from secondary schools and tutorial centres across all 36 Nigerian states and the FCT.",
  },
  {
    iconId: "passport",
    title: "Verifiable Skills Passport & Badges",
    badge: "Recognition",
    description:
      "Earn digital accomplishment badges for subject mastery, perfect score sprints, and 30-day consistency streaks, verified directly on your academic passport.",
  },
  {
    iconId: "fairplay",
    title: "Academic Integrity & Fair Play",
    badge: "Fair Play",
    description:
      "Protected by anti-cheat timing algorithms and tamper-proof scoring to guarantee that leaderboard positions reflect genuine knowledge, preparation, and speed.",
  },
];

function ArenaModeIcon({ id }: { id: ArenaModeItem["iconId"] }) {
  switch (id) {
    case "sprint":
      return (
        <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "duel":
      return (
        <svg className="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
          <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
          <line x1="5" y1="14" x2="9" y2="18" />
          <line x1="7" y1="17" x2="4" y2="20" />
          <line x1="3" y1="19" x2="5" y2="21" />
        </svg>
      );
    case "streak":
      return (
        <svg className="h-6 w-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "passport":
      return (
        <svg className="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case "fairplay":
      return (
        <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
  }
}

export default function ChallengeArenaProductPage() {
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
            <span className="font-bold text-slate-800 dark:text-slate-200">Challenge Arena</span>
          </div>
          <Link
            href="/challenge-arena"
            className="font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Enter Arena →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(244,63,94,0.1),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Gamified Examination Prep
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              Compete with purpose. <br />
              <span className="text-rose-600 dark:text-rose-400">Build rapid recall and test stamina.</span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
              Gamify your daily exam study. Sit 10-question speed sprints, duel fellow candidates in real-time academic matches, protect your daily revision streak, and benchmark your score against the national merit leaderboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link
                href="/challenge-arena"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Join Today&apos;s Arena Sprint <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                View National Leaderboard
              </Link>
            </div>
          </div>

          {/* Visual Arena Card Mock */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl dark:border-slate-800 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-rose-400 font-bold">1V1 LIVE DUEL // USE OF ENGLISH</span>
                <span className="text-emerald-400 font-bold">ROUND 4 OF 10</span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 text-center">
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3">
                  <div className="text-[10px] text-slate-400">YOU (CHALLENGER)</div>
                  <div className="text-xl font-black text-cyan-300 mt-1">3/4</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Speed: 8.2s avg</div>
                </div>
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3">
                  <div className="text-[10px] text-slate-400">IBRAHIM K. (LAGOS)</div>
                  <div className="text-xl font-black text-rose-300 mt-1">3/4</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Speed: 9.1s avg</div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/80 p-3 text-[11px] text-slate-300 border border-slate-700/60">
                <div className="text-slate-400 text-[10px] mb-1">CONCORD QUESTION:</div>
                Neither the teacher nor the students ______ present at the assembly hall.
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <svg className="h-3.5 w-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                  <span>CURRENT STREAK: 14 DAYS</span>
                </span>
                <span className="text-rose-400 font-bold">+50 XP ON WIN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Arena Modes Grid */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Competitive Challenges That Drive Academic Speed
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Exam day requires not just knowing the answer, but choosing it decisively within seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARENA_MODES.map((mode, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <ArenaModeIcon id={mode.iconId} />
                  </div>
                  <span className="rounded-full bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-700 dark:text-rose-300">
                    {mode.badge}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {mode.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {mode.description}
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
            Test your speed in the arena today.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Join thousands of ambitious secondary school and UTME candidates nationwide.
          </p>
          <div className="flex justify-center gap-3.5">
            <Link
              href="/challenge-arena"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Enter Challenge Arena →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
