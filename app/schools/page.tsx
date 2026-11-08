"use client";
import { trackEvent } from "@/app/lib/analytics";

import { useState, useEffect } from "react";
import { getFooterConfig } from "../lib/platformConfig";
import { getWhatsAppChatUrl, normalizeDialPhone, DEFAULT_SUPPORT_PHONE, DEFAULT_WHATSAPP_NUMBER } from "../lib/whatsapp";
import Link from "next/link";
import { toast } from "../lib/toast";

/* -------------------------------------------------------------------------
   Types & Presets
------------------------------------------------------------------------- */
interface LicenseTier {
  name: string;
  minStudents: number;
  maxStudents: number;
  termlyRatePerHead: number;
  annualRatePerHead: number;
  badge: string;
  features: string[];
}

const TIERS: LicenseTier[] = [
  {
    name: "Standard Centre",
    minStudents: 30,
    maxStudents: 100,
    termlyRatePerHead: 1500,
    annualRatePerHead: 3200,
    badge: "Ideal for Tutorial Centres",
    features: [
      "Access to 2000-2026 JAMB & WAEC past question bank",
      "Offline-resilient exam runtime (no network drops)",
      "Standard instant grading and online score cards",
      "Bulk candidate upload via CSV",
      "Printable examination login slips",
    ],
  },
  {
    name: "Premier Academy",
    minStudents: 101,
    maxStudents: 500,
    termlyRatePerHead: 1200,
    annualRatePerHead: 2700,
    badge: "Most Popular for Secondary Schools",
    features: [
      "Everything in Standard Centre",
      "School Crest & Principal signature on PDF report slips",
      "Strict anti-malpractice lockdown mode",
      "Teacher subject diagnostic & question difficulty metrics",
      "Custom internal mock examinations & teacher authoring",
      "Priority WhatsApp technical support during mock sessions",
    ],
  },
  {
    name: "Collegiate / Multi-Campus",
    minStudents: 501,
    maxStudents: 3000,
    termlyRatePerHead: 950,
    annualRatePerHead: 2100,
    badge: "Enterprise & Group of Schools",
    features: [
      "Everything in Premier Academy",
      "Multi-campus centralized reporting dashboard",
      "Custom white-labeled domain (e.g. cbt.yourschool.edu.ng)",
      "Dedicated BrainLab Technical Proctor assigned to live exams",
      "API integration with existing School Portal / ERP",
      "Custom Post-UTME screening workflows",
    ],
  },
];

