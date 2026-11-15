import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About BrainLab Academy | A Better Learning Journey, Beyond the Exam",
  description:
    "BrainLab Academy is an intelligent learning platform built to help Nigerian and African learners prepare confidently for examinations, understand difficult concepts, and build lifelong skills.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    number: "01",
    title: "Learning Before Scores",
    summary: "Results open doors, but lasting understanding sustains success.",
    description:
      "Examinations are crucial milestones, but cramming without comprehension leaves students vulnerable at university and in careers. We build tools that illuminate the underlying principles behind every formula and concept.",
    color: "from-blue-600 to-cyan-500",
    badge: "Pedagogical Foundation",
  },
  {
    number: "02",
    title: "Low-Bandwidth Accessibility",
    summary: "High-quality education must work on everyday phones and varying networks.",
    description:
      "A learning tool is only as good as its availability. We optimize BrainLab with offline service worker caching, low-data live classroom modes, and lightweight asset bundles so learning never stalls over weak mobile data.",
    color: "from-emerald-600 to-teal-500",
    badge: "Engineering Priority",
  },
  {
    number: "03",
    title: "Honest Personalization",
    summary: "Guidance must reflect authentic diagnostic data, never generic shortcuts.",
    description:
      "Every learner has a unique pace and pattern of mistakes. Our AI revision engines pinpoint specific syllabus weak points—from quadratic discriminants to optics sign conventions—and deliver targeted reinforcement.",
    color: "from-purple-600 to-indigo-500",
    badge: "Adaptive AI",
  },
  {
    number: "04",
    title: "Community & Collaborative Spirit",
    summary: "Learners achieve greater retention when studying together in safe spaces.",
    description:
      "Peer discussions, live interactive masterclasses, and shared study circles turn isolated revision into an engaging, motivated journey where candidates support and elevate one another.",
    color: "from-amber-600 to-orange-500",
    badge: "Social Learning",
  },
  {
    number: "05",
    title: "Innovation with Real Purpose",
    summary: "Technology must solve genuine academic bottlenecks, not just look impressive.",
    description:
      "From zero-lag mathematical drawing boards to automated SM-2 spaced repetition, every feature we build directly targets a proven barrier in examination preparation and conceptual mastery.",
    color: "from-cyan-600 to-blue-500",
    badge: "Targeted EdTech",
  },
  {
    number: "06",
    title: "Academic Trust & Learner Safety",
    summary: "Strict data privacy, transparent assessment rules, and verified standards.",
    description:
      "We safeguard learner data with rigorous row-level security, enforce strictly unmanipulated examination scoring, and partner transparently with schools, educators, and parents.",
    color: "from-rose-600 to-pink-500",
    badge: "Security & NDPA",
  },
];

const CAPABILITIES = [
  {
    badge: "Authentic Examination CBT",
    title: "Practise with Purpose",
    subtitle: "Replicate official examination hall conditions",
    description:
      "Prepare with rigorous UTME, WASSCE, and Post-UTME simulations. Featuring official 4-subject combinations, real examination timers, calculator integration, high-resolution diagram zoom, and offline answer autosave.",
    linkHref: "/products/cbt",
    linkText: "Explore CBT Simulator",
    highlights: ["180-Question UTME standard", "Offline PWA queue & sync", "Topic-by-topic corrections"],
    accent: "blue",
  },
  {
    badge: "Curriculum & Syllabus",
    title: "Master Subject Foundations",
    subtitle: "Official exam board aligned modules",
    description:
      "Study structured syllabus notes, specific learning goals, and recommended textbooks across Science, Commercial, and Art disciplines, deep-linked directly to past exam questions.",
    linkHref: "/products/learning-hub",
    linkText: "Explore Learning Hub",
    highlights: ["Official exam board alignment", "Science, Commercial & Arts", "Direct CBT question links"],
    accent: "emerald",
  },
  {
    badge: "AI Diagnostics & Memory",
    title: "Understand Difficult Concepts",
    subtitle: "Socratic diagnosis & spaced retention",
    description:
      "Go beyond rote memorization. Generate targeted 5-question AI revision drills tailored to your test weaknesses, review step-by-step worked solutions, and retain critical formulas with our daily 10-minute SM-2 Spaced Repetition deck.",
    linkHref: "/products/ai-learning",
    linkText: "Explore AI Diagnostics",
    highlights: ["Step-by-step worked solutions", "SM-2 spaced review algorithm", "Targeted 5-question drills"],
    accent: "purple",
  },
  {
    badge: "Live Interactive Masterclasses",
    title: "Learn with Expert Tutors",
    subtitle: "Dynamic vector chalkboard instruction",
    description:
      "Attend structured virtual classes featuring the BrainLab Smart Academic Whiteboard. Switch seamlessly between chalkboard, coordinate grid, and ruled notebook styles with live student polls and low-data audio notes.",
    linkHref: "/products/live-classroom",
    linkText: "Explore Live Stage",
    highlights: ["Mobile-first lecture stage", "Interactive vector whiteboard", "Classroom audio recordings"],
    accent: "amber",
  },
  {
    badge: "STEM Virtual Laboratories",
    title: "Conduct Practical Experiments",
    subtitle: "Interactive physics, chemistry & logic benches",
    description:
      "Bridge textbook theory with interactive 2D simulations covering physics kinematics, DC electrical circuits, acid-base pH titration, genetics Punnett crosses, and Boolean logic gates.",
    linkHref: "/products/stem-studio",
    linkText: "Explore STEM Studio",
    highlights: ["5 interactive lab benches", "Real-time telemetry sliders", "UTME exam past-paper links"],
    accent: "cyan",
  },
  {
    badge: "Academic Challenge Arena",
    title: "Build Decisive Test Speed",
    subtitle: "Rapid-fire 10-question sprint match-ups",
    description:
      "Sharpen mental agility with daily 10-question speed sprints, real-time 1v1 candidate duels, daily revision streak milestones, and the verified national merit leaderboard.",
    linkHref: "/products/challenge-arena",
    linkText: "Explore Challenge Arena",
    highlights: ["Daily 10-question sprints", "1v1 live candidate duels", "National merit leaderboard"],
    accent: "rose",
  },
];

