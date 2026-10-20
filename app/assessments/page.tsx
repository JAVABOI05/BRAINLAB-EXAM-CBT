"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type FilterTab = "all" | "available" | "upcoming" | "closed";

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !auth.user) {
        router.replace("/account");
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
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const getStatus = (a: Assessment): "Available" | "Scheduled" | "Closed" => {
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return "Scheduled";
    if (a.ends_at && new Date(a.ends_at).getTime() <= now) return "Closed";
    return "Available";
  };

  const filteredAssessments = assessments.filter((a) => {
    const s = getStatus(a);
    if (activeTab === "available") return s === "Available";
    if (activeTab === "upcoming") return s === "Scheduled";
    if (activeTab === "closed") return s === "Closed";
    return true;
  });

  const availableCount = assessments.filter((a) => getStatus(a) === "Available").length;
  const upcomingCount = assessments.filter((a) => getStatus(a) === "Scheduled").length;
  const closedCount = assessments.filter((a) => getStatus(a) === "Closed").length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-7 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">BrainLab Academy</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Quizzes &amp; Competitions</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Published organisation quizzes and competition assessments available to your account. Some assessments require an access code; question papers do not include answer keys before submission.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/dashboard" className="text-indigo-700 hover:text-indigo-900">← Learner dashboard</Link>
            <Link href="/self-practice" className="text-slate-600 hover:text-slate-900">Self Practice →</Link>
            <Link href="/account/access" className="text-slate-600 hover:text-slate-900">My Access &amp; Entitlements →</Link>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
            {error}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "all"
                ? "bg-indigo-700 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-xs">{assessments.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "available"
                ? "bg-indigo-700 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Available Now <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs">{availableCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "upcoming"
                ? "bg-indigo-700 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Upcoming <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">{upcomingCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("closed")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "closed"
                ? "bg-indigo-700 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Past / Closed <span className="rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 text-xs">{closedCount}</span>
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading assessments…
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === "all"
                ? "No published assessments yet"
                : activeTab === "available"
                ? "No assessments currently open"
                : activeTab === "upcoming"
                ? "No scheduled assessments"
                : "No past assessments"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {activeTab === "available"
                ? "Check upcoming assessments or use Self Practice to keep your skills sharp."
                : "When an administrator publishes a quiz or competition you are eligible to take, it will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredAssessments.map((a) => {
              const currentStatus = getStatus(a);
              const usedAttempts = attemptCounts[a.id] || 0;
              const hasAttemptsRemaining = usedAttempts < a.max_attempts;
              const canStart = currentStatus === "Available" && hasAttemptsRemaining;

              return (
                <article key={a.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                        {a.assessment_type.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          currentStatus === "Available"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : currentStatus === "Closed"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {currentStatus}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-slate-950">{a.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {a.description || "Assessment instructions will be shown before you begin."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1">{a.question_count} questions</span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1">
                        {a.duration_seconds ? `${Math.round(a.duration_seconds / 60)} minutes` : "Untimed"}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1">
                        {usedAttempts} / {a.max_attempts} attempt(s) used
                      </span>
                      {a.access_code_required && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 border border-amber-200">
                          Code required
                        </span>
                      )}
                    </div>

                    {(a.starts_at || a.ends_at) && (
                      <p className="mt-3 text-xs text-slate-500">
                        {a.starts_at ? new Date(a.starts_at).toLocaleString() : "Opens immediately"} –{" "}
                        {a.ends_at ? new Date(a.ends_at).toLocaleString() : "No closing time"}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <Link
                      aria-disabled={!canStart}
                      href={canStart ? `/assessments/${a.id}` : "#"}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        canStart
                          ? "bg-indigo-700 text-white hover:bg-indigo-800"
                          : "pointer-events-none bg-slate-100 text-slate-400"
                      }`}
                    >
                      {!hasAttemptsRemaining
                        ? "Attempts completed"
                        : currentStatus === "Available"
                        ? "View and start →"
                        : currentStatus === "Scheduled"
                        ? "Not yet open"
                        : "Assessment closed"}
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
