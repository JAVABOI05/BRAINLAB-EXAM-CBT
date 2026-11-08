"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import type { CommunityGroup } from "@/app/lib/community/types";

export default function CommunityGroupSpacePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "assessments" | "members" | "rules">("feed");
  const [isJoining, setIsJoining] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroup() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/community/groups/${slug}`, { headers });
        const json = await res.json();
        if (active && json.ok && json.data) {
          setGroup(json.data);
        }
      } catch {
        // Fallback or error handled below
      } finally {
        if (active) setLoading(false);
      }
    }

    if (slug) {
      void loadGroup();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  const handleJoin = async () => {
    if (!group) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push(`/login?redirect=/community/${slug}`);
        return;
      }

      setIsJoining(true);
      setActionMessage(null);

      const res = await fetch(`/api/community/groups/${slug}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (json.ok) {
        setGroup((prev: CommunityGroup | null) =>
          prev
            ? {
                ...prev,
                is_member: json.data?.membership_status === "active",
                membership_status: json.data?.membership_status,
                user_role: "student",
              }
            : null
        );
        setActionMessage(
          json.data?.membership_status === "active"
            ? "Welcome! You are now an active member of this cohort."
            : "Your request has been submitted to the cohort tutor for approval."
        );
      } else {
        setActionMessage(json.message || "Could not join group.");
      }
    } catch {
      setActionMessage("Connection error. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 dark:bg-[#000814]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            Loading community workspace...
          </p>
        </div>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 dark:bg-[#000814]">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-4xl">🏛️</span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Community Not Found</h2>
          <p className="mt-2 text-xs text-slate-500">
            The community you are looking for may have been archived or does not exist.
          </p>
          <Link
            href="/community"
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-500"
          >
            ← Browse Discoverable Communities
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#000814] dark:text-slate-100">
      {/* Group Header Banner */}
      <section className="border-b border-slate-200 bg-[#00112b] text-white dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-white transition mb-6"
          >
            ← Back to Community Hub
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="text-5xl">{group.icon_emoji}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-black uppercase text-blue-300 border border-blue-400/30">
                    {group.category}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300 capitalize">
                    {group.group_type.replace("_", " ")}
                  </span>
                  {group.is_member && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase text-emerald-300 border border-emerald-400/30">
                      ✓ Enrolled ({group.user_role})
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-black text-white">
                  {group.name}
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {group.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-2">
              {!group.is_member ? (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition active-press disabled:opacity-50"
                >
                  {isJoining ? "Processing..." : group.membership_policy === "open" ? "Join Cohort" : "Request to Join"}
                </button>
              ) : (
                <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/30 px-5 py-2.5 text-xs font-bold text-emerald-300 text-center">
                  Active Member Space
                </div>
              )}
              <span className="text-[11px] text-slate-400">
                👥 {group.member_count || 1} candidates enrolled
              </span>
            </div>
          </div>

          {actionMessage && (
            <div className="mt-5 rounded-xl bg-blue-950/80 border border-blue-400/40 p-3 text-xs font-bold text-blue-200">
              {actionMessage}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-t border-blue-900/40 pt-4">
            {(["feed", "assessments", "members", "rules"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
                  activeTab === tab
                    ? "bg-white text-slate-950 dark:bg-blue-600 dark:text-white"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {tab === "feed" ? "Daily Feed" : tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Workspace Body */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {activeTab === "feed" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left 2 Cols: Activity Feed */}
            <div className="md:col-span-2 space-y-6">
              {/* Daily Assessment Alert Card */}
              <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-6 shadow-sm dark:border-indigo-950 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      Today&apos;s Scheduled Cohort Test
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">
                      {group.name} — Speed Drill #12
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      40 timed questions covering key syllabus areas. Standardized UTME marking applied.
                    </p>
                  </div>
                  <span className="text-3xl">⏱️</span>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-500">
                    Duration: <span className="text-slate-900 dark:text-white">45 Mins</span> • Attempts: <span className="text-slate-900 dark:text-white">1</span>
                  </div>
                  <Link
                    href={`/cbt?cohort=${group.slug}`}
                    className="rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    Start Test Now →
                  </Link>
                </div>
              </div>

              {/* Tutor Announcements */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📢</span> Cohort Announcements
                </h4>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Faculty Notice: Review Session Timetable
                      </span>
                      <span className="text-[10px] text-slate-400">2 hours ago</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Please ensure you have completed the Saturday speed drill before the live review session on Monday at 5:00 PM. High-error questions will be analyzed in detail.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Cohort Stats & Leaderboard Widget */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Cohort Diagnostics
                </h4>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Active Candidates</span>
                    <span className="font-bold text-slate-900 dark:text-white">{group.member_count || 1}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Average Readiness</span>
                    <span className="font-bold text-emerald-600">74% Target</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Weekly Quests Complete</span>
                    <span className="font-bold text-blue-600">88%</span>
                  </div>
                </div>

                <Link
                  href="/leaderboard"
                  className="mt-5 block text-center rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  View Cohort Leaderboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Scheduled Assessments &amp; Mock Sprints
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Assigned tests pull from verified question snapshots using standard CBT rules.
            </p>
            <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Speed Drill #12 (Active)
                  </h4>
                  <p className="text-xs text-slate-500">Closes today at 6:00 PM</p>
                </div>
                <Link
                  href={`/cbt?cohort=${group.slug}`}
                  className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 dark:bg-blue-600"
                >
                  Start →
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Cohort Directory (Privacy Protected)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              In accordance with NDPA 2023, personal contact details are withheld and handles are anonymized.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
                <span className="text-2xl">👨‍🏫</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Faculty Lead</h5>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Senior Tutor</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
                <span className="text-2xl">🎓</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Candidate #BL-49F1</h5>
                  <p className="text-[11px] text-slate-400">Streak: 12 Days</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 flex items-center gap-3">
                <span className="text-2xl">🎓</span>
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Candidate #BL-72A3</h5>
                  <p className="text-[11px] text-slate-400">Streak: 8 Days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Community Charter &amp; Academic Rules
            </h3>
            <div className="mt-4 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {group.group_rules || "1. Maintain academic integrity at all times.\n2. Complete scheduled cohort tests honestly without external aids.\n3. Respect peers and faculty mentors."}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
