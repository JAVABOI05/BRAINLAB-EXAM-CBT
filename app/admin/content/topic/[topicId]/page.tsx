/* eslint @typescript-eslint/no-explicit-any: "off" */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../../../lib/adminAuth";
import {
  CONTENT_TYPE_REGISTRY,
  type ContentType,
  type TopicContentItem,
  type MCQQuestion,
} from "../../../../lib/contentStudio/types";
import "../../../admin.css";

export default function TopicContentStudioPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params?.topicId as string;

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [topic, setTopic] = useState<{ id: string; title: string; slug: string; is_published: boolean; subject_id: string } | null>(null);
  const [subject, setSubject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [items, setItems] = useState<TopicContentItem[]>([]);
  const [maxLimit, setMaxLimit] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & Panels
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [editingItem, setEditingItem] = useState<TopicContentItem | null>(null);
  const [editorData, setEditorData] = useState<Record<string, any>>({});
  const [editorTitle, setEditorTitle] = useState("");
  const [editorSummary, setEditorSummary] = useState("");
  const [editorPublished, setEditorPublished] = useState(false);
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);

  // AI Assistant States
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string>("rephrase");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");

  // AI Guided Lesson Builder Modal
  const [showLessonBuilder, setShowLessonBuilder] = useState(false);
  const [builderLevel, setBuilderLevel] = useState("UTME/JAMB");
  const [builderObjectives, setBuilderObjectives] = useState("");
  const [builderDepth, setBuilderDepth] = useState("Detailed with exam examples");

  // AI Quality Reviewer Drawer
  const [showReviewDrawer, setShowReviewDrawer] = useState(false);
  const [reviewFindings, setReviewFindings] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState(false);

  // Student Preview Modal
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);

  const loadTopicAndContent = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      // 1. Fetch topic & subject details
      const { data: topicData, error: tErr } = await supabase
        .from("learning_topics")
        .select("id, title, slug, is_published, subject_id, learning_subjects(id, name, slug)")
        .eq("id", topicId)
        .single();

      if (tErr || !topicData) {
        setFeedback({ type: "error", text: "Topic not found." });
        setLoading(false);
        return;
      }

      setTopic(topicData as any);
      setSubject((topicData as any).learning_subjects);

      // 2. Fetch items
      const { data: itemsData, error: iErr } = await supabase
        .from("learning_topic_content_items")
        .select("*")
        .eq("topic_id", topicId)
        .order("order_index", { ascending: true });

      if (itemsData) {
        setItems(itemsData as TopicContentItem[]);
      }

      // 3. Fetch max items configuration
      const { data: configData } = await supabase
        .from("platform_configuration")
        .select("value")
        .eq("key", "max_content_items_per_topic")
        .maybeSingle();

      if (configData?.value) {
        setMaxLimit(Number(configData.value) || 50);
      }
    } catch (err) {
      setFeedback({ type: "error", text: "Error loading topic data." });
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    async function checkAuth() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      await loadTopicAndContent();
    }
    checkAuth();
  }, [router, loadTopicAndContent]);

  // Handle Opening Content Type Selector
  function openAddContent() {
    if (items.length >= maxLimit) {
      setFeedback({
        type: "error",
        text: `Topic item limit reached (${maxLimit} max). Cannot add more items.`,
      });
      return;
    }
    setShowTypeSelector(true);
  }

  // Handle Starting a New Content Item
  function startNewItem(type: ContentType) {
    const descriptor = CONTENT_TYPE_REGISTRY[type];
    const newItem: Partial<TopicContentItem> = {
      topic_id: topicId,
      content_type: type,
      title: descriptor.defaultTitle,
      summary: "",
      is_published: false,
      data: JSON.parse(JSON.stringify(descriptor.defaultData)),
      metadata: {},
      version: 1,
    };

    setEditingItem(newItem as TopicContentItem);
    setEditorTitle(descriptor.defaultTitle);
    setEditorSummary("");
    setEditorPublished(false);
    setEditorData(JSON.parse(JSON.stringify(descriptor.defaultData)));
    setShowTypeSelector(false);
    setAiResult(null);
  }

  // Handle Editing an Existing Item
  function startEditItem(item: TopicContentItem) {
    setEditingItem(item);
    setEditorTitle(item.title);
    setEditorSummary(item.summary || "");
    setEditorPublished(item.is_published);
    setEditorData(JSON.parse(JSON.stringify(item.data || {})));
    setAiResult(null);
  }

  // Save Content Item (Calls Atomic RPC)
  async function handleSaveItem() {
    if (!editorTitle.trim() || !editingItem) {
      setFeedback({ type: "error", text: "Please enter a content title." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc("admin_save_topic_content_item", {
        p_topic_id: topicId,
        p_item_id: editingItem.id || null,
        p_content_type: editingItem.content_type,
        p_title: editorTitle.trim(),
        p_summary: editorSummary.trim() || null,
        p_data: editorData,
        p_metadata: editingItem.metadata || {},
        p_ai_metadata: editingItem.ai_metadata || {},
        p_is_published: editorPublished,
      });

      if (error || !data?.ok) {
        setFeedback({
          type: "error",
          text: data?.message || error?.message || "Failed to save content item.",
        });
      } else {
        setFeedback({ type: "success", text: "Content item saved successfully!" });
        setEditingItem(null);
        await loadTopicAndContent();
      }
    } catch (err) {
      setFeedback({ type: "error", text: "Error during save operation." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadSelectedMedia(file: File | null) {
    if (!file || !editingItem || !topicId) return;
    const mediaType = editingItem.content_type;
    if (!["audio", "video", "image", "document"].includes(mediaType)) return;
    if (file.size > 100 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Files must be 100 MB or smaller. For large videos, use a hosted video link." });
      return;
    }

    setMediaUploading(true);
    setFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before uploading lesson media.");
      const response = await fetch("/api/learning/content-media/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topic_id: topicId,
          filename: file.name,
          content_type: file.type,
          media_type: mediaType,
        }),
      });
      const upload = await response.json();
      if (!response.ok || !upload.success) throw new Error(upload.error || "Could not prepare upload.");

      const { error: uploadError } = await supabase.storage
        .from(upload.bucket)
        .uploadToSignedUrl(upload.path, upload.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message || "Upload failed. Please check your connection.");

      const { data: publicData } = supabase.storage.from(upload.bucket).getPublicUrl(upload.path);
      setEditorData((current) => ({
        ...current,
        url: publicData.publicUrl,
        ...(mediaType === "document" ? { file_name: file.name } : {}),
        ...(mediaType === "video" ? { provider: "direct" } : {}),
      }));
      setFeedback({ type: "success", text: `${file.name} uploaded. Save the content item to attach it to this lesson.` });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Media upload failed." });
    } finally {
      setMediaUploading(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
    }
  }

  // Reorder Item (Move Up / Down)
  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setItems(newItems);

    try {
      const itemIds = newItems.map((i) => i.id);
      await supabase.rpc("admin_reorder_topic_content_items", {
        p_topic_id: topicId,
        p_item_ids: itemIds,
      });
    } catch {
      await loadTopicAndContent();
    }
  }

  // Duplicate Item (Calls Atomic RPC)
  async function handleDuplicate(item: TopicContentItem) {
    if (items.length >= maxLimit) {
      setFeedback({ type: "error", text: `Duplication blocked: maximum of ${maxLimit} items reached.` });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("admin_duplicate_topic_content_item", {
        p_item_id: item.id,
      });

      if (error || !data?.ok) {
        setFeedback({ type: "error", text: data?.message || "Failed to duplicate item." });
      } else {
        setFeedback({ type: "success", text: `Duplicated "${item.title}" successfully.` });
        await loadTopicAndContent();
      }
    } catch {
      setFeedback({ type: "error", text: "Duplication failed." });
    } finally {
      setSaving(false);
    }
  }

  // Delete Item
  async function handleDelete(item: TopicContentItem) {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"? This cannot be undone.`)) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("learning_topic_content_items").delete().eq("id", item.id);
      if (error) throw error;
      setFeedback({ type: "success", text: "Item deleted." });
      await loadTopicAndContent();
    } catch (err) {
      setFeedback({ type: "error", text: "Failed to delete item." });
    } finally {
      setSaving(false);
    }
  }

  // Toggle Publication of Entire Topic
  async function toggleTopicPublication() {
    if (!topic) return;
    const nextState = !topic.is_published;
    const { error } = await supabase
      .from("learning_topics")
      .update({ is_published: nextState, updated_at: new Date().toISOString() })
      .eq("id", topic.id);

    if (!error) {
      setTopic({ ...topic, is_published: nextState });
      setFeedback({
        type: "success",
        text: nextState ? "Topic is now published and visible to learners." : "Topic unpublished.",
      });
    }
  }

  // Contextual AI Assistant Execution
  async function handleRunAIAssistant() {
    let textToProcess = selectedText.trim();
    if (!textToProcess && textareaRef.current) {
      textToProcess = textareaRef.current.value.slice(0, 3000);
    }

    if (!textToProcess) {
      setFeedback({ type: "error", text: "Select some text or type content into the editor first." });
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/admin/ai-author", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "contextual_edit",
          selectedText: textToProcess,
          action: aiAction,
          instruction: aiCustomPrompt,
          studentLevel: "UTME/JAMB",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "AI edit failed.");
      }

      setAiResult(data.outputText);
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "AI Error" });
    } finally {
      setAiLoading(false);
    }
  }

  // Apply AI Result to Note
  function applyAiResult(mode: "replace" | "insert_below") {
    if (!aiResult) return;
    const currentMarkdown = editorData.markdown || "";

    if (mode === "replace" && selectedText) {
      const next = currentMarkdown.replace(selectedText, aiResult);
      setEditorData({ ...editorData, markdown: next });
    } else {
      const next = currentMarkdown + "\n\n" + aiResult;
      setEditorData({ ...editorData, markdown: next });
    }
    setAiResult(null);
    setSelectedText("");
  }

  // Run AI Lesson Builder
  async function handleBuildGuidedLesson(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/admin/ai-author", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "generate_lesson",
          subject: subject?.name || "General Subject",
          topic: topic?.title || "General Topic",
          level: builderLevel,
          objectives: builderObjectives,
          depth: builderDepth,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Generation failed");

      // Populate into editor as a new rich_text item
      const lesson = data.lesson;
      const newItem: Partial<TopicContentItem> = {
        topic_id: topicId,
        content_type: "rich_text",
        title: lesson.title || `${topic?.title} Core Lesson`,
        summary: lesson.summary || "",
        is_published: false,
        data: {
          markdown: lesson.markdown_content || "",
          reading_time_mins: lesson.estimated_read_time_mins || 6,
          key_takeaways: lesson.key_takeaways || [],
          definitions: lesson.definitions || [],
        },
        ai_metadata: { generated_by_ai: true },
      };

      setEditingItem(newItem as TopicContentItem);
      setEditorTitle(newItem.title || "");
      setEditorSummary(newItem.summary || "");
      setEditorPublished(false);
      setEditorData(newItem.data || {});
      setShowLessonBuilder(false);
      setFeedback({ type: "success", text: "AI Lesson generated! Review the content below before saving." });
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Lesson Builder Error" });
    } finally {
      setAiLoading(false);
    }
  }

  // Run AI Quality Reviewer
  async function handleRunQualityReview() {
    setReviewing(true);
    setShowReviewDrawer(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/admin/ai-author", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "quality_review",
          items,
          topicTitle: topic?.title || "",
          subjectName: subject?.name || "",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Quality review failed");
      setReviewFindings(data.findings || []);
    } catch (err) {
      setFeedback({ type: "error", text: "Quality Review failed to complete." });
    } finally {
      setReviewing(false);
    }
  }

  // Generate MCQs for In-Class Assessment using AI
  async function handleGenerateMCQs() {
    const sourceNote = items.find((i) => i.content_type === "rich_text");
    const sourceText = sourceNote ? (sourceNote.data.markdown as string) : "";

    if (!sourceText) {
      setFeedback({ type: "error", text: "Please create a Study Note first to provide reference material for MCQ generation." });
      return;
    }

    setAiLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const res = await fetch("/api/admin/ai-author", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: "generate_mcqs",
          sourceText,
          count: 3,
          difficulty: "medium",
          subject: subject?.name,
          topic: topic?.title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to generate MCQs");

      const existingQuestions = editorData.questions || [];
      setEditorData({
        ...editorData,
        questions: [...existingQuestions, ...data.questions],
      });
      setFeedback({ type: "success", text: `Generated ${data.questions.length} test questions grounded in topic notes!` });
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "MCQ Generation Error" });
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <p className="py-12 text-center text-sm font-semibold text-slate-500">
            Loading Topic Content Studio...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Link href="/admin/content" className="hover:text-blue-700">
              Content Manager
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">{subject?.name || "Subject"}</span>
            <span>/</span>
            <span className="font-bold text-slate-900">{topic?.title || "Topic"}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                items.length >= maxLimit
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {items.length} / {maxLimit} Items
            </span>

            <button
              onClick={toggleTopicPublication}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                topic?.is_published
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              {topic?.is_published ? "● Published" : "○ Draft State"}
            </button>

            <button
              onClick={() => setShowStudentPreview(true)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
            >
              👁️ Preview Student View
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">
                Studio · {subject?.name} · {topic?.title}
              </div>
              <h1 className="admin-title">Topic Content Studio</h1>
              <p className="admin-subtitle">
                Author, organize, edit, and sequence comprehensive learning resources for this topic. All content types appear in the exact pedagogical order configured below.
              </p>
            </div>
            <div className="admin-actions">
              <button onClick={openAddContent} className="admin-btn-primary">
                + Add Content
              </button>
              <button onClick={() => setShowLessonBuilder(true)} className="admin-btn-light">
                🤖 AI Lesson Builder
              </button>
              <button onClick={handleRunQualityReview} className="admin-btn-light">
                🔍 Quality Review
              </button>
              <button onClick={() => router.push("/admin/content")} className="admin-btn-light">
                All Topics
              </button>
            </div>
          </div>
        </section>

        <section aria-label="Recommended content workflow" className="mb-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/50 to-blue-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-sm font-black text-slate-900">Build your lesson in a few easy steps</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">You do not need to fill every field at once. Add one learning block, save it, then continue. Upload a file directly or paste a hosted media link.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { number: "1", label: "Add notes" },
                { number: "2", label: "Add media" },
                { number: "3", label: "Add a checkpoint" },
                { number: "4", label: "Preview & publish" },
              ].map((step) => (
                <div key={step.number} className="flex items-center gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 shadow-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-black text-indigo-800">{step.number}</span>
                  <span className="text-[11px] font-bold leading-4 text-slate-700">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Quick start actions" className="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={openAddContent}
            className="group flex items-center gap-3 rounded-2xl border border-blue-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">＋</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">Add learning material</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">Notes, examples, images, audio, video, PDFs or a quick quiz.</span>
            </span>
            <span aria-hidden="true" className="text-lg text-blue-700 transition group-hover:translate-x-1">→</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLessonBuilder(true)}
            className="group flex items-center gap-3 rounded-2xl border border-violet-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-400 hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">✦</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">Build a lesson with AI</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">Start with a draft, review it, and edit it before learners see it.</span>
            </span>
            <span aria-hidden="true" className="text-lg text-violet-700 transition group-hover:translate-x-1">→</span>
          </button>
        </section>

        {feedback && (
          <div
            className={`mb-4 rounded-xl p-4 text-xs font-semibold ${
              feedback.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* CONTENT ITEMS ORDERED SEQUENCE */}
        <section className="admin-section admin-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="admin-card-title">Learning Sequence ({items.length} items)</h2>
              <p className="admin-card-text">
                Items are delivered to students in this exact sequence. Use the arrow buttons to rearrange order.
              </p>
            </div>
            {items.length < maxLimit && (
              <button
                onClick={openAddContent}
                className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                + Add Item
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl">📚</span>
              <h3 className="mt-3 text-sm font-bold text-slate-800">No Content Items Created Yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Start building this topic by adding study notes, audio lessons, videos, or quick MCQ checkpoints.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={openAddContent}
                  className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-[#093278]"
                >
                  + Add First Item
                </button>
                <button
                  onClick={() => setShowLessonBuilder(true)}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  🤖 Generate with AI
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item, idx) => {
                const descriptor = CONTENT_TYPE_REGISTRY[item.content_type] || {
                  label: item.content_type,
                  icon: "📄",
                  badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Sequence Badge & Order buttons */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-black text-slate-700">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, "up")}
                            className="text-[10px] text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === items.length - 1}
                            onClick={() => handleMove(idx, "down")}
                            className="text-[10px] text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Item Details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${descriptor.badgeColor}`}
                          >
                            <span>{descriptor.icon}</span>
                            <span>{descriptor.label}</span>
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-black uppercase ${
                              item.is_published
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.is_published ? "Published" : "Draft"}
                          </span>

                          {item.ai_metadata?.generated_by_ai && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.2 text-[9px] font-bold text-indigo-700 border border-indigo-200">
                              🤖 AI Generated
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3>
                        {item.summary && <p className="text-xs text-slate-500 mt-0.5">{item.summary}</p>}

                        {/* Type specific preview info */}
                        <div className="mt-1.5 flex gap-3 text-[11px] text-slate-400">
                          {item.content_type === "in_class_mcq" && (
                            <span>{(item.data.questions as any[])?.length || 0} Questions</span>
                          )}
                          {item.content_type === "rich_text" && (
                            <span>~{String(item.data.reading_time_mins || 5)} mins read</span>
                          )}
                          {item.content_type === "audio" && (
                            <span>Speaker: {String(item.data.speaker || "Tutor")}</span>
                          )}
                          {item.content_type === "video" && (
                            <span>Provider: {String(item.data.provider || "Direct")}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => startEditItem(item)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Edit ✏️
                      </button>
                      <button
                        onClick={() => handleDuplicate(item)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        title="Duplicate item"
                      >
                        Duplicate 📄
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        title="Delete item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MODAL 1: CONTENT TYPE SELECTOR */}
        {showTypeSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Add Topic Content</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Choose a content format to add to this topic&apos;s learning sequence.
                  </p>
                </div>
                <button
                  onClick={() => setShowTypeSelector(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Object.values(CONTENT_TYPE_REGISTRY).map((descriptor) => (
                  <button
                    key={descriptor.type}
                    type="button"
                    onClick={() => startNewItem(descriptor.type)}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-500 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{descriptor.icon}</span>
                        <span className="text-sm font-bold text-slate-900">{descriptor.label}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{descriptor.description}</p>
                    </div>
                    <span className="mt-4 text-[11px] font-bold text-indigo-700">Select Format →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: FULL CONTENT ITEM EDITOR */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {CONTENT_TYPE_REGISTRY[editingItem.content_type]?.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      {editingItem.id ? "Edit Content Item" : "Create New Content Item"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Format: {CONTENT_TYPE_REGISTRY[editingItem.content_type]?.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                {/* Title & Summary */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold uppercase text-slate-700">Item Title</label>
                    <input
                      type="text"
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      placeholder="e.g. Introduction & Key Terminology"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-slate-700">Publication State</label>
                    <select
                      value={editorPublished ? "published" : "draft"}
                      onChange={(e) => setEditorPublished(e.target.value === "published")}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-bold focus:border-blue-500 focus:outline-none"
                    >
                      <option value="draft">Draft (Hidden from students)</option>
                      <option value="published">Published (Visible in order)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Short Summary / Subtitle</label>
                  <input
                    type="text"
                    value={editorSummary}
                    onChange={(e) => setEditorSummary(e.target.value)}
                    placeholder="Brief description visible in learning lists..."
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* TYPE-SPECIFIC EDITORS */}
                {["audio", "video", "image", "document"].includes(editingItem.content_type) && (
                  <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Add a file from your device</h4>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                          Upload an audio clip, video, image, or PDF directly. You can still paste a hosted URL below if you prefer.
                          Maximum file size: 100 MB.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => mediaFileInputRef.current?.click()}
                        disabled={mediaUploading}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
                      >
                        {mediaUploading ? "Uploading…" : "Choose file"}
                      </button>
                    </div>
                    <input
                      ref={mediaFileInputRef}
                      type="file"
                      className="hidden"
                      accept={
                        editingItem.content_type === "audio" ? "audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav" :
                        editingItem.content_type === "video" ? "video/mp4,video/webm,video/quicktime" :
                        editingItem.content_type === "image" ? "image/jpeg,image/png,image/webp,image/gif" :
                        "application/pdf"
                      }
                      onChange={(event) => void uploadSelectedMedia(event.target.files?.[0] || null)}
                    />
                    {editorData.url && (
                      <p className="mt-3 break-all rounded-lg border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-blue-900">
                        File attached: {editorData.file_name || editorData.url}
                      </p>
                    )}
                  </section>
                )}

                {/* A. Rich Text Editor */}
                {editingItem.content_type === "rich_text" && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      {/* Markdown Toolbar */}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + "\n## Heading 2\n" });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + "\n### Heading 3\n" });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + " **bold text** " });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + "\n- Bullet point\n" });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          • List
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({
                              ...editorData,
                              markdown: current + "\n| Concept | Definition | Example |\n| --- | --- | --- |\n| Term | Meaning | Sample |\n",
                            });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          Table ▦
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + "\n> **Definition**: Formal explanation of concept.\n" });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          Callout 📌
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.markdown || "";
                            setEditorData({ ...editorData, markdown: current + " $$\\int_{a}^{b} f(x) dx$$ " });
                          }}
                          className="rounded bg-slate-100 px-2 py-1 font-bold text-slate-700 hover:bg-slate-200"
                        >
                          KaTeX Math ∑
                        </button>
                      </div>

                      {/* AI Toolbar Button */}
                      <button
                        type="button"
                        onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
                        className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1 font-bold text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5"
                      >
                        <span>🤖 Contextual AI Assistant</span>
                      </button>
                    </div>

                    {/* Contextual AI Assistant Panel */}
                    {aiAssistantOpen && (
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold uppercase text-indigo-950">
                            Contextual AI Writing Assistant
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold">
                            Highlight text in editor to target specific passages
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { action: "rephrase", label: "Rephrase & Polish" },
                            { action: "expand", label: "Expand & Explain" },
                            { action: "simplify", label: "Simplify for Students" },
                            { action: "grammar", label: "Fix Grammar" },
                            { action: "bullets", label: "Convert to Bullets" },
                            { action: "table", label: "Convert to Table" },
                            { action: "definitions", label: "Extract Definitions" },
                            { action: "key_takeaways", label: "Generate Takeaways" },
                            { action: "continue_writing", label: "Continue Writing" },
                          ].map((item) => (
                            <button
                              key={item.action}
                              type="button"
                              onClick={() => {
                                setAiAction(item.action);
                                void handleRunAIAssistant();
                              }}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                                aiAction === item.action
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aiCustomPrompt}
                            onChange={(e) => setAiCustomPrompt(e.target.value)}
                            placeholder="Custom prompt: e.g. Add a real-world Nigerian WAEC exam example..."
                            className="flex-1 rounded-xl border border-slate-300 bg-white p-2 text-xs focus:border-indigo-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={aiLoading}
                            onClick={() => {
                              setAiAction("custom");
                              void handleRunAIAssistant();
                            }}
                            className="rounded-xl bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
                          >
                            {aiLoading ? "Thinking..." : "Run Custom →"}
                          </button>
                        </div>

                        {/* AI Output / Diff Preview */}
                        {aiResult && (
                          <div className="rounded-xl border border-indigo-200 bg-white p-3.5 space-y-2">
                            <span className="font-bold text-slate-800 uppercase text-[10px]">
                              Proposed AI Improvement
                            </span>
                            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 font-mono">
                              {aiResult}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => applyAiResult("replace")}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Replace Selection ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => applyAiResult("insert_below")}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Append Below
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiResult(null)}
                                className="rounded-lg px-2 text-xs text-slate-400 hover:text-slate-600 ml-auto"
                              >
                                Discard ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Markdown Editor</span>
                      <button
                        type="button"
                        onClick={() => setEditorPreviewMode(!editorPreviewMode)}
                        className="font-bold text-indigo-700 hover:underline"
                      >
                        {editorPreviewMode ? "Switch to Raw Editor" : "Switch to Formatted Preview"}
                      </button>
                    </div>

                    {!editorPreviewMode ? (
                      <textarea
                        ref={textareaRef}
                        rows={14}
                        value={editorData.markdown || ""}
                        onSelect={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          const sel = target.value.substring(target.selectionStart, target.selectionEnd);
                          setSelectedText(sel);
                        }}
                        onChange={(e) => setEditorData({ ...editorData, markdown: e.target.value })}
                        className="w-full rounded-2xl border border-slate-300 p-3.5 font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none"
                        placeholder="Write study note in markdown. Formulas can be formatted with $$KaTeX$$..."
                      />
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 prose max-w-none text-xs whitespace-pre-wrap">
                        {editorData.markdown || "Note is empty."}
                      </div>
                    )}
                  </div>
                )}

                {/* B. Audio Lesson Editor */}
                {editingItem.content_type === "audio" && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Audio URL (HTTPS)</label>
                      <input
                        type="url"
                        value={editorData.url || ""}
                        onChange={(e) => setEditorData({ ...editorData, url: e.target.value })}
                        placeholder="https://.../lecture-recording.mp3"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-700">Speaker / Instructor</label>
                        <input
                          type="text"
                          value={editorData.speaker || ""}
                          onChange={(e) => setEditorData({ ...editorData, speaker: e.target.value })}
                          placeholder="e.g. Dr. K. Adebayo"
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold uppercase text-slate-700">Duration (seconds)</label>
                        <input
                          type="number"
                          value={editorData.duration_seconds || 180}
                          onChange={(e) => setEditorData({ ...editorData, duration_seconds: Number(e.target.value) })}
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Full Audio Transcript</label>
                      <textarea
                        rows={5}
                        value={editorData.transcript || ""}
                        onChange={(e) => setEditorData({ ...editorData, transcript: e.target.value })}
                        placeholder="Provide text transcript for student accessibility..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* C. Video Lesson Editor */}
                {editingItem.content_type === "video" && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-700">Video Provider</label>
                        <select
                          value={editorData.provider || "youtube"}
                          onChange={(e) => setEditorData({ ...editorData, provider: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="youtube">YouTube Embed</option>
                          <option value="vimeo">Vimeo Embed</option>
                          <option value="direct">Direct MP4 / Mux Stream</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold uppercase text-slate-700">Video Link / URL</label>
                        <input
                          type="url"
                          value={editorData.url || ""}
                          onChange={(e) => setEditorData({ ...editorData, url: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Captions / Subtitles</label>
                      <textarea
                        rows={3}
                        value={editorData.captions || ""}
                        onChange={(e) => setEditorData({ ...editorData, captions: e.target.value })}
                        placeholder="Optional transcript or captions summary..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* D. In-Class MCQ Builder */}
                {editingItem.content_type === "in_class_mcq" && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800 uppercase">
                        Questions ({(editorData.questions as any[])?.length || 0})
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={aiLoading}
                          onClick={handleGenerateMCQs}
                          className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {aiLoading ? "Generating..." : "🤖 Generate Questions with AI"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = editorData.questions || [];
                            const newQ: MCQQuestion = {
                              id: `q${current.length + 1}`,
                              question: "New practice question prompt...",
                              options: [
                                { id: "A", text: "Option A text" },
                                { id: "B", text: "Option B text" },
                                { id: "C", text: "Option C text" },
                                { id: "D", text: "Option D text" },
                              ],
                              correct_option_id: "A",
                              explanation: "Explanation of correct reasoning...",
                              distractor_explanations: {},
                            };
                            setEditorData({ ...editorData, questions: [...current, newQ] });
                          }}
                          className="rounded-xl bg-slate-900 px-3 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          + Add Question
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {((editorData.questions as MCQQuestion[]) || []).map((q, qIdx) => (
                        <div key={q.id || qIdx} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-indigo-700">Question #{qIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(editorData.questions || [])];
                                current.splice(qIdx, 1);
                                setEditorData({ ...editorData, questions: current });
                              }}
                              className="text-xs text-rose-600 hover:underline"
                            >
                              Remove Question ✕
                            </button>
                          </div>

                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const current = [...(editorData.questions || [])];
                              current[qIdx].question = e.target.value;
                              setEditorData({ ...editorData, questions: current });
                            }}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2 font-bold text-slate-900 focus:outline-none"
                            placeholder="Enter question text..."
                          />

                          {/* Options */}
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`correct_${qIdx}`}
                                    checked={q.correct_option_id === opt.id}
                                    onChange={() => {
                                      const current = [...(editorData.questions || [])];
                                      current[qIdx].correct_option_id = opt.id;
                                      setEditorData({ ...editorData, questions: current });
                                    }}
                                  />
                                  <span className="font-bold text-slate-700">{opt.id}:</span>
                                </label>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const current = [...(editorData.questions || [])];
                                    current[qIdx].options[optIdx].text = e.target.value;
                                    setEditorData({ ...editorData, questions: current });
                                  }}
                                  className="flex-1 rounded-xl border border-slate-300 bg-white p-1.5 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase">
                              Correct Answer Explanation
                            </label>
                            <textarea
                              rows={2}
                              value={q.explanation || ""}
                              onChange={(e) => {
                                const current = [...(editorData.questions || [])];
                                current[qIdx].explanation = e.target.value;
                                setEditorData({ ...editorData, questions: current });
                              }}
                              placeholder="Why is this answer correct? Explain for learners..."
                              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* E. External Link Editor */}
                {editingItem.content_type === "external_link" && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Target URL (HTTPS)</label>
                      <input
                        type="url"
                        value={editorData.url || ""}
                        onChange={(e) => setEditorData({ ...editorData, url: e.target.value })}
                        placeholder="https://..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Resource Category</label>
                      <input
                        type="text"
                        value={editorData.category || ""}
                        onChange={(e) => setEditorData({ ...editorData, category: e.target.value })}
                        placeholder="e.g. Supplementary Simulation / University Lab"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* F. PDF & Document Resource Editor */}
                {editingItem.content_type === "document" && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Document URL (HTTPS)</label>
                      <input
                        type="url"
                        value={editorData.url || ""}
                        onChange={(e) => setEditorData({ ...editorData, url: e.target.value })}
                        placeholder="https://.../syllabus-note.pdf"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold uppercase text-slate-700">File Name</label>
                        <input
                          type="text"
                          value={editorData.file_name || ""}
                          onChange={(e) => setEditorData({ ...editorData, file_name: e.target.value })}
                          placeholder="e.g. Cell_Structure_Notes.pdf"
                          className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={editorData.download_allowed !== false}
                            onChange={(e) => setEditorData({ ...editorData, download_allowed: e.target.checked })}
                          />
                          <span>Allow Student Download</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* G. Image & Diagram Editor */}
                {editingItem.content_type === "image" && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Image URL (HTTPS)</label>
                      <input
                        type="url"
                        value={editorData.url || ""}
                        onChange={(e) => setEditorData({ ...editorData, url: e.target.value })}
                        placeholder="https://.../plant-cell-diagram.webp"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Alternative Text (Accessibility)</label>
                      <input
                        type="text"
                        value={editorData.alt_text || ""}
                        onChange={(e) => setEditorData({ ...editorData, alt_text: e.target.value })}
                        placeholder="Describe the image clearly for screen readers..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase text-slate-700">Caption / Attribution</label>
                      <input
                        type="text"
                        value={editorData.caption || ""}
                        onChange={(e) => setEditorData({ ...editorData, caption: e.target.value })}
                        placeholder="e.g. Figure 2.1: Organelles of an Animal Cell"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Save Actions */}
                <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveItem}
                    className="rounded-xl bg-[#012153] px-6 py-2.5 font-bold text-white shadow-sm hover:bg-[#093278] disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Content Item ✓"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: GUIDED AI LESSON BUILDER */}
        {showLessonBuilder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
              <h3 className="text-xl font-black text-slate-950">🤖 Guided AI Lesson Builder</h3>
              <p className="mt-1 text-xs text-slate-500">
                Specify curriculum parameters to draft a comprehensive study note with formulas, definitions, and worked examples.
              </p>

              <form onSubmit={handleBuildGuidedLesson} className="mt-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold uppercase text-slate-700">Target Level</label>
                  <select
                    value={builderLevel}
                    onChange={(e) => setBuilderLevel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                  >
                    <option value="UTME/JAMB">JAMB / UTME (Exam-focused, high yield)</option>
                    <option value="SSCE/WAEC">WAEC / WASSCE (Detailed theory and step-by-step)</option>
                    <option value="Post-UTME">Post-UTME / Advanced Secondary</option>
                    <option value="Undergraduate">Undergraduate (Introductory university)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Curriculum Objectives</label>
                  <input
                    type="text"
                    value={builderObjectives}
                    onChange={(e) => setBuilderObjectives(e.target.value)}
                    placeholder="e.g. Master differentiation from first principles and power rule..."
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-700">Content Depth &amp; Style</label>
                  <select
                    value={builderDepth}
                    onChange={(e) => setBuilderDepth(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                  >
                    <option value="Detailed with exam examples">Detailed with exam examples and pitfalls</option>
                    <option value="Concise high-yield revision">Concise high-yield revision summary</option>
                    <option value="Step-by-step beginner friendly">Step-by-step beginner friendly with analogies</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLessonBuilder(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="rounded-xl bg-indigo-700 px-5 py-2 font-bold text-white shadow-sm hover:bg-indigo-800 disabled:opacity-50"
                  >
                    {aiLoading ? "Generating Lesson..." : "Generate Lesson Draft →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DRAWER: AI QUALITY REVIEW FINDINGS */}
        {showReviewDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
            <div className="w-full max-w-md bg-white p-6 shadow-2xl h-full overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI Quality Inspection</h3>
                  <p className="text-xs text-slate-500">Automated audit for pedagogy, clarity, and consistency.</p>
                </div>
                <button
                  onClick={() => setShowReviewDrawer(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {reviewing ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <p className="mt-3 text-xs text-slate-600">Auditing topic items against exam standards...</p>
                </div>
              ) : reviewFindings.length === 0 ? (
                <div className="py-12 text-center text-xs text-emerald-700">
                  <span className="text-3xl">✨</span>
                  <p className="mt-2 font-bold">No High-Risk Issues Found!</p>
                  <p className="text-slate-500 mt-1">This topic meets quality benchmarks for publication.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {reviewFindings.map((f, idx) => (
                    <div
                      key={idx}
                      className={`rounded-2xl border p-4 text-xs space-y-1.5 ${
                        f.severity === "high"
                          ? "border-rose-200 bg-rose-50/70"
                          : "border-amber-200 bg-amber-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-700">
                          {f.category}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            f.severity === "high"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {f.severity}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">{f.itemTitle}</p>
                      <p className="text-slate-700">{f.issue}</p>
                      <div className="rounded-xl bg-white/80 p-2 text-slate-800 border border-slate-200/50">
                        <strong>Suggestion:</strong> {f.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 4: STUDENT VIEW PREVIEW */}
        {showStudentPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-slate-50 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-800">
                    Student Mode Preview
                  </span>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{topic?.title}</h3>
                </div>
                <button
                  onClick={() => setShowStudentPreview(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {items
                  .filter((i) => i.is_published)
                  .map((item, idx) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-slate-400">Step {idx + 1}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {CONTENT_TYPE_REGISTRY[item.content_type]?.label}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{item.title}</h4>

                      {/* Preview body */}
                      {item.content_type === "rich_text" && (
                        <div className="mt-3 prose max-w-none text-xs text-slate-700 whitespace-pre-wrap">
                          {String(item.data.markdown || "No text content.")}
                        </div>
                      )}
                      {item.content_type === "audio" && (
                        <div className="mt-3 rounded-xl bg-purple-50 p-3 text-xs text-purple-900">
                          🎙️ Audio Lesson ({String(item.data.speaker || "Instructor")}): {String(item.data.url || "Audio URL")}
                        </div>
                      )}
                      {item.content_type === "video" && (
                        <div className="mt-3 rounded-xl bg-slate-900 p-6 text-center text-xs text-white">
                          🎬 Video Player: {String(item.data.url || "Video URL")}
                        </div>
                      )}
                      {item.content_type === "in_class_mcq" && (
                        <div className="mt-3 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900">
                          ⚡ Interactive Checkpoint ({(item.data.questions as any[])?.length || 0} questions)
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
