import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "JAMB UTME CBT Practice & Mock Exam Simulator | BrainLab Academy",
  description:
    "Sit authentic 4-subject combination JAMB UTME mock exams with 2-hour countdown timing, 400-mark standardized scoring, built-in digital calculators, offline answer caching, and step-by-step worked solutions.",
  alternates: { canonical: "/products/cbt" },
  openGraph: {
    title: "JAMB UTME CBT Simulator — BrainLab Academy",
    description:
      "Prepare under authentic Nigerian CBT examination conditions. 180 questions, 2 hours, instant diagnostic score breakdown, and offline answer protection.",
    url: "https://www.brainlabacademy.com.ng/products/cbt",
  },
};

interface FeatureItem {
  iconId: "timer" | "calc" | "sync" | "score" | "solution" | "mobile";
  title: string;
  description: string;
}

const FEATURES: FeatureItem[] = [
  {
    iconId: "timer",
    title: "Authentic 2-Hour Countdown & Timing",
    description:
      "Practise with strict examination pacing. The timer replicates Joint Admissions and Matriculation Board standards, training you to allocate minutes efficiently across English and your three elective papers.",
  },
  {
    iconId: "calc",
    title: "Built-In On-Screen Scientific Calculator",
    description:
      "Never scramble for external tools. Our integrated digital calculator is accessible during Physics, Chemistry, and Mathematics calculations. You can drag, minimize, or close it anytime.",
  },
  {
    iconId: "sync",
    title: "Low-Data Offline Answer Auto-Sync",
    description:
      "Fluctuating Nigerian 3G/4G or sudden cybercafé power cuts won't wipe your paper. Responses are cached locally in your browser storage and automatically sync to the server once reconnected.",
  },
  {
    iconId: "score",
    title: "Standardized 400-Mark Diagnostic Scoring",
    description:
      "Get instant score breakdowns by subject immediately upon submission, with percentile benchmarks showing exactly where you stand among thousands of candidates nationwide.",
  },
  {
    iconId: "solution",
    title: "Step-by-Step Worked Solutions & Corrections",
    description:
      "Don't just see which answers were wrong — understand why. Review complete mathematical proofs, grammatical explanations, and conceptual breakdowns for every single question.",
  },
  {
    iconId: "mobile",
    title: "Responsive Mobile & Cybercafé Terminal Support",
    description:
      "Engineered mobile-first to glide on budget Android touchscreens, laptops, and older cybercafé desktop terminals without freezing, memory leaks, or heavy bundle downloads.",
  },
];

function CbtFeatureIcon({ id }: { id: FeatureItem["iconId"] }) {
  switch (id) {
    case "timer":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "calc":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="16" y1="14" x2="16" y2="18" />
          <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
        </svg>
      );
    case "sync":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "score":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "solution":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "mobile":
      return (
        <svg className="h-5 w-5 text-blue-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
  }
}

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Select Your Subject Combination",
    description:
      "Choose Use of English alongside your 3 degree-specific electives across Science, Commercial, or Art faculties (e.g. Mathematics, Physics, Chemistry for Engineering; Biology, Chemistry, Physics for Medicine).",
  },
  {
    step: "02",
    title: "Sit Full Timed Mock Paper",
    description:
      "Navigate 180 standard questions using standard keyboard shortcuts (A, B, C, D, N for Next, P for Previous, S for Submit) or mobile taps under 120-minute countdown conditions.",
  },
  {
    step: "03",
    title: "Instant Scoring & Psychometric Review",
    description:
      "Submit your paper to receive an authoritative breakdown out of 400, identifying high-scoring subjects and highlighting specific syllabus areas requiring review.",
  },
  {
    step: "04",
    title: "Bridge to Targeted AI Drills",
    description:
      "Instantly convert missed questions into targeted 5-question reinforcement drills or launch virtual STEM lab simulations to master tricky formulas.",
  },
];

const FAQS = [
  {
    q: "Can I take CBT practice tests for free?",
    a: "Yes. Every registered candidate receives one full-length timed CBT practice session per day completely free, alongside complete syllabus topic summaries. Premium subscribers unlock unlimited daily attempts and advanced worked solution archives.",
  },
  {
    q: "What happens if my internet connection drops during an exam?",
    a: "Our CBT simulator features offline answer protection. Your responses are stored in your device's local memory continuously. When your network connection resumes, the queue syncs with the server without losing a single answer or elapsed timer second.",
  },
  {
    q: "Are the questions authentic past questions or random questions?",
    a: "Questions are drawn strictly from verified Joint Admissions and Matriculation Board past examination series, curriculum-vetted model questions, and syllabus-aligned topic banks reviewed by Nigerian educators.",
  },
  {
    q: "Do I need to download or install a separate mobile app?",
    a: "No. BrainLab CBT runs smoothly directly inside standard web browsers on Android, iOS, Windows, Mac, and Linux. You can also add it to your home screen as a lightweight Progressive Web App (PWA).",
  },
];

