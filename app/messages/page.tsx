"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import AudioPlayer from "../components/AudioPlayer";
import VoiceNoteRecorder from "../components/VoiceNoteRecorder";
import { toast } from "../lib/toast";
import { ListSkeleton } from "../components/SkeletonLoader";

type Conversation = {
  id: string;
  type: string;
  title: string;
  last_message_at: string;
  messages?: { content: string; created_at: string; sender_id: string; message_type: string }[];
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  audio_assets?: {
    file_url: string;
    duration_seconds: number;
    title?: string;
  };
  message_reactions?: { id: string; reaction: string; user_id: string }[];
};

export default function MessagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // 1. Authenticate and load conversations
  useEffect(() => {
    let active = true;
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const user = session?.user;
      if (!session || !user) {
        router.replace("/account?redirect=/messages");
        return;
      }
      if (!active) return;
      setCurrentUser(user);

      try {
        const res = await fetch("/api/messages/conversations", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (active && json.success) {
          setConversations(json.conversations);
          if (json.conversations.length > 0 && !activeConvId) {
            setActiveConvId(json.conversations[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load conversations:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [router]);

  // 2. Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    let active = true;

    async function loadMessages(isInitial = false) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      if (isInitial) setMessagesLoading(true);
      try {
        const res = await fetch(`/api/messages?conversationId=${activeConvId}`, {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        });
        const json = await res.json();
        if (active && json.success) {
          setMessages(json.messages);
        }
      } catch (err) {
        console.warn("Error fetching messages:", err);
      } finally {
        if (active && isInitial) setMessagesLoading(false);
      }
    }

    void loadMessages(true);
    const interval = setInterval(() => void loadMessages(false), 8000); // Polling refresh
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeConvId]);

  // 3. Send text message
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !activeConvId || !currentUser) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const optimisticMsg: Message = {
      id: `opt_${Date.now()}`,
      sender_id: currentUser.id,
      content: textInput.trim(),
      message_type: "text",
      created_at: new Date().toISOString(),
      message_reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTextInput("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: optimisticMsg.content,
          messageType: "text",
        }),
      });
    } catch (err) {
      console.warn("Failed to deliver message:", err);
    }
  };

  // 4. Send recorded voice note
  const handleSendVoiceNote = async (blob: Blob, durationSeconds: number) => {
    if (!activeConvId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    // First upload audio asset
    const formData = new FormData();
    formData.append("file", blob, "voice_note.webm");
    formData.append("asset_type", "tutor_voice_note");
    formData.append("duration_seconds", String(durationSeconds));
    formData.append("title", "Voice Note");

    const uploadRes = await fetch("/api/audio/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      body: formData,
    });
    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(uploadJson.error || "Audio upload rejected.");
    }

    // Next post message referencing audio asset
    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        conversationId: activeConvId,
        content: "🎙️ Voice note",
        messageType: "audio_note",
        audioAssetId: uploadJson.asset.id,
      }),
    });

    setIsRecordingVoice(false);
    toast.success("Voice note sent successfully!");
  };

  // 5. Toggle reaction
  const handleReaction = async (messageId: string, reaction: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    await fetch("/api/messages/reactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ messageId, reaction }),
    });

    // Refresh messages
    const res = await fetch(`/api/messages?conversationId=${activeConvId}`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    const json = await res.json();
    if (json.success) setMessages(json.messages);
    toast.info(`Reaction updated: ${reaction}`);
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <main id="main" className="mx-auto max-w-7xl h-[calc(100vh-80px)] p-3 sm:p-6 flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Left Sidebar: Conversations List */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h1 className="text-xl font-black text-slate-950">Messages</h1>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900">
              {conversations.length} Active
            </span>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-3">
                <ListSkeleton count={4} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <p className="font-bold text-slate-700">No conversations yet</p>
                <p className="mt-1">Messages from your tutors, courses and study groups will appear here.</p>
              </div>
            ) : (
              conversations
                .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-4 transition flex items-start gap-3 hover:bg-slate-50 active-press ${
                        isSelected ? "bg-blue-50/80 font-semibold" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#012153] text-white font-bold text-sm">
                        {conv.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <h2 className="text-xs font-bold text-slate-950 truncate">{conv.title}</h2>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(conv.last_message_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 truncate">
                          {conv.messages?.[0]?.content || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </aside>

        {/* Right Pane: Active Chat Room */}
        <section
          className={`flex-1 flex flex-col overflow-hidden bg-slate-50 ${
            !mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden text-slate-600 hover:text-slate-900 font-bold text-sm"
                  >
                    ←
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-950 font-bold text-sm">
                    {activeConv.title.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">{activeConv.title}</h2>
                    <span className="text-[11px] text-slate-500 capitalize">{activeConv.type} discussion</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="space-y-4 p-2 animate-fade-in-up">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
                      <div className="max-w-xs sm:max-w-md p-4 rounded-2xl bg-white border border-slate-200 space-y-2 animate-pulse flex-1">
                        <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
                        <div className="h-3 w-5/6 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="flex items-end justify-end gap-3">
                      <div className="max-w-xs sm:max-w-md p-4 rounded-2xl bg-blue-100/70 space-y-2 animate-pulse flex-1">
                        <div className="h-3.5 w-1/2 bg-blue-200 rounded ml-auto" />
                        <div className="h-3 w-3/4 bg-blue-200 rounded ml-auto" />
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No messages in this conversation yet. Send a note or voice memo below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                            isMe
                              ? "bg-[#012153] text-white rounded-br-none"
                              : "bg-white text-slate-900 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          {msg.message_type === "audio_note" && msg.audio_assets ? (
                            <AudioPlayer
                              src={msg.audio_assets.file_url}
                              title={msg.audio_assets.title}
                              durationSeconds={msg.audio_assets.duration_seconds}
                            />
                          ) : (
                            <p>{msg.content}</p>
                          )}

                          <div
                            className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                              isMe ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <span>✓✓</span>}
                          </div>
                        </div>

                        {/* Emoji Reactions & Trigger */}
                        <div className="mt-1 flex items-center gap-1">
                          {msg.message_reactions && msg.message_reactions.length > 0 && (
                            <div className="flex gap-1 rounded-full bg-white px-2 py-0.5 border border-slate-200 text-xs shadow-xs">
                              {Array.from(new Set(msg.message_reactions.map((r) => r.reaction))).map((rx) => (
                                <button
                                  key={rx}
                                  onClick={() => handleReaction(msg.id, rx)}
                                  className="hover:scale-125 transition"
                                >
                                  {rx}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="opacity-0 hover:opacity-100 transition flex gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs shadow-xs">
                            {["👍", "❤️", "👏", "✅"].map((rx) => (
                              <button
                                key={rx}
                                onClick={() => handleReaction(msg.id, rx)}
                                className="hover:scale-125 transition"
                              >
                                {rx}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Input Deck */}
              <div className="p-3 border-t border-slate-200 bg-white">
                {isRecordingVoice ? (
                  <div className="flex justify-center">
                    <VoiceNoteRecorder
                      onAudioReady={handleSendVoiceNote}
                      onCancel={() => setIsRecordingVoice(false)}
                      maxDurationSeconds={300}
                    />
                  </div>
                ) : (
                  <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition active-press"
                      title="Record Voice Note"
                    >
                      🎙️
                    </button>

                    <input
                      type="text"
                      placeholder="Type a message…"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />

                    <button
                      type="submit"
                      disabled={!textInput.trim()}
                      className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-900 disabled:opacity-50 transition active-press hover-lift"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="text-4xl">💬</span>
              <h2 className="mt-3 text-base font-bold text-slate-700">Select a Conversation</h2>
              <p className="mt-1 text-xs max-w-sm">
                Choose a conversation from the left to start communicating with your tutors and classmates.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
