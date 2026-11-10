"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { isCurrentUserAdmin } from "@/app/lib/subscriptionEntitlements";
import { trackEvent } from "@/app/lib/analytics";

interface CohortProgramme {
  id: string;
  programme_name: string;
  programme_code: string;
  exam_category: string;
  academic_session: string;
  start_date: string;
  end_date: string;
  description: string;
  enrolment_fee_kobo: number;
  currency: string;
  is_enrolment_open: boolean;
}

const FALLBACK_PROGRAMMES: CohortProgramme[] = [
  {
    id: "prog-utme-2027",
    programme_name: "UTME 2027 Intensive Accelerator Cohort",
    programme_code: "APEX-UTME-2027",
    exam_category: "UTME",
    academic_session: "2026/2027",
    start_date: "2026-12-01",
    end_date: "2027-04-30",
    description: "Daily live subject masterclasses, dedicated tutors, assigned weekly syllabus roadmaps, and monitored JAMB mock sprints.",
    enrolment_fee_kobo: 500000,
    currency: "NGN",
    is_enrolment_open: true,
  },
  {
    id: "prog-post-utme-2027",
    programme_name: "Post-UTME University Screening Cohort",
    programme_code: "APEX-PUTME-2027",
    exam_category: "POST_UTME",
    academic_session: "2026/2027",
    start_date: "2027-05-01",
    end_date: "2027-08-31",
    description: "Institution-specific university aptitude clinics, past screening papers, interview coaching, and cut-off score strategy.",
    enrolment_fee_kobo: 500000,
    currency: "NGN",
    is_enrolment_open: true,
  },
];

