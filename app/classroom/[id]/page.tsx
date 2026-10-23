"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLearnerTheme } from "../../components/LearnerThemeProvider";
import { toast } from "../../lib/toast";
import type {
  Participant,
  ClassroomMessage,
  LiveRoomTokenResponse,
} from "../../lib/liveClassroom/types";
import { SmartWhiteboard, SmartWhiteboardHandle } from "./SmartWhiteboard";
import ClassroomSidebar from "./ClassroomSidebar";

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
  const [polls, setPolls] = useState<ClassroomPollItem[]>([]);
  const [activePoll, setActivePoll] = useState<ClassroomPollItem | null>(null);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollCountdown, setPollCountdown] = useState<number | null>(null);
  const { resolvedTheme, setAppearance } = useLearnerTheme();
  const [mentionFilter, setMentionFilter] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);


  // Poll Creator Form State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState([
    { id: "opt_1", text: "" },
    { id: "opt_2", text: "" },
  ]);
  const [pollCorrectId, setPollCorrectId] = useState<string>("");
  const [pollDuration, setPollDuration] = useState<number>(60);
  const [pollExplanation, setPollExplanation] = useState("");
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);

  // Multimedia & Audio Note Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Interactive Live Whiteboard State
  const smartWhiteboardRef = useRef<SmartWhiteboardHandle | null>(null);
  const [stageMode, setStageMode] = useState<"audio" | "whiteboard">("audio");
  const [canStudentsDraw, setCanStudentsDraw] = useState(false);

  // Mobile Adaptability & Responsive Hub Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isQuizCardMinimized, setIsQuizCardMinimized] = useState(false);

  // Big Screen & Pinned Lecture State
  const [pinnedMessage, setPinnedMessage] = useState<ClassroomMessage | null>(null);

  // Roster
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [reactionFloat, setReactionFloat] = useState<{ id: string; emoji: string }[]>([]);

  // Video streams & WebRTC Peer Connection refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [tutorStreaming, setTutorStreaming] = useState(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const attendanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // 1. Authenticate & Obtain Classroom Admission Token & Load Polls
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

        // Load persistent classroom messages & pinned presentation items
        try {
          const msgsRes = await fetch(`/api/classroom/messages?classId=${classId}`);
          const msgsJson = await msgsRes.json();
          if (msgsRes.ok && Array.isArray(msgsJson.messages) && msgsJson.messages.length > 0) {
            setMessages(msgsJson.messages);
            const pinned =
              msgsJson.messages.find((m: any) => m.isPinned) ||
              [...msgsJson.messages].reverse().find((m: any) => m.isHost);
            if (pinned) setPinnedMessage(pinned);
          } else {
            const welcomeMsg = {
              id: "msg_welcome",
              senderId: "system",
              senderName: "BrainLab Classroom",
              text: `Welcome to ${json.data.classDetails.title}. Please keep your microphone muted unless invited to speak.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isHost: true,
            };
            setMessages([welcomeMsg]);
            setPinnedMessage(welcomeMsg);
          }
        } catch {
          // fallback
        }

        // Fetch Classroom Polls
        try {
          const pollsRes = await fetch(`/api/classroom/polls?classId=${classId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const pollsJson = await pollsRes.json();
          if (pollsRes.ok && pollsJson.ok && Array.isArray(pollsJson.polls)) {
            setPolls(pollsJson.polls);
            const live = pollsJson.polls.find((p: ClassroomPollItem) => p.is_open);
            if (live) setActivePoll(live);
          }
        } catch (pollErr) {
          console.warn("Could not preload polls:", pollErr);
        }

        // Setup Supabase Realtime Channel for Live Chat, Presence, Polls & Quizzes
        const channel = supabase.channel(`classroom:${classId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id },
          },
        });
        channelRef.current = channel;

        // A. Listen for incoming live chat messages from all attendees
        channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
          if (payload?.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            // Tutor messages or pinned items automatically show on the Big Screen!
            if (payload.message.isHost || payload.message.isPinned) {
              setPinnedMessage(payload.message);
            }
            // Increment unread count if received from peer
            if (payload.message.senderId !== user.id) {
              setUnreadMessagesCount((prev) => prev + 1);
            }
          }
        });

        // Listen for whiteboard permission changes
        channel.on("broadcast", { event: "whiteboard_toggle_student_draw" }, ({ payload }) => {
          if (typeof payload?.allowed === "boolean") {
            setCanStudentsDraw(payload.allowed);
          }
        });

        // Pin to Big Screen Broadcast
        channel.on("broadcast", { event: "pin_message" }, ({ payload }) => {
          if (payload?.message) {
            setPinnedMessage(payload.message);
          }
        });

        // WebRTC Real-Time Video & Screen Stream Signaling
        channel
          .on("broadcast", { event: "webrtc_check_active_stream" }, ({ payload }) => {
            const activeStream = screenStreamRef.current || localStreamRef.current;
            if (activeStream && (user.id === json.data.classDetails.tutorId || json.data.permissions.canPublishVideo)) {
              channel.send({
                type: "broadcast",
                event: "webrtc_stream_live",
                payload: { hostId: user.id, targetStudentId: payload?.studentId },
              });
            }
          })
          .on("broadcast", { event: "webrtc_stream_live" }, async ({ payload }) => {
            if (payload?.hostId && payload.hostId !== user.id) {
              setTutorStreaming(true);
              channel.send({
                type: "broadcast",
                event: "webrtc_request_offer",
                payload: { studentId: user.id, hostId: payload.hostId },
              });
            }
          })
          .on("broadcast", { event: "webrtc_request_offer" }, async ({ payload }) => {
            const activeStream = screenStreamRef.current || localStreamRef.current;
            if (payload?.studentId && activeStream && (payload.hostId === user.id || json.data.classDetails.tutorId === user.id)) {
              try {
                const pc = new RTCPeerConnection({
                  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                });
                peerConnectionsRef.current.set(payload.studentId, pc);

                activeStream.getTracks().forEach((track) => pc.addTrack(track, activeStream));

                pc.onicecandidate = (event) => {
                  if (event.candidate) {
                    channel.send({
                      type: "broadcast",
                      event: "webrtc_ice",
                      payload: { targetId: payload.studentId, candidate: event.candidate, senderId: user.id },
                    });
                  }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                channel.send({
                  type: "broadcast",
                  event: "webrtc_offer",
                  payload: { targetId: payload.studentId, offer, hostId: user.id },
                });
              } catch (rtcErr) {
                console.warn("WebRTC offer creation error:", rtcErr);
              }
            }
          })
          .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
            if (payload?.targetId === user.id && payload?.offer) {
              try {
                const pc = new RTCPeerConnection({
                  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
                });
                peerConnectionsRef.current.set(payload.hostId, pc);

                pc.ontrack = (event) => {
                  if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                    setHasRemoteVideo(true);
                    setTutorStreaming(true);
                  }
                };

                pc.onicecandidate = (event) => {
                  if (event.candidate) {
                    channel.send({
                      type: "broadcast",
                      event: "webrtc_ice",
                      payload: { targetId: payload.hostId, candidate: event.candidate, senderId: user.id },
                    });
                  }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                channel.send({
                  type: "broadcast",
                  event: "webrtc_answer",
                  payload: { hostId: payload.hostId, answer, studentId: user.id },
                });
              } catch (rtcErr) {
                console.warn("WebRTC answer error:", rtcErr);
              }
            }
          })
          .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
            if (payload?.hostId === user.id && payload?.studentId) {
              const pc = peerConnectionsRef.current.get(payload.studentId);
              if (pc) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                } catch (e) {
                  console.warn("WebRTC answer setting error:", e);
                }
              }
            }
          })
          .on("broadcast", { event: "webrtc_ice" }, async ({ payload }) => {
            if (payload?.targetId === user.id && payload?.candidate) {
              const pc = peerConnectionsRef.current.get(payload.senderId);
              if (pc) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch {
                  // candidate error
                }
              }
            }
          })
          .on("broadcast", { event: "webrtc_stream_stopped" }, () => {
            setHasRemoteVideo(false);
            setTutorStreaming(false);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          });

        // B. Realtime Presence Sync: keep participants list completely live
        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const roster: Participant[] = [];
            for (const [key, presences] of Object.entries(state)) {
              if (Array.isArray(presences)) {
                for (const p of presences as any[]) {
                  if (p?.id && !roster.some((item) => item.id === p.id)) {
                    roster.push({
                      id: p.id,
                      name: p.name || "Learner",
                      role: p.role || (p.id === json.data.classDetails.tutorId ? "host" : "speaker"),
                      isMuted: p.isMuted ?? true,
                      isCameraOn: p.isCameraOn ?? false,
                      isScreenSharing: p.isScreenSharing ?? false,
                      isHandRaised: p.isHandRaised ?? false,
                      joinedAt: p.joinedAt || new Date().toISOString(),
                      networkQuality: p.networkQuality || "good",
                    });
                  }
                }
              }
            }
            if (roster.length > 0) {
              setParticipants(roster);
            }
          })
          .on("presence", { event: "join" }, ({ newPresences }) => {
            if (Array.isArray(newPresences)) {
              setParticipants((prev) => {
                const updated = [...prev];
                for (const p of newPresences as any[]) {
                  if (p?.id && !updated.some((u) => u.id === p.id)) {
                    updated.push({
                      id: p.id,
                      name: p.name || "Learner",
                      role: p.role || "speaker",
                      isMuted: p.isMuted ?? true,
                      isCameraOn: p.isCameraOn ?? false,
                      isScreenSharing: p.isScreenSharing ?? false,
                      isHandRaised: p.isHandRaised ?? false,
                      joinedAt: p.joinedAt || new Date().toISOString(),
                      networkQuality: p.networkQuality || "good",
                    });
                  }
                }
                return updated;
              });
            }
          })
          .on("presence", { event: "leave" }, ({ leftPresences }) => {
            if (Array.isArray(leftPresences)) {
              const leavingIds = new Set((leftPresences as any[]).map((p) => p.id));
              setParticipants((prev) => prev.filter((p) => !leavingIds.has(p.id) || p.id === user.id));
            }
          });

        channel
          .on("broadcast", { event: "poll_started" }, ({ payload }) => {
            if (payload?.poll) {
              setActivePoll(payload.poll);
              setPolls((prev) => [payload.poll, ...prev.filter((p) => p.id !== payload.poll.id)]);
            }
          })
          .on("broadcast", { event: "poll_vote" }, ({ payload }) => {
            if (!payload?.pollId) return;
            setPolls((prev) =>
              prev.map((p) => {
                if (p.id !== payload.pollId) return p;
                const newTotal = p.total_votes + 1;
                const newOptions = p.options.map((opt) => {
                  const newVotes = opt.id === payload.selectedOptionId ? opt.votes + 1 : opt.votes;
                  return {
                    ...opt,
                    votes: newVotes,
                    percentage: newTotal > 0 ? Math.round((newVotes / newTotal) * 100) : 0,
                  };
                });
                return { ...p, total_votes: newTotal, options: newOptions };
              })
            );
            setActivePoll((current) => {
              if (!current || current.id !== payload.pollId) return current;
              const newTotal = current.total_votes + 1;
              const newOptions = current.options.map((opt) => {
                const newVotes = opt.id === payload.selectedOptionId ? opt.votes + 1 : opt.votes;
                return {
                  ...opt,
                  votes: newVotes,
                  percentage: newTotal > 0 ? Math.round((newVotes / newTotal) * 100) : 0,
                };
              });
              return { ...current, total_votes: newTotal, options: newOptions };
            });
          })
          .on("broadcast", { event: "poll_closed" }, ({ payload }) => {
            if (!payload?.pollId) return;
            setPolls((prev) =>
              prev.map((p) =>
                p.id === payload.pollId
                  ? { ...p, is_open: false, options: payload.options || p.options, explanation: payload.explanation }
                  : p
              )
            );
            setActivePoll((current) =>
              current && current.id === payload.pollId
                ? { ...current, is_open: false, options: payload.options || current.options, explanation: payload.explanation }
                : current
            );
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Learner";
              await channel.track({
                id: user.id,
                name: userName,
                role: json.data.classDetails.tutorId === user.id ? "host" : "speaker",
                isMuted: true,
                isCameraOn: false,
                isScreenSharing: false,
                isHandRaised: false,
                joinedAt: new Date().toISOString(),
                networkQuality: "good",
              });
              // Check if tutor is already broadcasting video / screen
              channel.send({
                type: "broadcast",
                event: "webrtc_check_active_stream",
                payload: { studentId: user.id },
              });
            }
          });

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
        setError(err.message || "Failed to initialize classroom");
        setLoading(false);
      }
    }

    void initClassroom();

    return () => {
      active = false;
      if (attendanceTimerRef.current) clearInterval(attendanceTimerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [classId, router]);

  // Active Poll Countdown Timer
  useEffect(() => {
    if (!activePoll || !activePoll.is_open || !activePoll.duration_seconds || activePoll.duration_seconds <= 0) {
      setPollCountdown(null);
      return;
    }

    const createdTime = new Date(activePoll.created_at).getTime();
    const durationMs = activePoll.duration_seconds * 1000;
    const endTime = createdTime + durationMs;

    const interval = setInterval(() => {
      const remainingMs = Math.max(0, endTime - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setPollCountdown(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        // Automatically close poll on tutor client if expired
        if (classDetails?.tutorId === currentUser?.id) {
          void handleClosePoll(activePoll.id);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePoll, classDetails?.tutorId, currentUser?.id]);

  // 2. Toggle Audio / Mic
  const toggleAudio = async () => {
    if (!tokenData?.permissions.canPublishAudio) {
      toast.warning("Audio publishing is restricted for this session or requires host permission.");
      return;
    }

    try {
      if (!isAudioEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsAudioEnabled(true);
      } else {
        localStreamRef.current?.getAudioTracks().forEach((track) => track.stop());
        setIsAudioEnabled(false);
      }
    } catch {
      toast.error("Unable to access microphone. Check browser permissions.");
    }
  };

  // 3. Toggle Video / Camera
  const toggleVideo = async () => {
    if (!tokenData?.permissions.canPublishVideo) {
      toast.warning("Camera broadcasting is restricted to instructor or requires permission.");
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
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_stream_live",
          payload: { hostId: currentUser?.id },
        });
      } else {
        localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setIsVideoEnabled(false);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_stream_stopped",
          payload: { hostId: currentUser?.id },
        });
      }
    } catch {
      toast.error("Unable to access camera. Check device permissions.");
    }
  };

  // 4. Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!tokenData?.permissions.canPublishScreen) {
      toast.warning("Screen sharing is restricted for this session.");
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
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc_stream_stopped",
            payload: { hostId: currentUser?.id },
          });
        };
        setIsScreenSharing(true);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_stream_live",
          payload: { hostId: currentUser?.id },
        });
      } else {
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsScreenSharing(false);
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_stream_stopped",
          payload: { hostId: currentUser?.id },
        });
      }
    } catch {
      console.warn("Screen share cancelled or not allowed.");
    }
  };

  // 5. Send Chat Message (Persisted & Broadcast)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const textToSend = chatInput.trim();
    const isHostUser = classDetails?.tutorId === currentUser.id;

    setChatInput("");
    setShowMentions(false);

    const payloadMsg = {
      classId,
      senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
      text: textToSend,
      type: "text" as const,
      isHost: isHostUser,
    };

    try {
      const res = await fetch("/api/classroom/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadMsg),
      });
      const data = await res.json();
      const savedMsg: ClassroomMessage = data.message || {
        ...payloadMsg,
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, savedMsg]);
      if (savedMsg.isHost) setPinnedMessage(savedMsg);

      channelRef.current?.send({
        type: "broadcast",
        event: "chat_message",
        payload: { message: savedMsg },
      });
    } catch (err) {
      console.warn("Error sending message:", err);
    }
  };

  // Helper: Pin Any Message to the Big Screen Presentation
  const handlePinToBigScreen = (msg: ClassroomMessage) => {
    const pinned = { ...msg, isPinned: true };
    setPinnedMessage(pinned);
    channelRef.current?.send({
      type: "broadcast",
      event: "pin_message",
      payload: { message: pinned },
    });
  };

  // 5b. Voice Note Recording & Media Handlers (Real Server Upload)
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 120) {
            stopVoiceRecording(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone permission was denied or not available on this device.");
    }
  };

  const stopVoiceRecording = (send: boolean = true) => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    const duration = recordingDuration;
    setIsRecordingAudio(false);
    setRecordingDuration(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = async () => {
        if (send && audioChunksRef.current.length > 0 && currentUser) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

          // 1. Upload audio to real endpoint
          const formData = new FormData();
          formData.append("file", audioBlob, `voice_${Date.now()}.webm`);
          formData.append("classId", classId);
          formData.append("mediaType", "audio");
          formData.append("duration", String(Math.max(1, duration)));

          let uploadedUrl = URL.createObjectURL(audioBlob);
          try {
            const uploadRes = await fetch("/api/classroom/upload", {
              method: "POST",
              body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (uploadRes.ok && uploadJson.url) {
              uploadedUrl = uploadJson.url;
            }
          } catch (e) {
            console.warn("Audio upload fallback:", e);
          }

          // 2. Persist message
          const payloadMsg = {
            classId,
            senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
            text: "🎙️ Voice Note",
            type: "audio" as const,
            mediaUrl: uploadedUrl,
            duration: Math.max(1, duration),
            isHost: classDetails?.tutorId === currentUser.id,
          };

          try {
            const postRes = await fetch("/api/classroom/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payloadMsg),
            });
            const postJson = await postRes.json();
            const savedMsg: ClassroomMessage = postJson.message || {
              ...payloadMsg,
              id: `msg_audio_${Date.now()}`,
              senderId: currentUser.id,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            setMessages((prev) => [...prev, savedMsg]);
            if (savedMsg.isHost) setPinnedMessage(savedMsg);

            channelRef.current?.send({
              type: "broadcast",
              event: "chat_message",
              payload: { message: savedMsg },
            });
          } catch (err) {
            console.warn("Error saving audio message:", err);
          }
        }
      };
      recorder.stop();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.warning("Image must be smaller than 8MB.");
      return;
    }

    const isHostUser = classDetails?.tutorId === currentUser.id;

    // 1. Upload file to server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("classId", classId);
    formData.append("mediaType", "image");

    let uploadedUrl = "";
    try {
      const uploadRes = await fetch("/api/classroom/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (uploadRes.ok && uploadJson.url) {
        uploadedUrl = uploadJson.url;
      }
    } catch {
      // fallback
    }

    const dispatchImgMsg = async (url: string) => {
      const payloadMsg = {
        classId,
        senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
        text: file.name || "Academic diagram / problem snapshot",
        type: "image" as const,
        mediaUrl: url,
        isHost: isHostUser,
      };

      try {
        const postRes = await fetch("/api/classroom/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadMsg),
        });
        const postJson = await postRes.json();
        const savedMsg: ClassroomMessage = postJson.message || {
          ...payloadMsg,
          id: `msg_img_${Date.now()}`,
          senderId: currentUser.id,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, savedMsg]);
        if (savedMsg.isHost) setPinnedMessage(savedMsg);

        channelRef.current?.send({
          type: "broadcast",
          event: "chat_message",
          payload: { message: savedMsg },
        });
      } catch (err) {
        console.warn("Error saving image message:", err);
      }
    };

    if (uploadedUrl) {
      await dispatchImgMsg(uploadedUrl);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) await dispatchImgMsg(dataUrl);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  };

  const togglePlayAudio = (msgId: string, url: string) => {
    if (currentlyPlayingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setCurrentlyPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => setCurrentlyPlayingAudioId(null);
      audio.onerror = () => setCurrentlyPlayingAudioId(null);
      audio.play().catch(() => setCurrentlyPlayingAudioId(null));
      setCurrentlyPlayingAudioId(msgId);
    }
  };

  // 5c. Whiteboard Snapshot Sharing
  const shareWhiteboardToChat = (customDataUrl?: string) => {
    const dataUrl = customDataUrl || smartWhiteboardRef.current?.getCanvasDataUrl();
    if (!dataUrl || !currentUser) return;
    const newMsg: ClassroomMessage = {
      id: `msg_wb_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
      text: "🎨 Shared live whiteboard sketch/diagram",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isHost: classDetails?.tutorId === currentUser.id,
      type: "image",
      mediaUrl: dataUrl,
    };
    setMessages((prev) => [...prev, newMsg]);
    setPinnedMessage(newMsg);
    setActiveTab("chat");
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "chat_message",
        payload: { message: newMsg },
      });
    } catch {
      // ignore
    }
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
      prev.map((p) => (p.id === currentUser?.id ? { ...p, isHandRaised: !isHandRaised } : p))
    );
  };

  // 8. Reconnect Stream
  const handleReconnect = () => {
    setIsReconnecting(true);
    setNetworkQuality("reconnecting");
    setTimeout(() => {
      setIsReconnecting(false);
      setNetworkQuality("good");
    }, 1500);
  };

  // 9. Student Votes on Poll
  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      // Optimistic update
      setActivePoll((current) => {
        if (!current || current.id !== pollId) return current;
        const newTotal = current.total_votes + 1;
        const newOptions = current.options.map((opt) => {
          const newVotes = opt.id === optionId ? opt.votes + 1 : opt.votes;
          return {
            ...opt,
            votes: newVotes,
            percentage: newTotal > 0 ? Math.round((newVotes / newTotal) * 100) : 0,
          };
        });
        return {
          ...current,
          user_voted_option_id: optionId,
          total_votes: newTotal,
          options: newOptions,
        };
      });

      const res = await fetch("/api/classroom/polls/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pollId, selectedOptionId: optionId }),
      });

      if (res.ok && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "poll_vote",
          payload: { pollId, selectedOptionId: optionId },
        });
      }
    } catch (err) {
      console.error("Failed to submit poll vote:", err);
    }
  };

  // 10. Tutor Launches New Poll
  const handleLaunchPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.text.trim()).length < 2) {
      toast.error("Provide a question and at least 2 answer choices.");
      return;
    }

    setIsSubmittingPoll(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Unauthorized.");

      const validOptions = pollOptions
        .filter((o) => o.text.trim())
        .map((o) => ({
          id: o.id,
          text: o.text.trim(),
          is_correct: pollCorrectId ? o.id === pollCorrectId : undefined,
        }));

      const res = await fetch("/api/classroom/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId,
          question: pollQuestion.trim(),
          options: validOptions,
          explanation: pollExplanation.trim() || undefined,
          durationSeconds: pollDuration,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to launch poll.");

      const newPoll: ClassroomPollItem = {
        id: json.poll.id,
        class_id: json.poll.class_id,
        created_by: json.poll.created_by,
        question: json.poll.question,
        options: json.poll.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          votes: 0,
          percentage: 0,
          is_correct: o.is_correct,
        })),
        explanation: json.poll.explanation,
        is_open: true,
        duration_seconds: json.poll.duration_seconds,
        total_votes: 0,
        user_voted_option_id: null,
        created_at: json.poll.created_at,
      };

      setActivePoll(newPoll);
      setPolls((prev) => [newPoll, ...prev]);
      setIsCreatingPoll(false);
      setPollQuestion("");
      setPollExplanation("");

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "poll_started",
          payload: { poll: newPoll },
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to launch poll.");
    } finally {
      setIsSubmittingPoll(false);
    }
  };

  // 11. Tutor Closes Poll & Reveals Answers
  const handleClosePoll = async (pollId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/classroom/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pollId, isOpen: false }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        const updatedOptions = json.poll.options;
        const explanation = json.poll.explanation;

        setActivePoll((current) =>
          current && current.id === pollId
            ? { ...current, is_open: false, options: updatedOptions, explanation }
            : current
        );
        setPolls((prev) =>
          prev.map((p) =>
            p.id === pollId ? { ...p, is_open: false, options: updatedOptions, explanation } : p
          )
        );

        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "poll_closed",
            payload: { pollId, options: updatedOptions, explanation },
          });
        }
      }
    } catch (err) {
      console.error("Failed to close poll:", err);
    }
  };

  const isTutorOrModerator =
    Boolean(tokenData?.permissions.isModerator) || classDetails?.tutorId === currentUser?.id;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white animate-fade-in-up">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute h-8 w-8 rounded-full bg-blue-600/30 animate-ping" />
          <span className="absolute text-lg">🎓</span>
        </div>
        <h2 className="mt-6 text-xl font-black text-white">Connecting to Live Classroom…</h2>
        <p className="mt-2 text-xs text-slate-400 max-w-sm text-center leading-relaxed">
          Verifying course enrollment, testing network latency, and issuing room security tokens.
        </p>
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
    <div className="flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors duration-150">
      {/* Top Header Bar */}
      <header className="h-13 sm:h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link href="/dashboard" className="text-xs sm:text-sm font-black text-blue-500 hover:text-blue-400 shrink-0">
            BrainLab
          </Link>
          <span className="text-slate-600 hidden xs:inline">/</span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px] xs:max-w-[200px] sm:max-w-md">
            {classDetails?.title || "Live Class"}
          </h1>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase text-emerald-400 border border-emerald-500/20 shrink-0">
            Live
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div
            className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold ${
              networkQuality === "excellent"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : networkQuality === "good"
                ? "bg-blue-950 text-blue-400 border border-blue-800"
                : "bg-amber-950 text-amber-400 border border-amber-800"
            }`}
            title="Optimized for Nigerian 3G/4G bandwidth"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <span className="hidden sm:inline">Network:</span> <span className="capitalize">{networkQuality}</span>
          </div>

          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="hidden md:inline-flex rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            {isReconnecting ? "Reconnecting…" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => setAppearance(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 shadow-2xs"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          >
            <span>{resolvedTheme === "dark" ? "☀️" : "🌙"}</span>
            <span className="hidden md:inline">{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {/* Mobile Hub Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setMobileDrawerOpen(true);
              setUnreadMessagesCount(0);
            }}
            className="lg:hidden relative flex items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-600/20 px-2 sm:px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition active-press"
            title="Open Chat & Tabs"
          >
            <span>💬</span>
            <span className="hidden xs:inline">Hub</span>
            {unreadMessagesCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {unreadMessagesCount}
              </span>
            )}
            {activePoll?.is_open && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <Link
            href="/dashboard"
            className="rounded-lg bg-rose-600 px-2.5 sm:px-3 py-1 text-xs font-bold text-white hover:bg-rose-500 active-press"
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
            <div key={r.id} className="text-4xl animate-bounce transition duration-1000 ease-out">
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Video / Stage Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-200/70 dark:bg-slate-950 relative transition-colors overflow-hidden">
          <div className="w-full h-full max-w-5xl rounded-2xl border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Top Right Stage Mode Switcher */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-700/80 backdrop-blur shadow-md">
              <button
                type="button"
                onClick={() => setStageMode("audio")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  stageMode === "audio"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎙️ Stage
              </button>
              <button
                type="button"
                onClick={() => setStageMode("whiteboard")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                  stageMode === "whiteboard"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🎨 Whiteboard</span>
                <span className="rounded-full bg-cyan-400/30 px-1 py-0.2 text-[9px] font-black uppercase">Live</span>
              </button>
            </div>

            {stageMode === "whiteboard" ? (
              <div className="w-full h-full flex flex-col bg-slate-950 relative select-none">
                <SmartWhiteboard
                  ref={smartWhiteboardRef}
                  classId={classId}
                  isHost={isTutorOrModerator}
                  canDraw={isTutorOrModerator || canStudentsDraw}
                  channel={channelRef.current}
                  currentUserName={
                    currentUser?.user_metadata?.full_name ||
                    currentUser?.email?.split("@")[0] ||
                    "Learner"
                  }
                  currentUserId={currentUser?.id}
                  onShareToChat={(dataUrl) => {
                    shareWhiteboardToChat(dataUrl);
                  }}
                />
              </div>
            ) : isVideoEnabled || isScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                {/* Remote Video element: Always bound in DOM for WebRTC streaming */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={hasRemoteVideo ? "w-full h-full object-contain bg-black rounded-2xl shadow-2xl" : "hidden"}
                />

                {!hasRemoteVideo && (() => {
                  const featuredMessage = pinnedMessage || messages.filter((m) => m.isHost).slice(-1)[0];
                  const showQuizArena = Boolean(activePoll);

                  return (
                    <div className="w-full max-w-4xl flex flex-col items-center my-auto animate-fade-in-up">
                      {/* Big Screen Header Bar */}
                      <div className="w-full mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg backdrop-blur">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                          <span className="text-xs font-black tracking-wider uppercase text-cyan-300">
                            📡 Big Screen Lecture Board
                          </span>
                          <span className="hidden sm:inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            Low-data Audio Mode
                          </span>
                        </div>

                        {/* Audio Wave Visualizer */}
                        <div className="flex items-center gap-1 h-5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] font-bold text-cyan-400 mr-1">🎙️ LIVE</span>
                          {[14, 20, 10, 24, 18, 12, 22, 16].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-full animate-pulse"
                              style={{
                                height: `${h}px`,
                                animationDelay: `${(i % 4) * 150}ms`,
                                animationDuration: "0.9s",
                              }}
                            />
                          ))}
                        </div>

                        {/* Pin status badge or unpin action */}
                        {pinnedMessage && (
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-black text-amber-300">
                              📌 Pinned: {pinnedMessage.senderName}
                            </span>
                            {isTutorOrModerator && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPinnedMessage(null);
                                  channelRef.current?.send({
                                    type: "broadcast",
                                    event: "pin_message",
                                    payload: { message: null },
                                  });
                                }}
                                className="text-[10px] text-slate-400 hover:text-rose-400 transition underline"
                              >
                                Clear Pin
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* STAGE ARENA: 1. Live Quiz Arena */}
                      {showQuizArena && activePoll ? (
                        <div className="w-full rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-slate-900/95 to-slate-950 p-6 md:p-8 shadow-2xl backdrop-blur">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🎯</span>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-cyan-300">
                                  {activePoll.is_open ? "Interactive Checkpoint Quiz" : "Quiz Checkpoint Results"}
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  Answer below to test your understanding before the tutor proceeds
                                </p>
                              </div>
                            </div>
                            {activePoll.is_open && pollCountdown !== null && (
                              <span className="rounded-2xl bg-cyan-950 px-3 py-1.5 text-xs font-mono font-black text-cyan-300 border border-cyan-800 shadow-inner">
                                ⏱️ {pollCountdown}s remaining
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg md:text-2xl font-black text-white text-center leading-snug my-4 px-2">
                            {activePoll.question}
                          </h3>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                            {activePoll.options.map((opt, idx) => {
                              const isVoted = activePoll.user_voted_option_id === opt.id;
                              const canVote = activePoll.is_open && !activePoll.user_voted_option_id;

                              return (
                                <div key={opt.id} className="relative">
                                  {canVote ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleVote(activePoll.id, opt.id)}
                                      className="w-full text-left rounded-2xl border-2 border-slate-700 bg-slate-900/90 hover:border-cyan-400 hover:bg-slate-800/90 p-4 transition-all duration-200 active-press group flex items-start gap-3"
                                    >
                                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-black text-sm border border-cyan-500/40 group-hover:bg-cyan-400 group-hover:text-slate-950 transition">
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-100 group-hover:text-white leading-snug">
                                          {opt.text}
                                        </p>
                                        <span className="text-[11px] text-slate-500 group-hover:text-cyan-300 transition">
                                          Tap to select this option
                                        </span>
                                      </div>
                                    </button>
                                  ) : (
                                    <div
                                      className={`rounded-2xl border-2 p-4 transition-all ${
                                        isVoted
                                          ? "border-cyan-500 bg-cyan-950/40 text-cyan-100 shadow-lg shadow-cyan-500/10"
                                          : !activePoll.is_open && opt.is_correct
                                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-lg shadow-emerald-500/10"
                                          : "border-slate-800 bg-slate-900/60 text-slate-300"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                          <span className="font-mono font-black text-xs text-slate-400">
                                            {String.fromCharCode(65 + idx)}:
                                          </span>
                                          <span className="text-sm font-bold">{opt.text}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isVoted && (
                                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-black text-cyan-300">
                                              Your Vote
                                            </span>
                                          )}
                                          {!activePoll.is_open && opt.is_correct && (
                                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                                              ✓ Correct
                                            </span>
                                          )}
                                          <span className="font-mono text-xs font-black text-slate-300">
                                            {opt.percentage}%
                                          </span>
                                        </div>
                                      </div>
                                      {/* Bar */}
                                      <div className="mt-2.5 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-700 rounded-full ${
                                            !activePoll.is_open && opt.is_correct
                                              ? "bg-emerald-400"
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

                          {/* Explanation on Reveal */}
                          {!activePoll.is_open && activePoll.explanation && (
                            <div className="mt-5 rounded-2xl bg-blue-950/60 border border-blue-800/60 p-4 text-xs text-blue-200">
                              💡 <strong className="text-white">Instructor's Explanation:</strong> {activePoll.explanation}
                            </div>
                          )}

                          {/* Tutor Control to Close Poll */}
                          {isTutorOrModerator && activePoll.is_open && (
                            <div className="mt-5 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void handleClosePoll(activePoll.id)}
                                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-black text-white shadow transition"
                              >
                                End Quiz & Reveal Answers
                              </button>
                            </div>
                          )}
                        </div>
                      ) : featuredMessage?.type === "image" && featuredMessage.mediaUrl ? (
                        /* STAGE ARENA: 2. High-Res Diagram Projection */
                        <div className="w-full flex flex-col items-center rounded-3xl border-2 border-cyan-500/30 bg-slate-900/90 p-5 shadow-2xl backdrop-blur">
                          <div className="relative group max-h-[420px] overflow-hidden rounded-2xl border border-slate-700 bg-black flex items-center justify-center">
                            <img
                              src={featuredMessage.mediaUrl}
                              alt={featuredMessage.text || "Classroom lecture diagram"}
                              className="max-h-[400px] w-auto max-w-full object-contain cursor-pointer transition hover:scale-[1.01]"
                              onClick={() => setPreviewImage(featuredMessage.mediaUrl || null)}
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewImage(featuredMessage.mediaUrl || null)}
                              className="absolute bottom-3 right-3 rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-1.5 text-xs font-bold text-cyan-300 shadow backdrop-blur hover:bg-slate-800"
                            >
                              🔍 Expand High-Res
                            </button>
                          </div>
                          {featuredMessage.text && (
                            <div className="mt-3.5 max-w-2xl text-center px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs md:text-sm font-semibold text-cyan-100">
                              {featuredMessage.text}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-slate-400">
                            Shared by {featuredMessage.senderName} ({featuredMessage.timestamp})
                          </div>
                        </div>
                      ) : featuredMessage?.type === "audio" && featuredMessage.mediaUrl ? (
                        /* STAGE ARENA: 3. Masterclass Audio Lecture Spotlight */
                        <div className="w-full flex flex-col items-center rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-8 shadow-2xl backdrop-blur text-center max-w-2xl">
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 shadow-2xl shadow-cyan-500/20 mb-4 animate-pulse">
                            <button
                              type="button"
                              onClick={() => togglePlayAudio(featuredMessage.id, featuredMessage.mediaUrl || "")}
                              className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-cyan-300 font-black text-2xl hover:scale-105 transition"
                              title="Play/Pause Voice Lecture"
                            >
                              {currentlyPlayingAudioId === featuredMessage.id ? "⏸" : "▶"}
                            </button>
                          </div>
                          <h4 className="text-lg font-black text-white">🎙️ Masterclass Audio Explanation</h4>
                          <p className="mt-1 text-xs text-slate-400">
                            Shared by {featuredMessage.senderName} • {featuredMessage.duration ? `${featuredMessage.duration}s duration` : "Voice Note"}
                          </p>
                          <div className="mt-4 flex items-center justify-center gap-1 h-8">
                            {[16, 28, 12, 34, 22, 14, 30, 24, 18, 32, 10, 26, 20, 36, 14, 28, 12, 22].map((bar, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 rounded-full transition-all duration-300 ${
                                  currentlyPlayingAudioId === featuredMessage.id
                                    ? "bg-cyan-400 animate-pulse"
                                    : "bg-slate-700"
                                }`}
                                style={{
                                  height: currentlyPlayingAudioId === featuredMessage.id ? `${bar}px` : "10px",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : featuredMessage ? (
                        /* STAGE ARENA: 4. Tutor Spotlight & Smartboard Card */
                        <div className="w-full max-w-3xl flex flex-col items-center rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950 p-8 md:p-10 shadow-2xl backdrop-blur text-center">
                          <span className="rounded-full bg-cyan-950 border border-cyan-800/80 px-3 py-1 text-xs font-bold text-cyan-300 mb-4">
                            📝 Tutor's Note on Big Screen
                          </span>
                          <p className="text-lg md:text-2xl font-extrabold text-cyan-50 leading-relaxed font-sans max-w-2xl">
                            {featuredMessage.text}
                          </p>
                          <p className="mt-6 text-xs text-slate-400 font-mono">
                            — {featuredMessage.senderName} ({featuredMessage.timestamp})
                          </p>
                        </div>
                      ) : (
                        /* STAGE ARENA: 5. Default Masterclass Welcome Arena */
                        <div className="flex flex-col items-center text-center p-6 max-w-xl">
                          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/20 text-cyan-300 border-2 border-cyan-500/40 text-2xl font-black shadow-lg shadow-blue-500/10">
                            BL
                          </div>
                          <h3 className="mt-4 text-xl font-black text-white">{classDetails?.title || "Live Masterclass"}</h3>
                          <p className="mt-2 text-xs text-slate-400 max-w-md leading-relaxed">
                            Interactive Audio & Multimedia Discussion Stage. Low data consumption mode enabled for seamless participation across Nigeria.
                          </p>

                          {/* Feature Tags */}
                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                            <span className="rounded-full bg-blue-950/80 border border-blue-800/80 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                              🎙️ Voice Notes & Chat
                            </span>
                            <span className="rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                              📷 Diagram Sharing
                            </span>
                            <span className="rounded-full bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                              🎯 In-Class Live Quizzes
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Quick Stage Actions for Tutor & Students */}
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          disabled={isRecordingAudio}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>🎙️ Record Voice Note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>📷 Share Diagram</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("polls");
                            if (isTutorOrModerator) setIsCreatingPoll(true);
                          }}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-amber-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>🎯 Launch / View Quizzes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageMode("whiteboard")}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-purple-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>✏️ Open Smart Whiteboard</span>
                        </button>
                      </div>

                      {classDetails?.isRecording && (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-xs font-semibold text-rose-300">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          Recording active for student revision
                        </div>
                      )}
                    </div>
                  );
                })()}
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

            {/* IN-STAGE FLOATING LIVE QUIZ / POLL HUD */}
            {activePoll && (
              <div
                className={`absolute z-20 transition-all duration-200 ${
                  isQuizCardMinimized
                    ? "bottom-16 sm:bottom-4 right-2 sm:right-4"
                    : "bottom-16 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 sm:w-96 max-h-[70vh] overflow-y-auto"
                } rounded-2xl border border-cyan-500/50 bg-slate-950/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md animate-fade-in-up`}
              >
                {isQuizCardMinimized ? (
                  <button
                    type="button"
                    onClick={() => setIsQuizCardMinimized(false)}
                    className="flex items-center gap-2 text-xs font-black text-cyan-300 hover:text-cyan-200 active-press"
                  >
                    <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>🎯 Checkpoint Quiz Active {pollCountdown !== null && `(${pollCountdown}s)`}</span>
                    <span className="text-[10px] rounded-md bg-cyan-950 border border-cyan-800 px-1.5 py-0.5">
                      Expand ↗
                    </span>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                          {activePoll.is_open ? "Live Quiz Checkpoint" : "Quiz Checkpoint Result"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activePoll.is_open && pollCountdown !== null && (
                          <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-800">
                            ⏱️ {pollCountdown}s
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsQuizCardMinimized(true)}
                          className="rounded-lg text-slate-400 hover:text-white p-1 text-xs"
                          title="Minimize Quiz"
                        >
                          —
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-bold text-white leading-snug">{activePoll.question}</p>

                    {/* Voting options / Results preview */}
                    <div className="mt-3 space-y-2">
                      {activePoll.options.map((opt, idx) => {
                        const isVoted = activePoll.user_voted_option_id === opt.id;
                        const canVote = activePoll.is_open && !activePoll.user_voted_option_id;

                        return (
                          <div key={opt.id} className="text-xs">
                            {canVote ? (
                              <button
                                type="button"
                                onClick={() => void handleVote(activePoll.id, opt.id)}
                                className="w-full text-left rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-200 hover:border-cyan-400 hover:bg-slate-800 transition active-press flex items-center justify-between"
                              >
                                <span>
                                  <strong className="text-cyan-400 font-mono mr-2">
                                    {String.fromCharCode(65 + idx)}:
                                  </strong>
                                  {opt.text}
                                </span>
                                <span className="text-[10px] text-slate-500">Tap to vote</span>
                              </button>
                            ) : (
                              <div
                                className={`rounded-xl border p-2.5 ${
                                  isVoted
                                    ? "border-cyan-500 bg-cyan-950/40 text-cyan-100"
                                    : "border-slate-800 bg-slate-900/60 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    <strong className="font-mono mr-1.5 text-slate-400">
                                      {String.fromCharCode(65 + idx)}:
                                    </strong>
                                    {opt.text}
                                    {isVoted && (
                                      <span className="ml-2 text-[10px] font-bold text-cyan-400">
                                        (Your Vote)
                                      </span>
                                    )}
                                    {!activePoll.is_open && opt.is_correct && (
                                      <span className="ml-2 text-[10px] font-bold text-emerald-400">
                                        ✓ Correct
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono font-bold text-slate-400">
                                    {opt.percentage}% ({opt.votes})
                                  </span>
                                </div>
                                {/* Live Bar */}
                                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 rounded-full ${
                                      !activePoll.is_open && opt.is_correct
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

                    {/* Explanation on Reveal */}
                    {!activePoll.is_open && activePoll.explanation && (
                      <div className="mt-3 rounded-xl bg-blue-950/60 border border-blue-800/60 p-2.5 text-[11px] text-blue-200">
                        💡 <strong className="text-white">Explanation:</strong> {activePoll.explanation}
                      </div>
                    )}

                    {/* Tutor Controls */}
                    {isTutorOrModerator && activePoll.is_open && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleClosePoll(activePoll.id)}
                          className="rounded-lg bg-rose-600/30 border border-rose-500/50 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-600 hover:text-white"
                        >
                          End Poll & Reveal Answer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
              onClick={() => setActiveTab("polls")}
              className={`flex-1 py-3 text-center border-b-2 transition relative ${
                activeTab === "polls"
                  ? "border-blue-500 text-white bg-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Polls {polls.length > 0 && `(${polls.length})`}
              {activePoll?.is_open && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              )}
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
              Links
            </button>
          </div>

          {/* Tab 1: Live Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold ${m.isHost ? "text-amber-400" : "text-blue-400"}`}>
                          {m.senderName} {m.isHost && "(Tutor)"}
                        </span>
                        {(m.isPinned || pinnedMessage?.id === m.id) && (
                          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/40">
                            📌 ON BIG SCREEN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                        {isTutorOrModerator && (
                          <button
                            type="button"
                            onClick={() => handlePinToBigScreen(m)}
                            className="text-[10px] text-slate-400 hover:text-amber-300 transition flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60"
                            title="Pin this message to the Big Screen lecture board"
                          >
                            📌 Pin
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Image Message */}
                    {m.type === "image" && m.mediaUrl && (
                      <div className="mt-1.5 space-y-1 bg-slate-800/60 rounded-xl p-2 border border-slate-700/60">
                        <img
                          src={m.mediaUrl}
                          alt={m.text || "Classroom diagram"}
                          onClick={() => setPreviewImage(m.mediaUrl || null)}
                          className="max-h-48 w-auto rounded-lg object-contain cursor-pointer hover:opacity-90 transition border border-slate-700"
                        />
                        {m.text && <p className="text-[11px] text-slate-300 font-medium">{renderTextWithMentions(m.text, currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0])}</p>}
                      </div>
                    )}

                    {/* Audio Voice Note Message */}
                    {m.type === "audio" && m.mediaUrl && (
                      <div className="mt-1.5 flex items-center gap-2.5 bg-slate-800/80 rounded-xl p-2.5 border border-cyan-500/30">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(m.id, m.mediaUrl || "")}
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
                      <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-100 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/60">
                        {m.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input & Media Actions */}
              {isRecordingAudio ? (
                <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-rose-300">
                      Recording Voice Note ({recordingDuration}s / 120s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(false)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => stopVoiceRecording(true)}
                      className="rounded-xl bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950 shadow"
                    >
                      Send Note
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col gap-2 relative">
                  {showMentions && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-2 z-40">
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
                            className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          >
                            <span className="font-semibold text-slate-900 dark:text-white">@{p.name}</span>
                            <span className="text-[10px] text-slate-500 capitalize">{p.role}</span>
                          </button>
                        ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      title="Record Voice Note (Audio message)"
                      className="flex h-8 px-2 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-cyan-300 hover:bg-slate-700"
                    >
                      <span>🎙️</span>
                      <span className="hidden sm:inline">Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      title="Share Diagram or Picture"
                      className="flex h-8 px-2 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-emerald-300 hover:bg-slate-700"
                    >
                      <span>📷</span>
                      <span className="hidden sm:inline">Diagram</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("polls");
                        if (isTutorOrModerator) setIsCreatingPoll(true);
                      }}
                      title="Launch or participate in live checkpoint quiz"
                      className="flex h-8 px-2 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 text-[11px] font-bold text-amber-300 hover:bg-slate-700"
                    >
                      <span>🎯</span>
                      <span className="hidden sm:inline">Quiz</span>
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
                      className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-blue-500"
                    >
                      Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Polls & Live Quizzes */}
          {activeTab === "polls" && (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              {/* Tutor Launch Action */}
              {isTutorOrModerator && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPoll(true)}
                    className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-extrabold text-white hover:bg-blue-500 shadow transition flex items-center justify-center gap-2"
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

                {polls.map((poll) => {
                  return (
                    <div
                      key={poll.id}
                      className={`rounded-2xl border p-4 space-y-3 ${
                        poll.is_open
                          ? "border-cyan-500/50 bg-slate-950"
                          : "border-slate-800 bg-slate-900/60"
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
                                  onClick={() => void handleVote(poll.id, opt.id)}
                                  className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-200 hover:border-cyan-400 hover:bg-slate-800 transition"
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
                                    <span className="font-mono text-slate-400">
                                      {opt.percentage}%
                                    </span>
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
                          onClick={() => void handleClosePoll(poll.id)}
                          className="w-full rounded-xl border border-rose-500/40 bg-rose-950/30 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                        >
                          End Poll & Reveal Answer
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Participants Roster */}
          {activeTab === "participants" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Connected Learners ({participants.length})
              </h4>
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-xs border border-slate-200 dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-blue-200 font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{p.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("chat");
                        setChatInput((prev) => `@${p.name} ` + prev);
                      }}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-cyan-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      title={`Tag ${p.name} in chat`}
                    >
                      @ Tag
                    </button>
                    {p.isHandRaised && <span title="Hand raised">✋</span>}
                    <span className="text-[11px] text-slate-400">
                      {p.isMuted ? "🔇" : "🎙️"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Lesson Resources & Quiz Links */}
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

      {/* Expanded Diagram / Picture Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Enlarged diagram"
              className="max-h-[85vh] w-auto rounded-2xl object-contain border border-slate-700 shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white border border-slate-600 hover:bg-slate-700 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tutor Poll Creator Modal */}
      {isCreatingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleLaunchPoll}
            className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Create Checkpoint Poll / Quiz</h3>
              <button
                type="button"
                onClick={() => setIsCreatingPoll(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                ⚡ Quick Templates (1-Click Fill)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPollQuestion("Is the following statement True or False?");
                    setPollOptions([
                      { id: "opt_1", text: "True" },
                      { id: "opt_2", text: "False" },
                    ]);
                    setPollDuration(30);
                    setPollCorrectId("");
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active-press"
                >
                  ✓ True / False
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPollQuestion("Do you agree with this approach?");
                    setPollOptions([
                      { id: "opt_1", text: "Yes" },
                      { id: "opt_2", text: "No" },
                    ]);
                    setPollDuration(30);
                    setPollCorrectId("");
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active-press"
                >
                  👍 Yes / No
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPollQuestion("");
                    setPollOptions([
                      { id: "opt_1", text: "Option A" },
                      { id: "opt_2", text: "Option B" },
                      { id: "opt_3", text: "Option C" },
                      { id: "opt_4", text: "Option D" },
                    ]);
                    setPollDuration(60);
                    setPollCorrectId("");
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active-press"
                >
                  🔤 4-Option MCQ (A-D)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPollQuestion("Understanding Check: How well do you grasp this concept?");
                    setPollOptions([
                      { id: "opt_1", text: "💯 100% Clear & Understood" },
                      { id: "opt_2", text: "🤔 Mostly, Need Another Example" },
                      { id: "opt_3", text: "❓ Confused, Please Re-explain" },
                    ]);
                    setPollDuration(45);
                    setPollCorrectId("");
                  }}
                  className="rounded-lg border border-cyan-800/60 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition active-press"
                >
                  📊 Pulse Check
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Question Prompt
              </label>
              <textarea
                required
                rows={2}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="E.g., What is the primary SI unit of electrical resistance?"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Answer Options (Select the correct option if grading)
              </label>
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={pollCorrectId === opt.id}
                      onChange={() => setPollCorrectId(opt.id)}
                      title="Mark as correct answer"
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span className="font-mono font-bold text-xs text-slate-400 w-4">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <input
                      required
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx].text = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                ))}
              </div>

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setPollOptions((prev) => [
                      ...prev,
                      { id: `opt_${prev.length + 1}`, text: "" },
                    ])
                  }
                  className="mt-2 text-xs font-bold text-cyan-400 hover:underline"
                >
                  + Add Option Choice
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Timer Limit
                </label>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-cyan-400"
                >
                  <option value={30}>30 Seconds</option>
                  <option value={60}>60 Seconds (1 min)</option>
                  <option value={90}>90 Seconds</option>
                  <option value={120}>2 Minutes</option>
                  <option value={0}>Unlimited (Manual End)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Assessment Type
                </label>
                <div className="mt-2 text-xs text-slate-400 font-medium">
                  {pollCorrectId ? "Checkpoint Quiz (Graded)" : "Opinion Poll / Survey"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Explanation (Revealed when closed)
              </label>
              <input
                type="text"
                value={pollExplanation}
                onChange={(e) => setPollExplanation(e.target.value)}
                placeholder="E.g., Resistance is measured in Ohms (Ω), derived from Ohm's Law."
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingPoll(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPoll}
                className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300 shadow disabled:opacity-50"
              >
                {isSubmittingPoll ? "Broadcasting…" : "Broadcast Live Poll"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bottom Interactive Control Deck */}
      <footer className="h-18 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 flex items-center justify-between gap-4 shadow-lg transition-colors">
        {/* Media Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active-press hover-lift ${
              isAudioEnabled ? "bg-slate-700 text-white" : "bg-rose-600/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {isAudioEnabled ? "🎙️ Mute" : "🔇 Unmute"}
          </button>

          <button
            onClick={toggleVideo}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active-press hover-lift ${
              isVideoEnabled ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {isVideoEnabled ? "📹 Stop Cam" : "📷 Start Cam"}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active-press hover-lift ${
              isScreenSharing ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🖥️ {isScreenSharing ? "Stop Share" : "Share Screen"}
          </button>
        </div>

        {/* Center: Hand Raise, Quick Poll & Quick Reactions */}
        <div className="flex items-center gap-2">
          {isTutorOrModerator && (
            <button
              onClick={() => {
                setActiveTab("polls");
                setIsCreatingPoll(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition active-press hover-lift"
              title="Launch instant live poll or quiz checkpoint"
            >
              <span>🎯 Quick Poll</span>
            </button>
          )}

          <button
            onClick={toggleHandRaise}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition active-press hover-lift ${
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
                className="hover:scale-125 transition px-1.5 py-0.5 text-base active-press"
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
