"use client";

import React, { useState } from "react";
import { getCuratedAvatar, type StudentProfileData } from "../../lib/studentProfile";

interface StudentAvatarProps {
  profile?: StudentProfileData | null;
  avatarUrl?: string;
  customAvatarId?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showOnlineDot?: boolean;
  className?: string;
}

const SIZE_CONFIGS = {
  xs: {
    container: "h-6 w-6 rounded-lg text-[10px]",
    dot: "h-2 w-2 border",
    emoji: "text-xs",
  },
  sm: {
    container: "h-8 w-8 rounded-xl text-xs",
    dot: "h-2.5 w-2.5 border-[1.5px]",
    emoji: "text-sm",
  },
  md: {
    container: "h-11 w-11 rounded-2xl text-sm",
    dot: "h-3 w-3 border-2",
    emoji: "text-xl",
  },
  lg: {
    container: "h-16 w-16 rounded-[1.35rem] text-xl",
    dot: "h-4 w-4 border-2",
    emoji: "text-3xl",
  },
  xl: {
    container: "h-24 w-24 rounded-[1.8rem] text-3xl",
    dot: "h-5 w-5 border-2",
    emoji: "text-5xl",
  },
};

export function StudentAvatar({
  profile,
  avatarUrl: propAvatarUrl,
  customAvatarId: propAvatarId,
  name: propName,
  size = "md",
  showOnlineDot = false,
  className = "",
}: StudentAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const effectiveAvatarUrl = propAvatarUrl ?? profile?.avatarUrl ?? "";
  const effectiveAvatarId = propAvatarId ?? profile?.customAvatarId ?? "";
  const effectiveName = propName ?? profile?.displayName ?? "Student";

  const initials =
    profile?.initials ??
    (effectiveName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || effectiveName.charAt(0)?.toUpperCase() || "BL");

  const curated = effectiveAvatarId ? getCuratedAvatar(effectiveAvatarId) : undefined;
  const isHttpImage = Boolean(
    effectiveAvatarUrl &&
    typeof effectiveAvatarUrl === "string" &&
    /^https?:\/\//i.test(effectiveAvatarUrl) &&
    !imgError
  );

  const sizeCfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {/* 1. Real Uploaded / OAuth Image */}
      {isHttpImage ? (
        <div
          className={`overflow-hidden border border-white/20 bg-slate-900 shadow-sm ring-1 ring-blue-500/20 ${sizeCfg.container}`}
        >
          <img
            src={effectiveAvatarUrl}
            alt={effectiveName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : curated ? (
        /* 2. Curated Academic Scholar Avatar */
        <div
          className={`flex items-center justify-center bg-gradient-to-tr ${curated.gradient} shadow-md border border-white/20 ${sizeCfg.container}`}
          title={`${effectiveName} (${curated.name})`}
        >
          <span className={`leading-none drop-shadow-sm select-none ${sizeCfg.emoji}`}>
            {curated.emoji}
          </span>
        </div>
      ) : (
        /* 3. Modern Sleek Initials Fallback */
        <div
          className={`flex items-center justify-center bg-gradient-to-tr from-[#012153] via-blue-700 to-cyan-500 font-black text-white shadow-md border border-white/15 uppercase tracking-wider ${sizeCfg.container}`}
          title={effectiveName}
        >
          {initials}
        </div>
      )}

      {/* Online / Active Indicator Dot */}
      {showOnlineDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex"
          title="Active Learner Session"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span
            className={`relative inline-flex rounded-full bg-emerald-500 border-white dark:border-slate-900 ${sizeCfg.dot}`}
          />
        </span>
      )}
    </div>
  );
}

export default StudentAvatar;
