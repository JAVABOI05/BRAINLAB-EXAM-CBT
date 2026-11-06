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
    title: "Learning before scores",
    summary: "Results open doors, but lasting understanding sustains success.",
    description:
      "Examinations are crucial milestones, but cramming without comprehension leaves students vulnerable at university and in careers. We build tools that illuminate the underlying principles behind every formula and concept.",
  },
  {
    number: "02",
    title: "Low-bandwidth accessibility",
    summary: "High-quality education must work on everyday phones and varying networks.",
    description:
      "A learning tool is only as good as its availability. We optimize BrainLab with offline service worker caching, low-data live classroom modes, and lightweight asset bundles so learning never stalls over weak mobile data.",
  },
  {
    number: "03",
    title: "Honest personalization",
    summary: "Guidance must reflect authentic diagnostic data, never generic shortcuts.",
    description:
      "Every learner has a unique pace and pattern of mistakes. Our AI revision engines pinpoint specific syllabus weak points—from quadratic discriminants to optics sign conventions—and deliver targeted reinforcement.",
  },
  {
    number: "04",
    title: "Community & collaborative learning",
    summary: "Learners achieve greater retention when studying together in safe spaces.",
    description:
      "Peer discussions, live interactive masterclasses, and shared study circles turn isolated revision into an engaging, motivated journey where candidates support and elevate one another.",
  },
  {
    number: "05",
    title: "Innovation with real purpose",
    summary: "Technology must solve genuine academic bottlenecks, not just look impressive.",
    description:
      "From zero-lag mathematical drawing boards to automated SM-2 spaced repetition, every feature we build directly targets a proven barrier in examination preparation and conceptual mastery.",
  },
  {
    number: "06",
    title: "Academic trust & learner safety",
    summary: "Strict data privacy, transparent assessment rules, and verified standards.",
    description:
      "We safeguard learner data with rigorous row-level security, enforce strictly unmanipulated examination scoring, and partner transparently with schools, educators, and parents.",
  },
];

const CAPABILITIES = [
  {
    badge: "Authentic Examination CBT",
    title: "Practise with Purpose",
    description:
      "Prepare with rigorous UTME, WASSCE, and Post-UTME simulations. Featuring official 4-subject combinations, real examination timers, calculator integration, high-resolution diagram zoom, and offline answer autosave.",
    linkHref: "/products/cbt",
    linkText: "Explore CBT Simulator",
    highlights: ["180-Question UTME standard", "Offline PWA queue & sync", "Topic-by-topic corrections"],
  },
  {
    badge: "Curriculum & Syllabus",
    title: "Master Subject Foundations",
    description:
      "Study structured syllabus notes, specific learning goals, and recommended textbooks across Science, Commercial, and Art disciplines, deep-linked directly to past exam questions.",
    linkHref: "/products/learning-hub",
    linkText: "Explore Learning Hub",
    highlights: ["Official exam board alignment", "Science, Commercial & Arts", "Direct CBT question links"],
  },
  {
    badge: "AI Diagnostics & Memory",
    title: "Understand Difficult Concepts",
    description:
      "Go beyond rote memorization. Generate targeted 5-question AI revision drills tailored to your test weaknesses, review step-by-step worked solutions, and retain critical formulas with our daily 10-minute SM-2 Spaced Repetition deck.",
    linkHref: "/products/ai-learning",
    linkText: "Explore AI Diagnostics",
    highlights: ["Step-by-step worked solutions", "SM-2 spaced review algorithm", "Targeted 5-question drills"],
  },
  {
    badge: "Live Interactive Masterclasses",
    title: "Learn with Expert Tutors",
    description:
      "Attend structured virtual classes featuring the BrainLab Smart Academic Whiteboard. Switch seamlessly between chalkboard, coordinate grid, and ruled notebook styles with live student polls and low-data audio notes.",
    linkHref: "/products/live-classroom",
    linkText: "Explore Live Stage",
    highlights: ["Mobile-first lecture stage", "Interactive vector whiteboard", "Classroom audio recordings"],
  },
  {
    badge: "STEM Virtual Laboratories",
    title: "Conduct Practical Experiments",
    description:
      "Bridge textbook theory with interactive 2D simulations covering physics kinematics, DC electrical circuits, acid-base pH titration, genetics Punnett crosses, and Boolean logic gates.",
    linkHref: "/products/stem-studio",
    linkText: "Explore STEM Studio",
    highlights: ["5 interactive lab benches", "Real-time telemetry sliders", "UTME exam past-paper links"],
  },
  {
    badge: "Academic Challenge Arena",
    title: "Build Decisive Test Speed",
    description:
      "Sharpen mental agility with daily 10-question speed sprints, real-time 1v1 candidate duels, daily revision streak milestones, and the verified national merit leaderboard.",
    linkHref: "/products/challenge-arena",
    linkText: "Explore Challenge Arena",
    highlights: ["Daily 10-question sprints", "1v1 live candidate duels", "National merit leaderboard"],
  },
];

