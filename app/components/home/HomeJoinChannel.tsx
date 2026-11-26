"use client";

import React, { useEffect, useState } from "react";
import { trackEvent } from "@/app/lib/analytics";
import { CONTACT_CONFIG } from "@/app/lib/contactConfig";
import { useScrollReveal } from "@/app/lib/useScrollReveal";

export interface HomeJoinChannelProps {
  channelUrl?: string;
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
  channelUrl: defaultChannelUrl = CONTACT_CONFIG.whatsapp.channelUrl,
  className = "",
}: HomeJoinChannelProps) {
  const [channelUrl, setChannelUrl] = useState(defaultChannelUrl);
  const [visible, setVisible] = useState(true);
  const { ref, isRevealed } = useScrollReveal();

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
        }
      })
      .catch(() => {
        // Fallback to static default
      });
  }, [defaultChannelUrl]);

  if (!visible) return null;

  if (!isValidChannelUrl(channelUrl)) {
    return null;
  }

  const handleClick = () => {
    try {
      trackEvent("channel_join_clicked", {
        channel: "whatsapp",
        placement: "homepage_callout",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("brainlab:channel-click", {
            detail: { platform: "whatsapp", timestamp: Date.now() },
          })
        );
      }
    } catch {
      // Ignore telemetry errors
    }
  };

  return (
    <section
      aria-labelledby="join-channel-heading"
      className={`relative overflow-hidden bg-white dark:bg-[#060D20] text-slate-900 dark:text-white py-14 sm:py-20 border-t border-slate-200/80 dark:border-white/5 transition-colors duration-200 ${className}`}
    >
      <div
        ref={ref}
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bl-reveal-init ${isRevealed ? "bl-reveal-visible" : ""}`}
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-4 ring-emerald-500/10">
            <svg
              className="h-7 w-7"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
            </svg>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>OFFICIAL BROADCAST CHANNEL</span>
          </span>

          <h2
            id="join-channel-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Join our official WhatsApp channel
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Get daily worked solutions, syllabus breakdowns, and official UTME, O Level, and Post-UTME updates sent straight to your phone.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 sm:py-4 text-base sm:text-lg shadow-lg shadow-emerald-600/25 transition-all duration-200 active:scale-95 group min-h-[44px] min-w-[220px] bl-focus-ring"
            >
              <span>Join WhatsApp Channel</span>
              <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                &rarr;
              </span>
            </a>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Free to join &bull; Official examination alerts &bull; No spam
          </p>
        </div>
      </div>
    </section>
  );
}
