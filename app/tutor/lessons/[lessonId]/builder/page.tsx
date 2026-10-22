"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import AiLessonAuthorCopilot from "@/app/components/AiLessonAuthorCopilot";
import VoiceNoteRecorder from "@/app/components/VoiceNoteRecorder";
import AudioPlayer from "@/app/components/AudioPlayer";

type BlockType = "text" | "image" | "voice_note" | "short_video" | "long_video" | "inline_mcq";
type Option = { id: string; text: string };
type Block = { id: string; lesson_id: string; block_type: BlockType; content: Record<string, unknown>; order_index: number };
type Lesson = { id: string; title: string; summary: string | null; topic_id: string; estimated_duration_mins: number; is_published: boolean; version: number };
type Topic = { id: string; title: string; subject_id: string };
type Subject = { id: string; name: string; slug: string; is_published: boolean };

const blockLabels: Record<BlockType, string> = {
  text: "Rich text / Markdown",
  image: "Image or diagram",
  voice_note: "Audio note",
  short_video: "Short video (9:16)",
  long_video: "Long video (16:9)",
  inline_mcq: "Instant checkpoint MCQ",
};

function defaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "text": return { markdown: "" };
    case "image": return { url: "", caption: "" };
    case "voice_note": return { url: "", title: "Audio note", duration_sec: 0 };
    case "short_video": return { url: "", auto_loop: false };
    case "long_video": return { provider: "youtube", url: "" };
    case "inline_mcq": return { question: "", options: [{ id: "a", text: "Option A" }, { id: "b", text: "Option B" }], correct_option_id: "a", explanation: "" };
  }
}

function safeHttps(value: unknown) {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function validateBlocks(blocks: Block[]) {
  if (!blocks.length) return "Add at least one content block before publishing.";
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const content = block.content;
    if (block.block_type === "text" && typeof content.markdown !== "string" && typeof content.html !== "string") return `Part ${index + 1}: add lesson text.`;
    if (block.block_type === "text" && !String(content.markdown ?? content.html ?? "").trim()) return `Part ${index + 1}: add lesson text.`;
    if (["image", "voice_note", "short_video", "long_video"].includes(block.block_type) && !safeHttps(content.url)) return `Part ${index + 1}: add a valid HTTPS media URL or record an audio note.`;
    if (block.block_type === "inline_mcq") {
      const options = Array.isArray(content.options) ? content.options as Option[] : [];
      if (typeof content.question !== "string" || !content.question.trim()) return `Part ${index + 1}: add a checkpoint question.`;
      if (options.length < 2 || options.some((option) => !option.id || !option.text.trim())) return `Part ${index + 1}: provide at least two complete answer options.`;
      if (!options.some((option) => option.id === content.correct_option_id)) return `Part ${index + 1}: select the correct answer.`;
    }
  }
  return "";
}

