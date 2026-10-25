"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserBadges, type UserBadgeAward } from "../lib/gamification";

interface UserBadgesProps {
  userId?: string;
  badges?: UserBadgeAward[];
  maxVisible?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showOverflow?: boolean;
  interactive?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "h-4 w-4 text-[10px]",
  sm: "h-5 w-5 text-xs",
  md: "h-6 w-6 text-sm",
  lg: "h-8 w-8 text-base",
};

const RARITY_BORDER_MAP = {
  common: "border-slate-300 bg-slate-50 text-slate-700",
  rare: "border-blue-400 bg-blue-50 text-blue-700",
  epic: "border-purple-400 bg-purple-50 text-purple-700 shadow-sm",
  legendary: "border-amber-400 bg-amber-50 text-amber-800 shadow-[0_0_8px_rgba(245,158,11,0.35)]",
};

export default function UserBadges({
  userId,
  badges: initialBadges,
  maxVisible = 3,
  size = "sm",
  showOverflow = true,
  interactive = true,
  className = "",
}: UserBadgesProps) {
  const [fetchedBadges, setFetchedBadges] = useState<UserBadgeAward[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const badgeList = initialBadges ?? (userId ? fetchedBadges : []);
  const loading = !initialBadges && !!userId && loadedForUserId !== userId;

  useEffect(() => {
    if (initialBadges || !userId) return;
    let active = true;

    getUserBadges(userId)
      .then((result) => {
        if (active) {
          setFetchedBadges(result);
          setLoadedForUserId(userId);
        }
      })
      .catch(() => {
        if (active) {
          setFetchedBadges([]);
          setLoadedForUserId(userId);
        }
      });

    return () => {
      active = false;
    };
  }, [initialBadges, userId]);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="h-4 w-4 animate-pulse rounded-full bg-slate-200" />
      </span>
    );
  }

  if (!badgeList || badgeList.length === 0) {
    return null;
  }

  const visible = badgeList.slice(0, maxVisible);
  const overflowCount = badgeList.length - maxVisible;

  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`}>
      {visible.map((b) => {
        const rarityClass = RARITY_BORDER_MAP[b.rarity] || RARITY_BORDER_MAP.common;
        const isGlowing = b.visual_style?.glow;
        const hasFlame = b.visual_style?.flame;
        const hasSparkle = b.visual_style?.sparkle;

        return (
          <span
            key={b.badge_id}
            className="relative inline-flex items-center"
            onMouseEnter={() => interactive && setActiveTooltip(b.badge_id)}
            onMouseLeave={() => interactive && setActiveTooltip(null)}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full border transition-transform duration-150 hover:scale-110 ${SIZE_MAP[size]} ${rarityClass} ${
                isGlowing ? "ring-2 ring-amber-300 ring-offset-1" : ""
              } ${hasFlame ? "ring-2 ring-red-400 ring-offset-1" : ""} ${
                hasSparkle ? "ring-2 ring-purple-300 ring-offset-1 animate-pulse" : ""
              }`}
              title={`${b.name} (${b.rarity})`}
            >
              <span aria-hidden="true">{b.icon}</span>
            </span>

            {/* Tooltip */}
            {interactive && activeTooltip === b.badge_id && (
              <span
                role="tooltip"
                className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg pointer-events-none transition-opacity duration-150"
              >
                <span className="font-bold text-amber-300">{b.name}</span>
                <span className="mx-1 text-slate-400">·</span>
                <span className="capitalize text-slate-300">{b.rarity}</span>
                <span className="block max-w-[180px] truncate text-[10px] text-slate-300">
                  {b.description}
                </span>
              </span>
            )}
          </span>
        );
      })}

      {showOverflow && overflowCount > 0 && (
        <Link
          href="/profile/achievements"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
          title={`View ${overflowCount} more achievements`}
        >
          +{overflowCount}
        </Link>
      )}
    </span>
  );
}
