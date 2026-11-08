"use client";

import React from "react";
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
  channelName = "BrainLab Academy Official WhatsApp Channel",
  channelUrl = CONTACT_CONFIG.whatsapp.channelUrl,
  description = "Get daily CBT practice challenges, syllabus updates, exam registration alerts, and revision masterclass links delivered directly to your phone.",
  platforms = [
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
      enabled: false, // Disabled until approved
      url: "",
      description: "Community discussion and archives.",
    },
  ],
  onChannelClick,
  className = "",
}: HomeJoinChannelProps) {
  // If primary channel URL is missing or invalid, do not render block
  if (!isValidChannelUrl(channelUrl)) {
    return null;
  }

  // No-op analytics logger hook for prompt 12
  const handleClick = (platformId: string) => {
    try {
      if (typeof onChannelClick === "function") {
        onChannelClick(platformId);
      } else if (typeof window !== "undefined") {
        // Safe anonymous client-side telemetry event (no personal data)
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
      aria-label="Join Official BrainLab Channel"
      className={`relative w-full overflow-hidden border-y border-emerald-500/30 bg-emerald-950 py-12 text-white dark:border-emerald-500/20 dark:bg-[#03150e] sm:py-16 ${className}`}
    >
      {/* Background glow decoration */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,211,102,0.18),transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/80 via-emerald-950/90 to-slate-950 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Information Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OFFICIAL BROADCAST CHANNEL</span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                {channelName}
              </h2>

              <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
                {description}
              </p>

              {/* Verified Value Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-emerald-200/90">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Daily Question Drills &amp; Solutions</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>JAMB &amp; WAEC Official Timetable Alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Syllabus Breakdown Summaries</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Weekend Revision Masterclass Links</span>
                </div>
              </div>
            </div>

            {/* Action Column */}
            <div className="lg:col-span-4 flex flex-col items-stretch sm:items-start lg:items-end justify-center gap-3">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick("whatsapp")}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] px-7 py-4 text-base font-extrabold text-slate-950 shadow-xl transition-all duration-180 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] bl-focus-ring min-h-[52px]"
              >
                <svg
                  className="h-6 w-6 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.69.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z" />
                </svg>
                <span>Join Channel Now</span>
                <span className="text-slate-900" aria-hidden="true">↗</span>
              </a>

              {/* Multi-platform secondary links if enabled */}
              {activePlatforms.length > 1 && (
                <div className="flex items-center gap-3 text-xs text-emerald-300">
                  {activePlatforms
                    .filter((p) => p.id !== "whatsapp")
                    .map((p) => (
                      <a
                        key={p.id}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleClick(p.id)}
                        className="underline hover:text-white"
                      >
                        Join on {p.name} ↗
                      </a>
                    ))}
                </div>
              )}

              <p className="text-[11px] text-emerald-300/80 text-center sm:text-left lg:text-right">
                Free to join &bull; Instant WhatsApp notification
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
