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

  // CARD VARIANT (FOR DASHBOARD SIDEBAR / MODAL)
  if (variant === "card") {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20" aria-hidden="true">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
            </svg>
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
            Verified Broadcast Channel
          </span>
        </div>
        <h3 className="text-xl font-black">{channelTitle}</h3>
        <p className="mt-2 text-xs leading-relaxed text-emerald-100">
          Get daily syllabus revision questions, national exam timetable alerts, and direct tutor tips.
        </p>

        {formattedCount && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-950/40 px-3 py-1 text-[11px] font-bold text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{formattedCount} Active Candidates</span>
            {asOf && <span className="text-emerald-300/80 font-normal">({asOf})</span>}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-center text-xs font-black text-emerald-800 shadow transition-all hover:bg-emerald-50 active:scale-95"
          >
            <span>Join WhatsApp Channel</span>
            <span aria-hidden="true">&rarr;</span>
          </a>

          {config.telegram_url && (
            <a
              href={config.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-400/30 px-4 py-2 text-center text-xs font-bold text-emerald-100 transition-all"
            >
              <span>Join on Telegram</span>
            </a>
          )}
        </div>
      </div>
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
