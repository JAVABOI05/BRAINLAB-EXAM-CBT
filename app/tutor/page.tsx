"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { isGovernanceAdminRole } from "../lib/adminRoles";
import { CardSkeleton } from "../components/SkeletonLoader";
import ActivePresenceBar from "../components/ActivePresenceBar";

type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  membership_role: "tutor" | "reviewer" | "admin";
};

export default function TutorHomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      const currentUser = sessionData.session?.user;
      if (sessionError || !currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        // 1. Check administrative authority first
        let roleStr: string | null = null;
        try {
          const { data: adminRoleData } = await supabase.rpc("get_admin_role");
          if (typeof adminRoleData === "string") roleStr = adminRoleData.trim();
        } catch {}
        const canManageAll =
          roleStr === "super_admin" ||
          roleStr === "platform_admin" ||
          isGovernanceAdminRole(roleStr);

        setIsAdmin(canManageAll);

        if (canManageAll) {
          // Administrators see all platform subjects directly
          const { data: subjectRows, error: subjectError } = await supabase
            .from("learning_subjects")
            .select("id, name, slug, description")
            .order("name");

          if (!active) return;

          if (subjectError) {
            setError("Unable to load the subject catalogue. Click retry to reconnect.");
            setLoading(false);
            return;
          }

          setSubjects(
            (subjectRows ?? []).map((subject) => ({
              ...subject,
              membership_role: "admin",
            }))
          );
          setLoading(false);
          return;
        }

        // 2. Instructor / Tutor role: query subject memberships
        const { data: memberships, error: membershipError } = await supabase
          .from("learning_subject_memberships")
          .select("subject_id, membership_role")
          .eq("user_id", currentUser.id);

        if (!active) return;

        if (membershipError) {
          // Fall back gracefully rather than crashing the page
          console.warn("[TutorPage] learning_subject_memberships error:", membershipError);
          // Try loading publicly visible subjects or show helpful guidance
          const { data: publicSubjects } = await supabase
            .from("learning_subjects")
            .select("id, name, slug, description")
            .limit(10);

          if (!active) return;

          if (publicSubjects && publicSubjects.length > 0) {
            setSubjects(
              publicSubjects.map((s) => ({
                ...s,
                membership_role: "tutor",
              }))
            );
          } else {
            setError("We could not fetch your subject assignments. Please click retry or check your network connection.");
          }
          setLoading(false);
          return;
        }

        const rows = memberships ?? [];
        if (rows.length === 0) {
          // User is an instructor but hasn't had specific subjects mapped yet
          setSubjects([]);
          setLoading(false);
          return;
        }

        const ids = rows.map((item) => item.subject_id);
        const { data: subjectRows, error: subjectError } = await supabase
          .from("learning_subjects")
          .select("id, name, slug, description")
          .in("id", ids)
          .order("name");

        if (!active) return;

        if (subjectError) {
          setError("We could not load your assigned subject details. Please try again.");
          setLoading(false);
          return;
        }

        const roleBySubject = new Map(
          rows.map((item) => [item.subject_id, item.membership_role as "tutor" | "reviewer"])
        );

        setSubjects(
          (subjectRows ?? []).map((subject) => ({
            ...subject,
            membership_role: roleBySubject.get(subject.id) ?? "tutor",
          }))
        );
      } catch (err) {
        console.error("[TutorPage] Unexpected error loading assignments:", err);
        if (active) {
          setError("A temporary connection error occurred while loading your assignments.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      active = false;
    };
  }, [refreshIndex]);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const query = searchQuery.toLowerCase();
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query))
    );
  }, [subjects, searchQuery]);

  const instructorName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Instructor";

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12 space-y-10 animate-fade-in-up">
      {/* 1. Executive Instructor Hero Command Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#0c1328] via-[#141b3d] to-[#0a0f24] p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-950/60 px-3.5 py-1 text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AUTHORING &amp; PEDAGOGICAL COMMAND</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome back, {instructorName}!
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Orchestrate curriculum topics, author immutable question banks, host live interactive sessions, and mentor candidates toward exam excellence.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
              <span className="block text-2xl sm:text-3xl font-black text-indigo-400">{subjects.length}</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {isAdmin ? "Total Subjects" : "Assigned Subjects"}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
              <span className="block text-2xl sm:text-3xl font-black text-emerald-400">Active</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live Studio</span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md text-center">
              <span className="block text-2xl sm:text-3xl font-black text-cyan-400">100%</span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">CBT Engine</span>
            </div>
          </div>
        </div>

        <ActivePresenceBar activityContext="Instructor Studio & Authoring Suite" variant="banner" className="mt-8 pt-4 border-t border-white/10" />
      </section>

      {/* 2. Unauthenticated State */}
      {!user && !loading && (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Sign in to Access Instructor Studio</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Instructor privileges and content authoring permissions are provisioned by BrainLab Academy administrators.
          </p>
          <div className="mt-6">
            <Link
              href="/login?redirect=/tutor"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 font-bold text-white transition shadow-sm active:scale-95"
            >
              Sign in to Portal
            </Link>
          </div>
        </section>
      )}

      {/* 3. Error Banner (Non-blocking with Retry) */}
      {error && (
        <div role="alert" className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshIndex((prev) => prev + 1)}
            className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition active:scale-95 shadow-xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 4. Structured Authoring & Studio Suites */}
      {user && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Studio Management Suites</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Direct access to curriculum management, interactive lesson construction, live streaming, and evaluation.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Suite 1: Curriculum & Authoring */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1427] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Curriculum &amp; Content
                  </span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    5 Tools
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  <Link
                    href="/tutor/questions"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-sm">
                      QB
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Question Bank
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">CBT multiple-choice &amp; CSV bulk ingestion</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/syllabus"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-sm">
                      SY
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Curriculum &amp; Syllabus
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">JAMB/WAEC topic mapping &amp; learning targets</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/content"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-sm">
                      LC
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Lessons &amp; Content
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Subject, topic &amp; lesson module builder</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/lesson-blocks"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-sm">
                      LB
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Lesson Blocks
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Reusable formula sheets &amp; derivations</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/academic"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-sm">
                      AD
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        Academic Directory
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Taxonomy &amp; curriculum coverage statistics</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Suite 2: Live Delivery & Virtual Labs */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1427] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Live Broadcast &amp; Labs
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    4 Tools
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  <Link
                    href="/calendar"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-sm">
                      TC
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        Timetable &amp; Live Classes
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Session schedules, attendance &amp; student logs</p>
                    </div>
                  </Link>

                  <Link
                    href="/classroom/studio"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-sm">
                      LS
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        Lesson Broadcast Studio
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Multi-stream presenter stage &amp; smart board</p>
                    </div>
                  </Link>

                  <Link
                    href="/classroom/stem"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-sm">
                      ST
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        STEM Studio &amp; Simulations
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Virtual experiments, reagents &amp; lab worksheets</p>
                    </div>
                  </Link>

                  <Link
                    href="/recordings"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-sm">
                      CR
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        Class Recordings Archive
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Video sessions, auto-transcripts &amp; study notes</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Suite 3: Cohorts & Evaluation */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1427] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Cohorts &amp; Grading
                  </span>
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    4 Tools
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  <Link
                    href="/tutor/groups"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-black text-sm">
                      SC
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        Student Cohorts
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Academic cohorts, member rosters &amp; daily tests</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/assignments"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-black text-sm">
                      AS
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        Assignments &amp; Grading
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Homework evaluation &amp; tutor voice feedback</p>
                    </div>
                  </Link>

                  <Link
                    href="/tutor/stem-grading"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-black text-sm">
                      VL
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        Virtual Lab Grading
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Grade hypotheses &amp; student experiment data</p>
                    </div>
                  </Link>

                  <Link
                    href="/messages"
                    className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-black text-sm">
                      LC
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        Learner Chat &amp; Queries
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct student messaging &amp; academic support</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Subjects Management & Course Feeds */}
      {user && (
        <section className="space-y-6 pt-4" aria-labelledby="assigned-subjects">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 id="assigned-subjects" className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {isAdmin ? "Platform Academic Subjects" : "Your Assigned Subjects"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {isAdmin
                  ? "Universal administrator oversight: manage syllabus topics, author content, and review assessments."
                  : "Assigned subject workspaces: configure modules, post announcements, and construct assessments."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white w-48 sm:w-60"
              />
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                {filteredSubjects.length} {filteredSubjects.length === 1 ? "Subject" : "Subjects"}
              </span>
            </div>
          </div>

          {loading && (
            <div className="animate-fade-in-up">
              <CardSkeleton count={3} />
            </div>
          )}

          {/* Empty State for Tutors with No Subjects Assigned */}
          {!loading && subjects.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-[#0c1427]/60">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                📚
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white">No Subjects Assigned Yet</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Your instructor account is active! Specific subjects are mapped by BrainLab Academy administrators. You can browse the curriculum or request subject authoring privileges below.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/tutor/academic"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold transition shadow-xs"
                >
                  Browse Academic Directory
                </Link>
                <Link
                  href="/tutor/questions"
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-5 py-2.5 text-xs font-bold transition"
                >
                  Open Question Bank
                </Link>
              </div>
            </div>
          )}

          {/* Subjects Grid */}
          {!loading && filteredSubjects.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSubjects.map((subject) => (
                <article
                  key={subject.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all dark:border-slate-800 dark:bg-[#0c1427] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {subject.slug.toUpperCase()}
                        </span>
                        <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5">{subject.name}</h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {subject.membership_role === "admin" ? "Admin Access" : subject.membership_role}
                      </span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {subject.description || "Organize curriculum topics, lesson modules, and assessments for this academic subject."}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <Link
                      href={`/tutor/subjects/${subject.id}/topics`}
                      className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs active:scale-95"
                    >
                      Manage Topics &rarr;
                    </Link>
                    <Link
                      href={`/learn/${subject.slug}/feed`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3.5 py-2 text-xs font-bold transition"
                    >
                      Course Feed
                    </Link>
                    <Link
                      href="/tutor/questions"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 px-3.5 py-2 text-xs font-bold transition"
                    >
                      Questions
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
