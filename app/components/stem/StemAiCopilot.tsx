"use client";

import React, { useState, useRef, useEffect } from "react";
import type { CuratedMolecule } from "./Molecular3DViewer";
import {
  type StemViewerAction,
  type ParsedStemAction,
  parseStemViewerActions,
  getCuratedQuickPrompts,
} from "@/app/lib/stem/stemActionProtocol";
import { trackEvent } from "@/app/lib/analytics";

interface Message {
  id: string;
  sender: "user" | "tutor";
  text: string;
  actions?: ParsedStemAction[];
  timestamp: string;
}

interface StemAiCopilotProps {
  selectedMolecule: CuratedMolecule;
  isDark: boolean;
  onExecuteAction: (action: StemViewerAction) => void;
  onClose?: () => void;
}

export default function StemAiCopilot({
  selectedMolecule,
  isDark,
  onExecuteAction,
  onClose,
}: StemAiCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "tutor",
      text: `Hello! I am your STEM Studio AI Copilot. We are currently inspecting **${selectedMolecule.name}** (${selectedMolecule.formula}). You can ask me any chemistry or biology question, or tap a syllabus quick prompt below. I can also interactively highlight residues and steer the 3D camera!`,
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastExecutedActionId, setLastExecutedActionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = getCuratedQuickPrompts(selectedMolecule);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string, presetAction?: StemViewerAction) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    trackEvent("stem_copilot_prompt_sent", {
      molecule_id: selectedMolecule.id,
      query_length: textToSend.length,
      has_preset_action: Boolean(presetAction),
    });

    if (presetAction) {
      onExecuteAction(presetAction);
    }

    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputText("");
    setIsLoading(true);

    try {
      // Build rich curriculum prompt payload
      const contextualPrompt = `[Context: STEM Studio 3D Molecular Lab - Inspecting ${selectedMolecule.name} (${selectedMolecule.formula}), Type: ${selectedMolecule.type}]: ${textToSend}`;

      const res = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: contextualPrompt }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Tutor error (${res.status})`);
      }

      const data = await res.json();
      const rawAnswer = data.answer || "I could not generate an answer right now. Please try again.";

      // Parse structured action pills
      const { cleanText, actions } = parseStemViewerActions(rawAnswer);

      const tutorMessage: Message = {
        id: `tutor-${Date.now()}`,
        sender: "tutor",
        text: cleanText,
        actions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, tutorMessage]);

      // If tutor returned high-confidence single action, auto-trigger it
      if (actions.length === 1 && actions[0].action.type === "HIGHLIGHT_MUTATION") {
        onExecuteAction(actions[0].action);
        setLastExecutedActionId(actions[0].id);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "tutor",
        text: `⚠️ **Note:** ${err?.message || "Could not reach AI Tutor. Please check your connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (actionItem: ParsedStemAction) => {
    onExecuteAction(actionItem.action);
    setLastExecutedActionId(actionItem.id);
  };

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border transition-colors duration-300 shadow-xl overflow-hidden ${
        isDark ? "bg-[#070D1E] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-100 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
              STEM AI Copilot
            </h3>
            <span
              className={`text-[10px] block truncate ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Active Model: {selectedMolecule.formula} · {selectedMolecule.name}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg text-xs transition ${
              isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
            }`}
            title="Close Copilot Panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Prompts Bar */}
      {quickPrompts.length > 0 && (
        <div
          className={`p-2.5 border-b overflow-x-auto flex items-center gap-1.5 scrollbar-thin ${
            isDark ? "border-white/5 bg-[#081026]" : "border-slate-100 bg-slate-100/50"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
            Syllabus Cues:
          </span>
          {quickPrompts.map((qp) => (
            <button
              key={qp.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(qp.prompt, qp.presetAction)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition border ${
                isDark
                  ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60"
                  : "bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100"
              }`}
            >
              💡 {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-3 shadow-xs space-y-2 ${
                m.sender === "user"
                  ? "bg-cyan-600 text-white rounded-tr-none"
                  : isDark
                  ? "bg-[#0B1536] border border-white/10 text-slate-200 rounded-tl-none"
                  : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
              }`}
            >
              <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>

              {/* Interactive 3D Action Pills */}
              {m.actions && m.actions.length > 0 && (
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                  {m.actions.map((act) => {
                    const isSelected = lastExecutedActionId === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition shadow-xs border ${
                          isSelected
                            ? "bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-400/40"
                            : isDark
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30"
                            : "bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200"
                        }`}
                      >
                        <span>{act.icon}</span>
                        <span>{act.displayText}</span>
                        {isSelected && <span className="text-[10px]">✓ Active</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <span
              className={`text-[9px] mt-1 px-1 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {m.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing molecular coordinates and curriculum syllabus…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className={`p-3 border-t flex items-center gap-2 ${
          isDark ? "border-white/10 bg-[#0B1536]" : "border-slate-200 bg-slate-50"
        }`}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask about ${selectedMolecule.name} or key residues…`}
          disabled={isLoading}
          className={`flex-1 text-xs px-3 py-2.5 rounded-xl border focus:outline-none transition ${
            isDark
              ? "bg-[#070D1E] border-white/10 text-white placeholder-slate-500 focus:border-cyan-400"
              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
          }`}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold text-xs transition shadow flex items-center gap-1 shrink-0"
        >
          <span>Ask</span>
          <span>→</span>
        </button>
      </form>
    </div>
  );
}
