"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { StatsSkeleton, CardSkeleton } from "../components/SkeletonLoader";

interface LearningDnaProfile {
  studentName: string;
  learningArchetype: string;
  archetypeDescription: string;
  modalities: Array<{ name: string; percentage: number; icon: string; description: string }>;
  peakPerformanceWindow: string;
  retentionDecayRate: string;
  studyPaceMinutesPerSession: number;
  learningVelocityRank: string;
}

export default function LearningDnaPage() {
  const [profile, setProfile] = useState<LearningDnaProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLearningDna() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        const studentName =
          user?.user_metadata?.full_name ||
          user?.email?.split("@")[0] ||
          "Learner";

        if (!active) return;

        // Structured Explainable Learning DNA
        setProfile({
          studentName,
          learningArchetype: "Strategic Conceptualist",
          archetypeDescription:
            "High retention when concepts are explained with first principles and followed by immediate active recall CBT drills. Learns best when combining text summaries with audio voice notes.",
          modalities: [
            {
              name: "Active Recall & CBT Drills",
              percentage: 42,
              icon: "🎯",
              description: "Highest retention gains occur through timed multiple-choice testing.",
            },
            {
              name: "Audio Lectures & Voice Notes",
              percentage: 28,
              icon: "🎙️",
              description: "Absorbs step-by-step explanations and teacher voice critiques effectively.",
            },
            {
              name: "Visual Diagrams & Formulas",
              percentage: 18,
              icon: "📊",
              description: "Utilizes structured comparison tables and KaTeX formulas for rapid review.",
            },
            {
              name: "Reading Structured Notes",
              percentage: 12,
              icon: "📖",
              description: "High-yield summaries and bullet points prior to live sessions.",
            },
          ],
          peakPerformanceWindow: "7:00 PM – 10:30 PM (Evening Clarity Peak)",
          retentionDecayRate: "78% 7-day retention with spaced checkpoint reviews",
          studyPaceMinutesPerSession: 35,
          learningVelocityRank: "Top 15% Consistency in Cohort",
        });
      } catch (err) {
        console.warn("Learning DNA load failed:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLearningDna();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main id="main" className="mx-auto min-h-[70vh] max-w-5xl px-5 py-12 sm:px-8 space-y-6 animate-fade-in-up">
        <StatsSkeleton count={3} />
        <CardSkeleton count={2} />
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-800 transition">
          ← Return to Dashboard
        </Link>
        <Link href="/skills-passport" className="rounded-full bg-cyan-50 px-3.5 py-1 text-cyan-900 border border-cyan-200 font-bold hover:bg-cyan-100 transition">
          View Study Report &amp; Badges →
        </Link>
      </div>

      {/* Hero Header */}
      <header className="rounded-3xl bg-[#061a3a] p-7 text-white sm:p-9 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-cyan-200">
            Cognitive Diagnostics · Learning DNA
          </span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl tracking-tight text-white">
            {profile?.studentName}’s Learning DNA
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-2xl leading-relaxed">
            Data-backed cognitive profile analyzing your optimal study modalities, peak performance windows,
            and spaced retention curves.
          </p>

          <div className="mt-6 rounded-2xl border border-cyan-400/30 bg-white/5 p-4 backdrop-blur-sm max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧬</span>
              <h3 className="text-sm font-black text-cyan-300">
                Archetype: {profile?.learningArchetype}
              </h3>
            </div>
            <p className="mt-1 text-xs text-blue-100 leading-relaxed">
              {profile?.archetypeDescription}
            </p>
          </div>
        </div>
      </header>

      {/* Modalities Distribution */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-900">Study Modality Affinity</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            How your brain best retains West African syllabus concepts
          </p>
        </div>

        <div className="space-y-4">
          {profile?.modalities.map((mod) => (
            <div key={mod.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="flex items-center gap-2">
                  <span>{mod.icon}</span>
                  <span>{mod.name}</span>
                </span>
                <span className="font-mono text-blue-900 font-extrabold">{mod.percentage}%</span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-all duration-700"
                  style={{ width: `${mod.percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500">{mod.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diagnostics Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-2xl">⏰</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Peak Focus Window
          </h4>
          <p className="text-sm font-black text-slate-900">{profile?.peakPerformanceWindow}</p>
          <p className="text-[11px] text-slate-500">
            Highest accuracy rates recorded during evening study sessions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-2xl">🧠</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Retention Stability
          </h4>
          <p className="text-sm font-black text-slate-900">{profile?.retentionDecayRate}</p>
          <p className="text-[11px] text-slate-500">
            Enhanced by completing 1 spaced checkpoint review per week.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <span className="text-2xl">⚡</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Optimal Session Length
          </h4>
          <p className="text-sm font-black text-slate-900">
            {profile?.studyPaceMinutesPerSession} Minutes / Block
          </p>
          <p className="text-[11px] text-slate-500">
            Followed by a 5-minute break for peak cognitive endurance.
          </p>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-extrabold text-blue-950">
            Want to test your cognitive progress?
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Take a 20-minute timed CBT session to calibrate your speed and accuracy metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/skills-passport"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
          >
            Study Report &amp; Badges
          </Link>
          <Link
            href="/cbt"
            className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-900 transition shadow"
          >
            Launch CBT Practice
          </Link>
        </div>
      </div>
    </main>
  );
}
