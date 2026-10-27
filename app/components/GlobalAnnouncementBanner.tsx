"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Announcement {
  enabled: boolean;
  message: string;
  severity: "info" | "warning" | "urgent" | "success";
  dismissible: boolean;
  link_url?: string;
  link_label?: string;
}

export default function GlobalAnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkBanner() {
      try {
        const res = await fetch("/api/announcements/active");
        const data = await res.json();
        if (!active) return;

        if (res.ok && data.ok && data.announcement) {
          const ann = data.announcement as Announcement;
          // Check session storage if dismissed during this visit
          const isDismissed = sessionStorage.getItem(`banner_dismissed_${ann.message.slice(0, 20)}`);
          if (!isDismissed) {
            setAnnouncement(ann);
          }
        }
      } catch {
        // Fallback silently
      }
    }

    checkBanner();

    return () => {
      active = false;
    };
  }, []);

  if (!announcement || dismissed) return null;

  const severityStyles = {
    info: "bg-blue-600 text-white",
    warning: "bg-amber-500 text-slate-950 font-medium",
    urgent: "bg-rose-600 text-white font-bold animate-pulse",
    success: "bg-emerald-600 text-white",
  };

  function handleDismiss() {
    if (announcement) {
      sessionStorage.setItem(`banner_dismissed_${announcement.message.slice(0, 20)}`, "true");
    }
    setDismissed(true);
  }

  return (
    <aside
      role="banner"
      aria-label="Site announcement"
      className={`relative z-40 px-4 py-2 text-xs transition-all ${severityStyles[announcement.severity] || severityStyles.info}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-center gap-2 text-center sm:text-left">
          <span>
            {announcement.severity === "urgent"
              ? "🚨"
              : announcement.severity === "warning"
              ? "⚠️"
              : announcement.severity === "success"
              ? "🎉"
              : "📢"}
          </span>
          <p className="inline leading-tight">{announcement.message}</p>

          {announcement.link_url && (
            <Link
              href={announcement.link_url}
              className="ml-2 inline-flex items-center gap-1 underline font-black hover:opacity-80"
            >
              {announcement.link_label || "Learn More →"}
            </Link>
          )}
        </div>

        {announcement.dismissible && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="rounded p-1 hover:bg-black/10 active:scale-95 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>
    </aside>
  );
}
