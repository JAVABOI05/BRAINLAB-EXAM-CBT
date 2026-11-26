"use client";

import { useEffect, useState } from "react";
import { CANONICAL_WHATSAPP_CHANNEL } from "../lib/contactConfig";
import { type ChannelConfig, DEFAULT_CHANNEL_CONFIG } from "../lib/services/examCalendarService";

interface WhatsAppChannelHeroBannerProps {
  initialConfig?: ChannelConfig | null;
  memberCountClaim?: string | null;
  asOfDate?: string | null;
  variant?: "full-hero" | "card";
}

export default function WhatsAppChannelHeroBanner({
  initialConfig,
  memberCountClaim,
  asOfDate: initialAsOfDate,
  variant = "full-hero",
}: WhatsAppChannelHeroBannerProps) {
  const [config, setConfig] = useState<ChannelConfig>(() => initialConfig || DEFAULT_CHANNEL_CONFIG);

  useEffect(() => {
    if (!initialConfig) {
      // Fetch channel config from public exam calendar endpoint if not provided via props
      fetch("/api/admin/calendar")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.channelConfig) {
            setConfig(data.channelConfig);
          }
        })
        .catch(() => {
          // Use default
        });
    }
  }, [initialConfig]);

  // Visibility checks
  if (config.is_active === false) return null;
  if (variant === "full-hero" && config.show_on_landing === false) return null;
  if (variant === "card" && config.show_on_dashboard === false) return null;

  const targetUrl = config.whatsapp_url || CANONICAL_WHATSAPP_CHANNEL;
  const channelTitle = config.whatsapp_title || "Official WhatsApp Community";

  // Rule S7: Verified member count displayed ONLY if provided and non-null
  const formattedCount =
    typeof config.verified_member_count === "number" && config.verified_member_count > 0
      ? `${config.verified_member_count.toLocaleString("en-NG")}+`
      : memberCountClaim && memberCountClaim.trim()
      ? memberCountClaim.trim()
      : null;

  const asOf = config.as_of_date || initialAsOfDate || null;

  // CARD VARIANT (FOR DASHBOARD ROW - COMPACT PROFILE MATCHING EXAM COUNTDOWN BANNER)
  if (variant === "card") {
    return (
      <aside
        aria-label="Official WhatsApp Broadcast Channel"
        className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-emerald-950/90 dark:from-white/[0.08] dark:via-emerald-950/40 dark:to-white/[0.05] p-3 sm:p-4 text-white shadow-xl backdrop-blur-xl transition-all h-full flex flex-col justify-center"
      >
        {/* Ambient subtle light sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent opacity-80"
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-inner backdrop-blur-md"
              aria-hidden="true"
            >
              <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                  Broadcast Channel
                </span>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 motion-reduce:animate-none animate-ping" />
              </div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white mt-0.5 truncate">
                {channelTitle}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black px-3.5 py-1.5 text-xs shadow-md transition active:scale-95 shrink-0"
            >
              <span>Join Channel</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </aside>
    );
  }

  // FULL HERO BANNER VARIANT (LANDING PAGE - DIRECTLY BENEATH HERO)
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-300/80 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-7 text-white shadow-xl shadow-emerald-900/10">
        {/* Subtle Ambient Glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5 sm:gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-md">
              <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
              </svg>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 motion-reduce:animate-none animate-pulse" />
                  {channelTitle}
                </span>

                {/* Rule S7: Verified count displayed only when available */}
                {formattedCount && (
                  <span className="text-[11px] font-semibold text-emerald-100">
                    {formattedCount} Active Candidates {asOf ? `(${asOf})` : ""}
                  </span>
                )}
              </div>

              <h2 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-white">
                Never Miss a National Exam Notice or Daily Practice Drill
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/95 leading-relaxed max-w-xl">
                Real-time examination timetable alerts, syllabus revision notes, and post-exam step-by-step corrections broadcasted directly to your phone.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white hover:bg-emerald-50 px-6 py-3 text-xs sm:text-sm font-black text-emerald-800 shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Join WhatsApp Channel</span>
              <span aria-hidden="true">&rarr;</span>
            </a>

            {config.telegram_url && (
              <a
                href={config.telegram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-300/40 px-4 py-3 text-xs sm:text-sm font-bold text-white transition-all"
              >
                <span>Telegram</span>
              </a>
            )}

            <span className="text-[11px] text-center text-emerald-200/90 font-medium">
              Free &bull; Instant Access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
