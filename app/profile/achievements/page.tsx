"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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


function AchievementIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  switch (name) {
    case "trophy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" /><path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
        </svg>
      );
    case "medal":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="6" /><path d="m15.477 12.89 2.523 8.11-6-3-6 3 2.523-8.11" />
        </svg>
      );
    case "crown":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
      );
    case "target":
    case "bullseye":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "flame":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
        </svg>
      );
    case "zap":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "gift":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 12 20 22 4 22 4 12" /><rect width="20" height="5" x="2" y="7" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "book":
    case "cap":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "rocket":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "video":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
        </svg>
      );
    case "handshake":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2-2" /><path d="m18 10 1.4-1.4a1 1 0 0 0 0-1.4l-3-3a1 1 0 0 0-1.4 0L13.6 5.6" /><path d="m7 21 1.4-1.4a1 1 0 0 0 0-1.4l-2-2" /><rect x="2" y="6" width="9" height="9" rx="1" transform="rotate(45 6.5 10.5)" />
        </svg>
      );
    case "bulb":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
        </svg>
      );
    case "swords":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" />
        </svg>
      );
    case "diamond":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h12l4 6-10 12L2 9z" /><path d="M11 3 8 9l4 12 4-12-3-6" />
        </svg>
      );
    case "institution":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 21h18" /><path d="M5 21V10" /><path d="M19 21V10" /><path d="M9 21v-7" /><path d="M15 21v-7" /><path d="m2 10 10-6 10 6" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="6" /><path d="m15.477 12.89 2.523 8.11-6-3-6 3 2.523-8.11" />
        </svg>
      );
  }
}

const ALL_INITIAL_BADGES: BadgeDefinition[] = [
  // Academic
  {
    id: "top_student",
    name: "Top Student",
    description: "Verified top-performing learner across subject cohorts.",
    category: "academic",
    rarity: "legendary",
    icon: "trophy",
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
    icon: "medal",
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
    icon: "crown",
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
    icon: "bullseye",
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
    icon: "cap",
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
    icon: "book",
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
    icon: "star",
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
    icon: "zap",
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
    icon: "zap",
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
    icon: "flame",
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
    icon: "rocket",
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
    icon: "shield",
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
    icon: "target",
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
    icon: "video",
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
    icon: "handshake",
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
    icon: "bulb",
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
    icon: "star",
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
    icon: "medal",
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
    icon: "swords",
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
    icon: "diamond",
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
    icon: "institution",
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
    icon: "check",
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
                  <AchievementIcon name="trophy" className="h-4 w-4 inline mr-1 text-amber-300" />Global Leaderboard →
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
                  <AchievementIcon name="flame" className="h-8 w-8 text-rose-400 mx-auto" />
                  <p className="mt-2 text-2xl font-black text-rose-300">
                    {profile?.current_streak_days ?? 0}{" "}
                    <span className="text-xs font-medium text-slate-300">Days</span>
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Active Daily Streak</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <AchievementIcon name="zap" className="h-8 w-8 text-amber-400 mx-auto" />
                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {profile?.longest_streak_days ?? 0}{" "}
                    <span className="text-xs font-medium text-slate-300">Days</span>
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Longest Streak</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <AchievementIcon name="bullseye" className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="mt-2 text-2xl font-black text-emerald-300">
                    {profile?.perfect_scores_count ?? 0}
                  </p>
                  <p className="text-[11px] font-bold text-blue-200">Perfect Scores</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <AchievementIcon name="medal" className="h-8 w-8 text-purple-400 mx-auto" />
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
              <AchievementIcon name="medal" className="h-4 w-4 inline mr-1.5 text-blue-800" />Badges &amp; Achievements ({earnedBadges.length})
            </button>
            <button
              onClick={() => setActiveTab("rewards")}
              className={`pb-3 px-4 text-sm font-extrabold transition border-b-2 ${
                activeTab === "rewards"
                  ? "border-[#071c43] text-[#071c43]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <AchievementIcon name="gift" className="h-4 w-4 inline mr-1.5 text-blue-800" />Rewards Catalog &amp; Claims ({claims.length} claimed)
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
                            <AchievementIcon name={badge.icon} className="h-6 w-6 text-blue-700" />
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
                            <span className="font-extrabold text-emerald-700 inline-flex items-center gap-1"><AchievementIcon name="check" className="h-3 w-3" />Unlocked</span>
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
                              {award.is_featured ? "Featured" : "Set Featured"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <span className="inline-flex items-center gap-1"><AchievementIcon name="lock" className="h-3 w-3" />Locked</span>
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

          </div>
  );
}