const ROADMAP_STAGES = [
  {
    stage: "Available Now",
    badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
    description: "Fully operational and battle-tested for all active learners and candidates:",
    items: [
      "Authentic JAMB UTME & WAEC CBT examination engine with official scoring",
      "Low-bandwidth PWA offline caching with background answer sync",
      "AI Weak-Topic Revision Drill Generator with step-by-step solutions",
      "Daily 10-Minute SM-2 Spaced Repetition flashcard system",
      "Live Virtual Classroom with dynamic vector whiteboard & checkpoint polls",
      "Curated high-yield formula sheets for Mathematics, Physics, Chemistry, & Biology",
      "Secure student accounts with verified certificate lookup",
    ],
  },
  {
    stage: "In Active Rollout",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300",
    dotColor: "bg-amber-500",
    description: "Currently in testing or graduating into wider school deployment:",
    items: [
      "School & Tutorial Centre bulk licensing portal with multi-campus analytics",
      "Interactive voice critique and step-by-step tutor audio feedback",
      "National Inter-School Challenge tournaments with live sprint arenas",
      "Parental progress digest summaries via WhatsApp notifications",
    ],
  },
  {
    stage: "Future Direction",
    badgeBg: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:border-blue-800 dark:text-cyan-300",
    dotColor: "bg-blue-500",
    description: "Our long-term commitment to democratizing education across the African continent:",
    items: [
      "Pan-African curriculum expansions (Ghana, Sierra Leone, Liberia, Kenya)",
      "Local offline mesh learning nodes for ultra-low-connectivity rural schools",
      "Practical vocational & technology skills pathways for post-secondary learners",
    ],
  },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* 01. Hero & Academic Manifesto Header */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(6,182,212,0.12),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/70 dark:text-cyan-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            <span>The BrainLab Manifesto</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl leading-tight">
            A Better Learning Journey, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 dark:from-cyan-300 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
              Beyond the Exam.
            </span>
          </h1>

          <p className="mx-auto max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-xl leading-relaxed">
            BrainLab Academy is an intelligent learning ecosystem engineered to help Nigerian and African learners prepare with absolute confidence for critical examinations, dismantle conceptual barriers, and develop lasting intellectual competence.
          </p>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            From focused CBT practice and AI-assisted diagnostics to structured syllabus notes, live whiteboard classrooms, and collaborative student arenas, we unite the entire academic pathway under one accessible, offline-resilient architecture.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/cbt"
              className="rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-6 py-3.5 text-xs font-black text-white shadow-md transition-all active:scale-95"
            >
              Start Free CBT Practice →
            </Link>
            <Link
              href="/products"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
            >
              Explore Learning Suite
            </Link>
            <Link
              href="/schools"
              className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 px-5 py-3.5 text-xs font-bold text-blue-900 dark:text-cyan-300 hover:underline transition"
            >
              Partner as a School →
            </Link>
          </div>
        </div>
      </section>

      {/* 02. What Learners Can Do (Capabilities Bento) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-12">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <span>Real Tools · Proven Impact</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
            Built for the Way Learners Actually Learn.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            We avoid empty EdTech buzzwords. Every capability in BrainLab Academy directly solves an authentic barrier faced by students preparing for Nigerian secondary and tertiary entrance exams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap) => (
            <article
              key={cap.title}
              className="group rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0a152b] p-7 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {cap.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white group-hover:text-blue-700 dark:group-hover:text-cyan-400 transition-colors">
                    {cap.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-blue-700 dark:text-cyan-300">
                    {cap.subtitle}
                  </p>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {cap.description}
                </p>

                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Highlights:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {cap.highlights.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-cyan-400 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href={cap.linkHref}
                  className="inline-flex items-center text-xs font-black text-blue-700 dark:text-cyan-400 hover:underline group-hover:translate-x-1 transition-transform"
                >
                  <span>{cap.linkText}</span>
                  <span className="ml-1" aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 03. Vision & Mission: Panoramic Focal Stage */}
      <section className="border-y border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070f22] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Vision Panel */}
            <div className="rounded-3xl bg-gradient-to-br from-[#012153] to-[#0c3372] p-8 sm:p-12 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
                  Our Continental Vision
                </span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight text-white">
                  To become Africa&apos;s most trusted and empowering intelligent learning platform.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-blue-100">
                  We envision an African continent where geographic remoteness and mobile data constraints never dictate the quality of education a young person receives—enabling every learner to master difficult concepts, excel in competitive examinations, and build meaningful skills for Africa&apos;s future.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-blue-400/20 text-xs font-bold uppercase tracking-widest text-cyan-300">
                Starting in Nigeria · Expanding Across Africa
              </div>
            </div>

            {/* Mission Panel */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-8 sm:p-12 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                  Our Everyday Mission
                </span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight text-slate-950 dark:text-white">
                  To make learning accessible, deeply understood, and consistently rewarding.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  By uniting rigorous Nigerian curriculum standards with high-yield AI diagnostics, resilient low-data offline technology, and compassionate tutor instruction, we transform stressful examination preparation into an inspiring, step-by-step path to mastery.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Accessible · Personalized · Collaborative
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04. Values that Shape Every Decision (Numbered Editorial Canvas) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 space-y-12">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <span>Core Principles</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
            Values That Shape Every Line of Code.
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            These commitments guide our product architecture, instructional design, and relationships with candidates, parents, and schools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map((val) => (
            <article
              key={val.number}
              className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#0a152b] p-7 shadow-xs hover:border-blue-400/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-blue-700 dark:text-cyan-400">
                    {val.number}
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {val.badge}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  {val.title}
                </h3>
                <p className="text-xs font-bold text-blue-800 dark:text-cyan-300 leading-snug">
                  {val.summary}
                </p>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {val.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 05. Product Integrity & Transparency Roadmap */}
      <section className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070f22] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/70 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              Product Integrity &amp; Trust
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Honest Transparency: What is Live and What is Next.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              We believe trust is earned through truthfulness. Here is our unambiguous feature breakdown so candidates, schools, and partners know exactly what is operational today and what is on our active horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ROADMAP_STAGES.map((col) => (
              <div
                key={col.stage}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-6 sm:p-8 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${col.badgeBg}`}>
                      {col.stage}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {col.description}
                  </p>

                  <ul className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                    {col.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-blue-600 dark:text-cyan-400 mt-0.5">•</span>
                        <span className="leading-relaxed font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-center">
            <Link
              href="/about/trust-centre"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-6 py-3 text-xs font-black text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 transition shadow-xs"
            >
              <span>Explore BrainLab Trust &amp; Governance Centre</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 06. Official Contact Channels & Communication Desks */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
            Ready to Experience Purposeful Learning?
          </h2>
          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Whether you are a student preparing for UTME, a teacher looking for curriculum materials, or a school director seeking reliable assessment infrastructure, BrainLab is built for you.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/cbt"
            className="rounded-xl bg-[#012153] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 px-6 py-3.5 text-xs font-black text-white shadow-md transition-all active:scale-95"
          >
            Start Free Practice Now
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
          >
            Contact Academy Directory
          </Link>
        </div>

        {/* Official Directory Cards */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a152b] p-6 sm:p-8 text-left shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Official Academy Inquiries &amp; Desks
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified Cloudflare mail routing under our official domain: <span className="font-semibold text-slate-700 dark:text-slate-300">brainlabacademy.com.ng</span>
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              ● Active Channels
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-1">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                Technical &amp; CBT Support
              </span>
              <a
                href="mailto:support@brainlabacademy.com.ng?subject=BrainLab%20Technical%20Support"
                className="font-bold text-blue-700 dark:text-cyan-400 hover:underline block text-sm"
              >
                support@brainlabacademy.com.ng
              </a>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Exam sessions, access PINs, &amp; device sync
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-1">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                General Enquiries
              </span>
              <a
                href="mailto:info@brainlabacademy.com.ng?subject=BrainLab%20General%20Enquiry"
                className="font-bold text-blue-700 dark:text-cyan-400 hover:underline block text-sm"
              >
                info@brainlabacademy.com.ng
              </a>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Course schedules, curriculum, &amp; general info
              </span>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-1">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                Academy &amp; Partnerships
              </span>
              <a
                href="mailto:hello@brainlabacademy.com.ng?subject=BrainLab%20Partnership%20Inquiry"
                className="font-bold text-blue-700 dark:text-cyan-400 hover:underline block text-sm"
              >
                hello@brainlabacademy.com.ng
              </a>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Schools, tutorial centres, &amp; educator desks
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
