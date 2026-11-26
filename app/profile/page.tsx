"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useLearnerTheme } from "../components/LearnerThemeProvider";
import UserBadges from "../components/UserBadges";
import {
  getUserGamificationProfile,
  type UserGamificationProfile,
} from "../lib/gamification";
import {
  CURATED_AVATARS,
  POPULAR_UNIVERSITIES,
  POPULAR_COURSES,
  ACADEMIC_INTERESTS_LIST,
  STUDY_VIBES,
  TARGET_SCORES,
  FACULTY_SUBJECT_PRESETS,
  AVAILABLE_UTME_ELECTIVE_SUBJECTS,
  DEFAULT_CANDIDATE_SUBJECTS,
  extractStudentProfile,
  getCuratedAvatar,
  type StudentProfileData,
} from "../lib/studentProfile";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { NigerianInstitutionSelect } from "../components/ui/NigerianInstitutionSelect";
import { NigerianCourseSelect } from "../components/ui/NigerianCourseSelect";

function ProfileIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  switch (name) {
    case "flame":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
        </svg>
      );
    case "target":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "school":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "sparkle":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    case "medal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="6" /><path d="m15.477 12.89 2.523 8.11-6-3-6 3 2.523-8.11" />
        </svg>
      );
    case "dna":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m8 8 8 8" /><path d="m9 16 6-6" /><path d="M2 12c1 0 2-1 2-2s1-2 2-2 2 1 2 2 1 2 2 2" /><path d="M14 12c1 0 2-1 2-2s1-2 2-2 2 1 2 2 1 2 2 2" />
        </svg>
      );
    case "persona":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      );
    case "gear":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LearnerProfilePage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [gamification, setGamification] = useState<UserGamificationProfile | null>(null);
  const [peakScore, setPeakScore] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Editable Profile State
  const [name, setName] = useState("");
  const [customAvatarId, setCustomAvatarId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dreamSchool, setDreamSchool] = useState("");
  const [targetCourse, setTargetCourse] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [studyVibe, setStudyVibe] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<[string, string, string, string]>([...DEFAULT_CANDIDATE_SUBJECTS]);

  // Active Tab for Customization
  const [activeTab, setActiveTab] = useState<"persona" | "ambition" | "interests" | "account">("persona");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;
      if (userError || !currentUser) {
        router.replace("/login?redirect=/profile");
        return;
      }

      setUser(currentUser);
      const prof = extractStudentProfile(currentUser);
      setName(prof.displayName);
      setCustomAvatarId(prof.customAvatarId || (prof.avatarUrl ? "" : "avatar-tech"));
      setPhotoUrl(prof.avatarUrl);
      setDreamSchool(prof.dreamSchool);
      setTargetCourse(prof.targetCourse);
      setTargetScore(prof.targetScore);
      setSelectedInterests(prof.academicInterests);
      setStudyVibe(prof.studyVibe);
      setBio(prof.bio);
      if (Array.isArray(prof.selectedSubjects) && prof.selectedSubjects.length === 4) {
        setSelectedSubjects(prof.selectedSubjects);
      }

      // Fetch gamification profile
      const gProfile = await getUserGamificationProfile(currentUser.id);
      if (active && gProfile) {
        setGamification(gProfile);
      }

      // Fetch user's all-time highest CBT score
      try {
        const candidateName = prof.displayName;
        const candidatePhone = currentUser.user_metadata?.phone || currentUser.phone || "";
        const { data: peakRes } = await supabase
          .from("results")
          .select("score, total")
          .or(`name.ilike.%${candidateName}%,phone.eq.${candidatePhone || "---"}`)
          .order("score", { ascending: false })
          .limit(1);

        if (peakRes && peakRes.length > 0 && active) {
          const sc = Number(peakRes[0].score) || 0;
          const tot = Number(peakRes[0].total) || 400;
          setPeakScore({
            score: sc,
            total: tot,
            percentage: Math.min(100, Math.max(0, Math.round((sc / tot) * 100))),
          });
        }
      } catch {}

      setLoading(false);
    }

    void loadProfile().catch(() => {
      if (active) {
        setError("We could not load your profile. Please refresh and try again.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  function toggleInterest(interestLabel: string) {
    if (selectedInterests.includes(interestLabel)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interestLabel));
    } else {
      if (selectedInterests.length >= 6) {
        setError("You can choose up to 6 key academic passions.");
        return;
      }
      setError("");
      setSelectedInterests([...selectedInterests, interestLabel]);
    }
  }

  async function saveProfile(event?: React.FormEvent) {
    if (event) event.preventDefault();
    setError("");
    setMessage("");

    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) {
      setError("Enter the name you want shown on your profile.");
      return;
    }
    if (cleanName.length > 100) {
      setError("Keep your display name to 100 characters or fewer.");
      return;
    }

    setSaving(true);
    try {
      const updatedMetadata = {
        ...(user?.user_metadata ?? {}),
        full_name: cleanName,
        name: cleanName,
        custom_avatar_id: customAvatarId,
        avatar_url: photoUrl.trim() || undefined,
        picture: photoUrl.trim() || undefined,
        dream_school: dreamSchool.trim(),
        target_course: targetCourse.trim(),
        target_score: targetScore.trim(),
        academic_interests: selectedInterests,
        study_vibe: studyVibe.trim(),
        bio: bio.trim(),
        motto: bio.trim(),
        selected_subjects: selectedSubjects,
      };

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: updatedMetadata,
      });

      if (updateError || !data.user) {
        setError("We could not save your profile changes. Please try again.");
        return;
      }

      setUser(data.user);
      setName(cleanName);

      // Also update local storage candidate cache
      try {
        const savedCandidate = localStorage.getItem("candidate");
        if (savedCandidate) {
          const parsed = JSON.parse(savedCandidate);
          parsed.name = cleanName;
          parsed.avatar = photoUrl.trim() || undefined;
          parsed.customAvatarId = customAvatarId;
          parsed.dreamSchool = dreamSchool.trim();
          parsed.targetCourse = targetCourse.trim();
          parsed.subjects = selectedSubjects;
          localStorage.setItem("candidate", JSON.stringify(parsed));
          localStorage.setItem("candidate_subjects", JSON.stringify(selectedSubjects));
        } else {
          localStorage.setItem("candidate", JSON.stringify({
            name: cleanName,
            subjects: selectedSubjects,
            dreamSchool: dreamSchool.trim(),
            targetCourse: targetCourse.trim(),
          }));
          localStorage.setItem("candidate_subjects", JSON.stringify(selectedSubjects));
        }
      } catch {}

      setMessage("Profile updated successfully! Your new avatar and academic goals are active across BrainLab.");
    } catch {
      setError("We could not save your profile changes. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main id="main" className="learner-theme min-h-[70vh] px-5 py-16">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  const liveProfile: StudentProfileData = {
    displayName: name.trim() || "Scholar",
    email: user?.email || "",
    avatarUrl: photoUrl.trim(),
    customAvatarId,
    dreamSchool: dreamSchool.trim(),
    targetCourse: targetCourse.trim(),
    targetScore: targetScore.trim(),
    academicInterests: selectedInterests,
    studyVibe: studyVibe.trim(),
    bio: bio.trim(),
    initials: name.trim()
      ? name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
      : "BL",
    isCustomized: true,
    selectedSubjects,
  };

  const selectedCurated = getCuratedAvatar(customAvatarId);

  return (
    <main
      id="main"
      data-theme={resolvedTheme}
      className="learner-theme min-h-[85vh] px-4 py-8 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8 sm:py-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Top Breadcrumb & Title */}
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 transition"
            >
              <span aria-hidden="true">←</span> Return to Learner Workspace
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Student Identity &amp; Profile Studio
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Personalise your scholar avatar, dream school, target course, academic passions, and study vibe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-900/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Global Alert Messages */}
        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </div>
        )}

        {/* Hero Interactive Identity Card */}
        <section className="mb-8 overflow-hidden rounded-[2.5rem] border border-slate-200/90 bg-gradient-to-br from-[#06122d] via-[#091b42] to-[#040817] text-white shadow-2xl dark:border-slate-800 relative">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />

          <div className="relative p-6 sm:p-9">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Avatar & Identity Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative group">
                  <StudentAvatar
                    profile={liveProfile}
                    size="xl"
                    showOnlineDot={true}
                    className="ring-4 ring-cyan-400/30 shadow-2xl"
                  />
                  {selectedCurated && (
                    <span className="absolute -bottom-2 -right-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-900 shadow-md border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700">
                      {selectedCurated.emoji}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/15 border border-cyan-400/30 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> Verified Learner
                    </span>
                    {gamification && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/20 px-3 py-0.5 text-[10px] font-extrabold text-amber-200">
                        <ProfileIcon name="star" className="h-3 w-3 text-amber-300" /> Level {gamification.current_level} · {gamification.level_name}
                      </span>
                    )}
                    {gamification && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-purple-300/30 bg-purple-500/20 px-3 py-0.5 text-[10px] font-extrabold text-purple-200">
                        <ProfileIcon name="sparkle" className="h-3 w-3 text-purple-300" /> {gamification.lifetime_xp.toLocaleString()} XP
                      </span>
                    )}
                    {gamification && gamification.current_streak_days > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/30 bg-rose-500/20 px-3 py-0.5 text-[10px] font-extrabold text-rose-200">
                        <ProfileIcon name="flame" className="h-3 w-3 text-rose-400" /> {gamification.current_streak_days} Day Streak
                      </span>
                    )}
                    {peakScore && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-3 py-0.5 text-[10px] font-extrabold text-emerald-200" title="All-time personal best CBT score">
                        🏆 Peak: {peakScore.score}/{peakScore.total} ({peakScore.percentage}%)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black sm:text-3xl tracking-tight text-white">
                      {liveProfile.displayName}
                    </h2>
                    {user && <UserBadges userId={user.id} size="md" maxVisible={4} />}
                  </div>

                  <p className="text-xs text-blue-200/80 font-mono">
                    {user?.email ?? "Email unavailable"}
                  </p>

                  {/* Dynamic Academic Ambition Badges in Hero */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    {targetCourse && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 px-3 py-1 font-bold text-cyan-200">
                        <ProfileIcon name="target" className="h-3.5 w-3.5 text-cyan-300" /> Course: {targetCourse}
                      </span>
                    )}
                    {dreamSchool && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 font-bold text-indigo-200">
                        <ProfileIcon name="school" className="h-3.5 w-3.5 text-indigo-300" /> {dreamSchool}
                      </span>
                    )}
                    {targetScore && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1 font-bold text-amber-200">
                        <ProfileIcon name="star" className="h-3.5 w-3.5 text-amber-300" /> Goal: {targetScore}
                      </span>
                    )}
                    {studyVibe && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 px-3 py-1 font-bold text-purple-200">
                        <ProfileIcon name="sparkle" className="h-3.5 w-3.5 text-purple-300" /> {studyVibe}
                      </span>
                    )}
                  </div>

                  {bio && (
                    <p className="pt-1.5 text-xs text-slate-300 italic max-w-xl">
                      &ldquo;{bio}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Right Achievements Shortcuts */}
              <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                <Link
                  href="/skills-passport"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md transition"
                >
                  <ProfileIcon name="medal" className="h-3.5 w-3.5 text-amber-100" /> Badges &amp; Passport →
                </Link>
                <Link
                  href="/learning-dna"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition"
                >
                  <ProfileIcon name="dna" className="h-3.5 w-3.5 text-cyan-300" /> Learning DNA
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Customization Navigation Tabs */}
        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("persona")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 transition border-b-2 cursor-pointer ${
              activeTab === "persona"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300 bg-blue-50/50 dark:bg-blue-950/30"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ProfileIcon name="persona" className="h-4 w-4" />
            <span>Avatar &amp; Persona</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ambition")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 transition border-b-2 cursor-pointer ${
              activeTab === "ambition"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300 bg-blue-50/50 dark:bg-blue-950/30"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ProfileIcon name="target" className="h-4 w-4" />
            <span>Dream School &amp; Course</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("interests")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 transition border-b-2 cursor-pointer ${
              activeTab === "interests"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300 bg-blue-50/50 dark:bg-blue-950/30"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ProfileIcon name="sparkle" className="h-4 w-4" />
            <span>Academic Passions &amp; Vibe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 transition border-b-2 cursor-pointer ${
              activeTab === "account"
                ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-300 bg-blue-50/50 dark:bg-blue-950/30"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ProfileIcon name="gear" className="h-4 w-4" />
            <span>Display Name &amp; Bio</span>
          </button>
        </div>

        {/* Tab 1: Avatar & Persona */}
        {activeTab === "persona" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ProfileIcon name="persona" className="h-5 w-5 text-blue-600 dark:text-cyan-400" /><span>Choose Your Academic Scholar Avatar</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select a persona that represents your field, mindset, or ambition. It appears across tests, leaderboards, and the student portal.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {CURATED_AVATARS.map((av) => {
                const isSelected = customAvatarId === av.id && !photoUrl;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setCustomAvatarId(av.id);
                      setPhotoUrl("");
                    }}
                    className={`relative flex flex-col items-center p-3.5 rounded-2xl border text-center transition cursor-pointer group ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 dark:border-cyan-400 dark:bg-cyan-950/40 ring-2 ring-blue-500/30"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${av.gradient} flex items-center justify-center text-2xl shadow-md border border-white/20 group-hover:scale-105 transition`}
                    >
                      <span>{av.emoji}</span>
                    </div>
                    <span className="mt-2.5 text-xs font-black text-slate-900 dark:text-white truncate w-full">
                      {av.name}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold truncate w-full">
                      {av.badge}
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Photo URL Option */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label htmlFor="avatar-photo-url" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <ProfileIcon name="image" className="h-4 w-4 text-blue-600 dark:text-cyan-400 inline mr-1.5" />Or Use a Custom Profile Picture URL
              </label>
              <div className="flex gap-2">
                <input
                  id="avatar-photo-url"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    if (e.target.value) setCustomAvatarId("");
                  }}
                  placeholder="https://example.com/my-profile-picture.jpg"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl("");
                      setCustomAvatarId("avatar-tech");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Paste an image URL from Google, GitHub, or any public image host.
              </p>
            </div>
          </section>
        )}

        {/* Tab 2: Dream School & Course */}
        {activeTab === "ambition" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            {/* Dream Course */}
            <div>
              <label htmlFor="target-course-input" className="block text-sm font-bold text-slate-900 dark:text-white">
                <ProfileIcon name="school" className="h-4 w-4 text-blue-600 dark:text-cyan-400 inline mr-1.5" />Aspiring Course of Study / Career Focus
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Choose from over 100+ accredited degree programmes or type a custom field of study.
              </p>

              <div className="mt-3">
                <NigerianCourseSelect
                  id="profile-course-select"
                  value={targetCourse}
                  onChange={(val) => setTargetCourse(val)}
                  placeholder="Select or search accredited programme..."
                />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {POPULAR_COURSES.map((course) => (
                  <button
                    key={course}
                    type="button"
                    onClick={() => setTargetCourse(course)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      targetCourse === course
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {course}
                  </button>
                ))}
              </div>
            </div>

            {/* Dream Institution */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label htmlFor="dream-school-input" className="block text-sm font-bold text-slate-900 dark:text-white">
                <ProfileIcon name="school" className="h-4 w-4 text-indigo-600 dark:text-indigo-400 inline mr-1.5" />Dream Institution / Target University
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Choose from 312+ universities and 200+ polytechnics across Nigeria.
              </p>

              <div className="mt-3">
                <NigerianInstitutionSelect
                  id="profile-institution-select"
                  value={dreamSchool}
                  onChange={(val) => setDreamSchool(val)}
                  placeholder="Select or search institution..."
                />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {POPULAR_UNIVERSITIES.map((uni) => (
                  <button
                    key={uni}
                    type="button"
                    onClick={() => setDreamSchool(uni)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      dreamSchool === uni
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {uni}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Score */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label htmlFor="target-score-select" className="block text-sm font-bold text-slate-900 dark:text-white">
                <ProfileIcon name="star" className="h-4 w-4 text-amber-500 inline mr-1.5" />Target JAMB UTME Score Goal
              </label>
              <select
                id="target-score-select"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Select your target goal...</option>
                {TARGET_SCORES.map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
            </div>

            {/* Persistent 4-Subject Combination */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ProfileIcon name="target" className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                    <span>Official 4-Subject Examination Combination</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Saved once, this combination powers your CBT simulations, baseline diagnostic tests, and Learning DNA radar across the entire platform.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-mono font-bold text-blue-700 dark:text-cyan-300">
                  4 Subjects Active
                </span>
              </div>

              {/* Quick Faculty Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Faculty Combinations:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FACULTY_SUBJECT_PRESETS.map((preset) => {
                    const isActive =
                      selectedSubjects[1] === preset.subjects[1] &&
                      selectedSubjects[2] === preset.subjects[2] &&
                      selectedSubjects[3] === preset.subjects[3];

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedSubjects([...preset.subjects])}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? "border-blue-500 bg-blue-50/80 dark:border-cyan-400 dark:bg-cyan-950/40 ring-2 ring-blue-500/20"
                            : "border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {preset.label}
                          </span>
                          {isActive && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-blue-700 dark:text-cyan-300 font-bold mt-1">
                          {preset.subjects.join(" + ")}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed 4-Slot Customizer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Slot 1: Locked Compulsory English */}
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-blue-800 dark:text-cyan-400">
                      Subject 1 (Compulsory)
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-cyan-300 font-bold">
                      Locked
                    </span>
                  </div>
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-black text-blue-950 dark:text-white flex items-center justify-between">
                    <span>English Language</span>
                    <span className="text-[10px] text-slate-400 font-mono">UTME Compulsory</span>
                  </div>
                </div>

                {/* Slots 2, 3, 4: Custom Electives */}
                {[1, 2, 3].map((slotIdx) => (
                  <div key={slotIdx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`profile-subject-slot-${slotIdx + 1}`} className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                        Subject {slotIdx + 1} (Elective)
                      </label>
                      <span className="text-[10px] text-slate-400 font-bold">Elective</span>
                    </div>
                    <select
                      id={`profile-subject-slot-${slotIdx + 1}`}
                      aria-label={`Subject Slot ${slotIdx + 1}`}
                      value={selectedSubjects[slotIdx]}
                      onChange={(e) => {
                        const newSubj = e.target.value;
                        setSelectedSubjects((prev) => {
                          const next: [string, string, string, string] = [...prev];
                          next[slotIdx] = newSubj;
                          return next;
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                    >
                      {AVAILABLE_UTME_ELECTIVE_SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Academic Passions & Study Vibe */}
        {activeTab === "interests" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ProfileIcon name="sparkle" className="h-5 w-5 text-cyan-500" /><span>Academic Passions &amp; Specializations</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select up to 6 topics you find most exciting. This customises your recommendations and community study group matches.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {ACADEMIC_INTERESTS_LIST.map((item) => {
                const isSelected = selectedInterests.includes(item.label);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.label)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold text-left transition cursor-pointer ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50/70 text-cyan-900 dark:border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-200 ring-2 ring-cyan-400/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-lg leading-none">{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                    {isSelected && <span className="ml-auto text-cyan-600 dark:text-cyan-400 font-bold"><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span>}
                  </button>
                );
              })}
            </div>

            {/* Study Vibe Selection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                <ProfileIcon name="dna" className="h-4 w-4 text-purple-500 inline mr-1.5" />Your Learning Superpower &amp; Study Vibe
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STUDY_VIBES.map((vibe) => {
                  const isSelected = studyVibe === vibe.label;
                  return (
                    <button
                      key={vibe.id}
                      type="button"
                      onClick={() => setStudyVibe(vibe.label)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/70 text-purple-950 dark:border-purple-400 dark:bg-purple-950/40 dark:text-purple-200 ring-2 ring-purple-400/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-2xl">{vibe.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-black">{vibe.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{vibe.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: Display Name, Bio & Account */}
        {activeTab === "account" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            <form onSubmit={saveProfile} className="space-y-5">
              <div>
                <label htmlFor="profile-name" className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Display Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="How should your name appear?"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Displayed on leaderboards, study reports, certificates, and challenge arena duels.
                </p>
              </div>

              <div>
                <label htmlFor="profile-bio" className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Learner Bio / Academic Motto
                </label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  maxLength={240}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Aiming for 340+ in JAMB 2026. Future Neurosurgeon at UNILAG. BrainLab Legend in the making!"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  A personal motto or study resolution (up to 240 characters).
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Authenticated Sign-in Email
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <ProfileIcon name="mail" className="h-4 w-4 text-slate-500" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-xl bg-[#0b2a5b] hover:bg-blue-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving Changes…" : "Save Profile Details →"}
              </button>
            </form>
          </section>
        )}

        {/* Bottom Action Row */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ProfileIcon name="shield" className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Your academic ambitions and preferences are saved securely to your BrainLab profile.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-black uppercase text-white shadow-md transition cursor-pointer"
            >
              {saving ? "Saving…" : "Save All Changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