export default function CbtProductPage() {
  return (
    <div className="public-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070e1b] dark:text-slate-100 transition-colors">
      {/* Breadcrumb & Navigation Pill */}
      <div className="border-b border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-[#091325]/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-cyan-400">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-blue-700 dark:hover:text-cyan-400">Products</Link>
            <span>/</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">CBT Practice</span>
          </div>
          <Link
            href="/cbt"
            className="font-bold text-blue-700 hover:text-blue-900 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Launch CBT Portal →
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a152b] py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(37,99,235,0.1),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Standard Examination CBT Engine
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.12]">
              Practise with purpose. <br />
              <span className="text-blue-700 dark:text-cyan-400">Master UTME timed conditions.</span>
            </h1>

            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg leading-relaxed">
              Sit authentic 4-subject combination practice exams formatted strictly to Joint Admissions and Matriculation Board standards. Gain speed, stamina, and confidence before you ever set foot inside the test centre.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <Link
                href="/cbt"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
              >
                Launch Free CBT Practice Test <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href="/syllabus"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
              >
                View Tested Subject Syllabi
              </Link>
            </div>

            {/* Spec Highlights */}
            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 dark:border-slate-800 text-xs">
              <div>
                <div className="text-lg font-black text-slate-900 dark:text-white">180 Questions</div>
                <div className="text-[11px] text-slate-500">Standard UTME paper size</div>
              </div>
              <div>
                <div className="text-lg font-black text-blue-700 dark:text-cyan-400">120 Minutes</div>
                <div className="text-[11px] text-slate-500">Authentic countdown clock</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">Offline Safe</div>
                <div className="text-[11px] text-slate-500">Zero data-loss protection</div>
              </div>
            </div>
          </div>

          {/* Interactive Visual Mock Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl dark:border-slate-800 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-xs font-mono">
                <span className="text-cyan-400 font-bold">JAMB UTME MOCK // 2026</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  01:42:18 REMAINING
                </span>
              </div>

              <div className="my-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Question 24 of 40 (Physics)</span>
                  <span className="rounded bg-blue-950 px-2 py-0.5 text-cyan-300 font-bold">Kinematics</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-200">
                  A stone is projected horizontally with an initial speed of 15 m/s from the top of a cliff 45 m high. Calculate the horizontal distance travelled by the stone before it strikes the ground. [Take g = 10 m/s²]
                </p>

                <div className="space-y-2 pt-2 text-xs">
                  {["A. 30.0 m", "B. 45.0 m", "C. 60.0 m", "D. 90.0 m"].map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                        i === 1
                          ? "border-cyan-500 bg-cyan-950/40 text-cyan-200 font-bold"
                          : "border-slate-800 bg-slate-800/40 text-slate-300"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">
                        {i === 1 ? "●" : ""}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="16" y1="14" x2="16" y2="18" />
                  </svg>
                  <span>Calculator Ready</span>
                </span>
                <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                  <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Answer Saved Locally</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture - Compact Alternating Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/60 px-4 py-1.5 text-xs font-bold text-blue-700 dark:text-cyan-300 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
              <span>CORE CBT ENGINE CAPABILITIES</span>
            </div>
            <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight sm:text-4xl">
              Engineered for Nigerian CBT Realities
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
              Exam preparation is about more than multiple-choice questions. It requires authentic timing, anti-panic familiarity, and network resilience.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {/* Row 1: Authentic 2-Hour Countdown & 8-Key Controls (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-blue-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 dark:border-blue-700/60 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-cyan-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Official UTME Timing &amp; Pacing</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Authentic 2-Hour Countdown &amp; 8-Key Hardware Controls
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Practise with strict examination pacing. The timer replicates Joint Admissions and Matriculation Board standards, training you to allocate minutes efficiently across English and your three elective papers.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>180 questions across 4 subjects under strict 120-minute countdown</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Physical 8-key shortcuts: [A, B, C, D] options and [P, N, R, S] navigation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-cyan-400 text-xs font-bold">✓</span>
                      <span>Built-in on-screen scientific calculator with drag-and-minimize capabilities</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/cbt"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Launch Free CBT Practice Test</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-blue-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          JAMB TERMINAL HUD
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                        118:24
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
                      <span className="py-1 rounded bg-blue-600 text-white font-bold">ENG (60)</span>
                      <span className="py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">BIO (40)</span>
                      <span className="py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">CHM (40)</span>
                      <span className="py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">PHY (40)</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Question 24 of 40 (Physics)</span>
                        <span className="text-cyan-300 font-bold">Projectiles</span>
                      </div>
                      <p className="text-xs text-slate-200">
                        A ball is projected horizontally at 15 m/s from a cliff 45 m high. Find the horizontal range.
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                        <span className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300">A. 30.0 m</span>
                        <span className="p-1 rounded bg-cyan-950 border border-cyan-600 text-cyan-300 font-bold">B. 45.0 m ✓</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      <span>Keycaps: [P] Prev &bull; [N] Next</span>
                      <span className="text-cyan-300 font-bold">[S] Submit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Low-Data Offline Protection (Visual Preview Left, Text Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-emerald-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Visual Preview Side (Span 5 - Order 2 on mobile, Order 1 on desktop) */}
                <div className="lg:col-span-5 order-2 lg:order-1">
                  <div className="rounded-2xl border border-emerald-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          OFFLINE RELIABILITY
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                        ACTIVE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center font-mono">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">IndexedDB Cache</div>
                        <div className="text-base font-black text-emerald-400 mt-0.5">180 / 180</div>
                        <div className="text-[10px] text-slate-500">Fully Cached</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Network Lost</div>
                        <div className="text-base font-black text-cyan-400 mt-0.5">0 Answers Lost</div>
                        <div className="text-[10px] text-slate-500">Auto-Queued</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-[11px] font-mono text-emerald-200">
                      ✓ Instant client reconciliation when cellular or Wi-Fi reconnects
                    </div>
                  </div>
                </div>

                {/* Text Side (Span 7 - Order 1 on mobile, Order 2 on desktop) */}
                <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Offline-First Architecture</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Low-Data Offline Answer Auto-Sync
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Fluctuating Nigerian 3G/4G or sudden cybercafé power cuts won&apos;t wipe your paper. Responses are cached locally in your browser storage and automatically sync to the server once reconnected.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Under 1.2 MB total client bundle: zero remote font downloads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Encrypted IndexedDB storage protects your answers from sudden battery death</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>
                      <span>Runs smoothly on budget Android phones, cybercafé PCs, and laptops</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/about"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>Explore System Specifications</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Standardized 400-Mark Diagnostic Scoring (Text Left, Visual Preview Right) */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-6 sm:p-8 lg:p-10 shadow-sm transition hover:border-purple-400/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Text Side (Span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-300 dark:border-purple-700/60 bg-purple-50 dark:bg-purple-950/70 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span>Instant Psychometric Review</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                    Standardized 400-Mark Diagnostic Scoring &amp; Proofs
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    Get instant score breakdowns by subject immediately upon submission, with percentile benchmarks showing exactly where you stand among thousands of candidates nationwide.
                  </p>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Immediate 4-subject aggregate scoring with university tier comparison</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Step-by-step worked solutions and examiner distractor derivations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-bold">✓</span>
                      <span>Instant bridge to targeted 5-question Socratic reinforcement drills</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      href="/syllabus"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition active:scale-95"
                    >
                      <span>View Tested Subject Syllabi</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Visual Preview Side (Span 5) */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-purple-900/40 bg-slate-950 p-5 text-white shadow-lg space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                          DIAGNOSTIC SCORECARD
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                        294 / 400
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span>Use of English (60 Qs)</span>
                        <span className="text-cyan-400 font-bold">74%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span>Mathematics (40 Qs)</span>
                        <span className="text-emerald-400 font-bold">82%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span>Physics (40 Qs)</span>
                        <span className="text-amber-400 font-bold">68%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span>Chemistry (40 Qs)</span>
                        <span className="text-cyan-400 font-bold">70%</span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 bg-purple-950/40 p-2.5 rounded-xl border border-purple-900/60 flex items-center justify-between">
                      <span>Admission Target: UNILAG Engineering</span>
                      <span className="text-emerald-400 font-bold">Competitive ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Examination Workflow */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#0a152b]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              From Practice to Verified Mastery
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              How a student uses the CBT simulator to identify blind spots and systematically raise their target aggregate score.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((wf, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50 space-y-3"
              >
                <span className="text-3xl font-black text-blue-600/30 dark:text-cyan-400/30 font-mono">
                  {wf.step}
                </span>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  {wf.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {wf.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product FAQs */}
      <section className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Frequently Asked Questions About CBT Practice
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Clear answers on daily limits, offline behavior, and syllabus coverage.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-2"
              >
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {faq.q}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-[#070e1b]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
            Ready to test your readiness under real exam pressure?
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            No credit card required. Start your first timed 4-subject practice exam in minutes and discover your baseline score.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3.5 pt-2">
            <Link
              href="/cbt"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 active:scale-95"
            >
              Start Free Practice Test Now →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
            >
              Explore Unlimited Pro Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
