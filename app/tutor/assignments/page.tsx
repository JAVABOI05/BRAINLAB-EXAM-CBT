"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AudioPlayer from "../../components/AudioPlayer";
import VoiceNoteRecorder from "../../components/VoiceNoteRecorder";
import { ListSkeleton } from "../../components/SkeletonLoader";
import { toast } from "../../lib/toast";

interface TutorAssignment {
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
  rubric: { criterion: string; max_points: number }[];
  status: string;
  created_at: string;
  learning_subjects?: { id: string; name: string; slug: string };
  stats: { total: number; submitted: number; graded: number };
}

interface StudentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  text_submission: string | null;
  audio_asset_id: string | null;
  tutor_audio_asset_id: string | null;
  grade: number | null;
  feedback: string | null;
  rubric_scores: Record<string, number>;
  status: "submitted" | "graded" | "resubmission_requested";
  submitted_at: string;
  graded_at: string | null;
  audio_asset?: { id: string; file_url: string; duration_seconds: number; title?: string } | any;
  tutor_audio_asset?: { id: string; file_url: string; duration_seconds: number; title?: string } | any;
  student?: { id: string; full_name?: string; email?: string };
}

export default function TutorAssignmentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<TutorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // New Assignment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newMaxPoints, setNewMaxPoints] = useState(100);
  const [newAllowAudio, setNewAllowAudio] = useState(false);
  const [creating, setCreating] = useState(false);

  // Grading Form State
  const [gradingScore, setGradingScore] = useState<number | "">("");
  const [gradingFeedback, setGradingFeedback] = useState("");
  const [gradingAudioId, setGradingAudioId] = useState<string | null>(null);
  const [gradingAudioUrl, setGradingAudioUrl] = useState<string | null>(null);
  const [showGradingRecorder, setShowGradingRecorder] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user) {
        router.replace("/account?redirect=/tutor/assignments");
        return;
      }
      if (!active) return;
      setCurrentUser(session.user);

      try {
        // Fetch tutor assignments
        const res = await fetch("/api/assignments?mode=tutor", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (active && json.success) {
          setAssignments(json.assignments);
          if (json.assignments.length > 0) {
            setSelectedAssignmentId(json.assignments[0].id);
          }
        }

        // Fetch subjects & courses for creator dropdown
        const { data: subData } = await supabase.from("learning_subjects").select("id, name, slug");
        const { data: crsData } = await supabase.from("courses").select("id, title, slug");
        if (active) {
          setSubjects(subData || []);
          setCourses(crsData || []);
          if (crsData && crsData.length > 0) setNewCourseId(crsData[0].id);
        }
      } catch (err) {
        console.warn("Failed to init tutor assignments:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  // Load Submissions for Selected Assignment
  useEffect(() => {
    if (!selectedAssignmentId) return;
    let active = true;
    setLoadingSubmissions(true);

    async function loadSubs() {
      try {
        const { data, error } = await supabase
          .from("assignment_submissions")
          .select(`
            id,
            assignment_id,
            student_id,
            text_submission,
            audio_asset_id,
            tutor_audio_asset_id,
            grade,
            feedback,
            rubric_scores,
            status,
            submitted_at,
            graded_at,
            audio_asset:audio_asset_id ( id, file_url, duration_seconds, title ),
            tutor_audio_asset:tutor_audio_asset_id ( id, file_url, duration_seconds, title )
          `)
          .eq("assignment_id", selectedAssignmentId)
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        if (active) {
          const normalized: StudentSubmission[] = ((data as any[]) || []).map((row) => ({
            ...row,
            audio_asset: Array.isArray(row.audio_asset) ? row.audio_asset[0] : row.audio_asset,
            tutor_audio_asset: Array.isArray(row.tutor_audio_asset) ? row.tutor_audio_asset[0] : row.tutor_audio_asset,
          }));
          setSubmissions(normalized);
          if (normalized.length > 0) {
            setActiveSubmissionId(normalized[0].id);
            setGradingScore(normalized[0].grade ?? "");
            setGradingFeedback(normalized[0].feedback || "");
            setGradingAudioId(normalized[0].tutor_audio_asset_id || null);
            setGradingAudioUrl(normalized[0].tutor_audio_asset?.file_url || null);
          } else {
            setActiveSubmissionId(null);
          }
        }
      } catch (err) {
        console.warn("Could not load submissions:", err);
      } finally {
        if (active) setLoadingSubmissions(false);
      }
    }

    void loadSubs();
    return () => {
      active = false;
    };
  }, [selectedAssignmentId]);

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const activeSubmission = submissions.find((s) => s.id === activeSubmissionId);

  const handleSelectSubmission = (sub: StudentSubmission) => {
    setActiveSubmissionId(sub.id);
    setGradingScore(sub.grade ?? "");
    setGradingFeedback(sub.feedback || "");
    setGradingAudioId(sub.tutor_audio_asset_id || null);
    setGradingAudioUrl(sub.tutor_audio_asset?.file_url || null);
    setShowGradingRecorder(false);
  };

  const handleTutorAudioReady = async (audioBlob: Blob, durationSeconds: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) return;

      const formData = new FormData();
      formData.append("file", audioBlob, `tutor_critique_${Date.now()}.webm`);
      formData.append("title", `Tutor Feedback for ${selectedAssignment?.title || "Submission"}`);
      formData.append("duration_seconds", String(durationSeconds));
      formData.append("durationSeconds", String(durationSeconds));
      formData.append("asset_type", "tutor_voice_note");
      formData.append("assetType", "tutor_voice_note");
      if (selectedAssignment?.id) {
        formData.append("assignment_id", selectedAssignment.id);
        formData.append("assignmentId", selectedAssignment.id);
      }

      const res = await fetch("/api/audio/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Audio upload failed.");

      setGradingAudioId(json.asset.id);
      setGradingAudioUrl(json.asset.file_url);
      setShowGradingRecorder(false);
      toast.success("Voice feedback note recorded and attached!");
    } catch (err: any) {
      toast.error(err.message || "Failed to record audio feedback.");
    }
  };

  const handleGradeSubmission = async (status: "graded" | "resubmission_requested") => {
    if (!activeSubmission) return;

    setSavingGrade(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Auth required");

      const res = await fetch("/api/assignments/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          submissionId: activeSubmission.id,
          grade: gradingScore,
          feedback: gradingFeedback,
          tutorAudioAssetId: gradingAudioId,
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save evaluation.");

      // Update local submissions list
      setSubmissions((prev) =>
        prev.map((s) => (s.id === activeSubmission.id ? { ...s, ...json.submission } : s))
      );

      toast.success(status === "graded" ? "Grade and feedback saved!" : "Requested student revision.");
    } catch (err: any) {
      toast.error(err.message || "Evaluation save failed.");
    } finally {
      setSavingGrade(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstructions.trim() || !newCourseId) {
      toast.error("Please fill in the title, instructions, and course.");
      return;
    }

    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) throw new Error("Auth required");

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          instructions: newInstructions.trim(),
          courseId: newCourseId,
          subjectId: newSubjectId || null,
          dueDate: newDueDate || null,
          maxPoints: newMaxPoints,
          allowAudioSubmission: newAllowAudio,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Creation failed.");

      setAssignments((prev) => [{ ...json.assignment, stats: { total: 0, submitted: 0, graded: 0 } }, ...prev]);
      setSelectedAssignmentId(json.assignment.id);
      setShowCreateModal(false);
      setNewTitle("");
      setNewInstructions("");
      toast.success("Assignment published and added to course calendar!");
    } catch (err: any) {
      toast.error(err.message || "Could not publish assignment.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Tutor Authoring & Evaluation Workspace
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">
            Assignments Management & Grading
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Create course assignments, review student submissions, and deliver grades with voice notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition active-press hover-lift"
          >
            + Create Assignment
          </button>
          <Link
            href="/tutor"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active-press"
          >
            ← Tutor Workspace
          </Link>
        </div>
      </div>

      {/* Assignment Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-950">Publish New Course Assignment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Calculus: Chain Rule & Implicit Differentiation Problems"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject (Optional)</label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="">None / General</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instructions & Problem Set</label>
                <textarea
                  rows={5}
                  placeholder="Describe the tasks, problem numbers, or essay prompt in detail…"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Points</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={newMaxPoints}
                    onChange={(e) => setNewMaxPoints(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowAudio"
                  checked={newAllowAudio}
                  onChange={(e) => setNewAllowAudio(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allowAudio" className="text-xs text-slate-700 font-medium">
                  Allow student audio / voice note submissions (ideal for oral exams or spoken explanations)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-50"
                >
                  {creating ? "Publishing…" : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main 3-Column Cockpit */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Tutor Assignment Roster (4 cols) */}
        <section className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
            Course Assignments ({assignments.length})
          </h2>

          <div className="space-y-2 overflow-y-auto max-h-[650px] pr-1">
            {loading ? (
              <ListSkeleton count={4} />
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <p className="font-bold">No assignments yet</p>
                <p className="mt-1">Click "+ Create Assignment" to publish your first homework task.</p>
              </div>
            ) : (
              assignments.map((assign) => {
                const isSelected = assign.id === selectedAssignmentId;
                return (
                  <button
                    key={assign.id}
                    onClick={() => setSelectedAssignmentId(assign.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex flex-col gap-1.5 hover-lift active-press ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                      <span>{assign.learning_subjects?.name || "General"}</span>
                      <span className="text-[10px] text-slate-400">Max: {assign.max_points} pts</span>
                    </div>

                    <h3 className="text-xs font-black text-slate-950 line-clamp-2">{assign.title}</h3>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>
                        Submissions:{" "}
                        <strong className="text-slate-900">
                          {assign.stats.submitted}/{assign.stats.total}
                        </strong>
                      </span>
                      <span>Graded: {assign.stats.graded}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Middle Column: Submissions Queue (3 cols) */}
        <section className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              Submissions ({submissions.length})
            </h2>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[650px] pr-1">
            {loadingSubmissions ? (
              <ListSkeleton count={3} />
            ) : submissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <span className="text-2xl">⏳</span>
                <p className="font-bold mt-2">No submissions yet</p>
                <p className="mt-1">Students will appear here as they turn in their answers.</p>
              </div>
            ) : (
              submissions.map((sub, i) => {
                const isSelected = sub.id === activeSubmissionId;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex flex-col gap-1.5 hover-lift active-press ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Student #{i + 1}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          sub.status === "graded"
                            ? "bg-emerald-100 text-emerald-800"
                            : sub.status === "resubmission_requested"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {sub.status === "graded" ? `${sub.grade} pts` : sub.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {sub.audio_asset && <span>🎙️ Audio Note</span>}
                      {sub.text_submission && <span>📝 Text</span>}
                      <span>· {new Date(sub.submitted_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Grading Cockpit & Evaluation (5 cols) */}
        <section className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeSubmission ? (
            <div className="space-y-5 animate-fade-in-up">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                    Grading Cockpit
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Turned in: {new Date(activeSubmission.submitted_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-black text-slate-950">
                  {selectedAssignment?.title}
                </h3>
              </div>

              {/* Student's Work */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Student's Written Work
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {activeSubmission.text_submission || "No written text submitted."}
                </div>
              </div>

              {/* Student's Audio Submission */}
              {activeSubmission.audio_asset && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-xs font-bold text-purple-900 block">
                    🎙️ Student Audio Submission:
                  </span>
                  <AudioPlayer
                    src={activeSubmission.audio_asset.file_url}
                    title={activeSubmission.audio_asset.title || "Student Audio"}
                    durationSeconds={activeSubmission.audio_asset.duration_seconds}
                  />
                </div>
              )}

              {/* Evaluation Controls */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grade (Max {selectedAssignment?.max_points || 100} points)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={selectedAssignment?.max_points || 100}
                    value={gradingScore}
                    onChange={(e) => setGradingScore(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 88"
                    className="w-full sm:w-48 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Written Feedback & Rubric Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide constructive guidance, mistake corrections, or praise…"
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Tutor Audio Critique Recording */}
                {gradingAudioUrl ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>🎙️ Attached Voice Feedback</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGradingAudioId(null);
                          setGradingAudioUrl(null);
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <AudioPlayer src={gradingAudioUrl} title="Tutor Voice Feedback" />
                  </div>
                ) : (
                  <div>
                    {!showGradingRecorder ? (
                      <button
                        type="button"
                        onClick={() => setShowGradingRecorder(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition active-press"
                      >
                        <span>🎙️ Record Voice Critique for Student</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <VoiceNoteRecorder
                          onAudioReady={handleTutorAudioReady}
                          onCancel={() => setShowGradingRecorder(false)}
                          maxDurationSeconds={180}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Grade Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleGradeSubmission("graded")}
                    disabled={savingGrade}
                    className="rounded-xl bg-[#012153] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-900 disabled:opacity-50 transition active-press hover-lift"
                  >
                    {savingGrade ? "Saving…" : "Save & Publish Grade →"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGradeSubmission("resubmission_requested")}
                    disabled={savingGrade}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition active-press"
                  >
                    Request Resubmission
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400">
              <span className="text-4xl">🎯</span>
              <h3 className="mt-3 text-base font-bold text-slate-700">Select a Submission</h3>
              <p className="mt-1 text-xs">
                Pick a student submission from the queue to view their work and provide rubric points and audio feedback.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
