"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import LearningStreakCard from "@/app/components/LearningStreakCard";
import {
  getUserGamificationProfile,
  getUserBadges,
  getGamificationLevels,
  toggleBadgeFeatured,
  type UserGamificationProfile,
  type UserBadgeAward,
  type GamificationLevel,
} from "@/app/lib/gamification";

type Certificate = {
  id: string;
  certificate_number: string;
  recipient_name: string;
  title: string;
  issuer_name: string;
  score: number | null;
  grade: string | null;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

// Built-in standard badge definitions to display locked badges
const STANDARD_BADGES = [
  { id: "badge_first_quiz", name: "First Steps", desc: "Complete your first CBT or practice quiz.", icon: "🌱", rarity: "common", category: "academic" },
  { id: "badge_streak_3", name: "Spark", desc: "Maintain a continuous 3-day learning streak.", icon: "🔥", rarity: "common", category: "consistency" },
  { id: "badge_streak_7", name: "Ignition", desc: "Maintain a continuous 7-day learning streak.", icon: "⚡", rarity: "rare", category: "consistency" },
  { id: "badge_streak_30", name: "Unstoppable Force", desc: "Complete 30 consecutive days of revision.", icon: "☄️", rarity: "legendary", category: "consistency" },
  { id: "badge_speed_demon", name: "Speed Demon", desc: "Answer 40 questions in under 20 minutes with 80%+ accuracy.", icon: "⏱️", rarity: "rare", category: "academic" },
  { id: "badge_accuracy_ace", name: "Accuracy Ace", desc: "Achieve a perfect 100% score on any subject test.", icon: "🎯", rarity: "epic", category: "academic" },
  { id: "badge_utme_topgun", name: "UTME Top Gun", desc: "Score 320+ marks on an official 400-mark mock exam.", icon: "👑", rarity: "legendary", category: "academic" },
  { id: "badge_night_owl", name: "Night Owl", desc: "Complete a rigorous study session between 11 PM and 4 AM.", icon: "🦉", rarity: "common", category: "consistency" },
  { id: "badge_community_contributor", name: "Scholarly Peer", desc: "Share verified solution notes in study discussions.", icon: "💬", rarity: "rare", category: "community" },
];

export default function AchievementsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"badges" | "certificates">("badges");
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeAward[]>([]);
  const [levels, setLevels] = useState<GamificationLevel[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      router.replace("/account");
      return;
    }

    setUserEmail(auth.user.email || "");
    const userId = auth.user.id;

    // Load Gamification profile, badges, levels, and certificates in parallel
    const [gamProfile, badges, allLevels, certsRes] = await Promise.all([
      getUserGamificationProfile(userId),
      getUserBadges(userId),
      getGamificationLevels(),
      supabase
        .from("learning_certificates")
        .select("id,certificate_number,recipient_name,title,issuer_name,score,grade,issued_at,expires_at,revoked_at")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false }),
    ]);

    setProfile(gamProfile);
    setEarnedBadges(badges);
    setLevels(allLevels);
    if (certsRes.data) {
      setCertificates(certsRes.data as Certificate[]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute XP progress to next level
  const currentXp = profile?.lifetime_xp || 0;
  const currentLevelNum = profile?.current_level || 1;
  const currentLevelObj = levels.find((l) => l.level === currentLevelNum);
  const nextLevelObj = levels.find((l) => l.level === currentLevelNum + 1);

  const minXpForCurrent = currentLevelObj?.min_xp || 0;
  const xpForNext = nextLevelObj ? nextLevelObj.min_xp : minXpForCurrent + 1000;
  const xpNeeded = Math.max(1, xpForNext - minXpForCurrent);
  const xpProgress = Math.min(100, Math.max(0, Math.round(((currentXp - minXpForCurrent) / xpNeeded) * 100)));

  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badge_id));

  async function handleToggleFeatured(badgeId: string, currentFeatured: boolean) {
    const success = await toggleBadgeFeatured(badgeId, !currentFeatured);
    if (success) {
      setEarnedBadges((prev) =>
        prev.map((b) => (b.badge_id === badgeId ? { ...b, is_featured: !currentFeatured } : b))
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#060e1a] text-slate-900 dark:text-slate-100 transition-colors">
      
      <main id="main" className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header Banner */}
          <header className="rounded-3xl border border-white/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 sm:p-9 shadow-sm backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-cyan-400">
                Learner Portfolio &amp; Reputation
              </span>
              {userEmail && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  {userEmail}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
              Achievements, XP &amp; Streaks
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Track your academic progression, maintain your daily study streak flame, and display verified skill badges across leaderboards and peer discussions.
            </p>

            {/* Level & XP Meter */}
            <div className="mt-6 rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/50 dark:bg-slate-950 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#012153] text-xl font-black text-white shadow-md">
                    ⭐
                  </span>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-blue-700 dark:text-cyan-400">
                      Current Rank
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Level {currentLevelNum}: {profile?.level_name || currentLevelObj?.name || "Novice Learner"}
                    </h3>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Progress</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {currentXp.toLocaleString()} <span className="text-xs font-bold text-slate-500">XP</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>Level {currentLevelNum}</span>
                  <span>{xpProgress}% ({xpForNext - currentXp > 0 ? `${(xpForNext - currentXp).toLocaleString()} XP to Level ${currentLevelNum + 1}` : "Max Rank Reached"})</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Learning Streak & Reminder Card */}
          <LearningStreakCard
            currentStreak={profile?.current_streak_days || 0}
            longestStreak={profile?.longest_streak_days || 0}
            lastActiveDate={profile?.last_activity_date}
          />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("badges")}
              className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                activeTab === "badges"
                  ? "bg-[#012153] text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              🏅 Skill Badges ({earnedBadges.length} Unlocked)
            </button>
            <button
              onClick={() => setActiveTab("certificates")}
              className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                activeTab === "certificates"
                  ? "bg-[#012153] text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              📜 Verified Credentials ({certificates.length})
            </button>
          </div>

          {/* Badges Tab View */}
          {activeTab === "badges" && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All Badges" },
                  { id: "academic", label: "📚 Academic" },
                  { id: "consistency", label: "🔥 Consistency" },
                  { id: "community", label: "🤝 Community" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setFilterCategory(pill.id)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                      filterCategory === pill.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Badges Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STANDARD_BADGES.filter((b) => filterCategory === "all" || b.category === filterCategory).map(
                  (badge) => {
                    const isUnlocked = earnedBadgeIds.has(badge.id);
                    const awardData = earnedBadges.find((b) => b.badge_id === badge.id);
                    const isFeatured = awardData?.is_featured || false;

                    const rarityColor =
                      badge.rarity === "legendary"
                        ? "border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300"
                        : badge.rarity === "epic"
                        ? "border-purple-400 dark:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300"
                        : badge.rarity === "rare"
                        ? "border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200";

                    return (
                      <article
                        key={badge.id}
                        className={`rounded-3xl border p-5 shadow-sm transition-all duration-150 ${rarityColor} ${
                          !isUnlocked ? "opacity-60 grayscale-[0.6]" : "hover:-translate-y-1 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            {badge.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded-full bg-white/80 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                              {badge.rarity}
                            </span>
                            {isUnlocked && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ Unlocked
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="mt-3 text-base font-black tracking-tight">{badge.name}</h3>
                        <p className="mt-1 text-xs leading-5 opacity-80">{badge.desc}</p>

                        {isUnlocked && (
                          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Awarded {awardData?.awarded_at ? new Date(awardData.awarded_at).toLocaleDateString() : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(badge.id, isFeatured)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                                isFeatured
                                  ? "bg-amber-400 text-slate-950 font-black"
                                  : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {isFeatured ? "★ Featured" : "Pin to Profile"}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Certificates Tab View */}
          {activeTab === "certificates" && (
            <div>
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Loading credential records…
                </div>
              ) : certificates.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center sm:p-12 shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-2xl text-blue-700 dark:text-cyan-400">
                    📜
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">No Certificates Issued Yet</h3>
                  <p className="mt-2 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400">
                    Complete published CBT tests, official mock competitions, or revision curriculum assessments with distinction to earn verified BrainLab credentials.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/login"
                      className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                    >
                      Start CBT Practice
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {certificates.map((cert) => {
                    const isRevoked = Boolean(cert.revoked_at);
                    const isExpired = cert.expires_at ? new Date(cert.expires_at).getTime() <= Date.now() : false;
                    const status = isRevoked ? "Revoked" : isExpired ? "Expired" : "Active & Verified";

                    return (
                      <article
                        key={cert.id}
                        className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">{cert.certificate_number}</span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                status === "Active & Verified"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">{cert.title}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Issued by {cert.issuer_name}</p>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-300">
                              Issued: {new Date(cert.issued_at).toLocaleDateString()}
                            </span>
                            {cert.score !== null && (
                              <span className="rounded-lg bg-blue-50 dark:bg-blue-900/40 px-2 py-1 text-blue-900 dark:text-cyan-300 font-bold">
                                Score: {cert.score}% {cert.grade ? `(${cert.grade})` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <Link
                            href={`/verify/${cert.certificate_number}`}
                            className="text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline"
                          >
                            View Official Credential ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/verify/${cert.certificate_number}`;
                              void navigator.clipboard.writeText(url);
                              alert("Verification link copied to clipboard!");
                            }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Copy Link
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

          </div>
  );
}
