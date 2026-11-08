"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import type { CommunityGroup, CommunityGroupType } from "../../lib/community/types";
import InstructorPortalShell from "../InstructorPortalShell";

export default function TutorGroupsManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // New Group Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupType, setGroupType] = useState<CommunityGroupType>("academic_cohort");
  const [category, setCategory] = useState("Medicine");
  const [capacity, setCapacity] = useState(500);
  const [policy, setPolicy] = useState<"open" | "approval_required" | "invite_only">("open");
  const [rules, setRules] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTutorGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/login?redirect=/tutor/groups");
        return;
      }

      const admin = await getAdminSession();
      if (admin) {
        setCurrentUser(admin);
      }

      // Fetch groups owned by tutor or where tutor is assigned
      const res = await fetch("/api/community/groups");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setGroups(json.data);
      }
    } catch {
      // Error handled gracefully
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadTutorGroups();
  }, [loadTutorGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim()) {
      setFormError("Group name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/tutor/groups");
        return;
      }

      const res = await fetch("/api/community/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          group_type: groupType,
          category,
          capacity: Number(capacity),
          membership_policy: policy,
          group_rules: rules.trim(),
        }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setFormSuccess(`Cohort "${json.data.name}" created successfully!`);
        setName("");
        setDescription("");
        setRules("");
        setIsCreating(false);
        void loadTutorGroups();
      } else {
        setFormError(json.message || json.error || "Failed to create group.");
      }
    } catch {
      setFormError("Connection error while creating group.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <InstructorPortalShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Student Communities &amp; Cohorts
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Manage examination preparation cohorts, schedule daily CBT tests, and broadcast faculty announcements.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition active-press dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isCreating ? "✕ Cancel" : "+ Create New Cohort"}
          </button>
        </div>

        {formSuccess && (
          <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {formSuccess}
          </div>
        )}

        {/* Create Group Modal / Inline Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateGroup}
            className="mt-6 rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm dark:border-indigo-950 dark:bg-slate-900 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Configure New Academic Cohort or Class
              </h3>
              <p className="text-[11px] text-slate-500">
                Created groups will be discoverable on the student community hub according to your visibility policy.
              </p>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cohort Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UTME 2027 Medicine Sprint Cohort"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Discipline Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Medicine">Medicine & Health Sciences</option>
                  <option value="Engineering">Engineering & Physical Sciences</option>
                  <option value="Law & Arts">Law, Arts & Social Sciences</option>
                  <option value="Science">Pure Science & Mathematics</option>
                  <option value="Commercial">Commercial & Management</option>
                  <option value="Elite Sprint">Elite Sprint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Group Type
                </label>
                <select
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as CommunityGroupType)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="academic_cohort">Academic Cohort</option>
                  <option value="tutor_class">Tutor-Managed Class</option>
                  <option value="subject_community">Subject Community</option>
                  <option value="special_programme">Special Programme</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Membership Policy
                </label>
                <select
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value as "open" | "approval_required" | "invite_only")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open (Instant Enrollment)</option>
                  <option value="approval_required">Approval Required (Tutor review)</option>
                  <option value="invite_only">Invite Only (Secure Token Link)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description &amp; Learning Goals
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Outline syllabus areas, target scores, and expectations..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cohort Guidelines / Rules (Optional)
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={2}
                  placeholder="e.g. 1. Complete weekly mock sprints. 2. Respect peers."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 dark:bg-blue-600"
              >
                {submitting ? "Creating..." : "Save & Publish Cohort"}
              </button>
            </div>
          </form>
        )}

        {/* Existing Cohorts List */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Active Cohorts ({groups.length})
            </h3>
            {loading && <span className="text-xs text-slate-400 animate-pulse">Syncing...</span>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{group.icon_emoji}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {group.category}
                    </span>
                  </div>
                  <h4 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
                    {group.name}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {group.description || "Active student learning community."}
                  </p>
                  <div className="mt-3 text-[11px] font-bold text-slate-500">
                    👥 {group.member_count || 1} candidates • {group.membership_policy}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/community/${group.slug}`}
                    className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open Space →
                  </Link>
                  <Link
                    href={`/cbt?cohort=${group.slug}`}
                    className="rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Assign Test
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}
