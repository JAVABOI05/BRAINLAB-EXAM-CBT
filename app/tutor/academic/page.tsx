"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";

type SubjectStat = {
  name: string;
  questionCount: number;
};

export default function TutorAcademicPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/academic");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }

        // Fetch subject statistics
        fetch("/api/admin/subjects")
          .then((r) => r.json())
          .then((res) => {
            if (active && res.ok && Array.isArray(res.subjectStats)) {
              setSubjectStats(res.subjectStats);
              const total = res.subjectStats.reduce((sum: number, s: SubjectStat) => sum + (s.questionCount || 0), 0);
              setTotalQuestions(total);
            }
          })
          .catch(() => {});
      } catch {}
      finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Institution Intelligence
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Academic Directory &amp; Subject Coverage
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time syllabus and question repository distribution across all BrainLab departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tutor/questions"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            📋 Open Question Bank
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-black uppercase text-slate-400">Total Tracked Subjects</span>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{subjectStats.length}</div>
          <p className="mt-1 text-[11px] text-slate-500">JAMB, WAEC, NECO &amp; Science curricula</p>
        </div>

        <div className="rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-black uppercase text-slate-400">Total Ingested Questions</span>
          <div className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">{totalQuestions}</div>
          <p className="mt-1 text-[11px] text-slate-500">Live questions deployed for candidate examinations</p>
        </div>

        <div className="rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-black uppercase text-slate-400">Average Questions / Subject</span>
          <div className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {subjectStats.length > 0 ? Math.round(totalQuestions / subjectStats.length) : 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Repository coverage metric</p>
        </div>
      </div>

      {/* Subjects Question Distribution Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Question Bank Statistics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjectStats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{stat.name}</h4>
                <span className="text-[10px] text-slate-500">Active Subject</span>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {stat.questionCount} Questions
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
