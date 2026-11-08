"use client";

import { DEFAULT_WHATSAPP_CHANNEL } from "@/app/lib/whatsapp";

export default function PrototypeJoinChannel() {
  const channelUrl = DEFAULT_WHATSAPP_CHANNEL;

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-emerald-950/90 py-16 text-white sm:py-20 dark:border-slate-800 dark:bg-[#041a12]">
      {/* Background emerald radial aura */}
      <div className="absolute inset-0 bg-radial from-[#25D366]/15 via-transparent to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/60 to-slate-950/80 p-8 sm:p-12 lg:p-14 backdrop-blur-md shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Value Proposition Column */}
            <div className="lg:col-span-8">
              {/* WhatsApp Verified Community Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/80 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-[#25D366] animate-pulse" />
                <span>Official BrainLab Academy Broadcast Channel</span>
              </div>

              <h2 className="mt-4 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Get Daily UTME Past Questions &amp; Verified Exam Updates on WhatsApp.
              </h2>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-emerald-100/90 max-w-2xl">
                Never miss an official JAMB announcement. Join thousands of ambitious Nigerian secondary and tertiary entrance candidates receiving daily worked solutions, syllabus breakdowns, and exam tips directly in WhatsApp.
              </p>

              {/* 4 Concrete Subscriber Benefits */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-[#25D366] font-bold">✓</span>
                  <span className="text-xs sm:text-sm text-emerald-50">
                    Daily 4-subject past question drills with step-by-step answers
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#25D366] font-bold">✓</span>
                  <span className="text-xs sm:text-sm text-emerald-50">
                    Verified JAMB, WAEC &amp; NECO registration deadlines
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#25D366] font-bold">✓</span>
                  <span className="text-xs sm:text-sm text-emerald-50">
                    High-yield topic revision checklists &amp; summary PDFs
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[#25D366] font-bold">✓</span>
                  <span className="text-xs sm:text-sm text-emerald-50">
                    Zero spam: official academic announcements only
                  </span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-2 inline-block">
                <span className="text-[11px] font-medium text-emerald-300">
                  DESIGN PLACEHOLDER: Subscriber count dynamically links to official verified WhatsApp Broadcast Channel.
                </span>
              </div>
            </div>

            {/* Direct Channel Call to Action Column */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center text-center">
              <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-slate-900/90 p-6 sm:p-7 shadow-xl">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg">
                  <svg className="h-8 w-8 fill-current" viewBox="0 0 24 24">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 17.5c-1.49 0-2.95-.4-4.22-1.16l-.3-.18-3.13.82.84-3.05-.2-.31a8.13 8.13 0 01-1.25-4.32c0-4.5 3.66-8.16 8.16-8.16 2.18 0 4.23.85 5.77 2.39 1.54 1.54 2.39 3.59 2.39 5.77 0 4.5-3.66 8.16-8.16 8.16z" />
                  </svg>
                </div>

                <h3 className="mt-4 text-lg font-bold text-white">
                  Join BrainLab on WhatsApp
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Instant free access. One click to subscribe.
                </p>

                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-black text-slate-950 shadow-md transition-all hover:bg-[#20ba5a] hover:shadow-lg focus:outline-hidden focus:ring-2 focus:ring-[#25D366]"
                >
                  <span>Follow WhatsApp Channel</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>

                <p className="mt-3 text-[10px] text-slate-400">
                  Free and low-data. Safe, broadcast-only channel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
