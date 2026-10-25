"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { recordLearningActivity } from "@/app/lib/gamification";

interface TopicOption {
  id: string;
  text: string;
}

interface TopicQuestion {
  id: string;
  question: string;
  options: TopicOption[];
}

interface McqFeedback {
  question_id: string;
  correct_answer: string;
  correct: boolean;
  explanation?: string;
}

interface TopicContentData {
  [key: string]: unknown;
  reading_time_mins?: number;
  markdown?: string;
  speaker?: string;
  url?: string;
  transcript?: string;
  provider?: string;
  instructions?: string;
  questions?: TopicQuestion[];
  file_name?: string;
  category?: string;
  description?: string;
  alt_text?: string;
  caption?: string;
}

interface ContentItem {
  id: string;
  content_type: string;
  title: string;
  summary?: string;
  order_index: number;
  metadata: Record<string, unknown>;
  data: TopicContentData;
}

export default function StudentTopicContentPage() {
  const params = useParams();
  const router = useRouter();

  const subjectSlug = decodeURIComponent((params?.subjectSlug as string) || "");
  const topicSlug = decodeURIComponent((params?.topicSlug as string) || "");

  const [subject, setSubject] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [topic, setTopic] = useState<{ id: string; title: string; slug: string; description?: string } | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Audio Player States
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  // In-Class MCQ State (Keyed by item.id)
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, Record<string, string>>>({});
  const [mcqResults, setMcqResults] = useState<Record<string, { score: number; total: number; percentage: number; feedback: McqFeedback[] }>>({});
  const [gradingMcq, setGradingMcq] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch Subject
        const { data: subData, error: subErr } = await supabase
          .from("learning_subjects")
          .select("id, name, slug")
          .eq("slug", subjectSlug)
          .eq("is_published", true)
          .single();

        if (subErr || !subData) {
          if (active) setError("Subject not found or is currently unpublished.");
          setLoading(false);
          return;
        }

        if (active) setSubject(subData);

        // 2. Fetch Topic
        const { data: topData, error: topErr } = await supabase
          .from("learning_topics")
          .select("id, title, slug, description")
          .eq("subject_id", subData.id)
          .eq("slug", topicSlug)
          .eq("is_published", true)
          .single();

        if (topErr || !topData) {
          if (active) setError("Topic not found or is currently unpublished.");
          setLoading(false);
          return;
        }

        if (active) setTopic(topData);

        // 3. Fetch Published Content Items via Safe Public RPC
        const { data: contentData, error: contentErr } = await supabase.rpc(
          "get_published_topic_content",
          { p_topic_id: topData.id }
        );

        if (contentErr || !contentData?.ok) {
          // Fallback direct query if RPC isn't deployed yet
          const { data: directItems } = await supabase
            .from("learning_topic_content_items")
            .select("id, content_type, title, summary, order_index, metadata, data")
            .eq("topic_id", topData.id)
            .eq("is_published", true)
            .order("order_index", { ascending: true });

          if (active && directItems) setItems(directItems as ContentItem[]);
        } else if (active) {
          setItems((contentData.items || []) as ContentItem[]);
        }
      } catch (err) {
        if (active) setError("Failed to load topic learning materials.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (subjectSlug && topicSlug) void loadData();

    return () => {
      active = false;
    };
  }, [subjectSlug, topicSlug]);

  // Audio Format Time
  function formatTime(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  }

  // Handle MCQ Answer Pick
  function handleSelectOption(itemId: string, questionId: string, optionId: string) {
    setMcqAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [questionId]: optionId,
      },
    }));
  }

  // Submit MCQ for Server-Side Grading
  async function submitMcqForGrading(itemId: string) {
    const answers = mcqAnswers[itemId] || {};
    setGradingMcq(itemId);

    try {
      const { data, error } = await supabase.rpc("grade_topic_mcq_assessment", {
        p_content_item_id: itemId,
        p_candidate_answers: answers,
      });

      if (!error && data?.ok) {
        setMcqResults((prev) => ({
          ...prev,
          [itemId]: {
            score: data.score,
            total: data.total,
            percentage: data.percentage,
            feedback: data.feedback || [],
          },
        }));
        void recordLearningActivity("topic_mcq", itemId, data.percentage);
      }
    } catch {
      // Handle error gracefully
    } finally {
      setGradingMcq(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
                <main className="flex flex-1 items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </main>
              </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      
      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/learn" className="hover:text-blue-700">
              Learning Hub
            </Link>
            <span>/</span>
            <Link href={`/learn/${subject?.slug}`} className="hover:text-blue-700 font-semibold">
              {subject?.name}
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-900">{topic?.title}</span>
          </nav>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {/* Topic Hero Banner */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-7 sm:p-10 shadow-sm">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-indigo-700 border border-indigo-200">
              {subject?.name} · Topic Learning Path
            </span>
            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">{topic?.title}</h1>
            {topic?.description && (
              <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{items.length} learning resources</span>
              <span>·</span>
              <span>Sequential Study Order</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">Verified Syllabus Aligned</span>
            </div>
          </div>

          {/* Sequential Content Navigation Stepper */}
          {items.length > 0 && (
            <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveItemIndex(idx);
                    const el = document.getElementById(`item-${item.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    activeItemIndex === idx
                      ? "bg-[#012153] text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono">#{idx + 1}</span>
                  <span className="truncate max-w-[140px]">{item.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* RENDERED CONTENT ITEMS IN PEDAGOGICAL ORDER */}
          {items.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <span className="text-3xl">📝</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">Learning Materials in Preparation</h3>
              <p className="mt-1 text-xs text-slate-500">
                The tutor is currently reviewing and sequencing lessons for this topic. Check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {items.map((item, idx) => (
                <article
                  key={item.id}
                  id={`item-${item.id}`}
                  className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm transition hover:shadow-md"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-black text-indigo-700">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {item.content_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {item.content_type === "rich_text" && (
                      <span className="text-xs text-slate-400">
                        ~{item.data.reading_time_mins || 5} mins read
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-slate-950">{item.title}</h2>
                  {item.summary && <p className="mt-1 text-sm text-slate-500">{item.summary}</p>}

                  {/* 1. RICH TEXT NOTE */}
                  {item.content_type === "rich_text" && (
                    <div className="mt-6 prose max-w-none text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {item.data.markdown}
                    </div>
                  )}

                  {/* 2. AUDIO LESSON */}
                  {item.content_type === "audio" && (
                    <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/50 p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              const audio = audioRef.current;
                              if (!audio) return;
                              if (audioPlaying) {
                                audio.pause();
                                setAudioPlaying(false);
                              } else {
                                void audio.play();
                                setAudioPlaying(true);
                              }
                            }}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-700 text-xl font-bold text-white shadow-sm hover:bg-purple-800 transition"
                          >
                            {audioPlaying ? "⏸" : "▶"}
                          </button>
                          <div>
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-xs text-purple-800">
                              Lecturer: {item.data.speaker || "BrainLab Academic Tutor"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <label className="font-bold text-slate-600">Speed</label>
                          <select
                            value={audioSpeed}
                            onChange={(e) => {
                              const sp = Number(e.target.value);
                              setAudioSpeed(sp);
                              if (audioRef.current) audioRef.current.playbackRate = sp;
                            }}
                            className="rounded-lg border border-purple-200 bg-white px-2 py-1 font-bold text-purple-900"
                          >
                            <option value={1}>1.0×</option>
                            <option value={1.25}>1.25×</option>
                            <option value={1.5}>1.5×</option>
                          </select>
                        </div>
                      </div>

                      {/* Timeline */}
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        value={audioCurrentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAudioCurrentTime(val);
                          if (audioRef.current) audioRef.current.currentTime = val;
                        }}
                        className="mt-5 w-full accent-purple-700"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-purple-800 mt-1">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>

                      {item.data.url && (
                        <audio
                          ref={audioRef}
                          src={item.data.url}
                          onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                          onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                          onEnded={() => setAudioPlaying(false)}
                          className="hidden"
                        />
                      )}

                      {item.data.transcript && (
                        <div className="mt-4 border-t border-purple-200/60 pt-3">
                          <button
                            type="button"
                            onClick={() => setShowTranscript(!showTranscript)}
                            className="text-xs font-bold text-purple-800 hover:underline"
                          >
                            {showTranscript ? "Hide Transcript ▲" : "View Full Text Transcript ▼"}
                          </button>
                          {showTranscript && (
                            <div className="mt-3 rounded-xl bg-white p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-purple-200/60">
                              {item.data.transcript}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. VIDEO LESSON */}
                  {item.content_type === "video" && (
                    <div className="mt-6 overflow-hidden rounded-2xl bg-black">
                      {item.data.provider === "youtube" && item.data.url ? (
                        <div className="aspect-video w-full">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${
                              item.data.url.split("v=")[1]?.split("&")[0] || item.data.url.split("/").pop()
                            }`}
                            title={item.title}
                            allowFullScreen
                            className="h-full w-full"
                          />
                        </div>
                      ) : (
                        <video src={item.data.url} controls className="aspect-video w-full" />
                      )}
                    </div>
                  )}

                  {/* 4. IN-CLASS MCQ CHECKPOINT */}
                  {item.content_type === "in_class_mcq" && (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
                      <div className="mb-4">
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
                          Formative Knowledge Checkpoint
                        </span>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.data.instructions || "Check your understanding before moving forward."}
                        </p>
                      </div>

                      {/* Question List */}
                      <div className="space-y-6">
                        {(item.data.questions || []).map((q, qIdx) => {
                          const picked = mcqAnswers[item.id]?.[q.id];
                          const gradedResult = mcqResults[item.id]?.feedback?.find(
                            (f) => f.question_id === q.id
                          );

                          return (
                            <div key={q.id || qIdx} className="rounded-xl border border-amber-200/80 bg-white p-5">
                              <p className="text-xs font-mono font-bold text-amber-800">Question {qIdx + 1}</p>
                              <h3 className="mt-1 text-sm font-bold text-slate-900">{q.question}</h3>

                              <div className="mt-4 space-y-2">
                                {q.options.map((opt) => {
                                  const isSelected = picked === opt.id;
                                  let optionStyle = isSelected
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600"
                                    : "border-slate-200 hover:border-slate-300";

                                  if (gradedResult) {
                                    if (opt.id === gradedResult.correct_answer) {
                                      optionStyle = "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold";
                                    } else if (isSelected && !gradedResult.correct) {
                                      optionStyle = "border-rose-600 bg-rose-50 text-rose-950";
                                    }
                                  }

                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      disabled={Boolean(gradedResult)}
                                      onClick={() => handleSelectOption(item.id, q.id, opt.id)}
                                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs transition ${optionStyle}`}
                                    >
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-bold">
                                        {opt.id}
                                      </span>
                                      <span className="flex-1">{opt.text}</span>
                                      {gradedResult && opt.id === gradedResult.correct_answer && (
                                        <span className="font-bold text-emerald-700">✓ Correct</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Graded Explanation Reveal */}
                              {gradedResult && (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                                  <p className="font-bold text-slate-900">
                                    {gradedResult.correct ? "Well done! That is correct." : "Review Explanation:"}
                                  </p>
                                  <p className="mt-1 text-slate-700">{gradedResult.explanation}</p>
                                  {gradedResult.distractor_note && (
                                    <p className="mt-1 text-rose-700 font-medium">
                                      {gradedResult.distractor_note}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* MCQ Action / Score Bar */}
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/60 pt-4">
                        {mcqResults[item.id] ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-700">Your Score:</span>
                            <span className="rounded-xl bg-emerald-100 px-3 py-1 font-black text-emerald-800 text-sm">
                              {mcqResults[item.id].score} / {mcqResults[item.id].total} (
                              {mcqResults[item.id].percentage}%)
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={gradingMcq === item.id}
                            onClick={() => submitMcqForGrading(item.id)}
                            className="rounded-xl bg-amber-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-amber-800 shadow-sm disabled:opacity-50"
                          >
                            {gradingMcq === item.id ? "Grading..." : "Submit Answers For Feedback ✓"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. PDF & DOCUMENT DOWNLOAD */}
                  {item.content_type === "document" && (
                    <div className="mt-6 flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50/50 p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">📎</span>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.data.file_name || item.title}</p>
                          <p className="text-xs text-slate-500">
                            {item.data.instructions || "Download resource for study revision."}
                          </p>
                        </div>
                      </div>
                      {item.data.url && (
                        <a
                          href={item.data.url}
                          target="_blank"
                          rel="noreferrer"
                          download={item.data.file_name}
                          className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-800"
                        >
                          Download Resource ⇩
                        </a>
                      )}
                    </div>
                  )}

                  {/* 6. EXTERNAL LINK */}
                  {item.content_type === "external_link" && (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                          {item.data.category || "Recommended Destination"}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{item.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">{item.data.description}</p>
                      </div>
                      {item.data.url && (
                        <a
                          href={item.data.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shrink-0"
                        >
                          Visit Link ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* 7. IMAGE & DIAGRAM */}
                  {item.content_type === "image" && item.data.url && (
                    <figure className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                      <img
                        src={item.data.url}
                        alt={item.data.alt_text || item.title}
                        className="w-full max-h-[32rem] object-contain bg-white"
                      />
                      {item.data.caption && (
                        <figcaption className="bg-slate-50 p-3 text-center text-xs text-slate-600">
                          {item.data.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Bottom Back Button */}
          <div className="mt-12 text-center">
            <Link
              href={`/learn/${subject?.slug}`}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Back to {subject?.name || "Subject"} Topics
            </Link>
          </div>
        </div>
      </main>

          </div>
  );
}
