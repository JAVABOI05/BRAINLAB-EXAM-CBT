"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { ListSkeleton } from "../components/SkeletonLoader";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.replace("/account?redirect=/notifications");
        return;
      }

      try {
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        });
        const json = await res.json();
        if (active && json.success) {
          setNotifications(json.notifications);
        }
      } catch (err) {
        console.warn("Error loading notifications:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNotifications();
    return () => {
      active = false;
    };
  }, [router]);

  const markAsRead = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ notificationId: id }),
    });
  };

  const markAllAsRead = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ markAll: true }),
    });
  };

  const filtered = notifications.filter((n) => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !n.is_read;
    return n.type === filterType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "class":
        return "📹";
      case "assignment":
        return "📝";
      case "announcement":
        return "📢";
      case "message":
        return "💬";
      case "billing":
        return "💳";
      default:
        return "🔔";
    }
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Activity & Updates
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Notification Centre</h1>
          <p className="text-xs text-slate-600 mt-1">
            Stay informed on live classes, assignment releases, tutor updates and subscription alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active-press"
            >
              Mark all as read
            </button>
          )}
          <Link
            href="/dashboard"
            className="rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-900 transition active-press hover-lift"
          >
            ← My Learning
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "class", label: "Classes" },
          { key: "assignment", label: "Assignments" },
          { key: "announcement", label: "Announcements" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition hover-lift active-press ${
              filterType === tab.key
                ? "bg-[#012153] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="pt-2 animate-fade-in-up">
            <ListSkeleton count={4} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <span className="text-3xl">📭</span>
            <h3 className="mt-2 text-base font-bold text-slate-900">No notifications</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              You are all caught up! When you have new classroom or course updates, they will appear here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.is_read) markAsRead(item.id);
              }}
              className={`rounded-2xl border p-4 transition flex items-start gap-3 cursor-pointer hover-lift active-press ${
                item.is_read
                  ? "border-slate-200 bg-white"
                  : "border-blue-200 bg-blue-50/40 shadow-xs"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                {getTypeIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.message}</p>

                {item.link_url && (
                  <div className="mt-2.5">
                    <Link
                      href={item.link_url}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                    >
                      View details →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
