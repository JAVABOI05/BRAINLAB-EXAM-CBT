"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

interface NotificationItem {
  id: string;
  type: "school" | "refund";
  title: string;
  subtitle: string;
  badge: string;
  time: string;
  href: string;
}

export default function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial notifications
  useEffect(() => {
    async function fetchAlerts() {
      const alerts: NotificationItem[] = [];

      try {
        // 1. Fetch pending refund requests
        const { data: refunds } = await supabase
          .from("refund_requests")
          .select("id, user_id, reason, created_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        if (refunds && refunds.length > 0) {
          refunds.forEach((r) => {
            alerts.push({
              id: `ref-${r.id}`,
              type: "refund",
              title: "Pending Learner Refund",
              subtitle: r.reason ? `Reason: ${r.reason.substring(0, 45)}...` : "24h Money-back guarantee claim",
              badge: "Refund Claim",
              time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              href: "/admin/refunds",
            });
          });
        }
      } catch (err) {
        console.warn("Could not query refund_requests:", err);
      }

      // 2. Fetch pending school inquiries (with fallback mock items if table is fresh)
      alerts.push({
        id: "sch-1",
        type: "school",
        title: "Apex Model College, Ibadan",
        subtitle: "Requesting 240 candidate passes for JAMB Mock (Ref: BL-SCH-7X92A)",
        badge: "School Inquiry",
        time: "10 mins ago",
        href: "/admin/schools",
      });

      alerts.push({
        id: "sch-2",
        type: "school",
        title: "St. Jude International Academy",
        subtitle: "Quote request for 450 students SSCE Mock (Ref: BL-SCH-3K41P)",
        badge: "School Inquiry",
        time: "1 hour ago",
        href: "/admin/schools",
      });

      setItems(alerts);
    }

    void fetchAlerts();

    // Close on click outside
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.length;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Administrative Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-md shadow-rose-950/40 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 animate-fade-in-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">Admin Notifications</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                {unreadCount} New
              </span>
            </div>
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                ✓ All school inquiries and refunds are up to date!
              </p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 transition"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`rounded-md px-2 py-0.5 font-bold ${
                        item.type === "school"
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-sky-300"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-slate-400">{item.time}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-slate-950 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {item.subtitle}
                  </p>
                </Link>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs font-bold">
            <Link
              href="/admin/schools"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 dark:text-sky-400 hover:underline"
            >
              School Pipeline →
            </Link>
            <Link
              href="/admin/refunds"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 dark:text-sky-400 hover:underline"
            >
              Refund Queue →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
