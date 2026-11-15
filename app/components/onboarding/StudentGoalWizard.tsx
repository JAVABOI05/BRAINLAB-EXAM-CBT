"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  POPULAR_UNIVERSITIES,
  POPULAR_COURSES,
  TARGET_SCORES,
  STUDY_VIBES,
  type StudentProfileData,
} from "@/app/lib/studentProfile";
import { trackEvent } from "@/app/lib/analytics";

interface StudentGoalWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: StudentProfileData;
  onSaved?: (updated: Partial<StudentProfileData>) => void;
}

const EXAM_GOALS = [
  { id: "utme", title: "JAMB UTME 2027", badge: "Primary Exam", desc: "4-Subject timed CBT simulation, 400-mark scoring, speed drills" },
  { id: "waec", title: "WAEC SSCE (Senior Sec.)", badge: "May/June", desc: "Theory explanations, syllabus topic mastery, past questions" },
  { id: "neco", title: "NECO SSCE", badge: "June/July", desc: "Core subjects past papers, formula sheets, calculation steps" },
  { id: "post-utme", title: "Post-UTME Screening", badge: "Tertiary", desc: "University-specific entrance screening past questions (UNILAG, UI, OAU)" },
  { id: "stem", title: "University STEM Foundations", badge: "100L / Pre-Degree", desc: "Calculus, General Chemistry, Mechanics 3D Virtual Labs" },
];

function GoalIcon({ id }: { id: string }) {
  switch (id) {
    case "utme":
      return (
        <svg className="h-5 w-5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "waec":
      return (
        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "neco":
      return (
        <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case "post-utme":
      return (
        <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "stem":
      return (
        <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function StudentGoalWizard({
  isOpen,
  onClose,
  currentProfile,
  onSaved,
}: StudentGoalWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [examGoal, setExamGoal] = useState<string>("utme");
  const [dreamSchool, setDreamSchool] = useState<string>(currentProfile?.dreamSchool || "University of Lagos (UNILAG)");
  const [targetCourse, setTargetCourse] = useState<string>(currentProfile?.targetCourse || "Computer Science & AI");
  const [customCourse, setCustomCourse] = useState("");
  const [targetScore, setTargetScore] = useState<string>(currentProfile?.targetScore || TARGET_SCORES[1]);
  const [studyVibe, setStudyVibe] = useState<string>(currentProfile?.studyVibe || STUDY_VIBES[0].label);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      if (currentProfile.dreamSchool) setDreamSchool(currentProfile.dreamSchool);
      if (currentProfile.targetCourse) setTargetCourse(currentProfile.targetCourse);
      if (currentProfile.targetScore) setTargetScore(currentProfile.targetScore);
      if (currentProfile.studyVibe) setStudyVibe(currentProfile.studyVibe);
    }
  }, [currentProfile]);

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    const finalCourse = targetCourse === "Other" && customCourse.trim() ? customCourse.trim() : targetCourse;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = {
        dream_school: dreamSchool,
        target_course: finalCourse,
        target_score: targetScore,
        study_vibe: studyVibe,
        exam_goal: examGoal,
        is_customized: true,
      };

      await supabase
        .from("profiles")
        .update(updated)
        .eq("id", user.id);

      try {
        localStorage.setItem("brainlab_student_goals_set", "true");
      } catch {}

      trackEvent("student_goal_wizard_completed", {
        dream_school: dreamSchool,
        target_course: finalCourse,
        target_score: targetScore,
        exam_goal: examGoal,
      });

      setSuccess(true);
      if (onSaved) {
        onSaved({
          dreamSchool,
          targetCourse: finalCourse,
          targetScore,
          studyVibe,
          isCustomized: true,
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error("Failed to save goals:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#070D18] shadow-2xl">
        {/* Wizard Header */}
        <div className="relative border-b border-slate-100 dark:border-white/[0.08] bg-gradient-to-r from-blue-900 via-indigo-950 to-[#050811] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300 border border-cyan-400/30">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <span>Step {step} of 3 &bull; Personalise Your Study Roadmap</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-black">
            {step === 1 && "What is your primary examination goal?"}
            {step === 2 && "Which university & course are you targeting?"}
            {step === 3 && "Set your score target & study persona"}
          </h2>
          <p className="mt-1 text-xs text-blue-200/90 leading-relaxed">
            {step === 1 && "BrainLab tailors mock tests, blueprint weightings, and AI guidance to your goal."}
            {step === 2 && "We benchmark your practice test scores against historical cut-off marks for this institution."}
            {step === 3 && "Your target helps the AI tutor recommend high-yield topic priorities."}
          </p>

          {/* Progress Indicator */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-cyan-400" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6">
          {success ? (
            <div className="py-10 text-center animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Study Roadmap Activated!
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Your dashboard, mock predictions, and AI drills are now calibrated to your ambitions.
              </p>
            </div>
          ) : (
            <>
              {/* STEP 1: Exam Target */}
              {step === 1 && (
                <div className="space-y-3">
                  {EXAM_GOALS.map((g) => {
                    const isSelected = examGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setExamGoal(g.id)}
                        className={`w-full flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-600/30 shadow-sm"
                            : "border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06] mt-0.5">
                          <GoalIcon id={g.id} />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {g.title}
                            </span>
                            <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-cyan-300">
                              {g.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {g.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: University & Course */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      <svg className="h-3.5 w-3.5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span>Target University / Polytechnic</span>
                    </label>
                    <select
                      value={dreamSchool}
                      onChange={(e) => setDreamSchool(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#0E172A] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-600 focus:outline-none"
                    >
                      {POPULAR_UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>
                          {uni}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      <svg className="h-3.5 w-3.5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      <span>Target Discipline / Course of Study</span>
                    </label>
                    <select
                      value={targetCourse}
                      onChange={(e) => setTargetCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#0E172A] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-600 focus:outline-none"
                    >
                      {POPULAR_COURSES.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                      <option value="Other">Other / Custom Course</option>
                    </select>

                    {targetCourse === "Other" && (
                      <input
                        type="text"
                        value={customCourse}
                        onChange={(e) => setCustomCourse(e.target.value)}
                        placeholder="Enter course name (e.g. Mechatronics, Cyber Security)"
                        className="mt-2 w-full rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#0E172A] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Target Score & Study Vibe */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>Target JAMB Score Goal (out of 400)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TARGET_SCORES.map((score) => {
                        const isSelected = targetScore === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setTargetScore(score)}
                            className={`p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30"
                                : "border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      <svg className="h-3.5 w-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                      </svg>
                      <span>Your Study Persona / Learning Vibe</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STUDY_VIBES.map((vibe) => {
                        const isSelected = studyVibe === vibe.label;
                        return (
                          <button
                            key={vibe.id}
                            type="button"
                            onClick={() => setStudyVibe(vibe.label)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                              isSelected
                                ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600/30"
                                : "border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {vibe.label}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 line-clamp-1">
                              {vibe.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Actions */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.08] pt-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                  >
                    &larr; Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Skip for Now
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <span>&rarr;</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>{saving ? "Saving Roadmap..." : "Activate My Goals"}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
