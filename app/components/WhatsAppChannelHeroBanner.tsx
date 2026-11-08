"use client";

import { CANONICAL_WHATSAPP_CHANNEL, CANONICAL_PHONE_DISPLAY } from "../lib/contactConfig";

interface WhatsAppChannelHeroBannerProps {
  memberCountClaim?: string;
  variant?: "full-hero" | "card";
}

export default function WhatsAppChannelHeroBanner({
  memberCountClaim = "15,000+",
  variant = "full-hero",
}: WhatsAppChannelHeroBannerProps) {
  if (variant === "card") {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
            </svg>
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
            Verified Broadcast Channel
          </span>
        </div>
        <h3 className="text-xl font-black">BrainLab Study Community</h3>
        <p className="mt-2 text-xs leading-relaxed text-emerald-100">
          Get daily syllabus revision questions, UTME notices, and direct tutor tips.
        </p>
        <a
          href={CANONICAL_WHATSAPP_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-center text-xs font-black text-emerald-800 shadow transition-all hover:bg-emerald-50 active:scale-95"
        >
          <span>Join WhatsApp Channel</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    );
  }

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
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Official WhatsApp Community
                </span>
                <span className="text-[11px] font-semibold text-emerald-100">
                  {memberCountClaim} Active Nigerian Candidates
                </span>
              </div>

              <h2 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-white">
                Never Miss a JAMB Notice or Daily Practice Drill
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100/95 leading-relaxed max-w-xl">
                Real-time examination timetable alerts, subject revision notes, and post-exam derivations broadcasted directly to your phone. Zero spam.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <a
              href={CANONICAL_WHATSAPP_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white hover:bg-emerald-50 px-6 py-3 text-xs sm:text-sm font-black text-emerald-800 shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Join WhatsApp Channel</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
            <span className="text-[11px] text-center text-emerald-200/90 font-medium">
              Free &bull; Instant Access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
