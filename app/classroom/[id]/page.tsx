"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import type {
  Participant,
  ClassroomMessage,
  ClassroomPoll,
  LiveRoomTokenResponse,
  RoomPermissions,
} from "../../lib/liveClassroom/types";

export default function LiveClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  // Session & Auth state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<LiveRoomTokenResponse | null>(null);
  const [classDetails, setClassDetails] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Classroom media controls
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"excellent" | "good" | "poor" | "reconnecting">("good");
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Classroom sidebar tabs: "chat" | "participants" | "polls" | "resources"
  const [activeTab, setActiveTab] = useState<"chat" | "participants" | "polls" | "resources">("chat");

  // Chat & Polls
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePoll, setActivePoll] = useState<ClassroomPoll | null>(null);

  // Roster
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [reactionFloat, setReactionFloat] = useState<{ id: string; emoji: string }[]>([]);

  // Video streams refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const attendanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Authenticate & Obtain Classroom Admission Token
  useEffect(() => {
    let active = true;

    async function initClassroom() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const user = session?.user;
        if (!session || !user) {
          router.replace(`/account?redirect=/classroom/${classId}`);
          return;
        }
        if (!active) return;
        setCurrentUser(user);

        // Call backend token generator which enforces server authorization & enrollment
        const res = await fetch("/api/classroom/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ classId }),
        });

        const json = await res.json();
        if (!active) return;

        if (!res.ok) {
          setError(json.error || "Unable to enter classroom.");
          setLoading(false);
          return;
        }

        setTokenData(json.data);
        setClassDetails(json.data.classDetails);

        // Record Join Attendance
        await fetch("/api/classroom/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            classId,
            action: "join",
            joinTime: new Date().toISOString(),
          }),
        });

        // Initialize Participants with current user
        const initialParticipant: Participant = {
          id: user.id,
          name: json.data.identity ? user.email?.split("@")[0] || "Learner" : "Learner",
          role: json.data.classDetails.tutorId === user.id ? "host" : "speaker",
          isMuted: true,
          isCameraOn: false,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: new Date().toISOString(),
          networkQuality: "good",
        };
        setParticipants([initialParticipant]);

        // Default mock welcoming chat message
        setMessages([
          {
            id: "msg_welcome",
            senderId: "system",
            senderName: "BrainLab Classroom",
            text: `Welcome to ${json.data.classDetails.title}. Please keep your microphone muted unless invited to speak.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        setLoading(false);

        // Start 30s attendance heartbeat
        attendanceTimerRef.current = setInterval(() => {
          void fetch("/api/classroom/attendance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              classId,
              action: "heartbeat",
            }),
          });
        }, 30000);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || "Connection failure.");
        setLoading(false);
      }
    }

    void initClassroom();

    return () => {
      active = false;
      if (attendanceTimerRef.current) clearInterval(attendanceTimerRef.current);
      // Clean up media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Report Leave
      void fetch("/api/classroom/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, action: "leave" }),
      });
    };
  }, [classId, router]);

  // 2. Toggle Audio / Microphone
  const toggleAudio = async () => {
    if (!tokenData?.permissions.canPublishAudio) {
      alert("Microphone publishing is currently disabled by the instructor.");
      return;
    }

    try {
      if (!isAudioEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (localStreamRef.current) {
          stream.getAudioTracks().forEach((track) => localStreamRef.current?.addTrack(track));
        } else {
          localStreamRef.current = stream;
        }
        setIsAudioEnabled(true);
      } else {
        localStreamRef.current?.getAudioTracks().forEach((track) => track.stop());
        setIsAudioEnabled(false);
      }
    } catch (err) {
      alert("Microphone permission denied or device not found.");
    }
  };

  // 3. Toggle Video / Camera
  const toggleVideo = async () => {
    if (!tokenData?.permissions.canPublishVideo) {
      alert("Camera broadcasting is restricted to instructor or requires permission.");
      return;
    }

    try {
      if (!isVideoEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { max: 24 } },
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;
        setIsVideoEnabled(true);
      } else {
        localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setIsVideoEnabled(false);
      }
    } catch (err) {
      alert("Unable to access camera. Check device permissions.");
    }
  };

  // 4. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!tokenData?.permissions.canPublishScreen) {
      alert("Screen sharing is restricted for this session.");
      return;
    }

    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current) localVideoRef.current.srcObject = null;
        };
        setIsScreenSharing(true);
      } else {
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsScreenSharing(false);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("Screen share cancelled or not allowed.");
    }
  };

  // 5. Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const newMsg: ClassroomMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isHost: classDetails?.tutorId === currentUser.id,
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  // 6. Send Emoji Reaction
  const sendReaction = (emoji: string) => {
    const id = `react_${Date.now()}_${Math.random()}`;
    setReactionFloat((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactionFloat((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  // 7. Toggle Hand Raise
  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === currentUser?.id ? { ...p, isHandRaised: !isHandRaised } : p
      )
    );
  };

  // 8. Low-Bandwidth Reconnect Simulation / Test
  const handleReconnect = () => {
    setIsReconnecting(true);
    setNetworkQuality("reconnecting");
    setTimeout(() => {
      setIsReconnecting(false);
      setNetworkQuality("good");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <h2 className="mt-5 text-xl font-bold">Connecting to BrainLab Live Classroom…</h2>
        <p className="mt-2 text-sm text-slate-400">Verifying course enrollment and issuing secure credentials.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white">
        <div className="max-w-md rounded-3xl border border-red-500/30 bg-slate-950 p-8 text-center shadow-2xl">
          <span className="text-4xl">⚠️</span>
          <h2 className="mt-4 text-2xl font-black text-rose-400">Admission Denied</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/pricing"
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500"
            >
              Explore Subscriptions & Access
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-slate-200 transition hover:bg-slate-700"
            >
              Return to My Learning
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white" title="Exit Classroom">
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {classDetails?.title || "Live Session"}
              </h1>
              <span className="rounded bg-blue-900/80 px-2 py-0.5 text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                {classDetails?.format || "Interactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Network & Presence Indicators */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
              networkQuality === "excellent"
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : networkQuality === "good"
                ? "border-blue-500/40 bg-blue-950/40 text-blue-300"
                : networkQuality === "poor"
                ? "border-amber-500/40 bg-amber-950/40 text-amber-300"
                : "border-rose-500/40 bg-rose-950/40 text-rose-300 animate-pulse"
            }`}
            title="Optimized for Nigerian 3G/4G bandwidth"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="hidden sm:inline">Network:</span> {networkQuality}
          </div>

          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="hidden sm:inline-flex rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            {isReconnecting ? "Reconnecting…" : "Refresh Stream"}
          </button>

          <Link
            href="/dashboard"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
          >
            Leave
          </Link>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Floating Reactions Animation Canvas */}
        <div className="pointer-events-none absolute bottom-20 left-10 z-30 flex flex-col gap-2">
          {reactionFloat.map((r) => (
            <div
              key={r.id}
              className="text-4xl animate-bounce transition duration-1000 ease-out"
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Video / Stage Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950 relative">
          <div className="w-full h-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {isVideoEnabled || isScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="flex flex-col items-center text-center p-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-900/50 text-blue-200 border-2 border-blue-500/30 text-3xl font-black">
                  BL
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{classDetails?.title}</h3>
                <p className="mt-2 text-sm text-slate-400 max-w-md">
                  Audio-first learning mode active. Bandwidth optimized for smooth low-latency Nigerian networks.
                </p>
                {classDetails?.isRecording && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-xs font-semibold text-rose-300">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    Recording active for student revision
                  </div>
                )}
              </div>
            )}

            {/* Stage Overlays (Participant count & Hand raises) */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="rounded-full bg-slate-900/80 backdrop-blur px-3 py-1 text-xs font-medium text-slate-300 border border-slate-700">
                👥 {participants.length} Active
              </span>
              {isHandRaised && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-3 py-1 text-xs font-bold text-amber-300 flex items-center gap-1">
                  ✋ Hand Raised
                </span>
              )}
            </div>
          </div>
        </main>

        {/* Right Interactive Sidebar (Chat, Participants, Polls, Resources) */}
        <aside className="w-80 sm:w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
          {/* Sidebar Nav Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "chat"
                  ? "border-blue-500 text-white bg-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Chat ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "participants"
                  ? "border-blue-500 text-white bg-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              People ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "resources"
                  ? "border-blue-500 text-white bg-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Resources
            </button>
          </div>

          {/* Tab 1: Live Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`font-bold ${m.isHost ? "text-amber-400" : "text-blue-400"}`}>
                        {m.senderName} {m.isHost && "(Tutor)"}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                    </div>
                    <p className="mt-1 text-slate-300 leading-relaxed bg-slate-800/60 rounded-xl p-2.5">
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or comment…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-blue-500"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Participants Roster */}
          {activeTab === "participants" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Connected Learners ({participants.length})
              </h4>
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 text-xs border border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-blue-200 font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{p.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHandRaised && <span title="Hand raised">✋</span>}
                    <span className="text-[11px] text-slate-400">
                      {p.isMuted ? "🔇" : "🎙️"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Lesson Resources & Quiz Links */}
          {activeTab === "resources" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Study Links</h4>
                <p className="mt-1 text-xs text-slate-300">Access supplementary lesson materials and CBT practice.</p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/learn"
                  target="_blank"
                  className="block rounded-xl border border-slate-800 bg-slate-800/80 p-3 hover:border-blue-500"
                >
                  <p className="text-xs font-bold text-blue-300">📖 Topic Reference Material</p>
                  <p className="text-[11px] text-slate-400 mt-1">Review lesson notes in Learning Hub</p>
                </Link>

                <Link
                  href="/self-practice"
                  target="_blank"
                  className="block rounded-xl border border-slate-800 bg-slate-800/80 p-3 hover:border-blue-500"
                >
                  <p className="text-xs font-bold text-emerald-300">✍️ Self-Practice Assessment</p>
                  <p className="text-[11px] text-slate-400 mt-1">Test your recall of key exam concepts</p>
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Bottom Interactive Control Deck */}
      <footer className="h-18 shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-2 flex items-center justify-between gap-4">
        {/* Media Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              isAudioEnabled ? "bg-slate-700 text-white" : "bg-rose-600/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {isAudioEnabled ? "🎙️ Mute" : "🔇 Unmute"}
          </button>

          <button
            onClick={toggleVideo}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              isVideoEnabled ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isVideoEnabled ? "📹 Stop Cam" : "📷 Start Cam"}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              isScreenSharing ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🖥️ {isScreenSharing ? "Stop Share" : "Share Screen"}
          </button>
        </div>

        {/* Center: Hand Raise & Quick Reactions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleHandRaise}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition ${
              isHandRaised
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ✋ {isHandRaised ? "Lower Hand" : "Raise Hand"}
          </button>

          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700">
            {["👍", "❤️", "👏", "🤔", "✅"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="hover:scale-125 transition px-1.5 py-0.5 text-base"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Exit */}
        <div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
          >
            Exit Class
          </Link>
        </div>
      </footer>
    </div>
  );
}
