"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface ActiveUserPresence {
  user_id: string;
  status: "online" | "offline" | "away" | "in_class";
  custom_status?: string | null;
  current_class_id?: string | null;
  last_heartbeat_at: string;
  display_name: string;
  role: "admin" | "tutor" | "student";
  avatar_url?: string | null;
  activity_context?: string;
}

interface OnlineRosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  users: ActiveUserPresence[];
  onlineCount: number;
  inClassCount: number;
  tutorCount: number;
  currentUserId?: string;
}

export default function OnlineRosterDrawer({
  isOpen,
  onClose,
  users,
  onlineCount,
  inClassCount,
  tutorCount,
  currentUserId,
}: OnlineRosterDrawerProps) {
  const [filterRole, setFilterRole] = useState<"all" | "tutors" | "students">("all");
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = users.filter((u) => {
    if (filterRole === "tutors" && u.role !== "tutor" && u.role !== "admin") return false;
    if (filterRole === "students" && u.role !== "student") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.display_name.toLowerCase().includes(q) ||
        (u.custom_status && u.custom_status.toLowerCase().includes(q)) ||
        (u.activity_context && u.activity_context.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#061a3a] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-base font-black">Community Presence</h2>
              <p className="text-xs text-cyan-200">
                {onlineCount} Active ({tutorCount} Tutors · {inClassCount} in Class)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-3">
          <input
            type="text"
            placeholder="Search active peers or tutors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
          />

          <div className="flex gap-1.5 text-xs font-bold text-slate-600">
            <button
              onClick={() => setFilterRole("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterRole === "all" ? "bg-[#012153] text-white" : "bg-white border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setFilterRole("tutors")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterRole === "tutors" ? "bg-[#012153] text-white" : "bg-white border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Tutors ({tutorCount})
            </button>
            <button
              onClick={() => setFilterRole("students")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterRole === "students" ? "bg-[#012153] text-white" : "bg-white border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Learners ({users.filter((u) => u.role === "student").length})
            </button>
          </div>
        </div>

        {/* Roster List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              No active users found matching your filter.
            </div>
          ) : (
            filtered.map((user) => {
              const isSelf = user.user_id === currentUserId;
              const isTutor = user.role === "tutor" || user.role === "admin";
              const inClass = user.status === "in_class" || Boolean(user.current_class_id);

              return (
                <div
                  key={user.user_id}
                  className={`rounded-2xl border p-3 transition flex items-center justify-between gap-3 ${
                    isSelf
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-black text-xs ${
                          isTutor ? "bg-[#012153] text-cyan-200" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {user.display_name} {isSelf && "(You)"}
                        </span>
                        {isTutor && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-900">
                            Tutor
                          </span>
                        )}
                        {inClass && (
                          <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-800 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                            Live Class
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {user.custom_status || user.activity_context || "Active now"}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <Link
                      href={`/messages?recipientId=${user.user_id}`}
                      onClick={onClose}
                      className="shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-blue-600 hover:text-white transition shadow-sm"
                      title="Send private direct message"
                    >
                      Chat
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between text-xs text-slate-500">
          <span>Updates automatically every 45s</span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
