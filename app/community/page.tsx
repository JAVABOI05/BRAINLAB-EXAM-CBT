import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learner Community & Study Circles",
  description: "Connect with verified peer study circles, join subject cohorts, and engage in faculty-moderated academic discussions across Nigeria.",
  alternates: { canonical: "/community" },
};

const COHORTS = [
  {
    title: "JAMB Medicine & Health Sciences",
    members: "148 Candidates",
    focus: "English, Biology, Chemistry, Physics",
    badge: "Most Active",
    href: "/study-groups",
  },
  {
    title: "Engineering & Physical Sciences",
    members: "112 Candidates",
    focus: "English, Mathematics, Physics, Chemistry",
    badge: "High Velocity",
    href: "/study-groups",
  },
  {
    title: "Law, Arts & Social Sciences",
    members: "94 Candidates",
    focus: "English, Literature, Government, CRS/IRS",
    badge: "Discussion Heavy",
    href: "/study-groups",
  },
  {
    title: "300+ Elite Target Sprint Squad",
    members: "64 Candidates",
    focus: "Speed drills, high-order thinking & timed CBT",
    badge: "Elite Cohort",
    href: "/study-groups",
  },
];

const RECENT_DISCUSSIONS = [
  {
    title: "How to systematically approach projectile motion at an angle in JAMB Physics?",
    author: "Emeka O. (Answered by Engr. David K.)",
    subject: "Physics",
    replies: 2,
    upvotes: 24,
    href: "/community/discussions",
  },
  {
    title: "Subject-Verb Concord: 'Neither the teacher nor the students ____ (was/were) present'",
    author: "Blessing A. (Answered by Mrs. Bankole)",
    subject: "English Language",
    replies: 1,
    upvotes: 38,
    href: "/community/discussions",
  },
  {
    title: "Le Chatelier's Principle: Impact of inert gas addition at constant volume",
    author: "Tunde M. (Answered by Dr. Alabi)",
    subject: "Chemistry",
    replies: 1,
    upvotes: 19,
    href: "/community/discussions",
  },
];

export default function CommunityPage() {
  return (
    <main id="main" className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#000814] dark:text-slate-100">
      {/* -------------------------------------------------------------------
          1. Hero Section
      ------------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-blue-900/40 bg-[#00112b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Peer Community &amp; Moderated Circles
            </span>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              Learning is Better When We Learn Together.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-8">
              Welcome to the BrainLab Academic Community. Connect with serious candidates in
              moderated study circles, ask difficult past question doubts, and study with verified
              faculty mentors.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/study-groups"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 hover:scale-[1.02] active:scale-95"
              >
                Join a Study Circle →
              </Link>
              <Link
                href="/community/discussions"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 backdrop-blur-sm transition hover:bg-white/10 hover:text-white"
              >
                Browse Academic Discussions
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Meet your educators</p><h2 className="mt-2 text-2xl font-black text-slate-950">Learn with BrainLab tutors</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore tutor biographies, subject expertise, qualifications and teaching approaches before joining a learning session.</p></div>
          <Link href="/tutors" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1536] px-5 py-3 text-sm font-bold text-white hover:bg-blue-900">Explore tutor profiles →</Link>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          2. Active Study Circles Highlights
      ------------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
              Pillar 4 · Moderated Cohorts
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Active Moderated Study Circles
            </h2>
          </div>
          <Link
            href="/study-groups"
            className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline"
          >
            View All Cohorts &amp; Schedules →
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COHORTS.map((c) => (
            <article
              key={c.title}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-sky-300">
                    {c.badge}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{c.members}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Focus: {c.focus}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={c.href}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-slate-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700 transition"
                >
                  Enter Study Circle →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------------
          3. Recent Academic Discussions
      ------------------------------------------------------------------- */}
      <section className="border-y border-slate-200/80 bg-white py-14 transition-colors dark:border-slate-800/80 dark:bg-[#00112b]/40 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                Pillar 5 · Peer Q&amp;A
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Recent Academic Explanations &amp; Discussions
              </h2>
            </div>
            <Link
              href="/community/discussions"
              className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline"
            >
              Open Discussion Forum →
            </Link>
          </div>

          <div className="mt-8 space-y-4">
            {RECENT_DISCUSSIONS.map((d) => (
              <div
                key={d.title}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-900 dark:bg-blue-950 dark:text-sky-300 text-[10px]">
                      {d.subject}
                    </span>
                    <span className="text-slate-500 text-[11px]">{d.author}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    {d.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs font-semibold text-emerald-600">
                    ▲ {d.upvotes} Upvotes
                  </span>
                  <Link
                    href={d.href}
                    className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 transition"
                  >
                    Read Explanations →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          4. Safer Community Standards Strip
      ------------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-2xl">🛡️</span>
            <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
              Community Moderation Standards
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              BrainLab operates on academic integrity. All discussions are moderated by university
              faculty and high-scoring alumni. Inappropriate behaviour, spam, or malpractice queries are
              subject to immediate removal.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-2xl">⚡</span>
            <h3 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
              Daily Challenge Arena
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Test your knowledge against peers in live, real-time daily sprints. Compete on the
              leaderboard, protect your learning streak, and win study awards.
            </p>
            <Link
              href="/challenge-arena"
              className="mt-3 inline-block text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline"
            >
              Enter Challenge Arena →
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
