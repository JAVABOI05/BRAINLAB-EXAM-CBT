"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import { cleanAIResponse } from "@/app/lib/cleanText";
import { toast } from "@/app/lib/toast";
import { AiResponseSkeleton } from "@/app/components/SkeletonLoader";

type Intent = "understand" | "practise" | "mistake" | "exam";
type Method = "decode" | "solve" | "spot" | "apply" | "teach";

const intents: { id: Intent; title: string; description: string; next: string }[] = [
  { id: "understand", title: "Understand an idea", description: "Break a difficult concept into smaller questions and connect it to something you already know.", next: "Write what you think the idea means, then identify the part you cannot yet explain." },
  { id: "practise", title: "Practise a skill", description: "Work through a small set of problems and notice the step that slows you down.", next: "Try one example without help, then review the exact step where you got stuck." },
  { id: "mistake", title: "Learn from a mistake", description: "Look beyond the score and identify whether the gap came from a concept, method, misread or rushed choice.", next: "Revisit the released correction, explain why your answer was tempting, and state the corrected reasoning." },
  { id: "exam", title: "Prepare for an exam", description: "Choose a topic, practise deliberately and reserve time to review errors.", next: "Choose one topic, set a realistic practice window, then finish by reviewing errors—not just the score." },
];

const methods: { id: Method; title: string; description: string }[] = [
  { id: "decode", title: "Explain it simply", description: "Put the concept into plain language and connect it to prior knowledge." },
  { id: "solve", title: "Solve step by step", description: "Show the reasoning that connects the question to a result." },
  { id: "spot", title: "Spot the flaw", description: "Find the step where a worked example stops making sense." },
  { id: "apply", title: "Apply it", description: "Use the idea in a practical situation and explain why the method fits." },
  { id: "teach", title: "Teach it back", description: "Explain the idea in your own words without copying a definition." },
];

