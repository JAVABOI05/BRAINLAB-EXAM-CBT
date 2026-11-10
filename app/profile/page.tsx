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
  extractStudentProfile,
  getCuratedAvatar,
  type StudentProfileData,
} from "../lib/studentProfile";
import { StudentAvatar } from "../components/ui/StudentAvatar";

export default function LearnerProfilePage() {
  const router = useRouter();
  const { resolvedTheme } = useLearnerTheme();
  const [user, setUser] = useState<User | null>(null);
  const [gamification, setGamification] = useState<UserGamificationProfile | null>(null);
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

      // Fetch gamification profile
      const gProfile = await getUserGamificationProfile(currentUser.id);
      if (active && gProfile) {
        setGamification(gProfile);
      }

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
          localStorage.setItem("candidate", JSON.stringify(parsed));
        }
      } catch {}

      setMessage("✨ Profile updated successfully! Your new avatar and academic goals are active across BrainLab.");
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
              {saving ? "Saving…" : "Save Changes ✨"}
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
                        ⭐ Level {gamification.current_level} · {gamification.level_name}
                      </span>
                    )}
                    {gamification && gamification.current_streak_days > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/30 bg-rose-500/20 px-3 py-0.5 text-[10px] font-extrabold text-rose-200">
                        🔥 {gamification.current_streak_days} Day Streak
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
                        <span>🎯</span> Course: {targetCourse}
                      </span>
                    )}
                    {dreamSchool && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 font-bold text-indigo-200">
                        <span>🏛️</span> {dreamSchool}
                      </span>
                    )}
                    {targetScore && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 px-3 py-1 font-bold text-amber-200">
                        <span>⭐</span> Goal: {targetScore}
                      </span>
                    )}
                    {studyVibe && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 px-3 py-1 font-bold text-purple-200">
                        <span>✨</span> {studyVibe}
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
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md transition"
                >
                  🏅 Badges &amp; Passport →
                </Link>
                <Link
                  href="/learning-dna"
                  className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition"
                >
                  🧬 Learning DNA
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
            <span>🎭</span>
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
            <span>🎯</span>
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
            <span>✨</span>
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
            <span>⚙️</span>
            <span>Display Name &amp; Bio</span>
          </button>
        </div>

        {/* Tab 1: Avatar & Persona */}
        {activeTab === "persona" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎭</span> Choose Your Academic Scholar Avatar
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
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Photo URL Option */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label htmlFor="avatar-photo-url" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                🖼️ Or Use a Custom Profile Picture URL
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
                🎓 Aspiring Course of Study / Career Focus
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                What programme are you preparing for?
              </p>
              <input
                id="target-course-input"
                type="text"
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                placeholder="e.g. Medicine & Surgery, Computer Science, Law..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />

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
                🏛️ Dream Institution / Target University
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Which higher institution do you aim to gain admission to?
              </p>
              <input
                id="dream-school-input"
                type="text"
                value={dreamSchool}
                onChange={(e) => setDreamSchool(e.target.value)}
                placeholder="e.g. University of Lagos (UNILAG), UI, Covenant University..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />

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
                ⭐ Target JAMB UTME Score Goal
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
          </section>
        )}

        {/* Tab 3: Academic Passions & Study Vibe */}
        {activeTab === "interests" && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#0c1629] space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>✨</span> Academic Passions &amp; Specializations
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
                    {isSelected && <span className="ml-auto text-cyan-600 dark:text-cyan-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Study Vibe Selection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                🧬 Your Learning Superpower &amp; Study Vibe
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
                  <span>✉️</span>
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
            <span>🛡️</span>
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
              {saving ? "Saving…" : "Save All Changes ✨"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