export default function ApexCohortPage() {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<CohortProgramme[]>(FALLBACK_PROGRAMMES);
  const [selectedProg, setSelectedProg] = useState<CohortProgramme>(FALLBACK_PROGRAMMES[0]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isApexEnrolled, setIsApexEnrolled] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user;

        if (currentUser && active) {
          setUser(currentUser);

          const admin = await isCurrentUserAdmin(currentUser.id);
          if (admin) setIsAdminUser(true);

          // Check if user already holds an active Apex enrolment
          const { data: enrolments } = await supabase
            .from("apex_enrolments")
            .select("id, status, end_date")
            .eq("student_id", currentUser.id)
            .eq("status", "active")
            .limit(1);

          if (enrolments && enrolments.length > 0) {
            setIsApexEnrolled(true);
          }
        }

        // Fetch live programmes from database
        const { data: dbProgrammes } = await supabase
          .from("cohort_programmes")
          .select("*")
          .eq("is_enrolment_open", true)
          .order("created_at", { ascending: true });

        if (active && dbProgrammes && dbProgrammes.length > 0) {
          setProgrammes(dbProgrammes);
          setSelectedProg(dbProgrammes[0]);
        }
      } catch {
        // Fallbacks remain active
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const handleStartEnrolment = async (prog: CohortProgramme) => {
    trackEvent("enrolment_started", {
      programme_id: prog.id,
      programme_code: prog.programme_code,
      fee_naira: Math.round(prog.enrolment_fee_kobo / 100),
    });

    if (isAdminUser) {
      router.push("/classroom");
      return;
    }

    if (!user) {
      router.push(`/login?next=${encodeURIComponent("/apex")}`);
      return;
    }

    setEnrolling(true);
    setEnrolError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      // Initialize payment for Apex Cohort enrolment
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: "plus", // Maps to cohort pricing tier
          returnUrl: "/classroom",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "Failed to initialize enrolment checkout.");
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        router.push("/classroom");
      }
    } catch (err) {
      setEnrolError(err instanceof Error ? err.message : "Network error during checkout.");
      setEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 border-b border-indigo-950/80 bg-gradient-to-b from-[#070b16] via-[#0c142b] to-slate-950">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-blue-600/15 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-indigo-300 backdrop-blur-md mb-6 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>🏛️ APEX COHORT • GUIDED EDUCATIONAL PROGRAMME</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl max-w-4xl mx-auto leading-[1.1]">
            Ready for a More Intensive <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-400">
              Learning Experience?
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Join Apex Cohort for structured tutorials, dedicated tutors, guided learning and continuous academic support.
          </p>

          {/* Value Prop Status Badge */}
          {isApexEnrolled ? (
            <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 px-6 py-3 text-sm font-bold text-emerald-300">
              <span>✓ You are actively enrolled in Apex Cohort.</span>
              <Link href="/classroom" className="text-white underline hover:text-emerald-200">
                Enter Cohort Classroom &rarr;
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#programmes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-400 hover:to-blue-500 transition"
              >
                <span>Select Your Cohort Programme</span>
                <span>&darr;</span>
              </a>
              <Link
                href="/cbt"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 px-6 py-4 text-base font-bold text-slate-300 transition"
              >
                <span>Explore Free CBT Practice (₦0)</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Philosophy Statement: Not a Paywall, an Educational Programme */}
      <section className="py-14 border-b border-slate-800/80 bg-slate-900/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">
            The BrainLab Educational Commitment
          </h2>
          <p className="text-xl sm:text-2xl font-bold text-slate-200 leading-snug">
            &ldquo;BrainLab is an educational platform, not a subscription website. Apex Cohort is an intensive educational programme delivered through the platform, not a paywall around it.&rdquo;
          </p>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
            Every registered learner retains complete, free access to CBT practice, past question banks, Learning Hub syllabus materials, and Competition Arena battles. Apex students receive intensive teaching, structured timetables, and personal accountability.
          </p>
        </div>
      </section>

      {/* The 5 Pillars of Apex Cohort */}
      <section className="py-20 border-b border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
              WHY APEX COHORT DELIVERS RESULTS
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              Sell the Experience, Not Restrictions
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base">
              Five core academic pillars designed to guide candidates through rigorous preparation to exceptional examination scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-5">
                👨‍🏫
              </div>
              <h3 className="text-xl font-bold text-white">Intensive Live Teaching</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Structured, scheduled subject-by-subject live interactive masterclasses led by vetted subject matter experts. Real-time Q&A, derivations, and problem breakdowns.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-2xl mb-5">
                🗺️
              </div>
              <h3 className="text-xl font-bold text-white">Structured Academic Roadmap</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                No guessing what to read next. Receive an assigned weekly curriculum schedule covering all required topics with checkpoints and milestone targets.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mb-5">
                📊
              </div>
              <h3 className="text-xl font-bold text-white">Performance Monitoring &amp; Interventions</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Dedicated tutors review your mock results, pinpoint subtopic weaknesses, and assign targeted corrective exercises before exam day.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-5">
                👥
              </div>
              <h3 className="text-xl font-bold text-white">Cohort Peer Community</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Surround yourself with ambitious candidates aiming for premier faculties. Participate in cohort study groups, collaborative quizzes, and sprint challenges.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-5">
                📹
              </div>
              <h3 className="text-xl font-bold text-white">Full Recorded Lesson Library</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Never worry about missed sessions. Access complete lesson replays, downloadable summary notes, formula reference sheets, and worked solutions 24/7.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-5">
                🎯
              </div>
              <h3 className="text-xl font-bold text-white">Special Cohort Mocks</h3>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Timed, invigilated cohort-wide simulations reflecting the exact difficulty, trick questions, and pacing of the national examinations with ranked psychometrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Matrix: Public vs Apex Cohort (Directive Section 3) */}
      <section className="py-20 border-b border-slate-800/80 bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Platform Access Comparison
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Clear distinction between independent learning and guided cohort instruction.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/70 shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-4 px-6">Feature / Capability</th>
                  <th className="py-4 px-6 text-emerald-400">Public (Free, ₦0)</th>
                  <th className="py-4 px-6 text-indigo-400">Apex Cohort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">CBT Practice</td>
                  <td className="py-3.5 px-6 text-emerald-400 font-bold">Full Access</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Question Bank &amp; Solutions</td>
                  <td className="py-3.5 px-6 text-emerald-400 font-bold">Full Access</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">AI Tutor Support</td>
                  <td className="py-3.5 px-6 text-slate-400">Fair-Use Limits</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Enhanced Priority Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Learning Hub Curriculum</td>
                  <td className="py-3.5 px-6 text-slate-400">Open Resources</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Guided Learning Modules</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Curriculum Roadmap</td>
                  <td className="py-3.5 px-6 text-slate-400">Basic Self-Paced</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Structured Assigned Curriculum</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Progress Tracking</td>
                  <td className="py-3.5 px-6 text-slate-400">Self-Tracking Dashboard</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Tutor-Monitored &amp; Interventions</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Assignments &amp; Drills</td>
                  <td className="py-3.5 px-6 text-slate-400">General Practice</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Scheduled Weekly Assignments</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Mock Examinations</td>
                  <td className="py-3.5 px-6 text-emerald-400 font-bold">General Mocks</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Special Cohort Invigilated Mocks</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Live Classes &amp; Stages</td>
                  <td className="py-3.5 px-6 text-slate-400">Public Open Sessions</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Intensive Scheduled Classes</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Recorded Lesson Archives</td>
                  <td className="py-3.5 px-6 text-slate-400">Selected Highlights</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Full Cohort Lesson Library</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Tutor Guidance</td>
                  <td className="py-3.5 px-6 text-slate-400">General Support Channels</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Dedicated Tutor Guidance</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">STEM Studio Virtual Labs</td>
                  <td className="py-3.5 px-6 text-emerald-400 font-bold">Public Experiences</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Expanded Guided Experiences</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Competition Arena</td>
                  <td className="py-3.5 px-6 text-emerald-400 font-bold">Open Participation</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Special Cohort Challenges</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Academic Reports</td>
                  <td className="py-3.5 px-6 text-slate-400">Personal Dashboard</td>
                  <td className="py-3.5 px-6 text-indigo-300 font-bold">Detailed Tutor Reports</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enrolment Programme Selection Section */}
      <section id="programmes" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
              AVAILABLE PROGRAMMES
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              Choose Your Examination Track
            </h2>
            <p className="mt-3 text-slate-300 text-sm">
              Enrolments are scoped to your target academic session and exam cycle.
            </p>
          </div>

          {enrolError && (
            <div className="mb-8 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-center text-sm font-semibold text-red-200">
              {enrolError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {programmes.map((prog) => {
              const isSelected = selectedProg.id === prog.id;
              const feeNaira = Math.round(prog.enrolment_fee_kobo / 100);

              return (
                <div
                  key={prog.id}
                  onClick={() => setSelectedProg(prog)}
                  className={`cursor-pointer rounded-3xl p-8 border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/40 shadow-xl shadow-indigo-500/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-black uppercase text-indigo-300 border border-indigo-400/30">
                        {prog.exam_category} • {prog.academic_session}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-indigo-400" />
                          Selected
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-2xl font-bold text-white">
                      {prog.programme_name}
                    </h3>

                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                      {prog.description}
                    </p>

                    <div className="mt-6 pt-6 border-t border-slate-800">
                      <div className="text-xs text-slate-400">Programme Enrolment Fee</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">
                          ₦{feeNaira.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/ session track</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    <button
                      type="button"
                      disabled={enrolling}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProg(prog);
                        void handleStartEnrolment(prog);
                      }}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:from-indigo-400 hover:to-blue-500 transition disabled:opacity-50"
                    >
                      {enrolling && isSelected ? "Initializing Enrolment…" : `Enrol in ${prog.exam_category} Track →`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center text-xs text-slate-500">
            Have questions about timetable schedules, tutors, or payment methods?{" "}
            <Link href="/contact" className="text-indigo-400 underline hover:text-indigo-300">
              Speak with an Academic Advisor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