export default function LessonBuilderPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newBlockType, setNewBlockType] = useState<BlockType>("text");

  // AI Author Copilot & Audio recording state
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);
  const [recordingBlockId, setRecordingBlockId] = useState<string | null>(null);
  const [uploadingAudioBlockId, setUploadingAudioBlockId] = useState<string | null>(null);

  const loadBlocks = useCallback(async () => {
    const { data, error: blockError } = await supabase.from("learning_lesson_blocks")
      .select("id,lesson_id,block_type,content,order_index")
      .eq("lesson_id", lessonId).order("order_index", { ascending: true });
    if (blockError) throw blockError;
    setBlocks((data ?? []) as Block[]);
  }, [lessonId]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      const user = sessionData.session?.user;
      if (sessionError || !user) {
        setError("Sign in with an authorized BrainLab account to access the lesson builder.");
        setLoading(false);
        return;
      }
      const { data: lessonData, error: lessonError } = await supabase.from("learning_lessons")
        .select("id,title,summary,topic_id,estimated_duration_mins,is_published,version")
        .eq("id", lessonId).maybeSingle();
      if (!active) return;
      if (lessonError || !lessonData) {
        setError("This lesson was not found or you do not have permission to open it.");
        setLoading(false);
        return;
      }
      const { data: topicData, error: topicError } = await supabase.from("learning_topics")
        .select("id,title,subject_id").eq("id", lessonData.topic_id).maybeSingle();
      if (!active) return;
      if (topicError || !topicData) {
        setError("The topic for this lesson could not be loaded.");
        setLoading(false);
        return;
      }
      const { data: subjectData, error: subjectError } = await supabase.from("learning_subjects")
        .select("id,name,slug,is_published").eq("id", topicData.subject_id).maybeSingle();
      if (!active) return;
      if (subjectError || !subjectData) {
        setError("The subject for this lesson could not be loaded.");
        setLoading(false);
        return;
      }
      const { data: membership, error: membershipError } = await supabase.from("learning_subject_memberships")
        .select("membership_role").eq("subject_id", subjectData.id).eq("user_id", user.id).maybeSingle();
      const adminRole = await supabase.rpc("get_admin_role");
      if (!active) return;
      const isPlatformAdmin = !adminRole.error && ["super_admin", "platform_admin"].includes(String(adminRole.data ?? ""));
      if (membershipError || (!membership && !isPlatformAdmin)) {
        setError("Your account has not been assigned to this subject.");
        setLoading(false);
        return;
      }
      setCanManage(isPlatformAdmin || membership?.membership_role === "tutor");
      setLesson(lessonData as Lesson);
      setTopic(topicData as Topic);
      setSubject(subjectData as Subject);
      setTitle(lessonData.title);
      setSummary(lessonData.summary ?? "");
      try { await loadBlocks(); }
      catch { if (active) setError("We could not load the lesson blocks."); }
      if (active) setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [lessonId, loadBlocks]);

  function updateContent(blockId: string, key: string, value: unknown) {
    setBlocks((old) => old.map((block) => block.id === blockId ? { ...block, content: { ...block.content, [key]: value } } : block));
  }

  async function movePublishedLessonToDraft() {
    if (!lesson || !lesson.is_published) return true;
    const { error: updateError } = await supabase.from("learning_lessons")
      .update({ is_published: false }).eq("id", lesson.id);
    if (updateError) {
      setError("This published lesson could not be moved to draft before editing.");
      return false;
    }
    setLesson({ ...lesson, is_published: false });
    setMessage("The lesson was moved to draft before changing its structure.");
    return true;
  }

  async function addBlock() {
    if (!canManage || !lesson) return;
    setSaving(true); setError(""); setMessage("");
    if (!(await movePublishedLessonToDraft())) { setSaving(false); return; }
    const { data, error: insertError } = await supabase.from("learning_lesson_blocks").insert({
      lesson_id: lesson.id,
      block_type: newBlockType,
      content: defaultContent(newBlockType),
      order_index: Math.max(-1, ...blocks.map((block) => block.order_index)) + 1,
    }).select("id,lesson_id,block_type,content,order_index").single();
    if (insertError || !data) setError("The block could not be added. Check your assignment and try again.");
    else {
      setBlocks((old) => [...old, data as Block]);
      setMessage(`${blockLabels[newBlockType]} added as a draft block.`);
    }
    setSaving(false);
  }

  async function deleteBlock(block: Block) {
    if (!canManage || !window.confirm("Delete this lesson block? This cannot be undone.")) return;
    setSaving(true); setError(""); setMessage("");
    if (!(await movePublishedLessonToDraft())) { setSaving(false); return; }
    const { error: deleteError } = await supabase.from("learning_lesson_blocks").delete().eq("id", block.id);
    if (deleteError) setError("The block could not be deleted.");
    else {
      setBlocks((old) => old.filter((item) => item.id !== block.id));
      setMessage("Block deleted. Save the lesson to normalize the block order.");
    }
    setSaving(false);
  }

  async function moveBlock(index: number, direction: -1 | 1) {
    if (!canManage || saving) return;
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const moving = blocks[index];
    const other = blocks[target];
    setSaving(true); setError(""); setMessage("");
    if (!(await movePublishedLessonToDraft())) { setSaving(false); return; }
    const temporary = Math.max(...blocks.map((block) => block.order_index), 0) + 1000;
    const first = await supabase.from("learning_lesson_blocks").update({ order_index: temporary }).eq("id", moving.id);
    const second = first.error ? first : await supabase.from("learning_lesson_blocks").update({ order_index: moving.order_index }).eq("id", other.id);
    const third = second.error ? second : await supabase.from("learning_lesson_blocks").update({ order_index: other.order_index }).eq("id", moving.id);
    if (first.error || second.error || third.error) setError("The block order could not be changed. Refresh and try again.");
    else {
      const next = [...blocks];
      next[index] = { ...other, order_index: moving.order_index };
      next[target] = { ...moving, order_index: other.order_index };
      setBlocks(next);
      setMessage("Block order updated.");
    }
    setSaving(false);
  }

  // Handle direct audio recording completion
  async function handleVoiceRecorded(blockId: string, audioBlob: Blob, durationSec: number) {
    setUploadingAudioBlockId(blockId);
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Authentication required.");

      const formData = new FormData();
      formData.append("file", audioBlob, `lesson_${lessonId}_block_${blockId}.webm`);
      formData.append("asset_type", "lesson_voice_note");
      formData.append("title", `${title || "Lesson"} Voice Note`);
      formData.append("duration_seconds", String(Math.round(durationSec)));

      const res = await fetch("/api/audio/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload audio.");

      const audioUrl = json.data?.playback_url || json.data?.public_url;
      updateContent(blockId, "url", audioUrl);
      updateContent(blockId, "duration_sec", Math.round(durationSec));
      updateContent(blockId, "title", `${title || "Lesson"} Voice Note`);
      setRecordingBlockId(null);
      setMessage("Voice note recorded and saved to block.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save audio recording.");
    } finally {
      setUploadingAudioBlockId(null);
    }
  }

  // Handle AI Lesson Draft Application
  async function handleApplyDraft(draft: {
    title: string;
    summary: string;
    markdownContent: string;
    keyTakeaways?: string[];
  }) {
    if (!lesson) return;
    setTitle(draft.title);
    setSummary(draft.summary);

    await movePublishedLessonToDraft();
    const maxOrder = Math.max(-1, ...blocks.map((b) => b.order_index));

    const { data: blockData, error: insertError } = await supabase
      .from("learning_lesson_blocks")
      .insert({
        lesson_id: lesson.id,
        block_type: "text",
        content: { markdown: draft.markdownContent },
        order_index: maxOrder + 1,
      })
      .select("id,lesson_id,block_type,content,order_index")
      .single();

    const newBlocksList = [...blocks];
    if (blockData && !insertError) {
      newBlocksList.push(blockData as Block);
    }

    if (draft.keyTakeaways && draft.keyTakeaways.length > 0) {
      const takeawaysMd = `### 🎯 Key Exam Takeaways\n\n` + draft.keyTakeaways.map((t) => `- **${t}**`).join("\n");
      const { data: takeBlock } = await supabase
        .from("learning_lesson_blocks")
        .insert({
          lesson_id: lesson.id,
          block_type: "text",
          content: { markdown: takeawaysMd },
          order_index: maxOrder + 2,
        })
        .select("id,lesson_id,block_type,content,order_index")
        .single();

      if (takeBlock) {
        newBlocksList.push(takeBlock as Block);
      }
    }

    setBlocks(newBlocksList);
    setMessage("AI Lesson draft applied! Details and study note blocks added.");
  }

  // Handle AI MCQ Generation addition
  async function handleAddMcqBlocks(
    mcqs: Array<{
      question: string;
      options: Array<{ id: string; text: string }>;
      correct_option_id: string;
      explanation: string;
    }>
  ) {
    if (!lesson || mcqs.length === 0) return;
    await movePublishedLessonToDraft();
    let currentOrder = Math.max(-1, ...blocks.map((b) => b.order_index));
    const newItems: Block[] = [];

    for (const q of mcqs) {
      currentOrder += 1;
      const { data, error: insertError } = await supabase
        .from("learning_lesson_blocks")
        .insert({
          lesson_id: lesson.id,
          block_type: "inline_mcq",
          content: {
            question: q.question,
            options: q.options,
            correct_option_id: q.correct_option_id,
            explanation: q.explanation,
          },
          order_index: currentOrder,
        })
        .select("id,lesson_id,block_type,content,order_index")
        .single();

      if (data && !insertError) {
        newItems.push(data as Block);
      }
    }

    setBlocks((prev) => [...prev, ...newItems]);
    setMessage(`Added ${newItems.length} AI checkpoint questions to the lesson!`);
  }

  function handleReplaceBlockText(blockId: string, newText: string) {
    updateContent(blockId, "markdown", newText);
    setMessage("Block text updated from AI Copilot.");
  }

  async function save(publish: boolean) {
    if (!canManage || !lesson) return;
    setSaving(true); setError(""); setMessage("");
    if (publish) {
      const validationError = validateBlocks(blocks);
      if (!title.trim()) {
        setError("Add a lesson title before publishing.");
        setSaving(false);
        return;
      }
      if (validationError) {
        setError(validationError);
        setSaving(false);
        return;
      }
    }
    // Unpublish first so partially saved edits are never served as published content.
    const { error: unpublishError } = await supabase.from("learning_lessons")
      .update({ is_published: false }).eq("id", lesson.id);
    if (unpublishError) {
      setError("We could not safely save the lesson. Check your permissions.");
      setSaving(false);
      return;
    }
    const { error: metadataError } = await supabase.from("learning_lessons")
      .update({ title: title.trim(), summary: summary.trim() || null, is_published: false })
      .eq("id", lesson.id);
    if (metadataError) {
      setError("Lesson details could not be saved.");
      setSaving(false);
      return;
    }
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const { error: blockError } = await supabase.from("learning_lesson_blocks")
        .update({ content: block.content, order_index: index }).eq("id", block.id).eq("lesson_id", lesson.id);
      if (blockError) {
        setError(`Part ${index + 1} could not be saved. The lesson remains a draft to protect learners.`);
        setSaving(false);
        return;
      }
    }
    if (publish) {
      const { error: publishError } = await supabase.from("learning_lessons")
        .update({ is_published: true, version: lesson.version + 1 }).eq("id", lesson.id);
      if (publishError) {
        setError("Your edits were saved, but publishing failed. The lesson remains a draft.");
        setSaving(false);
        return;
      }
      setLesson({ ...lesson, title: title.trim(), summary: summary.trim() || null, is_published: true, version: lesson.version + 1 });
      setMessage("Lesson published. Students can see it if its topic and subject are also published.");
    } else {
      setLesson({ ...lesson, title: title.trim(), summary: summary.trim() || null, is_published: false });
      setMessage("Lesson saved as a draft. Learners cannot see it.");
    }
    setSaving(false);
  }

  function renderEditor(block: Block) {
    const content = block.content;
    const disabled = !canManage || saving;
    const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
    const labelClass = "block text-sm font-bold text-slate-800";

    if (block.block_type === "text") {
      return (
        <label className={labelClass}>
          Lesson text / Markdown
          <textarea
            disabled={disabled}
            value={String(content.markdown ?? content.html ?? "")}
            onChange={(event) => updateContent(block.id, "markdown", event.target.value)}
            rows={8}
            maxLength={30000}
            placeholder="Explain the idea in clear steps. You can use Markdown headings, lists and examples."
            className={fieldClass}
          />
        </label>
      );
    }

    if (block.block_type === "image") {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            HTTPS image URL
            <input
              disabled={disabled}
              type="url"
              value={String(content.url ?? "")}
              onChange={(event) => updateContent(block.id, "url", event.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Caption (optional)
            <input
              disabled={disabled}
              value={String(content.caption ?? "")}
              onChange={(event) => updateContent(block.id, "caption", event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      );
    }

    if (block.block_type === "voice_note") {
      const audioUrl = String(content.url || "");
      const duration = Number(content.duration_sec || 0);
      const isRecording = recordingBlockId === block.id;
      const isUploading = uploadingAudioBlockId === block.id;

      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Audio title
              <input
                disabled={disabled}
                value={String(content.title ?? "")}
                onChange={(event) => updateContent(block.id, "title", event.target.value)}
                placeholder="E.g., Key Concept Explanation"
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              External HTTPS audio URL (optional)
              <input
                disabled={disabled}
                type="url"
                value={audioUrl}
                onChange={(event) => updateContent(block.id, "url", event.target.value)}
                placeholder="https://…"
                className={fieldClass}
              />
            </label>
          </div>

          {/* Audio Player Preview */}
          {audioUrl && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">🔊 Audio Preview:</p>
              <AudioPlayer src={audioUrl} title={String(content.title || "Voice Note")} durationSeconds={duration} />
            </div>
          )}

          {/* Integrated Voice Note Recorder */}
          {canManage && !disabled && (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                    🎙️ Microphone Recording
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Record tutor audio notes with real-time waveform visualizer and direct cloud upload.
                  </p>
                </div>
                {!isRecording && (
                  <button
                    type="button"
                    onClick={() => setRecordingBlockId(block.id)}
                    className="rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 shadow transition"
                  >
                    {audioUrl ? "Re-record Voice Note" : "Record Voice Note"}
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="mt-4">
                  <VoiceNoteRecorder
                    maxDurationSeconds={600}
                    onAudioReady={(blob, dur) => handleVoiceRecorded(block.id, blob, dur)}
                    onCancel={() => setRecordingBlockId(null)}
                  />
                </div>
              )}

              {isUploading && (
                <p className="mt-3 text-xs font-bold text-blue-800 animate-pulse">
                  Uploading audio to secure storage…
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (block.block_type === "short_video") {
      return (
        <div className="space-y-4">
          <label className={labelClass}>
            HTTPS video URL
            <input
              disabled={disabled}
              type="url"
              value={String(content.url ?? "")}
              onChange={(event) => updateContent(block.id, "url", event.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
            <input
              disabled={disabled}
              type="checkbox"
              checked={content.auto_loop === true}
              onChange={(event) => updateContent(block.id, "auto_loop", event.target.checked)}
              className="h-4 w-4 accent-blue-900"
            />
            Loop the short video
          </label>
        </div>
      );
    }

    if (block.block_type === "long_video") {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Provider
            <select
              disabled={disabled}
              value={String(content.provider ?? "youtube")}
              onChange={(event) => updateContent(block.id, "provider", event.target.value)}
              className={fieldClass}
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="direct">Direct video URL</option>
              <option value="mux">Mux playback URL</option>
            </select>
          </label>
          <label className={labelClass}>
            HTTPS video URL
            <input
              disabled={disabled}
              type="url"
              value={String(content.url ?? "")}
              onChange={(event) => updateContent(block.id, "url", event.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
          </label>
        </div>
      );
    }

    if (block.block_type === "inline_mcq") {
      const options = Array.isArray(content.options) ? (content.options as Option[]) : [];
      return (
        <div className="space-y-4">
          <label className={labelClass}>
            Checkpoint question
            <textarea
              disabled={disabled}
              value={String(content.question ?? "")}
              onChange={(event) => updateContent(block.id, "question", event.target.value)}
              rows={3}
              maxLength={3000}
              className={fieldClass}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-bold text-slate-800">Answer options · select the correct answer</legend>
            <div className="mt-3 space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <input
                    disabled={disabled}
                    type="radio"
                    name={`correct-${block.id}`}
                    aria-label={`Set option ${option.id} as correct`}
                    checked={content.correct_option_id === option.id}
                    onChange={() => updateContent(block.id, "correct_option_id", option.id)}
                    className="h-4 w-4 accent-blue-900"
                  />
                  <span className="w-6 text-xs font-black uppercase text-slate-500">{option.id}</span>
                  <input
                    disabled={disabled}
                    value={option.text}
                    onChange={(event) => {
                      const next = options.map((item) => (item.id === option.id ? { ...item, text: event.target.value } : item));
                      updateContent(block.id, "options", next);
                    }}
                    aria-label={`Option ${index + 1}`}
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-700"
                  />
                  {options.length > 2 && (
                    <button
                      disabled={disabled}
                      type="button"
                      onClick={() => {
                        const next = options.filter((item) => item.id !== option.id);
                        updateContent(block.id, "options", next);
                        if (content.correct_option_id === option.id) updateContent(block.id, "correct_option_id", next[0]?.id ?? "");
                      }}
                      className="rounded-lg px-2 py-2 text-xs font-bold text-rose-700 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              disabled={disabled || options.length >= 6}
              type="button"
              onClick={() => {
                const id = `option-${Date.now().toString(36)}`;
                updateContent(block.id, "options", [...options, { id, text: `Option ${options.length + 1}` }]);
              }}
              className="mt-3 text-sm font-bold text-blue-800 underline underline-offset-4 disabled:opacity-40"
            >
              + Add option
            </button>
          </fieldset>
          <label className={labelClass}>
            Explanation
            <textarea
              disabled={disabled}
              value={String(content.explanation ?? "")}
              onChange={(event) => updateContent(block.id, "explanation", event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Explain why the correct option is right."
              className={fieldClass}
            />
          </label>
        </div>
      );
    }
    return null;
  }

  return (
    <main id="main" className="mx-auto min-h-[65vh] max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={subject ? `/tutor/subjects/${subject.id}/topics` : "/tutor"} className="text-sm font-bold text-blue-800 underline underline-offset-4">
        ← Back to topics
      </Link>
      {loading && <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600" role="status">Loading lesson builder…</p>}
      {!loading && error && !lesson && (
        <div role="alert" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          {error}
          <p className="mt-3"><Link href="/account" className="font-bold underline underline-offset-4">Sign in</Link></p>
        </div>
      )}
      {!loading && lesson && topic && subject && (
        <>
          <header className="mt-6 rounded-3xl bg-[#061a3a] p-7 text-white sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-cyan-200">
                Lesson authoring · {canManage ? "Editor" : "Review only"}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsAiCopilotOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2 text-xs font-black text-[#061a3a] shadow-lg hover:bg-cyan-200 transition-all active:scale-95"
                >
                  <span>✨ AI Authoring Copilot</span>
                </button>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Build a lesson</h1>
            <p className="mt-3 leading-7 text-blue-100">{subject.name} / {topic.title}. Add blocks in the order learners should experience them.</p>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${lesson.is_published ? "bg-emerald-200 text-emerald-950" : "bg-amber-200 text-amber-950"}`}>
              {lesson.is_published ? "Published" : "Draft"}
            </span>
          </header>

          {(error || message) && (
            <p role={error ? "alert" : "status"} className={`mt-4 rounded-xl p-4 text-sm font-semibold ${error ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}>
              {error || message}
            </p>
          )}

          <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-extrabold text-slate-950">Lesson details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-800">
                Lesson title
                <input
                  disabled={!canManage || saving}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </label>
              <label className="block text-sm font-bold text-slate-800">
                Lesson summary
                <textarea
                  disabled={!canManage || saving}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={2}
                  maxLength={1000}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </label>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950">Content blocks</h2>
                <p className="mt-1 text-sm text-slate-600">Reorder blocks to control the lesson stream.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{blocks.length} blocks</span>
            </div>

            {blocks.length === 0 && (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
                No content blocks yet. Add a text block first, or click <strong>✨ AI Authoring Copilot</strong> above to generate a full lesson draft.
              </p>
            )}

            <div className="mt-5 space-y-4">
              {blocks.map((block, index) => (
                <article key={block.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-900">{index + 1}</span>
                      <div>
                        <h3 className="font-extrabold text-slate-950">{blockLabels[block.block_type]}</h3>
                        <p className="text-xs text-slate-500">Content block</p>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={saving || index === 0} onClick={() => void moveBlock(index, -1)} aria-label="Move block up" className="min-h-9 min-w-9 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↑</button>
                        <button type="button" disabled={saving || index === blocks.length - 1} onClick={() => void moveBlock(index, 1)} aria-label="Move block down" className="min-h-9 min-w-9 rounded-lg border border-slate-300 font-bold disabled:opacity-30">↓</button>
                        <button type="button" disabled={saving} onClick={() => void deleteBlock(block)} className="ml-2 min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 disabled:opacity-40">Delete</button>
                      </div>
                    )}
                  </div>
                  <div className="pt-5">{renderEditor(block)}</div>
                </article>
              ))}
            </div>
          </section>

          {canManage && (
            <section className="mt-7 rounded-3xl border border-dashed border-blue-300 bg-blue-50/50 p-5 sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-950">Add a content block</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Choose the format that helps learners understand the next idea.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select value={newBlockType} onChange={(event) => setNewBlockType(event.target.value as BlockType)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900">
                  {(Object.keys(blockLabels) as BlockType[]).map((type) => (
                    <option key={type} value={type}>{blockLabels[type]}</option>
                  ))}
                </select>
                <button type="button" disabled={saving} onClick={() => void addBlock()} className="min-h-11 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white disabled:opacity-50">
                  {saving ? "Working…" : "+ Add block"}
                </button>
              </div>
            </section>
          )}

          {canManage && (
            <div className="sticky bottom-3 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
              <p className="px-2 text-xs text-slate-500">Publishing makes the lesson visible when the parent topic and subject are also published.</p>
              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={() => void save(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-800 disabled:opacity-50">
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button type="button" disabled={saving} onClick={() => void save(true)} className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">
                  {saving ? "Saving…" : "Publish lesson"}
                </button>
              </div>
            </div>
          )}

          {/* AI Authoring Copilot Drawer / Modal */}
          {isAiCopilotOpen && (
            <AiLessonAuthorCopilot
              isOpen={isAiCopilotOpen}
              onClose={() => setIsAiCopilotOpen(false)}
              subjectName={subject.name}
              topicTitle={topic.title}
              existingBlocks={blocks}
              onApplyDraft={handleApplyDraft}
              onAddMcqBlocks={handleAddMcqBlocks}
              onReplaceBlockText={handleReplaceBlockText}
            />
          )}
        </>
      )}
    </main>
  );
}
