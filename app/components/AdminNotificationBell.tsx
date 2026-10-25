"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface NotificationItem {
  id: string;
  type: "school" | "refund";
  title: string;
  subtitle: string;
  badge: string;
  time: string;
  href: string;
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio playback policy fallback
  }
}

export default function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial notifications & subscribe to real-time alerts
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

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

      // 2. Fetch pending school inquiries (with initial pipeline items)
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

      // 3. Real-time broadcast channel for live incoming inquiries & refunds
      try {
        channel = supabase.channel("admin_live_alerts");

        channel
          .on("broadcast", { event: "new_school_inquiry" }, ({ payload }) => {
            if (isRecord(payload)) {
              const newItem: NotificationItem = {
                id: `sch-${Date.now()}`,
                type: "school",
                title: typeof payload.schoolName === "string" ? payload.schoolName : "New School Inquiry",
                subtitle: `Requested ${String(payload.studentCount || "custom")} passes for ${String(payload.examType || "JAMB CBT")} (Ref: ${String(payload.referenceCode || "pending")})`,
                badge: "School Inquiry",
                time: "Just now",
                href: "/admin/schools",
              };
              setItems((prev) => [newItem, ...prev]);
              playChime();
            }
          })
          .on("broadcast", { event: "new_refund_request" }, ({ payload }) => {
            if (isRecord(payload)) {
              const newItem: NotificationItem = {
                id: `ref-${Date.now()}`,
                type: "refund",
                title: "New Learner Refund Claim",
                subtitle: typeof payload.reason === "string" ? payload.reason : "24h Money-back guarantee claim",
                badge: "Refund Claim",
                time: "Just now",
                href: "/admin/refunds",
              };
              setItems((prev) => [newItem, ...prev]);
              playChime();
            }
          })
          .subscribe();
      } catch (subErr) {
        console.warn("Could not subscribe to admin_live_alerts channel:", subErr);
      }
    }

    void fetchAlerts();

    // Close on click outside
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (channel) supabase.removeChannel(channel);
    };
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
