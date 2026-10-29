"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import AudioPlayer from "../components/AudioPlayer";
import VoiceNoteRecorder from "../components/VoiceNoteRecorder";
import { ListSkeleton } from "../components/SkeletonLoader";
import { toast } from "../lib/toast";

interface Assignment {
  id: string;
  course_id: string;
  subject_id?: string;
  tutor_id: string;
  title: string;
  instructions: string;
  allow_audio_submission: boolean;
  allow_late_submissions: boolean;
  due_date: string | null;
  max_points: number;
  rubric: { criterion: string; max_points: number; description?: string }[];
  status: string;
  created_at: string;
  courses?: { id: string; title: string; slug: string };
  learning_subjects?: { id: string; name: string; slug: string };
  submission?: {
    id: string;
    student_id: string;
    text_submission: string | null;
    audio_asset_id: string | null;
    tutor_audio_asset_id: string | null;
    grade: number | null;
    feedback: string | null;
    rubric_scores: Record<string, number>;
    status: "submitted" | "graded" | "returned" | "resubmission_requested";
    submitted_at: string;
    graded_at: string | null;
    audio_asset?: { id: string; file_url: string; duration_seconds: number; title?: string };
    tutor_audio_asset?: { id: string; file_url: string; duration_seconds: number; title?: string };
  } | null;
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "submitted" | "graded" | "revision">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Submission Form State
  const [textWork, setTextWork] = useState("");
  const [uploadedAudioId, setUploadedAudioId] = useState<string | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user) {
        router.replace("/account?redirect=/assignments");
        return;
      }
      if (!active) return;
      setCurrentUser(session.user);

      try {
        const res = await fetch("/api/assignments", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (active && json.success) {
          setAssignments(json.assignments);
          if (json.assignments.length > 0) {
            setSelectedId(json.assignments[0].id);
            if (json.assignments[0].submission?.text_submission) {
              setTextWork(json.assignments[0].submission.text_submission);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load assignments:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedId) || null;
  }, [assignments, selectedId]);

  const handleSelectAssignment = (assign: Assignment) => {
    setSelectedId(assign.id);
    setTextWork(assign.submission?.text_submission || "");
    setUploadedAudioId(assign.submission?.audio_asset_id || null);
    setUploadedAudioUrl(assign.submission?.audio_asset?.file_url || null);
    setShowRecorder(false);
  };

  const handleAudioReady = async (audioBlob: Blob, durationSeconds: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;

      const formData = new FormData();
      formData.append("file", audioBlob, `assignment_audio_${Date.now()}.webm`);
      formData.append("title", `Submission for ${selectedAssignment?.title || "Assignment"}`);
      formData.append("duration_seconds", String(durationSeconds));
      formData.append("durationSeconds", String(durationSeconds));
      formData.append("asset_type", "student_submission");
      formData.append("assetType", "student_submission");
      if (selectedAssignment?.id) {
        formData.append("assignment_id", selectedAssignment.id);
        formData.append("assignmentId", selectedAssignment.id);
      }
      if (selectedAssignment?.course_id) {
        formData.append("course_id", selectedAssignment.course_id);
      }

      const res = await fetch("/api/audio/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Audio upload failed.");
      }

      setUploadedAudioId(json.asset.id);
      setUploadedAudioUrl(json.asset.file_url);
      setShowRecorder(false);
      toast.success("Voice note attached to your submission!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not attach audio note.");
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!textWork.trim() && !uploadedAudioId) {
      toast.error("Please enter written responses or record an audio note.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Authentication required.");

      const res = await fetch("/api/assignments/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          textSubmission: textWork.trim(),
          audioAssetId: uploadedAudioId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit assignment.");
      }

      // Update local state
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === selectedAssignment.id
            ? {
                ...a,
                submission: {
                  ...json.submission,
                  audio_asset: uploadedAudioUrl
                    ? { id: uploadedAudioId!, file_url: uploadedAudioUrl, duration_seconds: 0 }
                    : null,
                },
              }
            : a
        )
      );

      toast.success("Assignment submitted successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.courses?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.learning_subjects?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const subStatus = a.submission?.status;
      if (statusFilter === "all") return true;
      if (statusFilter === "todo") return !a.submission || subStatus === "resubmission_requested";
      if (statusFilter === "submitted") return subStatus === "submitted";
      if (statusFilter === "graded") return subStatus === "graded";
      if (statusFilter === "revision") return subStatus === "resubmission_requested";
      return true;
    });
  }, [assignments, searchQuery, statusFilter]);

  const getStatusBadge = (assign: Assignment) => {
    const sub = assign.submission;
    if (!sub) {
      const isPastDue = assign.due_date && new Date(assign.due_date).getTime() < Date.now();
      return (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
            isPastDue ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-blue-100 text-blue-900 border border-blue-200"
          }`}
        >
          {isPastDue ? "Overdue" : "Pending"}
        </span>
      );
    }

    if (sub.status === "graded") {
      return (
        <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          Graded: {sub.grade ?? 0}/{assign.max_points}
        </span>
      );
    }

    if (sub.status === "resubmission_requested") {
      return (
        <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          Revision Requested
        </span>
      );
    }

    return (
      <span className="rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
        Submitted
      </span>
    );
  };

  return (
    <main id="main" className="assignments-page mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Course Work & Continuous Assessment
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">
            Assignments & Homework
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Submit written answers and voice notes for course tutor feedback, grading, and rubric evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active-press"
          >
            <svg className="h-3.5 w-3.5 text-slate-500 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Timetable
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition active-press hover-lift"
          >
            ← My Learning
          </Link>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Pane: Filter & Assignment List */}
        <section className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          {/* Search & Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search assignments or subjects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: "all", label: "All" },
                { id: "todo", label: "To Do" },
                { id: "submitted", label: "Submitted" },
                { id: "graded", label: "Graded" },
                { id: "revision", label: "Revision" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as "all" | "todo" | "submitted" | "graded" | "revision")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active-press ${
                    statusFilter === f.id
                      ? "bg-[#012153] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px] pr-1">
            {loading ? (
              <div className="p-2">
                <ListSkeleton count={4} />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <p className="font-bold text-slate-800">No assignments found</p>
                <p className="mt-1">Assignments assigned by your course tutors will appear here.</p>
              </div>
            ) : (
              filteredAssignments.map((assign) => {
                const isSelected = assign.id === selectedId;
                return (
                  <button
                    key={assign.id}
                    onClick={() => handleSelectAssignment(assign)}
                    className={`w-full text-left p-3.5 transition flex flex-col gap-2 rounded-2xl my-1 hover-lift active-press ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 shadow-xs"
                        : "bg-white border border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-blue-900 truncate">
                        {assign.learning_subjects?.name || assign.courses?.title || "Course Work"}
                      </span>
                      {getStatusBadge(assign)}
                    </div>

                    <h3 className="text-xs font-extrabold text-slate-950 leading-snug line-clamp-2">
                      {assign.title}
                    </h3>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Max Points: {assign.max_points}</span>
                      <span>
                        Due:{" "}
                        {assign.due_date
                          ? new Date(assign.due_date).toLocaleDateString([], { month: "short", day: "numeric" })
                          : "No deadline"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Pane: Selected Assignment Details & Submission Workspace */}
        <section className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedAssignment ? (
            <div className="space-y-6 animate-fade-in-up">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-900">
                      {selectedAssignment.learning_subjects?.name || "General Course"}
                    </span>
                    {selectedAssignment.allow_audio_submission && (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-900">
                        <svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Voice Note Allowed
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-950">{selectedAssignment.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Max: {selectedAssignment.max_points} points · Due:{" "}
                    {selectedAssignment.due_date
                      ? new Date(selectedAssignment.due_date).toLocaleString()
                      : "Open completion"}
                  </p>
                </div>
                <div>{getStatusBadge(selectedAssignment)}</div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Instructions</h4>
                <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {selectedAssignment.instructions}
                </div>
              </div>

              {/* Rubric Criteria (if any) */}
              {selectedAssignment.rubric && selectedAssignment.rubric.length > 0 && (
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                    Evaluation Rubric
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedAssignment.rubric.map((r, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{r.criterion}</span>
                          <span className="text-blue-900">{r.max_points} pts</span>
                        </div>
                        {r.description && <p className="mt-1 text-[11px] text-slate-500">{r.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tutor Feedback Banner (if graded or revision requested) */}
              {selectedAssignment.submission?.status === "graded" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      Tutor Grade & Assessment
                    </span>
                    <span className="text-lg font-black text-emerald-950">
                      {selectedAssignment.submission.grade} / {selectedAssignment.max_points} pts
                    </span>
                  </div>

                  {selectedAssignment.submission.feedback && (
                    <p className="text-xs text-emerald-950 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-emerald-200">
                      {selectedAssignment.submission.feedback}
                    </p>
                  )}

                  {/* Tutor Audio Note Feedback */}
                  {selectedAssignment.submission.tutor_audio_asset && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">
                        <svg className="h-3.5 w-3.5 text-blue-600 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Tutor Voice Critique:
                      </span>
                      <AudioPlayer
                        src={selectedAssignment.submission.tutor_audio_asset.file_url}
                        title={selectedAssignment.submission.tutor_audio_asset.title || "Tutor Feedback Note"}
                        durationSeconds={selectedAssignment.submission.tutor_audio_asset.duration_seconds}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form / Viewer */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Your Submission Work
                  </h4>
                  {selectedAssignment.submission?.submitted_at && (
                    <span className="text-[11px] text-slate-400">
                      Submitted on {new Date(selectedAssignment.submission.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Written Response / Working Steps
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Type your complete solution, essay, or assignment working steps here…"
                      value={textWork}
                      onChange={(e) => setTextWork(e.target.value)}
                      disabled={selectedAssignment.submission?.status === "graded"}
                      className="w-full rounded-2xl border border-slate-300 p-4 text-xs leading-relaxed text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition disabled:bg-slate-100"
                    />
                  </div>

                  {/* Attached Student Voice Note */}
                  {uploadedAudioUrl && (
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                        <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Attached Voice Note</span>
                        {selectedAssignment.submission?.status !== "graded" && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedAudioId(null);
                              setUploadedAudioUrl(null);
                            }}
                            className="text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <AudioPlayer src={uploadedAudioUrl} title="My Audio Submission" />
                    </div>
                  )}

                  {/* Voice Note Recorder Trigger */}
                  {selectedAssignment.allow_audio_submission && !uploadedAudioUrl && selectedAssignment.submission?.status !== "graded" && (
                    <div>
                      {!showRecorder ? (
                        <button
                          type="button"
                          onClick={() => setShowRecorder(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 transition active-press"
                        >
                          <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>Record Audio Submission</span>
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <VoiceNoteRecorder
                            onAudioReady={handleAudioReady}
                            onCancel={() => setShowRecorder(false)}
                            maxDurationSeconds={300}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit CTA */}
                  {selectedAssignment.submission?.status !== "graded" && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-[#012153] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-900 disabled:opacity-50 transition active-press hover-lift"
                      >
                        {submitting
                          ? "Submitting Work…"
                          : selectedAssignment.submission
                          ? "Update My Submission"
                          : "Turn in Assignment →"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200"><svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
              <h3 className="mt-3 text-base font-bold text-slate-700">Select an Assignment</h3>
              <p className="mt-1 text-xs">
                Choose an assignment from the list to review instructions and turn in your solution.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
