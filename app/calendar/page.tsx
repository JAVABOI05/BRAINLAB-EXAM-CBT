"use client";

import Link from "next/link";
import TimetableSection from "../components/TimetableSection";

export default function CalendarPage() {
  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-900">
            Academy Timetable
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Timetable &amp; Schedule</h1>
        </div>
        <Link
          href="/learn"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
        >
          ← Return to Learning Hub
        </Link>
      </div>

      <TimetableSection />
    </main>
  );
}
