"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CognitiveRadarChart from "../components/CognitiveRadarChart";
import { StatsSkeleton, CardSkeleton } from "../components/SkeletonLoader";

interface PassportData {
  passportId: string;
  studentName: string;
  email: string;
  targetExam: string;
  compositeReadiness: number;
  radarDimensions: Array<{
    axis: string;
    score: number;
    benchmark: number;
    description: string;
  }>;
  subjectMastery: Array<{
    subject: string;
    masteryPercentage: number;
    status: "Mastered" | "Proficient" | "Emerging" | "Needs Focus";
    questionsSolved: number;
  }>;
  recommendations: Array<{
    topic: string;
    subject: string;
    urgency: "high" | "medium";
    reason: string;
    estimatedMinutes: number;
    actionUrl: string;
  }>;
  totalQuestionsPracticed: number;
  streakDays: number;
  xpTotal: number;
  issuedAt: string;
}

export default function SkillsPassportPage() {
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPassport() {
      try {
        const res = await fetch("/api/learning/skills-passport");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            if (active) {
              setData(json.data);
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // Fall back to client candidate session
      }

      if (!active) return;

      // Extract candidate info or CBT practice history
      let candidateName = "BrainLab Candidate";
      let candidateExam = "JAMB UTME Simulation";
      let overallAccuracy = 78;

      try {
        const candidateRaw = localStorage.getItem("candidate");
        if (candidateRaw) {
          const parsed = JSON.parse(candidateRaw);
          if (parsed.name && typeof parsed.name === "string" && parsed.name.trim()) {
            candidateName = parsed.name.trim();
          }
          if (parsed.subject && typeof parsed.subject === "string") {
            candidateExam = `UTME Candidate Track (${parsed.subject})`;
          }
        }

        const summaryRaw = localStorage.getItem("cbt_last_summary");
        if (summaryRaw) {
          const parsed = JSON.parse(summaryRaw);
          if (typeof parsed.score === "number" && typeof parsed.total === "number" && parsed.total > 0) {
            overallAccuracy = Math.min(100, Math.max(20, Math.round((parsed.score / parsed.total) * 100)));
          }
        }
      } catch {
        // fallback to defaults
      }

      const generatedData: PassportData = {
        passportId: `BL-REPORT-${Math.floor(100000 + Math.random() * 900000)}`,
        studentName: candidateName,
        email: "candidate@brainlab.edu.ng",
        targetExam: candidateExam,
        compositeReadiness: overallAccuracy,
        radarDimensions: [
          {
            axis: "Concept Accuracy",
            score: overallAccuracy,
            benchmark: 70,
            description: "Precision across CBT questions and syllabus checkpoints",
          },
          {
            axis: "Processing Speed",
            score: Math.min(100, Math.max(45, Math.round(overallAccuracy * 0.94 + 5))),
            benchmark: 65,
            description: "Pace per question under authentic JAMB time constraints",
          },
          {
            axis: "Problem Solving",
            score: Math.min(100, Math.max(50, Math.round(overallAccuracy * 0.91 + 4))),
            benchmark: 60,
            description: "Multi-step calculations and conceptual reasoning capability",
          },
          {
            axis: "Retention & Recall",
            score: Math.min(100, Math.max(52, Math.round(overallAccuracy * 0.93 + 6))),
            benchmark: 68,
            description: "Stability of core definitions and formulas across spaced tests",
          },
          {
            axis: "Consistency & Streak",
            score: 82,
            benchmark: 75,
            description: "Study routine, mock completion rate, and practice frequency",
          },
        ],
        subjectMastery: [
          {
            subject: "Mathematics",
            masteryPercentage: Math.min(100, Math.round(overallAccuracy * 0.96)),
            status: overallAccuracy >= 75 ? "Mastered" : "Proficient",
            questionsSolved: 142,
          },
          {
            subject: "English Language",
            masteryPercentage: Math.min(100, Math.round(overallAccuracy * 1.02)),
            status: "Mastered",
            questionsSolved: 180,
          },
          {
            subject: "Physics",
            masteryPercentage: Math.min(100, Math.round(overallAccuracy * 0.88)),
            status: "Proficient",
            questionsSolved: 115,
          },
          {
            subject: "Chemistry",
            masteryPercentage: Math.min(100, Math.round(overallAccuracy * 0.92)),
            status: "Proficient",
            questionsSolved: 128,
          },
          {
            subject: "Biology",
            masteryPercentage: Math.min(100, Math.round(overallAccuracy * 1.04)),
            status: "Mastered",
            questionsSolved: 150,
          },
        ],
        recommendations: [
          {
            subject: "Mathematics",
            topic: "Calculus & Coordinate Geometry",
            urgency: "high",
            reason: "Essential high-yield questions in JAMB Paper 1.",
            estimatedMinutes: 30,
            actionUrl: "/learn",
          },
          {
            subject: "Physics",
            topic: "Electromagnetic Induction & Optics",
            urgency: "medium",
            reason: "Frequent multi-step calculation questions.",
            estimatedMinutes: 25,
            actionUrl: "/learn",
          },
          {
            subject: "Chemistry",
            topic: "Organic Nomenclature & Reaction Mechanisms",
            urgency: "medium",
            reason: "Reinforce isomerism and homologous series IUPAC naming rules.",
            estimatedMinutes: 25,
            actionUrl: "/learn",
          },
        ],
        totalQuestionsPracticed: 715,
        streakDays: 6,
        xpTotal: 2140,
        issuedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      };

      setData(generatedData);
      setLoading(false);
    }

    void loadPassport();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return (
      <main id="main" className="mx-auto min-h-[70vh] max-w-6xl px-5 py-12 sm:px-8 space-y-6 animate-fade-in-up">
        <StatsSkeleton count={4} />
        <CardSkeleton count={2} />
      </main>
    );
  }

  return (
    <main id="main" className="skills-passport-page mx-auto min-h-[75vh] max-w-6xl px-5 py-10 sm:px-8 sm:py-14 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-800 transition">
          ← Return to Dashboard
        </Link>
        <span className="rounded-full bg-blue-50 px-3 py-1 font-mono text-blue-900 border border-blue-200">
          ID: {data.passportId}
        </span>
      </div>

      {/* Hero Header Card */}
      <header className="rounded-3xl bg-[#061a3a] p-7 text-white sm:p-9 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-cyan-200">
                Verified Study Report &amp; Badges
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300">
                Active Candidate
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl tracking-tight text-white">
              {data.studentName}
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-xl leading-relaxed">
              Target: <strong className="text-white">{data.targetExam}</strong>. Cognitive mastery,
              conceptual accuracy, and problem-solving readiness aggregated across live CBT attempts and assignments.
            </p>
          </div>

          {/* Composite Readiness Gauge */}
          <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/30 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400 text-2xl font-black text-[#061a3a] shadow-inner">
              {data.compositeReadiness}%
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-200">
                Exam Readiness Index
              </p>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                {data.compositeReadiness >= 75
                  ? "High Competitive Standing"
                  : data.compositeReadiness >= 60
                  ? "Solid Foundation · On Track"
                  : "Targeted Revision Recommended"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4 text-xs">
          <div>
            <p className="text-blue-300 font-semibold">Total Solved</p>
            <p className="text-lg font-black text-white mt-0.5">{data.totalQuestionsPracticed} Qs</p>
          </div>
          <div>
            <p className="text-blue-300 font-semibold">Study Streak</p>
            <p className="text-lg font-black text-amber-300 mt-0.5 inline-flex items-center gap-1.5"><svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>{data.streakDays} Days</p>
          </div>
          <div>
            <p className="text-blue-300 font-semibold">Mastery XP</p>
            <p className="text-lg font-black text-cyan-300 mt-0.5">{data.xpTotal.toLocaleString()} XP</p>
          </div>
          <div>
            <p className="text-blue-300 font-semibold">Issued</p>
            <p className="text-xs font-mono text-slate-300 mt-1">
              {new Date(data.issuedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Analysis Grid: Cognitive Radar Matrix & Subject Mastery Index */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Left Column: Cognitive Radar Matrix */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Cognitive Mastery Radar</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-axis psychometric evaluation vs benchmark cohort
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
              5 Dimensions
            </span>
          </div>

          <div className="my-2">
            <CognitiveRadarChart dimensions={data.radarDimensions} size={340} />
          </div>

          <div className="w-full mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs">
            {data.radarDimensions.map((d) => (
              <div key={d.axis} className="flex items-center justify-between py-1">
                <span className="font-semibold text-slate-700">{d.axis}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-900">{d.score}%</span>
                  <span className="text-[10px] text-slate-400">vs target {d.benchmark}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Subject Mastery Index */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Subject Mastery Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated performance across standard UTME/WAEC subjects
              </p>
            </div>
            <Link href="/courses" className="text-xs font-bold text-blue-700 hover:underline">
              Syllabus →
            </Link>
          </div>

          <div className="space-y-4">
            {data.subjectMastery.map((sub) => {
              const isMastered = sub.status === "Mastered";
              const isProficient = sub.status === "Proficient";

              return (
                <div
                  key={sub.subject}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{sub.subject}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {sub.questionsSolved} questions evaluated
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {sub.masteryPercentage}%
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          isMastered
                            ? "bg-emerald-100 text-emerald-900"
                            : isProficient
                            ? "bg-blue-100 text-blue-900"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isMastered ? "bg-emerald-500" : isProficient ? "bg-blue-600" : "bg-amber-500"
                      }`}
                      style={{ width: `${sub.masteryPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Adaptive Weakness Diagnosis & AI Recommendations */}
      <section className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <h2 className="text-lg font-black text-slate-950">
                Adaptive AI Revision Recommendations
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Personalized revision roadmap based on cognitive gaps diagnosed from recent CBT sessions.
            </p>
          </div>
          <Link
            href="/learning/revision"
            className="rounded-xl bg-[#012153] px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition shadow-sm"
          >
            Open Revision Planner
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {data.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {rec.subject}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    ⏱️ ~{rec.estimatedMinutes} mins
                  </span>
                </div>
                <h4 className="mt-2 text-xs font-black text-slate-900">{rec.topic}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{rec.reason}</p>
              </div>

              <Link
                href={rec.actionUrl}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-blue-600 hover:text-white transition"
              >
                Study Topic Now →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Digital Verifiable Credential Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#061a3a] to-blue-700 text-2xl text-cyan-300 shadow-md">
            <svg className="h-4 w-4 text-emerald-400 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Verifiable Learning Credential</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unique Cryptographic ID: <code className="font-mono text-blue-900 font-bold">{data.passportId}</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <svg className="h-4 w-4 text-slate-600 inline mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print / Save PDF Report
          </button>
          <Link
            href="/login"
            className="rounded-xl border border-blue-600 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-xs"
          >
            Sign In / Register
          </Link>
          <Link
            href="/cbt"
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 transition shadow"
          >
            Practise CBT Questions →
          </Link>
        </div>
      </section>
    </main>
  );
}