export default function AILearningStudio() {
  const [intent, setIntent] = useState<Intent>("understand");
  const [method, setMethod] = useState<Method>("decode");
  const [topic, setTopic] = useState("");
  const [plan, setPlan] = useState(false);

  // AI Tutor interactive state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);

  const selectedIntent = intents.find((item) => item.id === intent) ?? intents[0];
  const selectedMethod = methods.find((item) => item.id === method) ?? methods[0];

  function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlan(true);
  }

  async function handleAskAi(customPrompt?: string) {
    const queryTopic = topic.trim();
    const basePrompt =
      customPrompt ||
      aiQuestion.trim() ||
      (queryTopic
        ? `I am studying "${queryTopic}". My goal is to "${selectedIntent.title}" using the method "${selectedMethod.title}". Please give me a brief, step-by-step explanation and 1 guided question to test my understanding.`
        : "Please give me a high-yield study strategy for computer-based testing (CBT) exams.");

    const promptToSend = `${basePrompt}\n\nNote: Provide a concise, direct answer under 180 words without markdown hashtags (#) or asterisks (* or **). Write in clean plain text only.`;

    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);

    try {
      // Pass user session if authenticated
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
          prompt: promptToSend,
          metadata: {
            source: "ai_learning_studio",
            topic: queryTopic || "general",
            intent,
            method,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI guidance.");
      }

      setAiResponse(cleanAIResponse(data.response));
      setAiModel(data.model);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "An error occurred calling AI Tutor.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-800">Guided study mission</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Make your next study session count.</h2>
        <p className="mt-4 leading-7 text-slate-600">Choose a goal and a learning method to create a practical session brief, then ask the BrainLab AI Tutor to guide your thinking step-by-step.</p>
      </div>

      <form onSubmit={createPlan} className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <fieldset>
            <legend className="text-base font-extrabold text-slate-950">1. What do you want to do?</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {intents.map((item) => (
                <button key={item.id} type="button" onClick={() => { setIntent(item.id); setPlan(false); }} aria-pressed={intent === item.id} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover-lift active-press ${intent === item.id ? "border-blue-800 bg-blue-50 ring-1 ring-blue-800 shadow-xs" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                  <span className="block font-extrabold text-slate-950">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="text-base font-extrabold text-slate-950">2. How will you work on it?</legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {methods.map((item) => (
                <button key={item.id} type="button" onClick={() => { setMethod(item.id); setPlan(false); }} aria-pressed={method === item.id} className={`min-h-10 rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover-lift active-press ${method === item.id ? "border-[#012153] bg-[#012153] text-white shadow-xs" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}>{item.title}</button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7">
            <label htmlFor="ai-learning-topic" className="block text-sm font-extrabold text-slate-950">3. Which topic? <span className="font-normal text-slate-500">(optional)</span></label>
            <input id="ai-learning-topic" value={topic} onChange={(event) => { setTopic(event.target.value); setPlan(false); }} maxLength={120} placeholder="e.g. simultaneous equations" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition" />
          </div>
          <button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#012153] px-5 py-3 font-extrabold text-white transition hover:bg-[#0a2f72] hover-lift active-press sm:w-auto">Create my study plan <span aria-hidden="true" className="ml-2">→</span></button>
        </div>

        <aside className="rounded-3xl bg-[#061a3a] p-6 text-white shadow-sm sm:p-8" aria-live="polite">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">Your session brief</p>
          <h3 className="mt-3 text-2xl font-black">{selectedMethod.title}</h3>
          <p className="mt-2 text-sm leading-6 text-blue-100">{selectedMethod.description}</p>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Session focus</p>
            <p className="mt-2 font-bold">{selectedIntent.next}</p>
          </div>
          {plan ? (
            <div className="mt-6 rounded-2xl border border-cyan-200/30 bg-cyan-300/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Your plan</p>
              <p className="mt-2 font-extrabold">{topic.trim() || "General CBT Study Plan"}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-blue-50">
                <li>Write down what you already understand.</li>
                <li>{selectedMethod.title}: {selectedMethod.description.toLowerCase()}</li>
                <li>Try a fresh example without looking at a solution.</li>
                <li>Note what remains unclear and choose one next step.</li>
              </ol>
              <div className="mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleAskAi()}
                  disabled={aiLoading}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-cyan-300 px-4 py-2 text-xs font-extrabold text-[#061a3a] hover:bg-cyan-200 disabled:opacity-50"
                >
                  {aiLoading ? "Generating AI guidance..." : "Ask AI Tutor for guidance on this plan →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.05] p-4 text-sm leading-6 text-blue-100">Choose a goal and method, then create your study plan.</div>
          )}
        </aside>
      </form>

      {/* Interactive AI Tutor Section */}
      <section className="mt-10 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              BrainLab AI Tutor (Online)
            </span>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Ask the AI Tutor</h3>
          </div>
          {aiModel && (
            <span className="text-xs font-semibold text-slate-500">
              Powered by {aiModel}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Get step-by-step reasoning, conceptual breakdowns, or guided practice questions on any topic.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder={topic.trim() ? `Ask a question about ${topic.trim()}...` : "e.g. Why does cross-multiplication work in fractions?"}
              maxLength={250}
              className="min-h-12 w-full rounded-xl border border-slate-300 pl-4 pr-16 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !aiLoading) {
                  e.preventDefault();
                  handleAskAi();
                }
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
              {aiQuestion.length}/250
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleAskAi()}
            disabled={aiLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-800 px-6 font-extrabold text-white hover:bg-blue-900 disabled:opacity-50 transition hover-lift active-press"
          >
            {aiLoading ? "Thinking..." : "Ask Tutor"}
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "📐 Quick Math CBT Strategy",
            "⚡ Eliminate Trap Options",
            "📖 Comprehension Recall Steps",
            "⏱️ CBT Time Management",
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => {
                setAiQuestion(promptText);
                void handleAskAi(promptText);
              }}
              className="rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-900 transition hover:bg-blue-100 hover-lift active-press"
            >
              {promptText}
            </button>
          ))}
        </div>

        {aiError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {aiError}
          </div>
        )}

        {aiLoading && (
          <div className="mt-6 animate-fade-in-up">
            <AiResponseSkeleton />
          </div>
        )}

        {aiResponse && !aiLoading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Tutor Response</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(aiResponse);
                  toast.success("AI guidance copied to clipboard!");
                }}
                className="text-xs font-bold text-slate-600 hover:text-blue-900 transition active-press"
              >
                📋 Copy Guidance
              </button>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
              {aiResponse}
            </div>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Study content</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Lessons and topic tests</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use structured lessons and topic assessments in the Learning Hub.</p>
          <Link className="mt-4 inline-flex font-bold text-blue-800 hover:underline" href="/learn">Open Learning Hub →</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Understand errors</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Corrections and review</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Review released exam feedback where your exam settings make corrections available.</p>
          <Link className="mt-4 inline-flex font-bold text-blue-800 hover:underline" href="/corrections">Open Corrections →</Link>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">AI Tutor Active</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">Google AI Studio Connected</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">The tutor service is live with Gemini 3.8 Flash. Interactions adhere to exam integrity and responsible study guidelines.</p>
          <Link className="mt-4 inline-flex font-bold text-emerald-950 underline underline-offset-2" href="/ai-learning">Try a study prompt ↑</Link>
        </article>
      </div>
    </section>
  );
}
