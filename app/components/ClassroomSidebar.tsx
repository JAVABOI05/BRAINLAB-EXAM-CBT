"use client";

import React, { RefObject } from "react";
import Link from "next/link";
import type { Participant, ClassroomMessage } from "../lib/liveClassroom/types";
import type { LessonAttachment } from "./ClassroomMaterialImporter";

interface ClassroomPollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
  is_correct?: boolean;
}

interface ClassroomPollItem {
  id: string;
  class_id: string;
  created_by: string;
  question: string;
  options: ClassroomPollOption[];
  explanation?: string;
  is_open: boolean;
  duration_seconds?: number;
  total_votes: number;
  user_voted_option_id?: string | null;
  created_at: string;
  closed_at?: string | null;
}

function renderTextWithMentions(text: string, currentUserName?: string) {
  if (!text.includes("@")) return text;
  const parts = text.split(/(@[\w\.-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const isMe = currentUserName && part.toLowerCase() === `@${currentUserName.toLowerCase()}`;
      return (
        <span
          key={i}
          className={`font-bold px-1.5 py-0.5 rounded-md inline-block ${
            isMe
              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 ring-1 ring-amber-400"
              : "bg-blue-100 text-blue-800 dark:bg-cyan-950/80 dark:text-cyan-300"
          }`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export interface ClassroomSidebarProps {
  activeTab: "chat" | "participants" | "polls" | "resources";
  setActiveTab: (tab: "chat" | "participants" | "polls" | "resources") => void;
  messages: ClassroomMessage[];
  currentUser: { id: string; email?: string; user_metadata?: { full_name?: string; name?: string; [key: string]: unknown } } | null;
  participants: Participant[];
  polls: ClassroomPollItem[];
  activePoll: ClassroomPollItem | null;
  isTutorOrModerator: boolean;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  showMentions: boolean;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
  mentionFilter: string | null;
  setMentionFilter: React.Dispatch<React.SetStateAction<string | null>>;
  isRecordingAudio: boolean;
  recordingDuration: number;
  currentlyPlayingAudioId: string | null;
  onSendMessage: (e: React.FormEvent) => Promise<void>;
  onStartVoiceRecording: () => Promise<void>;
  onStopVoiceRecording: (send?: boolean) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onTogglePlayAudio: (msgId: string, url: string) => void;
  onVotePoll: (pollId: string, optionId: string) => Promise<void>;
  onClosePoll: (pollId: string) => Promise<void>;
  onOpenCreatePoll: () => void;
  onPreviewImage: (url: string | null) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onCloseMobileDrawer?: () => void;
  allowStudentMedia?: boolean;
  allowStudentVoiceNotes?: boolean;
  chatMuted?: boolean;
  classId?: string;
  attachments?: LessonAttachment[];
  pendingAdmissions?: { studentId: string; studentName: string; studentEmail?: string }[];
  onAdmitStudent?: (studentId: string, allowed?: boolean) => Promise<void>;
  onAdmitAllStudents?: () => Promise<void>;
}


export function formatSafeName(name?: string | null): string {
  if (!name) return "Learner";
  if (name.includes("@")) {
    const handle = name.split("@")[0];
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  return name;
}

export default function ClassroomSidebar({
  activeTab,
  setActiveTab,
  messages,
  currentUser,
  participants,
  polls,
  activePoll,
  isTutorOrModerator,
  chatInput,
  setChatInput,
  showMentions,
  setShowMentions,
  mentionFilter,
  setMentionFilter,
  isRecordingAudio,
  recordingDuration,
  currentlyPlayingAudioId,
  onSendMessage,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onImageUpload,
  onTogglePlayAudio,
  onVotePoll,
  onClosePoll,
  onOpenCreatePoll,
  onPreviewImage,
  imageInputRef,
  onCloseMobileDrawer,
  allowStudentMedia = false,
  allowStudentVoiceNotes = true,
  chatMuted = false,
  classId,
  attachments = [],
  pendingAdmissions = [],
  onAdmitStudent,
  onAdmitAllStudents,
}: ClassroomSidebarProps) {
  const currentUserName =
    currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "Me";

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden text-slate-100">
      {/* Mobile Drawer Top Bar (rendered when onCloseMobileDrawer is provided) */}
      {onCloseMobileDrawer && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">Classroom Hub</span>
            <span className="rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 px-2 py-0.5 text-[10px] font-bold">
              Live
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:text-white active-press"
          >
            ✕ Back to Stage
          </button>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/90 text-xs font-bold shrink-0 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === "chat"
              ? "bg-slate-800 text-white shadow-xs border border-slate-700/80 font-extrabold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          <span>Chat</span>
          <span className="text-[10px] opacity-75 font-mono">({messages.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("polls")}
          className={`flex-1 py-2 rounded-xl text-center transition relative flex items-center justify-center gap-1.5 ${
            activeTab === "polls"
              ? "bg-slate-800 text-white shadow-xs border border-slate-700/80 font-extrabold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>Polls</span>
          {polls.length > 0 && <span className="text-[10px] opacity-75 font-mono">({polls.length})</span>}
          {activePoll?.is_open && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("participants")}
          className={`flex-1 py-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === "participants"
              ? "bg-slate-800 text-white shadow-xs border border-slate-700/80 font-extrabold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>People</span>
          <span className="text-[10px] opacity-75 font-mono">({participants.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`flex-1 py-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === "resources"
              ? "bg-slate-800 text-white shadow-xs border border-slate-700/80 font-extrabold"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Links</span>
        </button>
      </div>

      {/* TAB 1: LIVE CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageUpload}
          />

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`font-bold ${m.isHost ? "text-amber-400" : "text-blue-400"}`}>
                    {formatSafeName(m.senderName)} {m.isHost && "(Tutor)"}
                  </span>
                  <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                </div>

                {/* Image Message */}
                {m.type === "image" && m.mediaUrl && (
                  <div className="mt-1.5 space-y-1 bg-slate-800/60 rounded-xl p-2 border border-slate-700/60">
                    <img
                      src={m.mediaUrl}
                      alt={m.text || "Classroom diagram"}
                      onClick={() => onPreviewImage(m.mediaUrl || null)}
                      className="max-h-48 w-auto rounded-lg object-contain cursor-pointer hover:opacity-90 transition border border-slate-700"
                    />
                    {m.text && (
                      <p className="text-[11px] text-slate-300 font-medium">
                        {renderTextWithMentions(m.text, currentUserName)}
                      </p>
                    )}
                  </div>
                )}

                {/* Audio Voice Note Message */}
                {m.type === "audio" && m.mediaUrl && (
                  <div className="mt-1.5 flex items-center gap-2.5 bg-slate-800/80 rounded-xl p-2.5 border border-cyan-500/30">
                    <button
                      type="button"
                      onClick={() => onTogglePlayAudio(m.id, m.mediaUrl || "")}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition shrink-0"
                      title="Play/Pause Voice Note"
                    >
                      {currentlyPlayingAudioId === m.id ? "⏸" : "▶"}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300">
                        <span>🎙️ Voice Note</span>
                        <span>{m.duration ? `${m.duration}s` : "Audio"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-0.5 h-3">
                        {[12, 8, 16, 20, 10, 14, 22, 18, 12, 16, 8, 14].map((bar, idx) => (
                          <span
                            key={idx}
                            className={`w-1 rounded-full ${
                              currentlyPlayingAudioId === m.id
                                ? "bg-cyan-400 animate-pulse"
                                : "bg-slate-600"
                            }`}
                            style={{ height: `${bar}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Plain Text Message */}
                {(!m.type || m.type === "text") && (
                  <p className="mt-1 text-slate-100 leading-relaxed bg-slate-800/70 rounded-xl p-2.5 border border-slate-700/60 break-words">
                    {renderTextWithMentions(m.text, currentUserName)}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input & Media Actions */}
          {chatMuted && !isTutorOrModerator ? (
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200">
                <span className="text-lg shrink-0">🔇</span>
                <div className="text-left">
                  <p className="font-bold text-amber-300">Chat paused by instructor</p>
                  <p className="text-[10px] text-amber-400/80">
                    The tutor has temporarily paused learner chat during presentation.
                  </p>
                </div>
              </div>
            </div>
          ) : isRecordingAudio ? (
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-300">
                  Recording Voice Note ({recordingDuration}s / 120s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStopVoiceRecording(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onStopVoiceRecording(true)}
                  className="rounded-xl bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950 shadow"
                >
                  Send Note
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={onSendMessage}
              className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 relative shrink-0"
            >
              {showMentions && (
                <div className="absolute bottom-full left-3 right-3 mb-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-2 z-40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Tag a participant (@)
                  </p>
                  {participants
                    .filter((p) => !mentionFilter || p.name.toLowerCase().includes(mentionFilter))
                    .slice(0, 6)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setChatInput((prev) => prev.replace(/@\w*$/, `@${p.name} `));
                          setShowMentions(false);
                          setMentionFilter(null);
                        }}
                        className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left hover:bg-slate-800 transition"
                      >
                        <span className="font-semibold text-white">@{p.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{p.role}</span>
                      </button>
                    ))}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onStartVoiceRecording}
                  disabled={!isTutorOrModerator && !allowStudentVoiceNotes}
                  title={
                    !isTutorOrModerator && !allowStudentVoiceNotes
                      ? "Voice notes paused by instructor"
                      : "Record Voice Note"
                  }
                  className={`flex h-8 px-2 items-center gap-1 rounded-lg border text-[11px] font-bold transition ${
                    !isTutorOrModerator && !allowStudentVoiceNotes
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-60"
                      : "border-slate-700 bg-slate-800 text-cyan-300 hover:bg-slate-700"
                  }`}
                >
                  <span>🎙️</span>
                  <span>Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!isTutorOrModerator && !allowStudentMedia}
                  title={
                    !isTutorOrModerator && !allowStudentMedia
                      ? "Image sharing restricted to instructor"
                      : "Share Diagram or Picture"
                  }
                  className={`flex h-8 px-2 items-center gap-1 rounded-lg border text-[11px] font-bold transition ${
                    !isTutorOrModerator && !allowStudentMedia
                      ? "border-slate-800 bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-60"
                      : "border-slate-700 bg-slate-800 text-emerald-300 hover:bg-slate-700"
                  }`}
                >
                  <span>📷</span>
                  <span>Diagram</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("polls");
                    if (isTutorOrModerator) onOpenCreatePoll();
                  }}
                  title={isTutorOrModerator ? "Launch checkpoint quiz" : "View active polls & quizzes"}
                  className="flex h-8 px-2 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-amber-300 hover:bg-slate-700"
                >
                  <span>🎯</span>
                  <span>{isTutorOrModerator ? "+ Quiz" : "Quizzes"}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or comment…"
                  value={chatInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChatInput(val);
                    const match = val.match(/@(\w*)$/);
                    if (match) {
                      setMentionFilter(match[1].toLowerCase());
                      setShowMentions(true);
                    } else {
                      setShowMentions(false);
                      setMentionFilter(null);
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-blue-500 active-press"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: POLLS & LIVE QUIZZES */}
      {activeTab === "polls" && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Tutor Launch Action */}
          {isTutorOrModerator && (
            <div className="mb-4 shrink-0">
              <button
                type="button"
                onClick={onOpenCreatePoll}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-extrabold text-white hover:bg-blue-500 shadow transition flex items-center justify-center gap-2 active-press"
              >
                <span>🎯 Launch Live Poll / Quiz</span>
              </button>
            </div>
          )}

          {/* Polls List */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {polls.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No classroom polls yet. When the tutor launches a checkpoint quiz, it will appear here.
              </div>
            )}

            {polls.map((poll) => (
              <div
                key={poll.id}
                className={`rounded-2xl border p-4 space-y-3 ${
                  poll.is_open ? "border-cyan-500/50 bg-slate-950" : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      poll.is_open
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {poll.is_open ? "Active Poll" : "Closed"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white">{poll.question}</h4>

                {/* Options */}
                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const isVoted = poll.user_voted_option_id === opt.id;
                    const canVote = poll.is_open && !poll.user_voted_option_id;

                    return (
                      <div key={opt.id} className="text-xs">
                        {canVote ? (
                          <button
                            type="button"
                            onClick={() => void onVotePoll(poll.id, opt.id)}
                            className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-200 hover:border-cyan-400 hover:bg-slate-800 transition active-press"
                          >
                            <strong className="text-cyan-400 font-mono mr-2">
                              {String.fromCharCode(65 + idx)}:
                            </strong>
                            {opt.text}
                          </button>
                        ) : (
                          <div
                            className={`rounded-xl border p-2 ${
                              isVoted
                                ? "border-cyan-500 bg-cyan-950/40 text-cyan-200"
                                : "border-slate-800 bg-slate-950/40 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span>
                                <strong className="font-mono mr-1.5 text-slate-400">
                                  {String.fromCharCode(65 + idx)}:
                                </strong>
                                {opt.text}
                                {isVoted && (
                                  <span className="ml-1 text-[10px] font-bold text-cyan-400">
                                    (Yours)
                                  </span>
                                )}
                                {!poll.is_open && opt.is_correct && (
                                  <span className="ml-1 text-[10px] font-bold text-emerald-400">
                                    ✓
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-slate-400">{opt.percentage}%</span>
                            </div>
                            <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  !poll.is_open && opt.is_correct
                                    ? "bg-emerald-500"
                                    : isVoted
                                    ? "bg-cyan-400"
                                    : "bg-blue-600"
                                }`}
                                style={{ width: `${opt.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {!poll.is_open && poll.explanation && (
                  <p className="text-[11px] text-blue-200 bg-blue-950/60 p-2 rounded-xl border border-blue-900">
                    💡 <strong>Explanation:</strong> {poll.explanation}
                  </p>
                )}

                {/* Tutor Actions */}
                {isTutorOrModerator && poll.is_open && (
                  <button
                    type="button"
                    onClick={() => void onClosePoll(poll.id)}
                    className="w-full rounded-xl border border-rose-500/40 bg-rose-950/30 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                  >
                    End Poll & Reveal Answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PARTICIPANTS ROSTER */}
      {activeTab === "participants" && (() => {
        const tutorsAndHosts = participants.filter((p) => p.role === "host");
        const studentsAndLearners = participants.filter((p) => p.role !== "host");

        return (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Pending Masterclass Admission Requests (Waiting Room) */}
            {isTutorOrModerator && pendingAdmissions && pendingAdmissions.length > 0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Waiting Room ({pendingAdmissions.length})</span>
                  </h4>
                  {onAdmitAllStudents && (
                    <button
                      type="button"
                      onClick={() => void onAdmitAllStudents()}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white transition active-press"
                    >
                      Admit All
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {pendingAdmissions.map((req) => (
                    <div
                      key={req.studentId}
                      className="flex items-center justify-between rounded-xl bg-slate-900/80 p-2 text-xs border border-amber-500/20"
                    >
                      <div>
                        <p className="font-bold text-white">{formatSafeName(req.studentName)}</p>
                        <p className="text-[10px] text-amber-300/80">Requested entry</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void onAdmitStudent?.(req.studentId, true)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white transition"
                        >
                          ✓ Admit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onAdmitStudent?.(req.studentId, false)}
                          className="rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 px-2 py-1 text-[10px] font-bold text-rose-300 transition"
                        >
                          ✕ Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tutors & Instructors Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span>👑</span>
                  <span>Instructors &amp; Hosts</span>
                </h4>
                <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {tutorsAndHosts.length}
                </span>
              </div>
              <div className="space-y-2">
                {tutorsAndHosts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2 bg-slate-950/40 rounded-xl">Host connecting…</p>
                ) : (
                  tutorsAndHosts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-amber-950/20 p-2.5 text-xs border border-amber-500/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black">
                          👑
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-white">{formatSafeName(p.name)}</p>
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-300 border border-amber-500/30">
                              Host
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-300/70">Lead Instructor</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("chat");
                            setChatInput((prev) => `@${p.name} ` + prev);
                          }}
                          className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-900/40 transition"
                          title={`Ask ${p.name} in chat`}
                        >
                          @ Ask
                        </button>
                        <span className="text-[11px] text-slate-400">{p.isMuted ? "🔇" : "🎙️"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Students & Learners Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>🎓</span>
                  <span>Learners in Class</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  {studentsAndLearners.length}
                </span>
              </div>
              <div className="space-y-2">
                {studentsAndLearners.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2 bg-slate-950/40 rounded-xl">No students connected yet</p>
                ) : (
                  studentsAndLearners.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 text-xs border border-slate-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-blue-200 font-bold">
                          {formatSafeName(p.name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{formatSafeName(p.name)}</p>
                          <p className="text-[10px] text-slate-400">Student</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("chat");
                            setChatInput((prev) => `@${p.name} ` + prev);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-slate-700 transition"
                          title={`Tag ${p.name} in chat`}
                        >
                          @ Tag
                        </button>
                        {p.isHandRaised && <span title="Hand raised">✋</span>}
                        <span className="text-[11px] text-slate-400">{p.isMuted ? "🔇" : "🎙️"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Attendance CSV Export (for instructors and moderators) */}
            {isTutorOrModerator && (
              <div className="pt-2 border-t border-slate-800">
                <a
                  href={`/api/classroom/attendance?classId=${classId || "BL-LIVE-101"}&format=csv`}
                  download={`attendance-${classId || "classroom"}.csv`}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/50 py-2.5 px-3 text-xs font-bold text-emerald-300 transition active-press"
                  title="Download verified attendance CSV log with timestamps and accreditation qualification"
                >
                  <span>📥</span>
                  <span>Export Attendance CSV</span>
                </a>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 4: LESSON RESOURCES */}
      {activeTab === "resources" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section A: Tutor-Attached Course Handouts & Slides */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <span>📎</span>
                <span>Class Handouts &amp; Materials</span>
              </h4>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
                {attachments.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Files and outlines prepared by the instructor for this session.
            </p>

            {attachments.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center">
                <p className="text-xs text-slate-500">No downloadable handouts attached to this class yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Instructors can upload PDFs, PPT slides, or question banks in Classroom Studio before class starts.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {attachments.map((file) => {
                  const ext = file.name.split(".").pop()?.toLowerCase();
                  let icon = "📄";
                  let badge = "DOC";
                  if (ext === "pdf") { icon = "📕"; badge = "PDF"; }
                  else if (ext === "pptx" || ext === "ppt") { icon = "📊"; badge = "PPTX"; }
                  else if (ext === "docx" || ext === "doc") { icon = "📝"; badge = "DOCX"; }
                  else if (ext === "csv") { icon = "📑"; badge = "CSV"; }

                  const sizeKb = file.size ? `${(file.size / 1024).toFixed(1)} KB` : "";

                  return (
                    <div
                      key={file.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-purple-950/20 hover:bg-purple-950/40 p-3 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate group-hover:text-purple-200 transition" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-purple-300">{badge}</span>
                            {sizeKb && <span>• {sizeKb}</span>}
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.name}
                        className="shrink-0 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-bold text-white transition shadow-xs inline-flex items-center gap-1 active:scale-95"
                        title={`Download ${file.name}`}
                      >
                        <span>📥</span>
                        <span>Download</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Attached Study Links */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Attached Study Links
            </h4>
            <div className="space-y-2">
              <Link
                href="/learn"
                target="_blank"
                className="block rounded-xl border border-slate-800 bg-slate-800/80 p-3 hover:border-blue-500 transition"
              >
                <p className="text-xs font-bold text-blue-300">📖 Topic Reference Material</p>
                <p className="text-[11px] text-slate-400 mt-1">Review lesson notes in Learning Hub</p>
              </Link>

              <Link
                href="/self-practice"
                target="_blank"
                className="block rounded-xl border border-slate-800 bg-slate-800/80 p-3 hover:border-blue-500 transition"
              >
                <p className="text-xs font-bold text-emerald-300">✍️ Self-Practice Assessment</p>
                <p className="text-[11px] text-slate-400 mt-1">Test your recall of key exam concepts</p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
