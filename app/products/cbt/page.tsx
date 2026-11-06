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

const FEATURES = [
  {
    icon: "⏱️",
    title: "Authentic 2-Hour Countdown & Timing",
    description:
      "Practise with strict examination pacing. The timer replicates Joint Admissions and Matriculation Board standards, training you to allocate minutes efficiently across English and your three elective papers.",
  },
  {
    icon: "🧮",
    title: "Built-In On-Screen Scientific Calculator",
    description:
      "Never scramble for external tools. Our integrated digital calculator is accessible during Physics, Chemistry, and Mathematics calculations. You can drag, minimize, or close it anytime.",
  },
  {
    icon: "💾",
    title: "Low-Data Offline Answer Auto-Sync",
    description:
      "Fluctuating Nigerian 3G/4G or sudden cybercafé power cuts won't wipe your paper. Responses are cached locally in your browser storage and automatically sync to the server once reconnected.",
  },
  {
    icon: "📊",
    title: "Standardized 400-Mark Diagnostic Scoring",
    description:
      "Get instant score breakdowns by subject immediately upon submission, with percentile benchmarks showing exactly where you stand among thousands of candidates nationwide.",
  },
  {
    icon: "🔍",
    title: "Step-by-Step Worked Solutions & Corrections",
    description:
      "Don't just see which answers were wrong — understand why. Review complete mathematical proofs, grammatical explanations, and conceptual breakdowns for every single question.",
  },
  {
    icon: "📱",
    title: "Responsive Mobile & Cybercafé Terminal Support",
    description:
      "Engineered mobile-first to glide on budget Android touchscreens, laptops, and older cybercafé desktop terminals without freezing, memory leaks, or heavy bundle downloads.",
  },
];

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
                <span className="flex items-center gap-1">
                  <span>🧮</span> Calculator Ready
                </span>
                <span className="text-emerald-400 font-bold">✓ Answer Saved Locally</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Engineered for Nigerian CBT Realities
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Exam preparation is about more than multiple-choice questions. It requires authentic timing, anti-panic familiarity, and network resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950/60">
                  {feat.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                  {feat.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {feat.description}
                </p>
              </div>
            ))}
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
