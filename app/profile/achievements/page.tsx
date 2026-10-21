"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import BrandHeader from "../../components/BrandHeader";
import BrandFooter from "../../components/BrandFooter";
import { supabase } from "../../lib/supabase";
import {
  getUserBadges,
  getUserGamificationProfile,
  getGamificationLevels,
  getGamificationRewards,
  getUserRewardClaims,
  claimReward,
  toggleBadgeFeatured,
  type UserBadgeAward,
  type UserGamificationProfile,
  type GamificationLevel,
  type GamificationReward,
  type RewardClaim,
  type BadgeDefinition,
} from "../../lib/gamification";

const ALL_INITIAL_BADGES: BadgeDefinition[] = [
  // Academic
  {
    id: "top_student",
    name: "Top Student",
    description: "Verified top-performing learner across subject cohorts.",
    category: "academic",
    rarity: "legendary",
    icon: "🏆",
    visual_style: { color: "#f59e0b", glow: true },
    award_type: "temporary_ranking",
    is_active: true,
    display_order: 1,
  },
  {
    id: "top_scorer",
    name: "Top Scorer",
    description: "Highest eligible scorer in an official assessment window.",
    category: "academic",
    rarity: "epic",
    icon: "🥇",
    visual_style: { color: "#eab308" },
    award_type: "temporary_ranking",
    display_order: 2,
    is_active: true,
  },
  {
    id: "quiz_champion",
    name: "Quiz Champion",
    description: "Winner of an official BrainLab CBT competition event.",
    category: "academic",
    rarity: "legendary",
    icon: "👑",
    visual_style: { color: "#ec4899", sparkle: true },
    award_type: "permanent",
    display_order: 3,
    is_active: true,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "Scored 100% on a verified examination or practice test.",
    category: "academic",
    rarity: "epic",
    icon: "💯",
    visual_style: { color: "#10b981" },
    award_type: "permanent",
    display_order: 4,
    is_active: true,
  },
  {
    id: "subject_mastery",
    name: "Subject Mastery",
    description: "Completed full topic syllabus and achieved mastery threshold.",
    category: "academic",
    rarity: "rare",
    icon: "🎓",
    visual_style: { color: "#6366f1" },
    award_type: "permanent",
    display_order: 5,
    is_active: true,
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Completed multi-topic lesson series and revision checklists.",
    category: "academic",
    rarity: "common",
    icon: "📚",
    visual_style: { color: "#3b82f6" },
    award_type: "permanent",
    display_order: 6,
    is_active: true,
  },
  {
    id: "assignment_ace",
    name: "Assignment Ace",
    description: "Consistently met high performance criteria on coursework.",
    category: "academic",
    rarity: "rare",
    icon: "⭐",
    visual_style: { color: "#8b5cf6" },
    award_type: "permanent",
    display_order: 7,
    is_active: true,
  },

  // Consistency & Growth
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Submitted assessments well before closing deadlines.",
    category: "consistency",
    rarity: "common",
    icon: "🌅",
    visual_style: { color: "#f97316" },
    award_type: "permanent",
    display_order: 8,
    is_active: true,
  },
  {
    id: "consistency_master",
    name: "Consistency Master",
    description: "Maintained continuous weekly study without missed days.",
    category: "consistency",
    rarity: "rare",
    icon: "⚡",
    visual_style: { color: "#06b6d4" },
    award_type: "permanent",
    display_order: 9,
    is_active: true,
  },
  {
    id: "unstoppable",
    name: "Unstoppable Streak",
    description: "Maintained an active 7-day or higher continuous learning streak.",
    category: "consistency",
    rarity: "epic",
    icon: "🔥",
    visual_style: { color: "#ef4444", flame: true },
    award_type: "permanent",
    display_order: 10,
    is_active: true,
  },
  {
    id: "rising_star",
    name: "Rising Star",
    description: "Demonstrated verified score improvements over successive tests.",
    category: "consistency",
    rarity: "rare",
    icon: "🚀",
    visual_style: { color: "#0ea5e9" },
    award_type: "permanent",
    display_order: 11,
    is_active: true,
  },
  {
    id: "comeback_champion",
    name: "Comeback Champion",
    description: "Recovered from lower assessment marks to achieve excellence.",
    category: "consistency",
    rarity: "rare",
    icon: "🛡️",
    visual_style: { color: "#14b8a6" },
    award_type: "permanent",
    display_order: 12,
    is_active: true,
  },
  {
    id: "100_quizzes",
    name: "Century Club (100 Quizzes)",
    description: "Completed 100 or more qualifying CBT practice sessions.",
    category: "consistency",
    rarity: "epic",
    icon: "🎯",
    visual_style: { color: "#d946ef" },
    award_type: "permanent",
    display_order: 13,
    is_active: true,
  },
  {
    id: "live_class_regular",
    name: "Live Class Regular",
    description: "Attended and participated in interactive academic streams.",
    category: "consistency",
    rarity: "common",
    icon: "🎥",
    visual_style: { color: "#64748b" },
    award_type: "permanent",
    display_order: 14,
    is_active: true,
  },

  // Community & Legacy
  {
    id: "community_helper",
    name: "Community Helper",
    description: "Provided helpful peer support and verified study assistance.",
    category: "community",
    rarity: "rare",
    icon: "🤝",
    visual_style: { color: "#22c55e" },
    award_type: "permanent",
    display_order: 15,
    is_active: true,
  },
  {
    id: "peer_mentor",
    name: "Peer Mentor",
    description: "Appointed peer study guide assisting younger learners.",
    category: "community",
    rarity: "epic",
    icon: "💡",
    visual_style: { color: "#a855f7" },
    award_type: "permanent",
    display_order: 16,
    is_active: true,
  },
  {
    id: "brainlab_ambassador",
    name: "BrainLab Ambassador",
    description: "Recognized student ambassador representing excellence.",
    category: "community",
    rarity: "rare",
    icon: "🌟",
    visual_style: { color: "#eab308" },
    award_type: "permanent",
    display_order: 17,
    is_active: true,
  },
  {
    id: "brainlab_og",
    name: "BrainLab OG",
    description: "Founding cohort member of BrainLab Academy.",
    category: "community",
    rarity: "legendary",
    icon: "🎖️",
    visual_style: { color: "#f43f5e" },
    award_type: "permanent",
    display_order: 18,
    is_active: true,
  },
  {
    id: "challenge_winner",
    name: "Challenge Arena Winner",
    description: "Triumphed in an official BrainLab Challenge Arena tournament.",
    category: "community",
    rarity: "epic",
    icon: "⚔️",
    visual_style: { color: "#f59e0b" },
    award_type: "permanent",
    display_order: 19,
    is_active: true,
  },

  // Membership & Verification
  {
    id: "premium_member",
    name: "Premium Member",
    description: "Active premium subscription tier holder.",
    category: "membership",
    rarity: "rare",
    icon: "💎",
    visual_style: { color: "#38bdf8", border: true },
    award_type: "entitlement",
    display_order: 20,
    is_active: true,
  },
  {
    id: "scholarship_recipient",
    name: "Scholarship Scholar",
    description: "Verified scholarship or institutional sponsored access.",
    category: "membership",
    rarity: "rare",
    icon: "🏛️",
    visual_style: { color: "#4ade80" },
    award_type: "entitlement",
    display_order: 21,
    is_active: true,
  },
  {
    id: "verified_student",
    name: "Verified Student",
    description: "Verified student status through school or institution credential.",
    category: "membership",
    rarity: "common",
    icon: "✓",
    visual_style: { color: "#3b82f6" },
    award_type: "entitlement",
    display_order: 22,
    is_active: true,
  },
];

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-300 bg-slate-50 text-slate-700",
  rare: "border-blue-400 bg-blue-50 text-blue-800",
  epic: "border-purple-400 bg-purple-50 text-purple-900 shadow-sm",
  legendary: "border-amber-400 bg-amber-50 text-amber-900 shadow-md",
};

