"use client";

import React, { useEffect, useState } from "react";
import { trackEvent } from "@/app/lib/analytics";
import { CONTACT_CONFIG } from "@/app/lib/contactConfig";
import "./home-motion.css";

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
        {/* Broadcast ribbon: crisp navy card with an orange edge. WhatsApp green is used only for the channel icon and button. */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 border-l-4 border-l-[var(--bl-color-brand-orange)] bg-[#0B1426] p-4 sm:p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: icon and channel details */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bl-color-brand-channel,#25d366)] text-[#0B1536]">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-sm sm:text-base font-black text-white tracking-tight">
                    {channelName}
                  </span>
                  <span className="bl-home-tint-orange inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--bl-color-brand-orange)" }} />
                    Live alerts
                  </span>
                  {verifiedCount && (
                    <span className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-300">
                      <strong className="text-white mr-1">{verifiedCount}</strong> Active Candidates
                      {asOfDate && <span className="text-slate-400 font-normal ml-1">({asOfDate})</span>}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-snug mt-1">
                  {description}
                </p>
              </div>
            </div>

            {/* Right: action */}
            <div className="flex items-center gap-4 shrink-0">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick("whatsapp")}
                className="bl-focus-ring inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--bl-color-brand-channel,#25d366)] hover:brightness-105 px-5 py-3 text-sm font-black text-[#0B1536] transition-all active:scale-95 min-h-[48px]"
              >
                <span>Join Channel</span>
                <span aria-hidden="true">&rarr;</span>
              </a>

              {activePlatforms.length > 1 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-300">
                  {activePlatforms
                    .filter((p) => p.id !== "whatsapp")
                    .map((p) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleClick(p.id)}
                        className="underline underline-offset-4 hover:text-white"
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
