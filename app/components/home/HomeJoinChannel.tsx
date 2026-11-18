"use client";

import React, { useEffect, useState } from "react";
import { trackEvent } from "@/app/lib/analytics";
import { CONTACT_CONFIG } from "@/app/lib/contactConfig";

export interface ChannelPlatformConfig {
  id: "whatsapp" | "telegram";
  name: string;
  enabled: boolean;
  url: string;
  description: string;
}

export interface HomeJoinChannelProps {
  channelName?: string;
  channelUrl?: string;
  description?: string;
  platforms?: ChannelPlatformConfig[];
  onChannelClick?: (platformId: string) => void;
  className?: string;
}

/**
 * Validates external channel link URL format
 */
function isValidChannelUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function HomeJoinChannel({
  channelName: defaultChannelName = "Official WhatsApp Broadcast Channel",
  channelUrl: defaultChannelUrl = CONTACT_CONFIG.whatsapp.channelUrl,
  description = "Daily worked solutions, syllabus breakdowns & official UTME, O Level and Post-UTME updates delivered directly to your phone.",
  platforms: defaultPlatforms = [
    {
      id: "whatsapp",
      name: "WhatsApp Broadcast Channel",
      enabled: true,
      url: CONTACT_CONFIG.whatsapp.channelUrl,
      description: "Direct alerts and daily practice challenges.",
    },
    {
      id: "telegram",
      name: "Telegram Community",
      enabled: false,
      url: "",
      description: "Community discussion and archives.",
    },
  ],
  onChannelClick,
  className = "",
}: HomeJoinChannelProps) {
  const [channelName, setChannelName] = useState(defaultChannelName);
  const [channelUrl, setChannelUrl] = useState(defaultChannelUrl);
  const [verifiedCount, setVerifiedCount] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<ChannelPlatformConfig[]>(defaultPlatforms);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch("/api/admin/calendar")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.channelConfig) {
          const cfg = data.channelConfig;
          if (cfg.is_active === false || cfg.show_on_landing === false) {
            setVisible(false);
            return;
          }
          if (cfg.whatsapp_url) {
            setChannelUrl(cfg.whatsapp_url);
          }
          if (cfg.whatsapp_title) {
            setChannelName(cfg.whatsapp_title);
          }
          if (typeof cfg.verified_member_count === "number" && cfg.verified_member_count > 0) {
            setVerifiedCount(`${cfg.verified_member_count.toLocaleString("en-NG")}+`);
          }
          if (cfg.as_of_date) {
            setAsOfDate(cfg.as_of_date);
          }
          if (cfg.telegram_url) {
            setPlatforms([
              {
                id: "whatsapp",
                name: "WhatsApp Broadcast Channel",
                enabled: true,
                url: cfg.whatsapp_url || defaultChannelUrl,
                description: "Direct alerts and daily practice challenges.",
              },
              {
                id: "telegram",
                name: "Telegram Community",
                enabled: true,
                url: cfg.telegram_url,
                description: "Community discussion and archives.",
              },
            ]);
          }
        }
      })
      .catch(() => {
        // Fallback to static defaults
      });
  }, [defaultChannelUrl]);

  if (!visible) return null;

  // If primary channel URL is missing or invalid, do not render block
  if (!isValidChannelUrl(channelUrl)) {
    return null;
  }

  const handleClick = (platformId: string) => {
    try {
      trackEvent("channel_join_clicked", {
        channel: platformId,
        placement: "homepage_callout",
      });
      if (typeof onChannelClick === "function") {
        onChannelClick(platformId);
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("brainlab:channel-click", {
            detail: { platform: platformId, timestamp: Date.now() },
          })
        );
      }
    } catch {
      // Ignore telemetry errors
    }
  };

  const activePlatforms = platforms.filter(
    (p) => p.enabled && isValidChannelUrl(p.url)
  );

  return (
    <section
      aria-label="Join Official BrainLab WhatsApp Channel"
      className={`relative w-full py-4 sm:py-6 ${className}`}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Compact, High-Impact Broadcast Ribbon */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 dark:from-[#071328] dark:via-[#091b2c] dark:to-[#071328] p-3.5 sm:p-4 shadow-sm dark:shadow-xl">
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
            {/* Left: Icon & Channel Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-white/20">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping absolute" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-950 dark:text-white tracking-tight truncate">
                    {channelName}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE ALERTS
                  </span>
                  {verifiedCount && (
                    <span className="hidden sm:inline-flex items-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      &bull; <strong className="text-slate-900 dark:text-white ml-1">{verifiedCount}</strong>&nbsp;Active Candidates
                      {asOfDate && <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">({asOfDate})</span>}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug line-clamp-1 sm:line-clamp-none mt-0.5">
                  {description}
                </p>
              </div>
            </div>

            {/* Right: Compact Action Button */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <span className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Official &bull; Instant Updates
              </span>
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick("whatsapp")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 min-h-[44px]"
              >
                <span>Join Channel</span>
                <span aria-hidden="true">&rarr;</span>
              </a>

              {activePlatforms.length > 1 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                  {activePlatforms
                    .filter((p) => p.id !== "whatsapp")
                    .map((p) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleClick(p.id)}
                        className="underline hover:text-emerald-400"
                      >
                        {p.name} &nearr;
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
