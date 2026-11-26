"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import type {
  CommunityGroup,
  CommunityGroupType,
  CohortPsychometrics,
} from "../../lib/community/types";
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

  // Announcement & Poll Modals
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPriority, setAnnPriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [annRequiresAck, setAnnRequiresAck] = useState(false);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentType, setAttachmentType] = useState<"slides" | "document" | "image" | "link">("slides");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const [isPolling, setIsPolling] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpt1, setPollOpt1] = useState("");
  const [pollOpt2, setPollOpt2] = useState("");
  const [pollOpt3, setPollOpt3] = useState("");

  // Phase 3: Assessment Scheduling Modal
  const [isSchedulingTest, setIsSchedulingTest] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testSubject, setTestSubject] = useState("Biology & General Science");
  const [testQuestionCount, setTestQuestionCount] = useState(40);
  const [testDuration, setTestDuration] = useState(45);
  const [testStartsAt, setTestStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [testEndsAt, setTestEndsAt] = useState(() => new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16));
  const [testFreezeRoster, setTestFreezeRoster] = useState(true);

  // Live Class Scheduling Modal
  const [isSchedulingClass, setIsSchedulingClass] = useState(false);
  const [classTitle, setClassTitle] = useState("");
  const [classStartsAt, setClassStartsAt] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [classDuration, setClassDuration] = useState(60);
  const [classDescription, setClassDescription] = useState("");
  const [schedulingClassBusy, setSchedulingClassBusy] = useState(false);

  // Phase 4: Cohort Psychometrics Modal
  const [isViewingPsychometrics, setIsViewingPsychometrics] = useState(false);
  const [psychometrics, setPsychometrics] = useState<CohortPsychometrics | null>(null);
  const [loadingPsychometrics, setLoadingPsychometrics] = useState(false);
  const [isManagingRoster, setIsManagingRoster] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);
  const [newCandidateEmail, setNewCandidateEmail] = useState("");
  const [rosterActionLoading, setRosterActionLoading] = useState(false);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

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

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !annTitle.trim() || !annContent.trim()) return;
    try {
      setModalSubmitting(true);
      setModalMessage("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: annTitle.trim(),
          content: annContent.trim(),
          priority: annPriority,
          requires_acknowledgement: annRequiresAck,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setModalMessage("Announcement successfully broadcast to cohort!");
        setAnnTitle("");
        setAnnContent("");
        setTimeout(() => {
          setIsAnnouncing(false);
          setModalMessage("");
        }, 1500);
      } else {
        setModalMessage(json.error || "Failed to broadcast announcement.");
      }
    } catch {
      setModalMessage("Network error broadcasting announcement.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handlePostPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;
    try {
      setModalSubmitting(true);
      setModalMessage("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const options = [pollOpt1.trim(), pollOpt2.trim()];
      if (pollOpt3.trim()) options.push(pollOpt3.trim());

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: pollQuestion.trim(),
          options,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setModalMessage("Checkpoint poll successfully published!");
        setPollQuestion("");
        setPollOpt1("");
        setPollOpt2("");
        setPollOpt3("");
        setTimeout(() => {
          setIsPolling(false);
          setModalMessage("");
        }, 1500);
      } else {
        setModalMessage(json.error || "Failed to publish poll.");
      }
    } catch {
      setModalMessage("Network error publishing poll.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleScheduleAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !testTitle.trim() || !testSubject.trim()) return;
    try {
      setModalSubmitting(true);
      setModalMessage("");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: testTitle.trim(),
          subject: testSubject.trim(),
          question_count: Number(testQuestionCount),
          duration_minutes: Number(testDuration),
          starts_at: new Date(testStartsAt).toISOString(),
          ends_at: new Date(testEndsAt).toISOString(),
          max_attempts: 1,
          freeze_eligible_members: testFreezeRoster,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setModalMessage("Assessment schedule published with frozen question snapshots!");
        setTestTitle("");
        setTimeout(() => {
          setIsSchedulingTest(false);
          setModalMessage("");
        }, 1500);
      } else {
        setModalMessage(json.error || "Failed to schedule assessment.");
      }
    } catch {
      setModalMessage("Network error scheduling assessment.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenRoster = async (group: CommunityGroup) => {
    setSelectedGroup(group);
    setIsManagingRoster(true);
    setIsAnnouncing(false);
    setIsPolling(false);
    setIsSchedulingTest(false);
    setIsViewingPsychometrics(false);

    try {
      setLoadingRoster(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/community/groups/${group.slug}/members`, { headers });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setRosterMembers(json.data);
      }
    } catch {
      // Handled
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newCandidateEmail.trim()) return;

    try {
      setRosterActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "add",
          email: newCandidateEmail.trim(),
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setNewCandidateEmail("");
        void handleOpenRoster(selectedGroup);
      } else {
        alert(json.error || "Failed to add candidate to cohort.");
      }
    } catch {
      alert("Network error adding candidate.");
    } finally {
      setRosterActionLoading(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "approve",
          memberId,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        void handleOpenRoster(selectedGroup);
      }
    } catch {
      // Handled
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    if (!confirm("Are you sure you want to remove this candidate from the cohort? Access will be revoked immediately.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/community/groups/${selectedGroup.slug}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "remove",
          memberId,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        void handleOpenRoster(selectedGroup);
      }
    } catch {
      // Handled
    }
  };

  const handleLaunchLiveStudio = (group: CommunityGroup) => {
    const liveUrl = `/classroom/COHORT-${group.slug}?role=host`;
    window.open(liveUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenScheduleClass = (group: CommunityGroup) => {
    setSelectedGroup(group);
    setClassTitle(`Live Masterclass: ${group.name}`);
    setClassDescription(`Interactive live classroom session for members of ${group.name}.`);
    setIsSchedulingClass(true);
    setIsAnnouncing(false);
    setIsPolling(false);
    setIsSchedulingTest(false);
    setIsViewingPsychometrics(false);
    setModalMessage("");
  };

  const handleCreateScheduledClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!classTitle.trim()) {
      setModalMessage("Please specify a class title.");
      return;
    }

    setSchedulingClassBusy(true);
    setModalMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setModalMessage("Authentication session expired.");
        return;
      }

      const startTime = new Date(classStartsAt);
      const endTime = new Date(startTime.getTime() + classDuration * 60000);

      const res = await fetch("/api/classroom/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: classTitle,
          description: classDescription,
          scheduled_start_at: startTime.toISOString(),
          scheduled_end_at: endTime.toISOString(),
          class_format: "interactive",
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setModalMessage(`Live Masterclass scheduled successfully! Added to the Academy Timetable.`);
        setTimeout(() => {
          setIsSchedulingClass(false);
        }, 1500);
      } else {
        setModalMessage(json.error || "Failed to schedule live class.");
      }
    } catch (err: any) {
      setModalMessage(err.message || "Failed to schedule live class.");
    } finally {
      setSchedulingClassBusy(false);
    }
  };

  const handleViewPsychometrics = async (group: CommunityGroup) => {
    setSelectedGroup(group);
    setIsViewingPsychometrics(true);
    setIsAnnouncing(false);
    setIsPolling(false);
    setIsSchedulingTest(false);

    try {
      setLoadingPsychometrics(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/community/groups/${group.slug}/psychometrics`, { headers });
      const json = await res.json();
      if (json.ok && json.data?.psychometrics) {
        setPsychometrics(json.data.psychometrics);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingPsychometrics(false);
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

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsAnnouncing(true);
                        setIsPolling(false);
                        setIsSchedulingTest(false);
                        setIsViewingPsychometrics(false);
                      }}
                      className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
                    >
                      📢 Broadcast
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsPolling(true);
                        setIsAnnouncing(false);
                        setIsSchedulingTest(false);
                        setIsViewingPsychometrics(false);
                      }}
                      className="rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300"
                    >
                      📊 Poll
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleClass(group)}
                      className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      🗓️ Schedule Class
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewPsychometrics(group)}
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      📈 Diagnostics
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/community/${group.slug}`}
                      className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open Space →
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsSchedulingTest(true);
                        setIsAnnouncing(false);
                        setIsPolling(false);
                        setIsViewingPsychometrics(false);
                      }}
                      className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Assign Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Broadcast Announcement */}
        {isAnnouncing && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  📢 Broadcast to {selectedGroup.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAnnouncing(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {modalMessage && (
                <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {modalMessage}
                </div>
              )}

              <form onSubmit={handlePostAnnouncement} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Saturday Timed Diagnostic Exam Guidelines"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Content
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Provide full instructions and requirements for candidates..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* Optional Rich Attachment: Slides, Document, Image, Link */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Attach Resource (Slides, Documents, Images, or Links)
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={attachmentTitle}
                      onChange={(e) => setAttachmentTitle(e.target.value)}
                      placeholder="Title: e.g. Week 4 Physics Formulas PDF"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <select
                      value={attachmentType}
                      onChange={(e) => setAttachmentType(e.target.value as "slides" | "document" | "image" | "link")}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="slides">Slides / Presentation</option>
                      <option value="document">PDF / Document</option>
                      <option value="image">Image / Diagram</option>
                      <option value="link">Web Link / Reference</option>
                    </select>
                  </div>
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Attachment URL (https://...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={annPriority}
                      onChange={(e) => setAnnPriority(e.target.value as "normal" | "urgent" | "critical")}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical (Mandatory)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={annRequiresAck}
                        onChange={(e) => setAnnRequiresAck(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      Require Candidate Ack
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAnnouncing(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 dark:bg-blue-600"
                  >
                    {modalSubmitting ? "Broadcasting..." : "Publish Broadcast"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Launch Checkpoint Poll */}
        {isPolling && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  📊 Checkpoint Poll for {selectedGroup.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPolling(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {modalMessage && (
                <div className="mt-4 rounded-xl bg-purple-50 p-3 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  {modalMessage}
                </div>
              )}

              <form onSubmit={handlePostPoll} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Poll Question / Checkpoint
                  </label>
                  <input
                    type="text"
                    required
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Which area of Organic Chemistry needs live revision this Friday?"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Options
                  </label>
                  <input
                    type="text"
                    required
                    value={pollOpt1}
                    onChange={(e) => setPollOpt1(e.target.value)}
                    placeholder="Option 1 (e.g. Reaction Mechanisms & Synthesis)"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    value={pollOpt2}
                    onChange={(e) => setPollOpt2(e.target.value)}
                    placeholder="Option 2 (e.g. Nomenclature & Isomerism)"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    type="text"
                    value={pollOpt3}
                    onChange={(e) => setPollOpt3(e.target.value)}
                    placeholder="Option 3 (Optional: Spectroscopy & Laboratory tests)"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPolling(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {modalSubmitting ? "Publishing..." : "Launch Poll"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Schedule Assessment (Phase 3) */}
        {isSchedulingTest && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ⏱️ Schedule Assessment for {selectedGroup.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSchedulingTest(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {modalMessage && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {modalMessage}
                </div>
              )}

              <form onSubmit={handleScheduleAssessment} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Title
                  </label>
                  <input
                    type="text"
                    required
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="e.g. Saturday Timed Diagnostic Speed Drill #01"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder="e.g. Biology & Chemistry"
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Question Count
                    </label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={100}
                      value={testQuestionCount}
                      onChange={(e) => setTestQuestionCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={180}
                      value={testDuration}
                      onChange={(e) => setTestDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Starts At
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={testStartsAt}
                      onChange={(e) => setTestStartsAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Testing Window Closes At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={testEndsAt}
                    onChange={(e) => setTestEndsAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={testFreezeRoster}
                      onChange={(e) => setTestFreezeRoster(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    Freeze Current Cohort Eligibility Roster (Immutable Snapshot)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSchedulingTest(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {modalSubmitting ? "Freezing & Publishing..." : "Publish Assessment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Schedule Live Interactive Class */}
        {isSchedulingClass && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🗓️</span> Schedule Live Class for {selectedGroup.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Creates an interactive live session and adds it to the student Academy Timetable.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchedulingClass(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {modalMessage && (
                <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {modalMessage}
                </div>
              )}

              <form onSubmit={handleCreateScheduledClass} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Title / Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={classTitle}
                    onChange={(e) => setClassTitle(e.target.value)}
                    placeholder="e.g. Organic Chemistry: Isomerism & Mechanism Workshop"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={classStartsAt}
                      onChange={(e) => setClassStartsAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      required
                      min={15}
                      max={240}
                      value={classDuration}
                      onChange={(e) => setClassDuration(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lesson Description &amp; Objectives
                  </label>
                  <textarea
                    rows={3}
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    placeholder="Provide overview, required reference formula sheets, and key goals..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSchedulingClass(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={schedulingClassBusy}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {schedulingClassBusy ? "Scheduling..." : "Schedule Live Class"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Roster Management (Add/Approve Candidates) */}
        {isManagingRoster && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👥</span> Candidate Roster: {selectedGroup.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage enrolled candidates and approve pending admission requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManagingRoster(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Add Candidate Direct Input */}
              <form onSubmit={handleAddCandidate} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newCandidateEmail}
                  onChange={(e) => setNewCandidateEmail(e.target.value)}
                  placeholder="Enter candidate email or student ID..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={rosterActionLoading || !newCandidateEmail.trim()}
                  className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50 dark:bg-blue-600"
                >
                  {rosterActionLoading ? "Adding..." : "+ Add Candidate"}
                </button>
              </form>

              {/* Members List */}
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {loadingRoster ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                    Loading roster...
                  </div>
                ) : rosterMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No candidates enrolled yet. Add candidates by email above.
                  </div>
                ) : (
                  rosterMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {member.display_handle || `Candidate #${member.user_id.slice(0, 6)}`}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                              member.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {member.status === "active" ? "Enrolled" : "Pending Approval"}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            ({member.group_role})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.status === "pending_approval" && (
                          <button
                            type="button"
                            onClick={() => handleApproveMember(member.id)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-emerald-700 transition"
                          >
                            ✓ Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManagingRoster(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cohort Psychometrics (Phase 4) */}
        {isViewingPsychometrics && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📈</span> Cohort Diagnostics &amp; Psychometrics
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedGroup.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewingPsychometrics(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {loadingPsychometrics ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aggregating psychometric metrics...
                </div>
              ) : psychometrics ? (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <span className="text-[10px] font-black uppercase text-slate-400">Total Attempts</span>
                      <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                        {psychometrics.total_attempts}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Across {psychometrics.unique_candidates} unique candidates
                      </span>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Pass Rate (&gt;= 50%)</span>
                      <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {psychometrics.pass_rate_percentage}%
                      </div>
                      <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
                        Cohort Benchmark Target
                      </span>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
                      <span className="text-[10px] font-black uppercase text-blue-600">Average Percentage</span>
                      <div className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">
                        {psychometrics.average_percentage}%
                      </div>
                      <span className="text-[10px] text-blue-700/70 dark:text-blue-400/70">
                        Average Score: {psychometrics.average_score}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-950 dark:bg-purple-950/20">
                      <span className="text-[10px] font-black uppercase text-purple-600">Avg Speed / Duration</span>
                      <div className="mt-1 text-2xl font-black text-purple-600 dark:text-purple-400">
                        {Math.floor(psychometrics.average_time_spent_seconds / 60)}m
                      </div>
                      <span className="text-[10px] text-purple-700/70 dark:text-purple-400/70">
                        {psychometrics.average_time_spent_seconds % 60} seconds average
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white mb-1">Security &amp; Proctoring Log</p>
                    <p>Disqualified attempts (excessive tab switching): <span className="font-bold text-rose-600">{psychometrics.disqualified_count}</span></p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No psychometric data available for this cohort yet.
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsViewingPsychometrics(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}