function renderCapIcon(title: string) {
  if (title.includes("Practise")) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  if (title.includes("Understand")) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-700">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
        <line x1="10" y1="21" x2="14" y2="21" />
      </svg>
    );
  }
  if (title.includes("Learn")) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

const ROADMAP_STAGES = [
  {
    stage: "Available Now",
    statusColor: "emerald",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
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
    statusColor: "amber",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-900",
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
    statusColor: "blue",
    badgeBg: "bg-blue-50 border-blue-200 text-blue-900",
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
    <main id="main" className="min-h-screen bg-slate-50 text-slate-900">
      {/* 01. Hero & Introduction */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white">
        <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-blue-50/70 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24 relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
            About BrainLab Academy
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.12]">
            A better learning journey, beyond the exam.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-700 sm:text-xl sm:leading-8">
            BrainLab Academy is an intelligent learning platform built to help learners in Nigeria
            prepare confidently for examinations, understand difficult concepts, and develop the
            knowledge and skills to keep progressing long after the exam.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-7">
            From focused CBT practice and AI-assisted explanations to structured learning resources,
            live whiteboard classrooms, and collaborative study groups, our goal is to bring more
            of the learning journey into one accessible, resilient platform.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#012153] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0c3372] active:scale-95"
            >
              Start CBT Practice →
            </Link>
            <Link
              href="/learning"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
            >
              Explore Learning Hub
            </Link>
            <Link
              href="/schools"
              className="inline-flex min-h-12 items-center justify-center px-4 py-3 text-sm font-bold text-blue-900 hover:text-blue-700 underline underline-offset-4"
            >
              Partner as a School or Learning Centre →
            </Link>
          </div>
        </div>
      </section>

      {/* 02. What Learners Can Do (Credibility & Real Features) */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">
            Real Tools · Proven Impact
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Built for the way learners actually learn.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            We avoid empty edtech buzzwords. Every module in BrainLab Academy addresses a real challenge
            faced by students preparing for Nigerian secondary and tertiary entrance exams.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <article
              key={cap.title}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition hover:border-blue-400 hover:shadow-md sm:p-9"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100/80">
                    {renderCapIcon(cap.title)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700">
                    {cap.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950 sm:text-2xl">
                  {cap.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {cap.description}
                </p>

                <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  {cap.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 pt-4">
                <Link
                  href={cap.linkHref}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-800 hover:text-blue-600 transition"
                >
                  <span>{cap.linkText}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 03. Vision & Mission */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl bg-[#012153] p-8 text-white sm:p-10 shadow-lg flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
                  Our Vision
                </div>
                <h2 className="mt-5 text-2xl font-black leading-snug sm:text-3xl">
                  To become Africa&apos;s most trusted and empowering intelligent learning platform.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-blue-100 sm:text-base sm:leading-7">
                  We envision a continent where geography and network constraints never dictate the quality
                  of education a young person receives—enabling every learner to master difficult concepts,
                  excel in competitive examinations, and build meaningful skills for Africa&apos;s future.
                </p>
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-cyan-400">
                Starting in Nigeria · Expanding Across Africa
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
                  Our Mission
                </div>
                <h2 className="mt-5 text-2xl font-black leading-snug text-slate-950 sm:text-3xl">
                  To make learning accessible, deeply understood, and consistently rewarding.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-7">
                  By uniting rigorous Nigerian curriculum standards with high-yield AI diagnostics,
                  resilient low-data offline technology, and compassionate tutor instruction, we transform
                  stressful exam preparation into an inspiring, step-by-step path to mastery.
                </p>
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-widest text-slate-500">
                Accessible · Personalized · Collaborative
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 04. Values that Shape Every Decision */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">
            Core Principles
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Values that shape every line of code.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            These commitments guide our product architecture, instructional design, and relationships
            with students, parents, and educators.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((val) => (
            <article
              key={val.number}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs font-black tracking-widest text-blue-800">
                  {val.number}
                </span>
                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {val.title}
                </h3>
                <p className="mt-2 text-xs font-bold text-blue-900 leading-snug">
                  {val.summary}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  {val.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 05. Roadmap & Trust Transparency */}
      <section className="border-t border-slate-200 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-indigo-900">
              Product Integrity &amp; Trust
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Honest transparency: What is live and what is next.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              We believe trust is earned through truthfulness. Here is our unambiguous feature breakdown
              so candidates, schools, and partners know exactly what is operational today and what is on our horizon.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {ROADMAP_STAGES.map((col) => (
              <div
                key={col.stage}
                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 flex flex-col"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                  <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${col.badgeBg}`}>
                    {col.stage}
                  </span>
                </div>

                <p className="mt-4 text-xs font-semibold text-slate-600">
                  {col.description}
                </p>

                <ul className="mt-5 space-y-3 border-t border-slate-200/80 pt-4 flex-1">
                  {col.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="font-bold text-slate-400 mt-0.5">•</span>
                      <span className="leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06. Verified Contact Directory & Next Steps */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24 text-center">
        <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Ready to experience purposeful learning?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Whether you are a student preparing for UTME, a teacher looking for curriculum materials, or a school director seeking reliable assessment infrastructure, BrainLab is built for you.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[#012153] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0c3372] active:scale-95"
          >
            Start Practising Now
          </Link>
          <Link
            href="/learning/revision"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 active:scale-95"
          >
            Open Revision Planner
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-100 active:scale-95"
          >
            Contact Academy Directory
          </Link>
        </div>

        {/* Official Verified Contact Channels Table */}
        <div className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-left shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Official Academy Inquiries &amp; Desks
              </h3>
              <p className="text-xs text-slate-500">
                Verified Cloudflare mail routing under our official domain: <span className="font-semibold text-slate-700">brainlabacademy.com.ng</span>
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              ● Active Channels
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">Technical &amp; CBT Support</span>
              <a
                href="mailto:support@brainlabacademy.com.ng?subject=BrainLab%20Technical%20Support"
                className="mt-1 font-bold text-blue-800 hover:underline block text-sm"
              >
                support@brainlabacademy.com.ng
              </a>
              <span className="mt-1 text-[11px] text-slate-500 block">Exam sessions, access PINs, &amp; device sync</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">General Enquiries</span>
              <a
                href="mailto:info@brainlabacademy.com.ng?subject=BrainLab%20General%20Enquiry"
                className="mt-1 font-bold text-blue-800 hover:underline block text-sm"
              >
                info@brainlabacademy.com.ng
              </a>
              <span className="mt-1 text-[11px] text-slate-500 block">Course schedules, curriculum, &amp; general info</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">Academy &amp; Partnerships</span>
              <a
                href="mailto:hello@brainlabacademy.com.ng?subject=BrainLab%20Partnership%20Inquiry"
                className="mt-1 font-bold text-blue-800 hover:underline block text-sm"
              >
                hello@brainlabacademy.com.ng
              </a>
              <span className="mt-1 text-[11px] text-slate-500 block">Schools, tutorial centres, &amp; educator desks</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
