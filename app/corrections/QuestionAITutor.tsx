"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cleanAIResponse, cleanQuestionText, cleanAnswerKeyNote } from "../lib/cleanText";
import { streamAiTutor } from "../lib/aiTutor";
import { enqueueMissedQuestion } from "../lib/spacedRepetition";
import { AiResponseSkeleton } from "../components/SkeletonLoader";
import { toast } from "../lib/toast";

type OptionKey = "A" | "B" | "C" | "D";

interface QuestionAITutorProps {
  item: {
    id: string | number;
    subject: string;
    text: string;
    options: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
    correctAnswer: OptionKey;
    userAnswer: OptionKey | null;
    isCorrect: boolean;
    explanation?: string;
  };
  questionNumber: number;
}

interface ChatMessage {
  role: "user" | "tutor";
  text: string;
  timestamp: string;
}

export default function QuestionAITutor({ item, questionNumber }: QuestionAITutorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<"standard" | "simple" | "detailed" | "exam_traps">("standard");
  const [savedToSpaced, setSavedToSpaced] = useState(false);

  async function saveToSpacedDeck() {
    await enqueueMissedQuestion({
      questionId: item.id,
      subject: item.subject,
      category: "Exam Question",
      questionText: item.text,
      options: item.options,
      correctAnswer: item.correctAnswer,
    });
    setSavedToSpaced(true);
    toast.success("Saved to Spaced Repetition review deck!");
  }

  const copyExplanation = async () => {
    if (!explanation) return;
    try {
      await navigator.clipboard.writeText(explanation);
      toast.success("AI explanation copied to clipboard!");
    } catch {
      toast.info("Failed to copy automatically.");
    }
  };

  async function switchMode(newStyle: "standard" | "simple" | "detailed" | "exam_traps") {
    setSelectedStyle(newStyle);
    setLoading(true);
    setError(null);
    try {
      let accumulated = "";
      await streamAiTutor(
        {
          mode: newStyle === "exam_traps" ? "distractor_traps" : "explain",
          style: newStyle,
          forceRefresh: true,
          question: {
            id: item.id,
            subject: item.subject,
            text: cleanQuestionText(item.text),
            options: item.options,
            correctAnswer: item.correctAnswer,
            userAnswer: item.userAnswer,
            explanation: cleanAnswerKeyNote(item.explanation || ""),
          },
        },
        (chunk) => {
          accumulated += chunk;
          setExplanation(cleanAIResponse(accumulated));
          setIsCached(false);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate breakdown.");
    } finally {
      setLoading(false);
    }
  }

  const cacheKey = `brainlab_ai_corr_${item.id}`;

  // Load cached AI explanation on mount: first check localStorage, then Supabase shared cache
  useEffect(() => {
    let active = true;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          explanation: string;
          model?: string;
          chat?: ChatMessage[];
        };
        if (parsed.explanation) {
          setExplanation(cleanAIResponse(parsed.explanation));
          if (parsed.model) setModel(parsed.model);
          setIsCached(true);
          if (Array.isArray(parsed.chat)) {
            setChatMessages(
              parsed.chat.map((msg) => ({
                ...msg,
                text: cleanAIResponse(msg.text),
              }))
            );
          }
          return;
        }
      }
    } catch {
      // Ignore cache parse errors
    }

    // Query Supabase shared explanation cache across learners
    fetch(`/api/ai/explanation?question_id=${encodeURIComponent(String(item.id))}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.cached && data.explanation) {
          const cleaned = cleanAIResponse(data.explanation);
          setExplanation(cleaned);
          if (data.model) setModel(data.model);
          setIsCached(true);
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                explanation: cleaned,
                model: data.model || "Gemini 3 Flash",
                chat: [],
              })
            );
          } catch {
            // Ignore quota errors
          }
        }
      })
      .catch(() => {
        // Shared cache lookup failure handled gracefully
      });

    return () => {
      active = false;
    };
  }, [cacheKey, item.id]);

  async function fetchAIExplanation(customPrompt?: string, forceRefresh?: boolean) {
    setLoading(true);
    setError(null);

    // Fast check: If not forceRefresh and no customPrompt, check Supabase shared cache
    if (!forceRefresh && !customPrompt) {
      try {
        const cacheRes = await fetch(`/api/ai/explanation?question_id=${encodeURIComponent(String(item.id))}`);
        const cacheData = await cacheRes.json();
        if (cacheData.cached && cacheData.explanation) {
          const cleaned = cleanAIResponse(cacheData.explanation);
          setExplanation(cleaned);
          if (cacheData.model) setModel(cacheData.model);
          setIsCached(true);
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to live generation
      }
    }

    const cleanedText = cleanQuestionText(item.text);
    const cleanedNote = cleanAnswerKeyNote(item.explanation || "");

    // 1. Fast Streaming Mode
    try {
      let accumulated = "";
      await streamAiTutor(
        {
          mode: "explain",
          forceRefresh: Boolean(forceRefresh),
          question: {
            id: item.id,
            subject: item.subject,
            text: cleanedText,
            options: item.options,
            correctAnswer: item.correctAnswer,
            userAnswer: item.userAnswer,
            explanation: cleanedNote,
          },
        },
        (chunk) => {
          accumulated += chunk;
          setExplanation(cleanAIResponse(accumulated));
          setIsCached(false);
          setLoading(false);
        }
      );

      const finalText = cleanAIResponse(accumulated);
      if (finalText) {
        setExplanation(finalText);
        setModel("Gemini 3 Flash");
        setIsCached(true);
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              explanation: finalText,
              model: "Gemini 3 Flash",
              chat: chatMessages,
            })
          );
        } catch {
          // Ignore cache quota errors
        }
        return;
      }
    } catch {
      // Fallback to /api/generate if stream encounters interruption
    }

    const userSelected = item.userAnswer
      ? `Option ${item.userAnswer}: "${item.options[item.userAnswer] || ""}"`
      : "Unanswered (No option chosen)";
    const correctSelected = `Option ${item.correctAnswer}: "${item.options[item.correctAnswer] || ""}"`;

    const promptText =
      customPrompt ||
      `You are BrainLab Academy's AI Tutor. Provide a concise, step-by-step pedagogical breakdown under 180 words for this CBT exam question. Never output markdown hashtags (#) or asterisks (* or **). Write in clean plain text only using simple numbered steps (1., 2.).

Subject: ${item.subject}
Question #${questionNumber}: ${cleanedText}
Options:
A: ${item.options.A}
B: ${item.options.B}
C: ${item.options.C}
D: ${item.options.D}

Candidate's Selection: ${userSelected}
Result: ${item.isCorrect ? "Correct" : item.userAnswer ? "Incorrect" : "Unanswered"}
Official Correct Answer: ${correctSelected}
${cleanedNote ? `Original Answer Key Note: ${cleanedNote}` : ""}

Structure your response with clear plain-text numbered sections:
1. Core Concept: State the fundamental principle or formula in simple terms.
2. Step-by-Step Solution: Walk through the exact deduction that makes Option ${item.correctAnswer} correct.
${!item.isCorrect && item.userAnswer ? `3. Common Trap: Explain why Option ${item.userAnswer} was tempting.` : ""}
4. CBT Strategy: Give one practical rule to solve similar questions.`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (sessionData?.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: promptText,
          metadata: {
            source: "corrections_page",
            question_id: String(item.id),
            subject: item.subject,
            is_correct: item.isCorrect,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI explanation.");
      }

      const text = cleanAIResponse(data.response as string);
      setExplanation(text);
      if (data.model) setModel(data.model);
      setIsCached(true);

      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            explanation: text,
            model: data.model,
            chat: chatMessages,
          })
        );
      } catch {
        // Ignore localStorage quota errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load explanation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendFollowUp(e: React.FormEvent) {
    e.preventDefault();
    const query = followUp.trim();
    if (!query || followUpLoading) return;

    setFollowUpLoading(true);
    const newChat: ChatMessage[] = [
      ...chatMessages,
      { role: "user", text: query, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ];
    setChatMessages(newChat);
    setFollowUp("");

    const tutorMsgIndex = newChat.length;
    const initialTutorMsg: ChatMessage = {
      role: "tutor",
      text: "Thinking...",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages([...newChat, initialTutorMsg]);

    try {
      let accumulated = "";
      await streamAiTutor(
        {
          mode: "chat",
          question: {
            id: item.id,
            subject: item.subject,
            text: cleanQuestionText(item.text),
            options: item.options,
            correctAnswer: item.correctAnswer,
            userAnswer: item.userAnswer,
            explanation: cleanAnswerKeyNote(item.explanation || ""),
          },
          messages: [
            ...chatMessages.map((m) => ({
              role: m.role === "user" ? ("user" as const) : ("assistant" as const),
              content: m.text,
            })),
            { role: "user", content: query },
          ],
        },
        (chunk) => {
          accumulated += chunk;
          const cleaned = cleanAIResponse(accumulated);
          setChatMessages((prev) => {
            const next = [...prev];
            if (next[tutorMsgIndex]) {
              next[tutorMsgIndex] = { ...next[tutorMsgIndex], text: cleaned };
            }
            return next;
          });
        }
      );

      const finalCleaned = cleanAIResponse(accumulated);
      if (finalCleaned) {
        try {
          const updatedChat = [
            ...newChat,
            { role: "tutor" as const, text: finalCleaned, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          ];
          localStorage.setItem(cacheKey, JSON.stringify({ explanation, model, chat: updatedChat }));
        } catch {
          // ignore storage error
        }
        return;
      }
    } catch {
      // Fallback to /api/generate
      const followUpPrompt = `You are BrainLab Academy's AI Tutor helping a student review Question #${questionNumber} (${item.subject}).
Question: "${cleanQuestionText(item.text)}"
Correct Answer: Option ${item.correctAnswer} (${item.options[item.correctAnswer]})
Prior Explanation: "${explanation?.slice(0, 300)}..."

The student asks a follow-up question:
"${query}"

Provide a concise, direct, and supportive answer under 120 words without markdown hashtags (#) or asterisks (* or **). Write in clean plain text only.`;

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (sessionData?.session?.access_token) {
          headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
        }

        const res = await fetch("/api/generate", {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: followUpPrompt,
            metadata: {
              source: "corrections_follow_up",
              question_id: String(item.id),
              subject: item.subject,
            },
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const updatedChat: ChatMessage[] = [
            ...newChat,
            {
              role: "tutor",
              text: cleanAIResponse(data.response as string),
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ];
          setChatMessages(updatedChat);
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                explanation,
                model: model || data.model,
                chat: updatedChat,
              })
            );
          } catch {
            // ignore storage error
          }
        }
      } catch {
        // Keep question active
      }
    } finally {
      setFollowUpLoading(false);
    }
  }

  function toggleOpen() {
    if (!isOpen && !explanation && !loading) {
      void fetchAIExplanation();
    }
    setIsOpen((prev) => !prev);
  }

  return (
    <div className="ai-tutor-container">
      <div className="ai-tutor-action-row">
        <button
          type="button"
          onClick={toggleOpen}
          className={`ai-tutor-toggle-btn ${isOpen ? "active" : ""}`}
          aria-expanded={isOpen}
        >
          <span className="ai-sparkle-icon" aria-hidden="true">✨</span>
          <span>
            {explanation
              ? (isOpen ? "Hide AI Tutor Explanation" : (isCached ? "View Saved AI Breakdown" : "View AI Tutor Explanation"))
              : (loading ? "Generating AI Breakdown..." : "Ask AI Tutor to Explain This")}
          </span>
          <span className="ai-badge-pill">{model || "Gemini 3 Flash"}</span>
          <span className="ai-chevron" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
        </button>

        {explanation && isOpen && (
          <button
            type="button"
            onClick={() => void fetchAIExplanation(undefined, true)}
            disabled={loading}
            className="ai-tutor-refresh-btn"
            title="Regenerate explanation with Gemini and update saved cache"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="ai-tutor-panel" aria-live="polite">
          <div className="ai-tutor-header">
            <div className="ai-tutor-title-group">
              <span className="ai-avatar-badge" aria-hidden="true">🧠</span>
              <div>
                <h4 className="ai-tutor-title">BrainLab AI Tutor Breakdown</h4>
                <p className="ai-tutor-subtitle">
                  Step-by-step reasoning & mistake analysis powered by Google AI Studio
                </p>
              </div>
            </div>
            {isCached ? (
              <span className="ai-status-cached">✓ Saved Explanation</span>
            ) : (
              <span className="ai-status-live">✨ Live AI Analysis</span>
            )}
          </div>

          {loading && (
            <div className="ai-tutor-loading-state my-2">
              <AiResponseSkeleton />
              <p className="ai-loading-text mt-3 text-xs text-slate-500 text-center font-medium">
                Analyzing Option {item.correctAnswer} vs Option {item.userAnswer ?? "Unanswered"}...
              </p>
            </div>
          )}

          {error && (
            <div className="ai-tutor-error">
              <p>⚠️ {error}</p>
              <button
                type="button"
                onClick={() => void fetchAIExplanation()}
                className="ai-retry-btn active-press"
              >
                Try Again
              </button>
            </div>
          )}

          {explanation && !loading && (
            <div className="ai-tutor-content">
              {/* Style Switcher Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Style:</span>
                {(
                  [
                    { id: "standard", label: "Standard" },
                    { id: "simple", label: "Simple" },
                    { id: "detailed", label: "Step-by-Step" },
                    { id: "exam_traps", label: "Trap Analysis" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => void switchMode(st.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition active-press ${
                      selectedStyle === st.id
                        ? "bg-[#012153] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="ai-tutor-prose">
                {explanation.split("\n\n").map((paragraph, idx) => (
                  <p key={idx} className="ai-tutor-paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Action Toolbar: Spaced Repetition + Copy */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void saveToSpacedDeck()}
                  disabled={savedToSpaced}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active-press ${
                    savedToSpaced
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default"
                      : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <span>🧠</span>
                  <span>{savedToSpaced ? "✓ Saved to Review Deck" : "Save to Spaced Review"}</span>
                </button>

                <button
                  type="button"
                  onClick={copyExplanation}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active-press"
                  title="Copy explanation text"
                >
                  <span>📋</span>
                  <span>Copy Note</span>
                </button>
              </div>

              {/* Interactive Follow-Up Questions */}
              <div className="ai-followup-section">
                <div className="ai-followup-header">
                  <span className="ai-followup-label">Still confused about this question?</span>
                </div>

                {chatMessages.length > 0 && (
                  <div className="ai-chat-thread">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`ai-chat-bubble ${msg.role === "user" ? "user-bubble" : "tutor-bubble"}`}
                      >
                        <div className="ai-bubble-meta">
                          <strong>{msg.role === "user" ? "You" : "AI Tutor"}</strong>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="ai-bubble-text">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendFollowUp} className="ai-followup-form">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      placeholder="e.g. Why is Option B wrong? What formula should I use?"
                      maxLength={200}
                      disabled={followUpLoading}
                      className="ai-followup-input !pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                      {followUp.length}/200
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={followUpLoading || !followUp.trim()}
                    className="ai-followup-btn active-press hover-lift"
                  >
                    {followUpLoading ? "Thinking..." : "Ask"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
