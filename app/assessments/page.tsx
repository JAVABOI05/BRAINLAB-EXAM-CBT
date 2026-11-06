"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Assessment = {
  id: string;
  assessment_type: string;
  title: string;
  description: string | null;
  organisation_id: string | null;
  question_count: number;
  duration_seconds: number | null;
  max_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  access_code_required: boolean;
  result_release: string;
};

type FilterStatus = "all" | "available" | "upcoming" | "closed";
type FilterType = "all" | "competition" | "organisation_quiz" | "drill";

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        router.replace("/login?redirect=/assessments");
        return;
      }

      const [assessmentsRes, attemptsRes] = await Promise.all([
        supabase
          .from("learning_assessments")
          .select("id,assessment_type,title,description,organisation_id,question_count,duration_seconds,max_attempts,starts_at,ends_at,access_code_required,result_release")
          .eq("is_published", true)
          .order("starts_at", { ascending: true }),
        supabase
          .from("learning_practice_attempts")
          .select("assessment_id, status")
          .eq("user_id", auth.user.id)
          .not("assessment_id", "is", null),
      ]);

      if (!active) return;
      if (assessmentsRes.error) {
        setError("Could not load assessments. Check that you are signed in and the assessment system is available.");
      }

      setAssessments((assessmentsRes.data ?? []) as Assessment[]);

      // Group attempts by assessment_id
      const counts: Record<string, number> = {};
      if (attemptsRes.data) {
        for (const item of attemptsRes.data) {
          if (item.assessment_id) {
            counts[item.assessment_id] = (counts[item.assessment_id] || 0) + 1;
          }
        }
      }
      setAttemptCounts(counts);
      setLoading(false);
    }

    void load().catch(() => {
      if (active) {
        setError("Could not load assessments.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getStatus = (a: Assessment): "Available" | "Scheduled" | "Closed" => {
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return "Scheduled";
    if (a.ends_at && new Date(a.ends_at).getTime() <= now) return "Closed";
    return "Available";
  };

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const s = getStatus(a);
      if (statusTab === "available" && s !== "Available") return false;
      if (statusTab === "upcoming" && s !== "Scheduled") return false;
      if (statusTab === "closed" && s !== "Closed") return false;

      if (typeFilter !== "all") {
        if (typeFilter === "competition" && a.assessment_type !== "competition") return false;
        if (typeFilter === "organisation_quiz" && a.assessment_type !== "organisation_quiz") return false;
        if (typeFilter === "drill" && a.assessment_type !== "diagnostic_drill") return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(query);
        const matchesDesc = (a.description || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [assessments, statusTab, typeFilter, searchQuery, now]);

  const availableCount = assessments.filter((a) => getStatus(a) === "Available").length;
  const upcomingCount = assessments.filter((a) => getStatus(a) === "Scheduled").length;
  const closedCount = assessments.filter((a) => getStatus(a) === "Closed").length;
  const competitionCount = assessments.filter((a) => a.assessment_type === "competition").length;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#070e1b] text-slate-900 dark:text-slate-100 px-4 py-8 sm:px-6 lg:px-8 transition-colors">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hub Header & Hero Banner */}
        <header className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0a1529]/95 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Academic Assessment Hub
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Standardized Verification</span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                Quizzes, Drills &amp; National Competitions
              </h1>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Take verified subject assessments, timed school quizzes, and competitive exams. Results release per administrative rule; answer keys remain protected until final submission.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-3 gap-2.5 shrink-0">
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-center">
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{availableCount}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Available</p>
              </div>
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-center">
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{competitionCount}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Contests</p>
              </div>
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-center">
                <p className="text-lg font-black text-cyan-600 dark:text-cyan-400">{assessments.length}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
              <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                ← Student Dashboard
              </Link>
              <Link href="/self-practice" className="hover:text-slate-900 dark:hover:text-white transition">
                ⚡ Self-Paced Practice
              </Link>
              <Link href="/skills-passport" className="hover:text-slate-900 dark:hover:text-white transition">
                🏅 Skills Passport &amp; Badges
              </Link>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-800 dark:text-rose-300" role="alert">
            {error}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusTab("all")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusTab === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              All <span className="rounded-full bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.2 text-[10px]">{assessments.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("available")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusTab === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              Available Now <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 text-[10px]">{availableCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("upcoming")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusTab === "upcoming"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              Upcoming <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 text-[10px]">{upcomingCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("closed")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusTab === "closed"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              Past / Closed <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[10px]">{closedCount}</span>
            </button>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 hidden md:inline">Format:</span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                typeFilter === "all"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Formats
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("competition")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                typeFilter === "competition"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🏆 Contests
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("organisation_quiz")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                typeFilter === "organisation_quiz"
                  ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📝 School Quizzes
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0a1529] p-12 text-center text-xs font-semibold text-slate-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mb-3" />
            Loading assessment hub…
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0a1529] p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-2xl mb-3">
              🎯
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {statusTab === "all"
                ? "No published assessments found"
                : statusTab === "available"
                ? "No assessments currently open"
                : statusTab === "upcoming"
                ? "No upcoming scheduled assessments"
                : "No past assessments recorded"}
            </h2>
            <p className="mt-1.5 max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400">
              {statusTab === "available"
                ? "Check upcoming competitions or practice independently with custom question drills."
                : "When your institution or administrator schedules a quiz or competition, it will appear here."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/self-practice"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition shadow-xs"
              >
                Launch Self Practice →
              </Link>
              <Link
                href="/cbt"
                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                JAMB CBT Simulator
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredAssessments.map((a) => {
              const currentStatus = getStatus(a);
              const usedAttempts = attemptCounts[a.id] || 0;
              const hasAttemptsRemaining = usedAttempts < a.max_attempts;
              const canStart = currentStatus === "Available" && hasAttemptsRemaining;

              return (
                <article
                  key={a.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0a1529] p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div>
                    {/* Top Type & Status Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {a.assessment_type === "competition"
                          ? "🏆 National Contest"
                          : a.assessment_type === "diagnostic_drill"
                          ? "🎯 Diagnostic Drill"
                          : "📝 School Quiz"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          currentStatus === "Available"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : currentStatus === "Closed"
                            ? "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {currentStatus === "Available" ? "🟢 Open Now" : currentStatus}
                      </span>
                    </div>

                    {/* Title & Instructions */}
                    <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white leading-snug">
                      {a.title}
                    </h2>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {a.description || "Official assessment instructions are presented in the testing environment prior to timer commencement."}
                    </p>

                    {/* Metrics Pills */}
                    <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1">
                        📄 {a.question_count} questions
                      </span>
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1">
                        ⏱️ {a.duration_seconds ? `${Math.round(a.duration_seconds / 60)} mins` : "Untimed"}
                      </span>
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1">
                        🔁 {usedAttempts} / {a.max_attempts} attempts
                      </span>
                      {a.access_code_required && (
                        <span className="rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          🔑 Access PIN
                        </span>
                      )}
                    </div>

                    {/* Timeline Window */}
                    {(a.starts_at || a.ends_at) && (
                      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                        🗓️ {a.starts_at ? new Date(a.starts_at).toLocaleString() : "Opens immediately"} –{" "}
                        {a.ends_at ? new Date(a.ends_at).toLocaleString() : "No expiry"}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    <Link
                      aria-disabled={!canStart}
                      href={canStart ? `/assessments/${a.id}` : "#"}
                      className={`flex-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black transition active:scale-98 ${
                        canStart
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                          : "pointer-events-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {!hasAttemptsRemaining
                        ? "Attempts Completed"
                        : currentStatus === "Available"
                        ? "Enter Assessment Stage →"
                        : currentStatus === "Scheduled"
                        ? "Opens at Start Time"
                        : "Assessment Closed"}
                    </Link>

                    {/* Leaderboard Button */}
                    <Link
                      href={`/assessments/${a.id}/leaderboard`}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="View assessment standings and leaderboard"
                    >
                      🏆 Rankings
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
