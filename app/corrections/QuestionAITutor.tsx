"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cleanAIResponse } from "../lib/cleanText";

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
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const cacheKey = `brainlab_ai_corr_${item.id}`;

  // Load cached AI explanation on mount
  useEffect(() => {
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
          if (Array.isArray(parsed.chat)) {
            setChatMessages(
              parsed.chat.map((msg) => ({
                ...msg,
                text: cleanAIResponse(msg.text),
              }))
            );
          }
        }
      }
    } catch {
      // Ignore cache parse errors
    }
  }, [cacheKey]);

  async function fetchAIExplanation(customPrompt?: string) {
    setLoading(true);
    setError(null);

    const userSelected = item.userAnswer
      ? `Option ${item.userAnswer}: "${item.options[item.userAnswer] || ""}"`
      : "Unanswered (No option chosen)";
    const correctSelected = `Option ${item.correctAnswer}: "${item.options[item.correctAnswer] || ""}"`;

    const promptText =
      customPrompt ||
      `You are BrainLab Academy's AI Tutor. Provide a concise, step-by-step pedagogical breakdown under 180 words for this CBT exam question. Never output markdown hashtags (#) or asterisks (* or **). Write in clean plain text only using simple numbered steps (1., 2.).

Subject: ${item.subject}
Question #${questionNumber}: ${item.text}
Options:
A: ${item.options.A}
B: ${item.options.B}
C: ${item.options.C}
D: ${item.options.D}

Candidate's Selection: ${userSelected}
Result: ${item.isCorrect ? "Correct" : item.userAnswer ? "Incorrect" : "Unanswered"}
Official Correct Answer: ${correctSelected}
${item.explanation ? `Original Answer Key Note: ${item.explanation}` : ""}

Structure your response with clear plain-text numbered sections:
1. Core Concept: State the fundamental principle or formula in simple terms.
2. Step-by-Step Solution: Walk through the exact deduction that makes Option ${item.correctAnswer} correct.
${!item.isCorrect && item.userAnswer ? `3. Common Trap: Explain why Option ${item.userAnswer} was tempting.` : ""}
4. CBT Strategy: Give one practical rule to solve similar questions.`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
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

    const followUpPrompt = `You are BrainLab Academy's AI Tutor helping a student review Question #${questionNumber} (${item.subject}).
Question: "${item.text}"
Correct Answer: Option ${item.correctAnswer} (${item.options[item.correctAnswer]})
Prior Explanation: "${explanation?.slice(0, 300)}..."

The student asks a follow-up question:
"${query}"

Provide a concise, direct, and supportive answer under 120 words without markdown hashtags (#) or asterisks (* or **). Write in clean plain text only.`;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
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
              ? (isOpen ? "Hide AI Tutor Explanation" : "View AI Tutor Explanation")
              : (loading ? "Generating AI Breakdown..." : "Ask AI Tutor to Explain This")}
          </span>
          <span className="ai-badge-pill">{model || "Gemini 3.8 Flash"}</span>
          <span className="ai-chevron" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
        </button>

        {explanation && isOpen && (
          <button
            type="button"
            onClick={() => void fetchAIExplanation()}
            disabled={loading}
            className="ai-tutor-refresh-btn"
            title="Regenerate explanation with Gemini"
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
            <span className="ai-status-live">● Live AI Analysis</span>
          </div>

          {loading && (
            <div className="ai-tutor-loading-state">
              <div className="ai-pulse-bar" />
              <div className="ai-pulse-bar short" />
              <div className="ai-pulse-bar" />
              <p className="ai-loading-text">
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
                className="ai-retry-btn"
              >
                Try Again
              </button>
            </div>
          )}

          {explanation && !loading && (
            <div className="ai-tutor-content">
              <div className="ai-tutor-prose">
                {explanation.split("\n\n").map((paragraph, idx) => (
                  <p key={idx} className="ai-tutor-paragraph">
                    {paragraph}
                  </p>
                ))}
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
                    className="ai-followup-btn"
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
