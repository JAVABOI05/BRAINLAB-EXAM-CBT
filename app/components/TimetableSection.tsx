"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCalendarEvents, generateIcsContent, type CalendarEvent } from "../lib/calendarService";
import { toast } from "../lib/toast";
import { CardSkeleton } from "./SkeletonLoader";

const FILTER_LABELS: Record<string, string> = {
  all: "All Activities",
  class: "Live Classes",
  assignment: "Assignments",
  exam: "Mock Exams",
  revision: "Revisions",
};

export default function TimetableSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const data = await fetchCalendarEvents({ eventType: filterType });
      if (active) {
        setEvents(data);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [filterType]);

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return e.title.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q);
  });

  const downloadIcs = (event: CalendarEvent) => {
    const icsData = generateIcsContent(event);
    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar (.ics) downloaded for Google & Apple Calendar");
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "class":
        return "bg-blue-100 text-blue-900 border-blue-200";
      case "assignment":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "exam":
        return "bg-rose-100 text-rose-900 border-rose-200";
      case "revision":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Academy Timetable &amp; Schedule</h2>
          <p className="mt-1 text-sm text-slate-600">
            Interactive schedule of upcoming live classes, assignment deadlines, and mock CBT tests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-xs">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 capitalize transition ${
                  viewMode === mode
                    ? "bg-[#012153] text-white"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter:</span>
          {["all", "class", "assignment", "exam", "revision"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                filterType === type
                  ? "bg-[#012153] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {FILTER_LABELS[type] || type}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search classes &amp; events…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="pt-2">
          <CardSkeleton count={6} />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-3xl">📅</span>
          <h3 className="mt-3 text-lg font-bold text-slate-950">No events found</h3>
          <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
            There are no {filterType !== "all" ? filterType : ""} events matching your criteria right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            const isClass = event.event_type === "class";

            return (
              <div
                key={event.id}
                className="hover-lift flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${getEventBadge(
                        event.event_type
                      )}`}
                    >
                      {event.event_type}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {startDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-extrabold text-slate-950 leading-snug">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
                    {event.description || "BrainLab Academy scheduled learning activity."}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span>⏰</span>
                    <span>
                      {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 gap-2">
                  {event.location_url ? (
                    <Link
                      href={event.location_url}
                      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                        isClass ? "bg-[#012153] hover:bg-blue-900" : "bg-emerald-700 hover:bg-emerald-800"
                      }`}
                    >
                      {isClass ? "Join Classroom →" : "Open Activity →"}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Scheduled on platform</span>
                  )}

                  <button
                    onClick={() => downloadIcs(event)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    title="Add to Google Calendar / Apple Calendar"
                  >
                    <span>📥</span> .ics
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