export default function SchoolsPage() {
  // State: License Estimator
  const [studentCount, setStudentCount] = useState<number>(150);
  const [billingCycle, setBillingCycle] = useState<"termly" | "annual">("termly");

  // State: Mock Simulator
  const [simSchoolName, setSimSchoolName] = useState<string>("Apex Model College");
  const [simExamType, setSimExamType] = useState<string>("JAMB UTME Mock (4 Subjects)");
  const [simLockdown, setSimLockdown] = useState<boolean>(true);
  const [simBatchCount, setSimBatchCount] = useState<number>(3);

  // State: Inquiry Form
  const [inquirySchool, setInquirySchool] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryLocation, setInquiryLocation] = useState("");
  const [inquiryCount, setInquiryCount] = useState("100-300 students");
  const [inquiryExam, setInquiryExam] = useState("JAMB UTME Mocks");
  const [inquiryNotes, setInquiryNotes] = useState("");
  const [inquiryHoneypot, setInquiryHoneypot] = useState("");
  const [inquiryConsent, setInquiryConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; ref?: string; message?: string } | null>(null);
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);
  const [supportPhoneDial, setSupportPhoneDial] = useState(() => normalizeDialPhone(DEFAULT_SUPPORT_PHONE));
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  useEffect(() => {
    let mounted = true;
    void getFooterConfig().then((cfg) => {
      if (!mounted || !cfg) return;
      if (cfg.support_phone) {
        setSupportPhone(cfg.support_phone);
        setSupportPhoneDial(normalizeDialPhone(cfg.support_phone));
      }
      if (cfg.whatsapp_number) {
        setWhatsappNumber(cfg.whatsapp_number);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Active tier calculation
  const activeTier =
    studentCount <= 100
      ? TIERS[0]
      : studentCount <= 500
      ? TIERS[1]
      : TIERS[2];

  const ratePerHead =
    billingCycle === "termly" ? activeTier.termlyRatePerHead : activeTier.annualRatePerHead;
  const totalCost = studentCount * ratePerHead;

  // Handle CSV Download
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "Candidate_ID,Full_Name,Class,Department,Subject_1,Subject_2,Subject_3,Subject_4\n" +
      "BL-STU-001,Adebayo Chioma,SS3,Science,English Language,Mathematics,Physics,Chemistry\n" +
      "BL-STU-002,Ibrahim Chukwuma,SS3,Commercial,English Language,Mathematics,Economics,Financial Accounting\n" +
      "BL-STU-003,Okonkwo Aisha,SS3,Arts,English Language,Literature in English,Government,Christian Religious Studies\n" +
      "BL-STU-004,Musa Tunde,SS3,Science,English Language,Mathematics,Biology,Chemistry\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "brainlab_school_candidate_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit Inquiry Form
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquirySchool || !inquiryName || !inquiryEmail || !inquiryPhone) {
      toast.error("Please fill in the school name, contact person, email, and phone number.");
      return;
    }

    if (!inquiryConsent) {
      toast.error("Please agree to the Nigeria Data Protection Act (NDPA) privacy terms before submitting.");
      return;
    }
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/schools/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: inquirySchool,
          contactName: inquiryName,
          email: inquiryEmail,
          phone: inquiryPhone,
          location: inquiryLocation,
          studentCount: inquiryCount,
          examType: inquiryExam,
          notes: inquiryNotes,
          website_url_hp: inquiryHoneypot,
          consentNdpa: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        trackEvent("school_enquiry_submitted", {
          exam_type: inquiryExam,
          student_cohort: inquiryCount,
        });
        setSubmitResult({
          ok: true,
          ref: data.referenceCode,
          message: data.message,
        });
      } else {
        setSubmitResult({
          ok: false,
          message: data.error || "Unable to submit inquiry. Please try again.",
        });
      }
    } catch {
      setSubmitResult({
        ok: false,
        message: "Connection failed. We could not automatically transmit your inquiry. Please reach our Academic Partnership Team directly via WhatsApp or email below.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#000814] dark:text-slate-100">
      {/* -------------------------------------------------------------------
          1. Hero Section
      ------------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-blue-900/40 bg-[#00112b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-950/60 px-3.5 py-1.5 text-xs font-semibold text-sky-300 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              Institutional CBT &amp; Multi-Lab Suite
            </span>

            <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              Power Your School With Stress-Free, Offline-Resilient CBT.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-8">
              Deploy standard JAMB UTME, WAEC, NECO and custom internal mock exams across your
              school computer laboratories. Zero internet hiccups, automated grading, branded PDF
              result slips, and deep subject teacher analytics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#inquiry"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-95"
              >
                Request School Demo &amp; Pilot
              </a>
              <a
                href="#pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
              >
                Calculate School Licensing →
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-8 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-black text-sky-400 sm:text-3xl">99.98%</p>
                <p className="mt-1 text-xs text-slate-400">Exam session uptime with local caching</p>
              </div>
              <div>
                <p className="text-2xl font-black text-sky-400 sm:text-3xl">100%</p>
                <p className="mt-1 text-xs text-slate-400">Official JAMB/WAEC question compliance</p>
              </div>
              <div>
                <p className="text-2xl font-black text-sky-400 sm:text-3xl">&lt; 3 Secs</p>
                <p className="mt-1 text-xs text-slate-400">Instant PDF report slip generation</p>
              </div>
              <div>
                <p className="text-2xl font-black text-sky-400 sm:text-3xl">Zero</p>
                <p className="mt-1 text-xs text-slate-400">Expensive local server hardware needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          2. Interactive School Pricing & Seat Calculator
      ------------------------------------------------------------------- */}
      <section id="pricing" className="border-b border-slate-200/80 bg-white py-16 transition-colors dark:border-slate-800/80 dark:bg-[#00112b]/60 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
              Institutional Calculator
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Transparent, Per-Candidate School Licensing
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Slide to the number of students in your school or tutorial centre to see immediate
              volume discounts and package capabilities.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-12 items-start">
            {/* Interactive Controls (7 cols) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-7 sm:p-8">
              {/* Billing Toggle */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Select License Duration:
                </span>
                <div className="inline-flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("termly")}
                    className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                      billingCycle === "termly"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-blue-600 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    1 Term / Mock
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`relative rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                      billingCycle === "annual"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-blue-600 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    Full Session (3 Terms)
                    <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      Save 25%
                    </span>
                  </button>
                </div>
              </div>

              {/* Slider for student count */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <label htmlFor="studentSlider" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Number of Registered Candidates:
                  </label>
                  <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-black text-blue-900 dark:bg-sky-950 dark:text-sky-300">
                    {studentCount.toLocaleString()} Candidates
                  </span>
                </div>

                <input
                  id="studentSlider"
                  type="range"
                  min="30"
                  max="1500"
                  step="10"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="mt-4 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-blue-600 dark:bg-slate-700"
                />

                <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>30 (Small Cohort)</span>
                  <span>250 (Mid Academy)</span>
                  <span>500 (Large School)</span>
                  <span>1,500+ (Multi-Campus)</span>
                </div>
              </div>

              {/* Active Tier Summary Card */}
              <div className="mt-8 rounded-xl border border-blue-200/60 bg-blue-50/50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                      {activeTier.badge}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {activeTier.name} Package
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Effective Rate</p>
                    <p className="text-lg font-black text-blue-700 dark:text-sky-400">
                      ₦{ratePerHead.toLocaleString()}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        /candidate
                      </span>
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 border-t border-blue-100 pt-4 text-xs text-slate-700 dark:border-blue-900/40 dark:text-slate-300">
                  {activeTier.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Estimated Total Invoice Box (5 cols) */}
            <div className="rounded-2xl border-2 border-blue-600/30 bg-white p-6 shadow-xl dark:border-blue-500/40 dark:bg-[#00112b] lg:col-span-5 sm:p-8">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-sky-400">
                Licensing Estimate
              </span>

              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {billingCycle === "termly" ? "One Term Examination License" : "Annual Full-Session License"}
              </h3>

              <div className="mt-6 rounded-xl bg-slate-50 p-5 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Investment</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white">
                    ₦{totalCost.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ({studentCount} students × ₦{ratePerHead.toLocaleString()})
                  </span>
                </div>
                {billingCycle === "annual" && (
                  <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Includes 25% full-session institutional discount
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Candidate Login PIN Slips:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Included (PDF)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lab Supervisor Dashboard:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>School Crest on Report Cards:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Included</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payment Channels:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Bank Transfer / Bachs / Invoicing</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <a
                  href="#inquiry"
                  className="w-full inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95"
                >
                  Request Official Invoice &amp; Pilot
                </a>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4 text-blue-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Candidate CSV Roster Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          3. Interactive Mock Exam Deployment Simulator
      ------------------------------------------------------------------- */}
      <section className="border-b border-slate-200/80 bg-slate-50/50 py-16 transition-colors dark:border-slate-800/80 dark:bg-[#000814] sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
              Interactive Lab Simulator
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Preview Your School’s Branded Mock Session
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Test how BrainLab tailors the exam interface, lockdown security, and scorecards for your
              school before rolling it out to your students.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-12 items-start">
            {/* Simulator Controls (5 cols) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-5 sm:p-7">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Exam Configuration Panel
              </h3>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    School / Centre Name:
                  </label>
                  <input
                    type="text"
                    value={simSchoolName}
                    onChange={(e) => setSimSchoolName(e.target.value)}
                    placeholder="e.g. Apex Model College, Lagos"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mock Target Curriculum:
                  </label>
                  <select
                    value={simExamType}
                    onChange={(e) => setSimExamType(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="JAMB UTME Mock (4 Subjects)">JAMB UTME Mock (4 Subjects, 120 Mins)</option>
                    <option value="WAEC SSCE Comprehensive Mock">WAEC SSCE Comprehensive Mock (Obj + Theory)</option>
                    <option value="NECO SSCE Terminal Mock">NECO SSCE Terminal Mock</option>
                    <option value="Internal Mid-Term CBT Test">Internal Mid-Term CBT Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Number of Computer Lab Batches:
                  </label>
                  <div className="mt-1.5 flex items-center gap-3">
                    {[1, 2, 3, 5].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSimBatchCount(b)}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                          simBatchCount === b
                            ? "bg-blue-600 text-white shadow-xs"
                            : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {b} {b === 1 ? "Batch" : "Batches"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simLockdown}
                      onChange={(e) => setSimLockdown(e.target.checked)}
                      className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Enforce Anti-Malpractice Browser Lockdown (Tab switch penalties)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Visual Mock Preview (7 cols) */}
            <div className="rounded-2xl border border-blue-900/30 bg-[#00112b] p-6 text-white shadow-xl lg:col-span-7 sm:p-8">
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">
                    🏫
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      Live Candidate Terminal Preview
                    </p>
                    <h4 className="text-sm font-extrabold text-white">
                      {simSchoolName || "Your School Name"}
                    </h4>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                  ● Lab Ready
                </div>
              </div>

              {/* Simulated Exam Header Bar */}
              <div className="mt-6 rounded-xl bg-[#000814]/80 p-4 border border-blue-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Candidate: </span>
                    <span className="font-semibold text-white">BL-0248 • Chioma Adebayo</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Exam: </span>
                    <span className="font-semibold text-sky-300">{simExamType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Batch: </span>
                    <span className="font-semibold text-amber-400">Session 01 of {simBatchCount}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-300">Offline Cache: Synchronized</span>
                  </div>
                  <div className="font-mono text-amber-300 font-bold">
                    ⏱ 01:58:45 Remaining
                  </div>
                </div>
              </div>

              {/* Simulated Printable PDF Score Slip Preview */}
              <div className="mt-6 rounded-xl bg-white p-5 text-slate-900 shadow-md">
                <div className="border-b border-slate-200 pb-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Official Mock Examination Report Slip
                  </p>
                  <p className="text-sm font-black text-slate-950">
                    {simSchoolName || "Your School Name"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Session 2025/2026 • Powered by BrainLab CBT Engine
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">English</p>
                    <p className="font-bold text-blue-700">78 / 100</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Mathematics</p>
                    <p className="font-bold text-blue-700">84 / 100</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Physics</p>
                    <p className="font-bold text-blue-700">76 / 100</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Chemistry</p>
                    <p className="font-bold text-blue-700">82 / 100</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                  <span className="font-bold text-slate-700">Aggregate Score:</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-black text-emerald-800">
                    320 / 400 (Top 2% Nationally)
                  </span>
                </div>
              </div>

              {simLockdown && (
                <p className="mt-4 text-center text-xs text-sky-300">
                  🛡️ Active Security: Anti-tab switching and screen minimisation traps enabled.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          4. Three-Step Institutional Rollout Architecture
      ------------------------------------------------------------------- */}
      <section className="border-b border-slate-200/80 bg-white py-16 transition-colors dark:border-slate-800/80 dark:bg-[#00112b]/60 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
              Simple Deployment
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Zero Server Installation. Ready In 3 Steps.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              You do not need to purchase an expensive local server or install cumbersome desktop
              software. BrainLab runs securely in any modern web browser.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                1
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Upload Student Roster
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Upload your students’ names and subject combinations using our simple Excel / CSV
                template. Instant account provisioning in seconds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                2
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Print Lab Access Slips
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Generate clean, printable slips containing unique 6-digit candidate PINs and lab
                seat allocations for each student.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                3
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                Conduct Exam &amp; Review
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Students enter their PIN on lab computers and start. Results score immediately with
                instant PDF report cards ready for parents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          5. Official Inquiry & Demo Booking Form
      ------------------------------------------------------------------- */}
      <section id="inquiry" className="py-16 sm:py-24 bg-slate-50 dark:bg-[#000814]">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="rounded-3xl border border-blue-200/80 bg-white p-7 shadow-xl dark:border-blue-900/50 dark:bg-[#00112b] sm:p-12">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/80 dark:text-sky-300">
                Institutional Partnership Desk
              </span>
              <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                Request an Institutional Pilot for Your School
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">
                Get a complimentary 20-candidate sandbox test in your computer lab, an official
                invoice, or schedule an in-person / virtual demonstration with our academic team.
              </p>
            </div>

            {submitResult && submitResult.ok ? (
              <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-800/80 dark:bg-emerald-950/40">
                <span className="text-4xl">🎉</span>
                <h3 className="mt-3 text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  Inquiry Received Successfully!
                </h3>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Your official tracking reference is:
                </p>
                <div className="mt-2 inline-block rounded-lg bg-emerald-200/70 px-4 py-1.5 font-mono text-sm font-extrabold text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100">
                  {submitResult.ref}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                  {submitResult.message}
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <a
                    href={getWhatsAppChatUrl(`Hello BrainLab Academic Desk, we just submitted an institutional request with Ref: ${submitResult.ref}`, whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-500"
                  >
                    Chat on WhatsApp with Desk
                  </a>
                  <button
                    type="button"
                    onClick={() => setSubmitResult(null)}
                    className="rounded-xl border border-emerald-600/40 px-5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200"
                  >
                    Submit Another Request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="mt-8 space-y-4">
                {submitResult && !submitResult.ok && (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-xs text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-200">
                    <div className="flex items-start gap-3">
                      <span className="text-xl leading-none">⚠️</span>
                      <div className="flex-1">
                        <p className="font-bold text-rose-950 dark:text-rose-100">Submission Notice</p>
                        <p className="mt-1 leading-relaxed text-rose-800 dark:text-rose-300">{submitResult.message}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={getWhatsAppChatUrl("Hello BrainLab Academic Desk, we encountered an issue submitting our institutional inquiry online and would like to connect directly.", whatsappNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-500"
                          >
                            💬 Chat Directly on WhatsApp
                          </a>
                          <a
                            href="mailto:support@brainlab.edu.ng?subject=Institutional%20Inquiry%20Direct%20Submission"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/60 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-rose-900 transition-colors hover:bg-white dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-100"
                          >
                            ✉️ Email Academic Desk
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      School / Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inquirySchool}
                      onChange={(e) => setInquirySchool(e.target.value)}
                      placeholder="e.g. Corona Secondary School"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Contact Person &amp; Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Academic Coordinator / Examination Officer"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="admin@yourschool.edu.ng"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      School Location (State/City)
                    </label>
                    <input
                      type="text"
                      value={inquiryLocation}
                      onChange={(e) => setInquiryLocation(e.target.value)}
                      placeholder="e.g. Lagos, Ikeja"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Candidate Count
                    </label>
                    <select
                      value={inquiryCount}
                      onChange={(e) => setInquiryCount(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="30-100 students">30 - 100 students</option>
                      <option value="101-300 students">101 - 300 students</option>
                      <option value="301-600 students">301 - 600 students</option>
                      <option value="600+ students">600+ students (Multi-Lab)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Target Exam Type
                    </label>
                    <select
                      value={inquiryExam}
                      onChange={(e) => setInquiryExam(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="JAMB UTME Mocks">JAMB UTME Mocks</option>
                      <option value="WAEC SSCE Prep">WAEC SSCE Prep</option>
                      <option value="Internal Terminal CBT">Internal Terminal CBT</option>
                      <option value="Full Comprehensive Suite">Full Comprehensive Suite</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Additional Requirements or Questions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    placeholder="Tell us about your computer lab setup, preferred mock dates, or any special requests..."
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="school_website_url_hp">Leave empty</label>
                  <input
                    id="school_website_url_hp"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={inquiryHoneypot}
                    onChange={(e) => setInquiryHoneypot(e.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={inquiryConsent}
                      onChange={(e) => setInquiryConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-blue-600 accent-blue-600"
                    />
                    <span>
                      <strong className="text-slate-900 dark:text-white">Institutional Authorization &amp; NDPA Consent:</strong> I confirm I am an authorized officer representing this school. I consent to BrainLab Academy processing this information under our NDPA 2023 Privacy Policy solely for mock delivery and school onboarding.
                    </span>
                  </label>
                </div>

                {/* Honeypot field (hidden from genuine users) */}
                <div style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={inquiryHoneypot}
                    onChange={(e) => setInquiryHoneypot(e.target.value)}
                  />
                </div>

                {/* NDPA 2023 Privacy Notice & Consent Checkbox */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={inquiryConsent}
                      onChange={(e) => setInquiryConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                    />
                    <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <strong>NDPA 2023 Consent:</strong> I agree that BrainLab Academy collects and processes our institutional contact details solely for evaluating this school request and providing CBT mock solutions in accordance with the Nigeria Data Protection Act 2023. Data is never shared with third parties.
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? "Submitting Inquiry..." : "Submit Institutional Request →"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Official responses are dispatched within 24 working hours. Strict confidentiality guaranteed.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          6. Institutional FAQs
      ------------------------------------------------------------------- */}
      <section className="border-t border-slate-200/80 bg-white py-16 transition-colors dark:border-slate-800/80 dark:bg-[#00112b]/40 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Answers for School Administrators &amp; ICT Directors
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 open:bg-white dark:open:bg-slate-900">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>Do we need dedicated internet on every lab computer during the entire exam?</span>
                <span className="ml-2 text-blue-600 dark:text-sky-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                No. BrainLab uses offline-tolerant session caching. Each candidate’s examination package is
                cryptographically loaded upon starting. If internet drops midway through the exam, students
                continue without interruption. Responses sync back to the cloud automatically once the connection
                re-establishes.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 open:bg-white dark:open:bg-slate-900">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>Can our subject teachers author and upload their own terminal questions?</span>
                <span className="ml-2 text-blue-600 dark:text-sky-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Yes! With the Premier Academy and Collegiate tiers, your school gains access to BrainLab’s
                Teacher Authoring Studio. Teachers can create multiple-choice questions, rich diagrams,
                and comprehension passages tailored strictly to your termly scheme of work.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 open:bg-white dark:open:bg-slate-900">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>How are results distributed to parents and students?</span>
                <span className="ml-2 text-blue-600 dark:text-sky-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Administrators can toggle instant release or withhold scores until official publication.
                Once released, individual PDF report cards can be batch-printed for physical distribution,
                or sent to parents via automated WhatsApp/SMS notifications.
              </p>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60 open:bg-white dark:open:bg-slate-900">
              <summary className="flex cursor-pointer items-center justify-between font-bold text-slate-900 dark:text-white text-sm">
                <span>Can we test BrainLab with a small group before paying?</span>
                <span className="ml-2 text-blue-600 dark:text-sky-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Absolutely. We provide an initial 20-candidate sandbox mock pass at no cost. You can
                experience candidate slip generation, lab loading, anti-cheat detection, and scorecard
                printing first-hand with your own students.
              </p>
            </details>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Need immediate assistance? Contact our institutional desk directly:
            </p>
            <div className="mt-3 flex justify-center gap-4 text-xs font-bold text-blue-600 dark:text-sky-400">
              <a href="mailto:support@brainlabacademy.com.ng" className="hover:underline">
                ✉ support@brainlabacademy.com.ng
              </a>
              <span>•</span>
              <a href={`tel:${supportPhoneDial}`} className="hover:underline">
                📞 {supportPhone}
              </a>
              <span>•</span>
              <Link href="/contact" className="hover:underline">
                Official Directory →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
