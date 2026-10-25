"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import AudioPlayer from "../../../components/AudioPlayer";
import VoiceNoteRecorder from "../../../components/VoiceNoteRecorder";
import { ListSkeleton } from "../../../components/SkeletonLoader";
import { toast } from "../../../lib/toast";
import ActivePresenceBar from "../../../components/ActivePresenceBar";

type FeedPost = {
  id: string;
  title: string;
  content: string;
  post_type: string;
  is_pinned: boolean;
  created_at: string;
  audio_assets?: {
    file_url: string;
    duration_seconds: number;
    title?: string;
  };
  content_tags?: {
    official_tags?: {
      id: string;
      name: string;
      display_label: string;
      color: string;
      bg_color: string;
    };
  }[];
};

export default function SubjectFeedPage({
  params,
}: {
  params: Promise<{ subjectSlug: string }>;
}) {
  const resolvedParams = use(params);
  const subjectSlug = resolvedParams.subjectSlug;

  const [subject, setSubject] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [isTutor, setIsTutor] = useState(false);

  // New post modal / composer state
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState("announcement");
  const [isPinned, setIsPinned] = useState(false);
  const [recordedAudioId, setRecordedAudioId] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // 1. Fetch Subject
      const { data: subData } = await supabase
        .from("learning_subjects")
        .select("*")
        .eq("slug", subjectSlug)
        .maybeSingle();

      if (!active) return;
      if (!subData) {
        setLoading(false);
        return;
      }
      setSubject(subData);

      // 2. Check Auth & Tutor role
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        const { data: membership } = await supabase
          .from("learning_subject_memberships")
          .select("id")
          .eq("subject_id", subData.id)
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: adminRole } = await supabase
          .from("admin_user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership || (adminRole && ["super_admin", "platform_admin", "teacher"].includes(adminRole.role))) {
          setIsTutor(true);
        }
      }

      // 3. Fetch Posts
      const res = await fetch(`/api/feed/posts?subjectId=${subData.id}&tag=${activeTag}`);
      const json = await res.json();
      if (active && json.success) {
        setPosts(json.posts);
      }
      setLoading(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [subjectSlug, activeTag]);

  // Handle uploading tutor voice note in composer
  const handleUploadVoice = async (blob: Blob, durationSeconds: number) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    setIsUploadingVoice(true);
    const formData = new FormData();
    formData.append("file", blob, "announcement_voice.webm");
    formData.append("asset_type", "tutor_voice_note");
    formData.append("duration_seconds", String(durationSeconds));
    formData.append("title", postTitle || "Audio Note");

    const uploadRes = await fetch("/api/audio/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    setIsUploadingVoice(false);

    if (uploadJson.success) {
      setRecordedAudioId(uploadJson.asset.id);
      toast.success("Audio note ready to publish!");
    } else {
      toast.error(uploadJson.error || "Failed to upload audio.");
    }
  };

  // Submit Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim() || !subject) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const res = await fetch("/api/feed/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        subject_id: subject.id,
        title: postTitle.trim(),
        content: postContent.trim(),
        post_type: postType,
        is_pinned: isPinned,
        audio_asset_id: recordedAudioId,
      }),
    });

    const json = await res.json();
    if (json.success) {
      setShowComposer(false);
      setPostTitle("");
      setPostContent("");
      setRecordedAudioId(null);
      // Reload posts
      const updated = await fetch(`/api/feed/posts?subjectId=${subject.id}`);
      const updatedJson = await updated.json();
      if (updatedJson.success) setPosts(updatedJson.posts);
      toast.success("Post published to subject feed! 📢");
    } else {
      toast.error(json.error || "Failed to publish post.");
    }
  };

  const officialTagPills = [
    { name: "all", label: "All Items" },
    { name: "IMPORTANT", label: "🔴 Important" },
    { name: "EXAM_TIP", label: "💡 Exam Tip" },
    { name: "ASSIGNMENT", label: "📝 Assignment" },
    { name: "CORRECTION", label: "⚠️ Correction" },
    { name: "REVISION", label: "🟢 Revision" },
    { name: "READ_THIS", label: "📖 Read This" },
    { name: "CLASS_UPDATE", label: "📹 Class Update" },
  ];

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/learn" className="hover:text-slate-900">
              Learning Hub
            </Link>
            <span>/</span>
            <Link href={`/learn/${subjectSlug}`} className="hover:text-slate-900">
              {subject?.name || "Subject"}
            </Link>
            <span>/</span>
            <span className="text-blue-900">Feed & Updates</span>
          </div>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            {subject?.name} Course Feed
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Official announcements, lesson audio notes, syllabus updates and revision resources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTutor && (
            <button
              onClick={() => setShowComposer(true)}
              className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition hover-lift active-press"
            >
              + Publish Announcement
            </button>
          )}

          <ActivePresenceBar activityContext={subject ? `Studying ${subject.name} Course Feed` : "Course Feed"} variant="pill" />

          <Link
            href="/assignments"
            className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100 transition active-press"
          >
            📝 Assignments
          </Link>

          <Link
            href={`/learn/${subjectSlug}`}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active-press"
          >
            ← Subject Lessons
          </Link>
        </div>
      </div>

      {/* Official Tag Filter Pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {officialTagPills.map((tag) => (
          <button
            key={tag.name}
            onClick={() => setActiveTag(tag.name)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition hover-lift active-press ${
              activeTag === tag.name
                ? "bg-[#012153] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Tutor Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-950">Publish Course Announcement</h3>
              <button
                onClick={() => setShowComposer(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Critical WAEC Exam Tip: Organic Chemistry Mechanisms"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Post Content</label>
                <textarea
                  rows={4}
                  placeholder="Provide structured notes, guidance, or revision instructions…"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* Attach Voice Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Tutor Voice Note
                </label>
                {recordedAudioId ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                    <span>✓ Audio memo attached</span>
                    <button
                      type="button"
                      onClick={() => setRecordedAudioId(null)}
                      className="font-bold text-emerald-950 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <VoiceNoteRecorder
                    onAudioReady={handleUploadVoice}
                    maxDurationSeconds={300}
                  />
                )}
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Pin this post to top of feed</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingVoice}
                  className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition disabled:opacity-50"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts Stream */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="pt-2 animate-fade-in-up">
            <ListSkeleton count={3} />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <span className="text-3xl">📌</span>
            <h3 className="mt-2 text-base font-bold text-slate-900">No feed items yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Announcements, lesson notes, and revision voice notes will appear here as the course progresses.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className={`rounded-3xl border p-5 sm:p-6 transition shadow-xs hover-lift ${
                post.is_pinned
                  ? "border-blue-300 bg-blue-50/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {post.is_pinned && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                      📌 Pinned
                    </span>
                  )}
                  {post.content_tags?.map((ct, idx) => (
                    <span
                      key={idx}
                      style={{
                        color: ct.official_tags?.color || "#0369a1",
                        backgroundColor: ct.official_tags?.bg_color || "#e0f2fe",
                      }}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                    >
                      {ct.official_tags?.display_label}
                    </span>
                  ))}
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  {new Date(post.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-black text-slate-950 sm:text-xl">
                {post.title}
              </h2>

              <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {post.content}
              </p>

              {/* Tutor Voice Note Player */}
              {post.audio_assets && (
                <div className="mt-4">
                  <AudioPlayer
                    src={post.audio_assets.file_url}
                    title={post.audio_assets.title || "Tutor Voice Note"}
                    durationSeconds={post.audio_assets.duration_seconds}
                  />
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