export default function AchievementsPage() {
  const [, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [levels, setLevels] = useState<GamificationLevel[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadgeAward[]>([]);
  const [rewards, setRewards] = useState<GamificationReward[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "academic" | "consistency" | "community" | "membership"
  >("all");
  const [activeTab, setActiveTab] = useState<"badges" | "rewards">("badges");
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      if (!auth.user) {
        setLoading(false);
        return;
      }

      setUserId(auth.user.id);

      const [profData, lvlData, bData, rData, cData] = await Promise.all([
        getUserGamificationProfile(auth.user.id),
        getGamificationLevels(),
        getUserBadges(auth.user.id),
        getGamificationRewards(),
        getUserRewardClaims(auth.user.id),
      ]);

      if (!active) return;
      setProfile(profData);
      setLevels(lvlData);
      setEarnedBadges(bData);
      setRewards(rData);
      setClaims(cData);
      setLoading(false);
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  async function handleToggleFeatured(badgeId: string, current: boolean) {
    if (!userId) return;
    const nextVal = !current;
    // optimistic update
    setEarnedBadges((prev) =>
      prev.map((b) => (b.badge_id === badgeId ? { ...b, is_featured: nextVal } : b))
    );
    await toggleBadgeFeatured(badgeId, nextVal);
  }

  async function handleClaimReward(rewardId: string) {
    setClaimingId(rewardId);
    setNotice(null);
    const res = await claimReward(rewardId);
    if (res.ok) {
      setNotice({ type: "success", text: res.message });
      // refresh claims & profile
      if (userId) {
        const [newProf, newClaims] = await Promise.all([
          getUserGamificationProfile(userId),
          getUserRewardClaims(userId),
        ]);
        startTransition(() => {
          if (newProf) setProfile(newProf);
          setClaims(newClaims);
        });
      }
    } else {
      setNotice({ type: "error", text: res.message });
    }
    setClaimingId(null);
  }

  const earnedMap = new Map<string, UserBadgeAward>();
  earnedBadges.forEach((b) => earnedMap.set(b.badge_id, b));

  const filteredBadges = ALL_INITIAL_BADGES.filter(
    (b) => selectedCategory === "all" || b.category === selectedCategory
  );

  // Compute XP progress towards next level
  const currentLvl = profile?.current_level ?? 1;
  const currentXp = profile?.lifetime_xp ?? 0;
  const currentThreshold = levels.find((l) => l.level === currentLvl)?.min_xp ?? 0;
  const nextLevelObj = levels.find((l) => l.level === currentLvl + 1);
  const nextThreshold = nextLevelObj?.min_xp ?? (currentThreshold + 1000);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((currentXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <BrandHeader />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Header breadcrumb */}
          <div className="mb-6">
            <Link
              href="/profile"
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              ← Back to Profile
            </Link>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                  Academic Milestones &amp; Reputation
                </p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">
                  Achievements &amp; Rewards
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/leaderboard"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
                >
                  🏆 Global Leaderboard →
                </Link>
              </div>
            </div>
          </div>

          {notice && (
            <div
              className={`mb-6 rounded-2xl p-4 text-xs font-bold ${
                notice.type === "success"
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-rose-300 bg-rose-50 text-rose-900"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Gamification Progress Hero */}
          <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#071c43] via-[#0d2a63] to-[#011438] p-6 text-white shadow-xl sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-200">
                  ⭐ Current Rank: Level {currentLvl} · {profile?.level_name ?? "Beginner"}
                </span>

                <h2 className="mt-4 text-2xl font-black sm:text-3xl">
                  {currentXp.toLocaleString()} <span className="text-amber-400 font-bold text-lg">XP</span>
                </h2>
                <p className="mt-1 text-xs text-blue-100/80">
                  {nextLevelObj
                    ? `${(nextThreshold - currentXp).toLocaleString()} XP to Level ${nextLevelObj.level} (${nextLevelObj.name})`
                    : "You have reached the maximum level! You are a BrainLab Legend."}
                </p>

                {/* Progress bar */}
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold text-blue-200">
                  <span>Level {currentLvl}</span>
                  <span>{progressPercent}% Complete</span>
                  <span>Level {currentLvl + 1}</span>
                </div>
              </div>

              {/* Streaks & Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-3xl">🔥</span>
                  <p className="mt-2 text-2xl font-black text-rose-300">
                    {profile?.current_streak_days ?? 0}{" "}
                    <span className="text-xs font-medium text-slate-300">Days</span>
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Active Daily Streak</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-3xl">⚡</span>
                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {profile?.longest_streak_days ?? 0}{" "}
                    <span className="text-xs font-medium text-slate-300">Days</span>
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Longest Streak</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-3xl">💯</span>
                  <p className="mt-2 text-2xl font-black text-emerald-300">
                    {profile?.perfect_scores_count ?? 0}
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Perfect Scores</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <span className="text-3xl">🎖️</span>
                  <p className="mt-2 text-2xl font-black text-purple-300">
                    {earnedBadges.length} / {ALL_INITIAL_BADGES.length}
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Badges Unlocked</p>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Tabs */}
          <div className="mb-6 flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("badges")}
              className={`pb-3 px-4 text-sm font-extrabold transition border-b-2 ${
                activeTab === "badges"
                  ? "border-[#071c43] text-[#071c43]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              🏅 Badges &amp; Achievements ({earnedBadges.length})
            </button>
            <button
              onClick={() => setActiveTab("rewards")}
              className={`pb-3 px-4 text-sm font-extrabold transition border-b-2 ${
                activeTab === "rewards"
                  ? "border-[#071c43] text-[#071c43]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              🎁 Rewards Catalog &amp; Claims ({claims.length} claimed)
            </button>
          </div>

          {activeTab === "badges" && (
            <div>
              {/* Category Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "All Badges" },
                  { id: "academic", label: "Academic (7)" },
                  { id: "consistency", label: "Consistency (7)" },
                  { id: "community", label: "Community & Legacy (5)" },
                  { id: "membership", label: "Membership (3)" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      selectedCategory === cat.id
                        ? "bg-[#071c43] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Badges Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredBadges.map((badge) => {
                  const award = earnedMap.get(badge.id);
                  const isEarned = !!award;
                  const rarityStyle = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;

                  return (
                    <div
                      key={badge.id}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                        isEarned
                          ? `${rarityStyle} shadow-sm hover:shadow-md`
                          : "border-slate-200 bg-white/70 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl border ${
                              isEarned
                                ? "bg-white shadow-inner"
                                : "bg-slate-100 grayscale border-slate-200"
                            }`}
                          >
                            {badge.icon}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            {badge.rarity}
                          </span>
                        </div>

                        <h3 className="mt-3 text-sm font-black text-slate-900">
                          {badge.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {badge.description}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-slate-200/60 pt-3">
                        {isEarned ? (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-emerald-700">✓ Unlocked</span>
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(badge.id, award.is_featured)}
                              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                                award.is_featured
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                              title="Toggle featured badge beside your name"
                            >
                              {award.is_featured ? "⭐ Featured" : "Set Featured"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <span>🔒 Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "rewards" && (
            <div className="space-y-8">
              {/* Rewards Catalog */}
              <div>
                <h3 className="text-lg font-black text-slate-900">Redeemable Rewards</h3>
                <p className="text-xs text-slate-600">
                  Spend your earned XP to claim exclusive vanity items, discount vouchers, and verified diplomas.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {rewards.map((reward) => {
                    const canAfford = currentXp >= reward.cost_xp;
                    const meetsLevel = currentLvl >= reward.min_level;
                    const canClaim = canAfford && meetsLevel;

                    return (
                      <div
                        key={reward.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-black text-amber-800">
                              {reward.cost_xp} XP
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              Requires Level {reward.min_level}
                            </span>
                          </div>
                          <h4 className="mt-3 text-sm font-black text-slate-950">
                            {reward.title}
                          </h4>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {reward.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={!canClaim || claimingId === reward.id}
                            onClick={() => handleClaimReward(reward.id)}
                            className={`w-full rounded-xl py-2.5 text-xs font-bold transition ${
                              canClaim
                                ? "bg-[#071c43] text-white hover:bg-blue-900 shadow-sm"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {claimingId === reward.id
                              ? "Claiming..."
                              : !meetsLevel
                              ? `Locked (Level ${reward.min_level})`
                              : !canAfford
                              ? `Need ${(reward.cost_xp - currentXp).toLocaleString()} more XP`
                              : "Claim Reward →"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Claimed Inventory */}
              <div>
                <h3 className="text-lg font-black text-slate-900">Your Claimed Rewards Inventory</h3>
                <p className="text-xs text-slate-600">
                  Items, discount coupons, and certificates claimed with your XP.
                </p>

                {claims.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                    You have not claimed any rewards yet. Continue learning to earn XP!
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                    {claims.map((claim) => (
                      <div key={claim.id} className="flex flex-wrap items-center justify-between p-4 gap-3">
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {claim.reward?.title || "Exclusive Reward"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Claimed on {new Date(claim.claimed_at).toLocaleDateString()}
                          </p>
                        </div>
                        {claim.claim_data && (
                          <div className="rounded-lg bg-slate-50 px-3 py-1 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                            {String(claim.claim_data.coupon_code || claim.claim_data.cert_template || "Active")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
