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
  { id: "utme", title: "JAMB UTME 2027", badge: "Primary Exam", desc: "4-Subject timed CBT simulation, 400-mark scoring, speed drills", emoji: "🎯" },
  { id: "waec", title: "WAEC SSCE (Senior Sec.)", badge: "May/June", desc: "Theory explanations, syllabus topic mastery, past questions", emoji: "📝" },
  { id: "neco", title: "NECO SSCE", badge: "June/July", desc: "Core subjects past papers, formula sheets, calculation steps", emoji: "📚" },
  { id: "post-utme", title: "Post-UTME Screening", badge: "Tertiary", desc: "University-specific entrance screening past questions (UNILAG, UI, OAU)", emoji: "🏛️" },
  { id: "stem", title: "University STEM Foundations", badge: "100L / Pre-Degree", desc: "Calculus, General Chemistry, Mechanics 3D Virtual Labs", emoji: "🧬" },
];

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
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        const updatedMetadata = {
          ...(user.user_metadata || {}),
          exam_goal: examGoal,
          dream_school: dreamSchool.trim(),
          target_course: finalCourse.trim(),
          target_score: targetScore.trim(),
          study_vibe: studyVibe.trim(),
          has_completed_onboarding: true,
        };

        await supabase.auth.updateUser({
          data: updatedMetadata,
        });
      }

      // Sync local storage candidate profile
      try {
        const saved = localStorage.getItem("candidate");
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.examGoal = examGoal;
        parsed.dreamSchool = dreamSchool.trim();
        parsed.targetCourse = finalCourse.trim();
        parsed.targetScore = targetScore.trim();
        parsed.studyVibe = studyVibe.trim();
        localStorage.setItem("candidate", JSON.stringify(parsed));
        localStorage.setItem("brainlab_student_goals_set", "true");
      } catch {}

      trackEvent("student_goal_wizard_completed", {
        examGoal,
        dreamSchool,
        targetCourse: finalCourse,
        targetScore,
      });

      if (onSaved) {
        onSaved({
          dreamSchool: dreamSchool.trim(),
          targetCourse: finalCourse.trim(),
          targetScore: targetScore.trim(),
          studyVibe: studyVibe.trim(),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch {
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Wizard Header */}
        <div className="relative border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
              🎓 Step {step} of 3 · Personalise Your Study Roadmap
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <h2 className="mt-3 text-2xl font-black">
            {step === 1 && "What is your primary examination goal?"}
            {step === 2 && "Which university & course are you targeting?"}
            {step === 3 && "Set your score target & study persona"}
          </h2>
          <p className="mt-1 text-xs text-blue-200/90">
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
              <span className="text-5xl">🎉</span>
              <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
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
                        className={`w-full flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-600/30 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{g.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {g.title}
                            </span>
                            <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
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
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      🏛️ Target University / Polytechnic
                    </label>
                    <select
                      value={dreamSchool}
                      onChange={(e) => setDreamSchool(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-600 focus:outline-none"
                    >
                      {POPULAR_UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>
                          {uni}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      🎯 Target Discipline / Course of Study
                    </label>
                    <select
                      value={targetCourse}
                      onChange={(e) => setTargetCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:border-blue-600 focus:outline-none"
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
                        className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Target Score & Study Vibe */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      ⭐ Target JAMB Score Goal (out of 400)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TARGET_SCORES.map((score) => {
                        const isSelected = targetScore === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setTargetScore(score)}
                            className={`p-3 rounded-xl border text-left text-xs font-bold transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30"
                                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      ✨ Your Study Persona / Learning Vibe
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STUDY_VIBES.map((vibe) => {
                        const isSelected = studyVibe === vibe.label;
                        return (
                          <button
                            key={vibe.id}
                            type="button"
                            onClick={() => setStudyVibe(vibe.label)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition ${
                              isSelected
                                ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600/30"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{vibe.emoji}</span>
                              <span>{vibe.label}</span>
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
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    ← Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Skip for Now
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                  >
                    <span>Next Step</span>
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
                  >
                    <span>{saving ? "Saving Roadmap..." : "Activate My Goals 🚀"}</span>
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
