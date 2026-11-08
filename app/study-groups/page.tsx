"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Study Groups Route:
 * Sample data and localStorage study circles have been retired.
 * This route automatically forwards learners to the authoritative
 * Academic Cohorts & Communities Hub (/community).
 */
export default function StudyGroupsPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear legacy localStorage simulation key
    try {
      localStorage.removeItem("brainlab_joined_study_circles_v1");
    } catch {}
    // Seamless redirect to unified communities hub
    router.replace("/community");
  }, [router]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#070e1b] text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-[#0d1b2a] rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 text-2xl">
          👥
        </div>
        <h1 className="text-xl font-black text-slate-950 dark:text-white">
          Redirecting to Academic Communities…
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Study Groups have been upgraded to the authoritative Academic Cohorts &amp; Communities Hub with verified tutor supervision, curriculum alignment, and live schedule sync.
        </p>
        <Link
          href="/community"
          className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-black text-white transition shadow-sm"
        >
          Open Academic Communities →
        </Link>
      </div>
    </main>
  );
}
