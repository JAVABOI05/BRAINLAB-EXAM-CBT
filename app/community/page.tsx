"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import type { CommunityGroup, CommunityGroupMembership } from "../lib/community/types";
import { INITIAL_COMMUNITY_GROUPS } from "../lib/community/seedData";

const CATEGORIES = ["All", "Medicine", "Engineering", "Law & Arts", "Science", "Elite Sprint"];

export default function CommunityDiscoveryPage() {
  const [groups, setGroups] = useState<CommunityGroup[]>(INITIAL_COMMUNITY_GROUPS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [userMemberships, setUserMemberships] = useState<CommunityGroupMembership[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch live groups from API
        const res = await fetch("/api/community/groups");
        const json = await res.json();
        if (active && json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setGroups(json.data);
        }

        // 2. Fetch current user memberships if authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (active && session?.user) {
          const { data: mems } = await supabase
            .from("community_group_memberships")
            .select("*, group:community_groups(*)")
            .eq("user_id", session.user.id)
            .eq("status", "active");

          if (active && mems) {
            setUserMemberships(mems as CommunityGroupMembership[]);
          }
        }
      } catch {
        // Keeps verified initial cohorts on failure
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      active = false;
    };
  }, []);

  const handleJoin = async (group: CommunityGroup) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = `/login?redirect=/community/${group.slug}`;
        return;
      }

      setJoiningId(group.id);
      setJoinMessage(null);

      const res = await fetch(`/api/community/groups/${group.slug}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (json.ok) {
        setJoinMessage({
          id: group.id,
          text: json.data?.membership_status === "active" ? "Joined successfully!" : "Join request submitted for review.",
          ok: true,
        });
        // Optimistic refresh
        setUserMemberships((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            group_id: group.id,
            user_id: session.user.id,
            group_role: "student",
            status: json.data?.membership_status || "active",
            joined_via: "direct",
            display_handle: null,
            is_ranking_opted_out: false,
            joined_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            group,
          },
        ]);
      } else {
        setJoinMessage({ id: group.id, text: json.message || "Could not join cohort.", ok: false });
      }
    } catch {
      setJoinMessage({ id: group.id, text: "Connection error. Please try again.", ok: false });
    } finally {
      setJoiningId(null);
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchesCat =
        selectedCategory === "All" || g.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesType =
        selectedType === "all" || g.group_type === selectedType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.category.toLowerCase().includes(q);

      return matchesCat && matchesType && matchesSearch;
    });
  }, [groups, selectedCategory, selectedType, searchQuery]);

  const memberGroupIds = useMemo(() => {
    return new Set(userMemberships.map((m) => m.group_id));
  }, [userMemberships]);

  return (
    <main id="main" className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#000814] dark:text-slate-100">
      {/* -------------------------------------------------------------------
          1. Hero Section
      ------------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-blue-900/40 bg-[#00112b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-18 lg:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified Student Communities &amp; Cohorts
            </span>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white">
              Academic Communities for Serious Candidates.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-8">
              Belong to disciplined examination preparation cohorts, take scheduled group mock sprints,
              receive tutor announcements, and conquer JAMB, WAEC, and NECO together.
            </p>

            {/* Search Input */}
            <div className="mt-8 max-w-xl">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-lg">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cohorts by subject, programme or goal..."
                  className="w-full rounded-2xl border border-blue-800/80 bg-blue-950/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-400 backdrop-blur-md focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------
          2. Active User Cohorts Drawer (If Enrolled)
      ------------------------------------------------------------------- */}
      {userMemberships.length > 0 && (
        <section className="border-b border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Enrolled Communities ({userMemberships.length})
            </h2>
            <div className="mt-3 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {userMemberships.map((m) => {
                const grp = m.group || groups.find((g) => g.id === m.group_id);
                if (!grp) return null;
                return (
                  <Link
                    key={m.id}
                    href={`/community/${grp.slug}`}
                    className="flex shrink-0 items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 hover:border-indigo-400 transition hover-lift dark:border-indigo-900/40 dark:bg-indigo-950/20"
                  >
                    <span className="text-2xl">{grp.icon_emoji}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">
                        {grp.name}
                      </h4>
                      <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {m.group_role === "owner" ? "Group Owner" : m.group_role === "tutor" ? "Assigned Tutor" : "Active Member"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------
          3. Category Filter & Group Type Controls
      ------------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition active-press ${
                  selectedCategory === cat
                    ? "bg-[#012153] text-white dark:bg-blue-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Group Types */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Filter Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="academic_cohort">Academic Cohorts</option>
              <option value="subject_community">Subject Communities</option>
              <option value="special_programme">Special Programmes</option>
              <option value="tutor_class">Tutor Classes</option>
            </select>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            4. Communities Grid
        ------------------------------------------------------------------- */}
        <div className="py-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Explore Communities ({filteredGroups.length})
            </h3>
            {loading && <span className="text-xs font-medium text-slate-400 animate-pulse">Syncing catalog...</span>}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const isEnrolled = memberGroupIds.has(group.id);
              const isJoining = joiningId === group.id;

              return (
                <article
                  key={group.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-3xl">{group.icon_emoji}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          {group.category}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize">
                          {group.group_type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <h4 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">
                      {group.name}
                    </h4>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                      {group.description || "Join this academic community for daily assessments, peer collaboration, and tutor guidance."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>👥 {group.member_count || 1} members</span>
                      <span>•</span>
                      <span>Policy: {group.membership_policy === "open" ? "Instant Join" : "Approval Required"}</span>
                    </div>

                    {joinMessage?.id === group.id && (
                      <div className={`mt-3 rounded-xl p-2.5 text-xs font-bold ${
                        joinMessage.ok
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}>
                        {joinMessage.text}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <Link
                      href={`/community/${group.slug}`}
                      className="text-xs font-bold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                    >
                      View Details →
                    </Link>

                    {isEnrolled ? (
                      <Link
                        href={`/community/${group.slug}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                      >
                        Enter Space ✓
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleJoin(group)}
                        disabled={isJoining}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900 active-press disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        {isJoining ? "Joining..." : group.membership_policy === "open" ? "Join Cohort" : "Request Join"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
