/* eslint @typescript-eslint/no-explicit-any: "off", react/no-unescaped-entities: "off" */
"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getPlatformConfig } from "../../lib/platformConfig";
import { useLearnerTheme } from "../../components/LearnerThemeProvider";
import { toast } from "../../lib/toast";
import {
  requestDeviceNotificationPermission,
  playNotificationChime,
} from "../../lib/clientNotifications";
import type {
  Participant,
  ClassroomMessage,
  LiveRoomTokenResponse,
} from "../../lib/liveClassroom/types";
import { SmartWhiteboard, SmartWhiteboardHandle } from "../../components/SmartWhiteboard";
import ClassroomSidebar from "../../components/ClassroomSidebar";
import EndClassModal from "../../components/classroom/live/EndClassModal";

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

  // Masterclass & Admission State
  const [requiresCode, setRequiresCode] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [requiresHost, setRequiresHost] = useState(false);
  const [classAlertSet, setClassAlertSet] = useState(false);
  const [showEndClassModal, setShowEndClassModal] = useState(false);
  const [classEndedByTutor, setClassEndedByTutor] = useState(false);
  const [pendingAdmissions, setPendingAdmissions] = useState<
    { studentId: string; studentName: string; studentEmail?: string; requestedAt: string }[]
  >([]);

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
  const messagesRef = useRef<ClassroomMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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

  // Interactive Live Whiteboard & Moderation State
  const smartWhiteboardRef = useRef<SmartWhiteboardHandle | null>(null);
  const [stageMode, setStageMode] = useState<"audio" | "whiteboard" | "split">("whiteboard");
  const [isLowDataMode, setIsLowDataMode] = useState(false);
  const [showBoardWatermark, setShowBoardWatermark] = useState(true);

  // Load and apply Low-Data Saver preference (saves ~70% bandwidth for Nigerian candidates)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("classroom_low_data");
      if (saved === "true") setIsLowDataMode(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("classroom_low_data", String(isLowDataMode));
    } catch {}
    const stream = remoteVideoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isLowDataMode;
      });
    }
  }, [isLowDataMode]);
  const [canStudentsDraw, setCanStudentsDraw] = useState(false);
  const [isClassRecording, setIsClassRecording] = useState(false);
  const [isClassRecordingPaused, setIsClassRecordingPaused] = useState(false);
  const [isSavingClassRecording, setIsSavingClassRecording] = useState(false);
  const [classRecordingSeconds, setClassRecordingSeconds] = useState(0);
  const [classRecordingMessage, setClassRecordingMessage] = useState("");
  const [localRecordingUrl, setLocalRecordingUrl] = useState<string | null>(null);
  const classMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const classRecordingChunksRef = useRef<Blob[]>([]);
  const classDisplayStreamRef = useRef<MediaStream | null>(null);
  const classExtraMicStreamRef = useRef<MediaStream | null>(null);
  const classRecordingStartedAtRef = useRef<number>(0);
  const classRecordingPausedAtRef = useRef<number | null>(null);
  const classRecordingPausedTotalMsRef = useRef<number>(0);
  const classRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [allowStudentMedia, setAllowStudentMedia] = useState(false);
  const [allowStudentVoiceNotes, setAllowStudentVoiceNotes] = useState(true);
  const [chatMuted, setChatMuted] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);

  // Mobile Adaptability & Responsive Hub Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isQuizCardMinimized, setIsQuizCardMinimized] = useState(false);

  // Big Screen & Pinned Lecture State
  const [pinnedMessage, setPinnedMessage] = useState<ClassroomMessage | null>(null);

  // Roster
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [reactionFloat, setReactionFloat] = useState<{ id: string; emoji: string }[]>([]);

  // Video streams & WebRTC Peer Connection refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [tutorStreaming, setTutorStreaming] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const attendanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const initClassroomRef = useRef<((codeOverride?: string) => Promise<void>) | null>(null);

  // Host UI is derived only from the server-issued room token. URL flags,
  // browser storage and editable Auth metadata are never role evidence.
  const isHostRole =
    tokenData?.role === "host" ||
    Boolean(tokenData?.permissions?.isModerator) ||
    Boolean(classDetails?.tutorId && currentUser?.id && classDetails.tutorId === currentUser.id);

  // 1. Authenticate & Obtain Classroom Admission Token & Load Polls
  useEffect(() => {
    let active = true;

    async function initClassroom(codeOverride?: string) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const user = session?.user;
        if (!session || !user) {
          router.replace(`/login?redirect=/classroom/${classId}${typeof window !== "undefined" && window.location.search ? window.location.search.replace(/^\?/, "&") : ""}`);
          return;
        }
        if (!active) return;
        setCurrentUser(user);

        // Call backend token generator which enforces server authorization & enrollment
        // Host intent is only a navigation hint; the API independently
        // resolves the user's real permissions and never trusts this flag.
        const hasHostIntent =
          typeof window !== "undefined" &&
          (window.location.search.includes("role=host") || codeOverride === "host");

        const res = await fetch("/api/classroom/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            classId,
            entryCode: codeOverride ?? enteredCode,
            requestedRole: hasHostIntent ? "host" : undefined,
            asHost: hasHostIntent,
          }),
        });

        const resText = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(resText);
        } catch {
          if (!active) return;
          setError(
            `Unable to connect to live classroom server (${res.status} ${res.statusText || "Server Notice"}). Please refresh or sign in again.`
          );
          setLoading(false);
          return;
        }
        if (!active) return;

        if (json.requiresCode) {
          setRequiresCode(true);
          setCodeError(json.error || "Please enter the masterclass access code.");
          if (json.classDetails) setClassDetails(json.classDetails);
          setLoading(false);
          return;
        }

        if (json.requiresHost) {
          setRequiresHost(true);
          if (json.classDetails) setClassDetails(json.classDetails);
          setError(json.error);
          setLoading(false);

          // Connect to waiting channel to automatically admit student the moment tutor launches stage
          const waitChannel = supabase.channel(`classroom:${classId}`, {
            config: { broadcast: { self: false } },
          });
          channelRef.current = waitChannel;

          waitChannel.on("broadcast", { event: "class_started" }, () => {
            toast.success("Instructor has launched the stage! Entering classroom…");
            setRequiresHost(false);
            setLoading(true);
            void initClassroomRef.current?.(codeOverride ?? enteredCode);
          });

          waitChannel.subscribe();
          return;
        }

        if (json.pendingApproval) {
          setPendingApproval(true);
          if (json.classDetails) setClassDetails(json.classDetails);
          setLoading(false);

          // Connect to waiting channel to request permission from tutor and wait for approval
          const waitChannel = supabase.channel(`classroom:${classId}`, {
            config: { broadcast: { self: false } },
          });
          channelRef.current = waitChannel;

          setTimeout(() => {
            waitChannel.send({
              type: "broadcast",
              event: "request_admission",
              payload: {
                studentId: user.id,
                studentName: user.user_metadata?.full_name || user.user_metadata?.name || "Learner",
                studentEmail: "", // Protect candidate privacy
                requestedAt: new Date().toISOString(),
              },
            });
          }, 1000);

          waitChannel.on("broadcast", { event: "student_admitted" }, ({ payload }) => {
            if (payload?.studentId === user.id && payload?.allowed) {
              toast.success("Tutor granted permission! Entering Masterclass…");
              setPendingApproval(false);
              setLoading(true);
              void initClassroom(codeOverride ?? enteredCode);
            } else if (payload?.studentId === user.id && payload?.allowed === false) {
              setError("The instructor has declined your admission request to this Masterclass.");
            }
          });

          waitChannel.subscribe();
          return;
        }

        if (!res.ok) {
          setError(json.error || "Unable to enter classroom.");
          setLoading(false);
          return;
        }

        setRequiresCode(false);
        setPendingApproval(false);
        setRequiresHost(false);
        setTokenData(json.data);
        setClassDetails(json.data.classDetails);
        void getPlatformConfig<boolean>("whiteboard_watermark_enabled", true).then(setShowBoardWatermark);

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
          name: user.user_metadata?.full_name || user.user_metadata?.name || "Learner",
          role: (json.data.role === "host" || Boolean(json.data.permissions?.isModerator) || json.data.classDetails.tutorId === user.id) ? "host" : "speaker",
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
          const msgsRes = await fetch(`/api/classroom/messages?classId=${encodeURIComponent(classId)}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          let msgsJson: any = { messages: [] };
          try {
            const msgsText = await msgsRes.text();
            msgsJson = JSON.parse(msgsText);
          } catch {
            // Non-blocking
          }
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
          let pollsJson: any = { ok: true, polls: [] };
          try {
            const pollsText = await pollsRes.text();
            pollsJson = JSON.parse(pollsText);
          } catch {
            // Non-blocking
          }
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

        // Chat History Synchronization: When someone joins, replay chat history from attendees
        channel.on("broadcast", { event: "request_chat_history" }, ({ payload }) => {
          if (payload?.requesterId && payload.requesterId !== user.id && messagesRef.current.length > 0) {
            channel.send({
              type: "broadcast",
              event: "chat_history_response",
              payload: {
                targetId: payload.requesterId,
                messages: messagesRef.current,
              },
            });
          }
        });

        channel.on("broadcast", { event: "chat_history_response" }, ({ payload }) => {
          if (payload?.targetId === user.id && Array.isArray(payload?.messages) && payload.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const missing = payload.messages.filter((m: ClassroomMessage) => !existingIds.has(m.id));
              if (missing.length === 0) return prev;
              const combined = [...prev, ...missing];
              combined.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
              return combined;
            });
          }
        });

        // Listen for whiteboard permission changes
        channel.on("broadcast", { event: "whiteboard_toggle_student_draw" }, ({ payload }) => {
          if (typeof payload?.allowed === "boolean") {
            setCanStudentsDraw(payload.allowed);
          }
        });

        // Listen for comprehensive classroom permission changes
        channel.on("broadcast", { event: "classroom_permission_change" }, ({ payload }) => {
          if (payload) {
            if (typeof payload.canStudentsDraw === "boolean") setCanStudentsDraw(payload.canStudentsDraw);
            if (typeof payload.allowStudentMedia === "boolean") setAllowStudentMedia(payload.allowStudentMedia);
            if (typeof payload.allowStudentVoiceNotes === "boolean") setAllowStudentVoiceNotes(payload.allowStudentVoiceNotes);
            if (typeof payload.chatMuted === "boolean") setChatMuted(payload.chatMuted);
          }
        });

        // Listen for student hand raises
        channel.on("broadcast", { event: "participant_hand_raise" }, ({ payload }) => {
          if (payload?.userId) {
            setParticipants((prev) =>
              prev.map((p) => (p.id === payload.userId ? { ...p, isHandRaised: payload.isHandRaised } : p))
            );
            if (payload.isHandRaised && (user.id === json.data.classDetails.tutorId || json.data.permissions.isModerator)) {
              toast.info(`${payload.userName || "A student"} raised their hand.`);
            }
          }
        });

        // Listen for student whiteboard access requests
        channel.on("broadcast", { event: "board_access_request" }, ({ payload }) => {
          if (payload?.userId && (user.id === json.data.classDetails.tutorId || json.data.permissions.isModerator)) {
            toast.info(`${payload.userName || "Student"} requested permission to draw on the board.`);
          }
        });

        // Listen for Masterclass student admission requests
        channel.on("broadcast", { event: "request_admission" }, ({ payload }) => {
          if (payload?.studentId && (user.id === json.data.classDetails.tutorId || json.data.permissions.isModerator)) {
            setPendingAdmissions((prev) => {
              if (prev.some((p) => p.studentId === payload.studentId)) return prev;
              return [...prev, payload];
            });
            toast.info(`Masterclass Request: ${payload.studentName || "A learner"} is waiting for admission.`);
          }
        });

        // Pin to Big Screen Broadcast
        channel.on("broadcast", { event: "pin_message" }, ({ payload }) => {
          if (payload?.message) {
            setPinnedMessage(payload.message);
          }
        });

        // Class Ended by Tutor Broadcast
        channel.on("broadcast", { event: "class_ended" }, () => {
          setClassEndedByTutor(true);
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
                    const stream = event.streams[0];
                    remoteVideoRef.current.srcObject = stream;
                    const hasVideoTracks = stream.getVideoTracks().length > 0;
                    setHasRemoteVideo(hasVideoTracks);
                    setTutorStreaming(true);
                    remoteVideoRef.current.play().then(() => {
                      setAudioPlaybackBlocked(false);
                    }).catch((playErr) => {
                      console.warn("Autoplay deferred:", playErr);
                      setAudioPlaybackBlocked(true);
                    });
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
              const userName = user.user_metadata?.full_name || user.user_metadata?.name || "Learner";
              await channel.track({
                id: user.id,
                name: userName,
                role: (json.data.role === "host" || Boolean(json.data.permissions?.isModerator) || json.data.classDetails.tutorId === user.id) ? "host" : "speaker",
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
              // Replay chat history from all participants already in session
              channel.send({
                type: "broadcast",
                event: "request_chat_history",
                payload: { requesterId: user.id },
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

    initClassroomRef.current = initClassroom;
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

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser cannot access a microphone. Try a supported browser over HTTPS.");
      return;
    }

    try {
      if (!isAudioEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        // Preserve any existing tracks (e.g. video)
        if (localStreamRef.current) {
          stream.getAudioTracks().forEach((track) => {
            localStreamRef.current?.addTrack(track);
          });
        } else {
          localStreamRef.current = stream;
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const existingAudioSender = senders.find((s) => s.track?.kind === "audio");
            if (existingAudioSender) {
              existingAudioSender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, localStreamRef.current!);
            }
          });
        }

        setIsAudioEnabled(true);
        // Announce live stream to listening students
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc_stream_live",
          payload: { hostId: currentUser?.id },
        });
      } else {
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });
        setIsAudioEnabled(false);
        const remaining = (localStreamRef.current?.getTracks().length || 0) + (screenStreamRef.current?.getTracks().length || 0);
        if (remaining === 0) {
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc_stream_stopped",
            payload: { hostId: currentUser?.id },
          });
        }
      }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Microphone permission was blocked. Allow microphone access in your browser or device settings, then try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("No microphone was detected. Connect or enable a microphone and try again.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        toast.error("Your microphone may be in use by another app. Close other apps using it and retry.");
      } else {
        toast.error(error instanceof Error ? `Microphone could not start: ${error.message}` : "Unable to access microphone. Check browser permissions.");
      }
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
    const isHostUser = isHostRole || classDetails?.tutorId === currentUser.id;

    setChatInput("");
    setShowMentions(false);

    const safeSender =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "Learner";

    const payloadMsg = {
      classId,
      senderName: safeSender,
      text: textToSend,
      type: "text" as const,
      isHost: isHostUser,
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/classroom/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(payloadMsg),
      });
      let data: any = {}; try { const _t = await res.text(); data = JSON.parse(_t); } catch {}
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

  // 5b. Voice Note Recording & Media Handlers (Cross-browser WebM / MP4 / AAC with universal streaming)
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Detect highest fidelity supported audio mime across Safari, Chrome, Edge & Firefox (prioritizing audio/mp4 for cross-platform iOS & Android playback)
      const mimeCandidates = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/aac",
        "audio/ogg;codecs=opus",
      ];
      const supportedMime =
        mimeCandidates.find(
          (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)
        ) || "";

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
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
          const actualMime = recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
          const fileExtension =
            actualMime.includes("mp4") || actualMime.includes("aac") ? "mp4" : "webm";

          // 1. Upload audio to streaming endpoint
          const formData = new FormData();
          formData.append("file", audioBlob, `voice_${Date.now()}.${fileExtension}`);
          formData.append("classId", classId);
          formData.append("mediaType", "audio");
          formData.append("duration", String(Math.max(1, duration)));

          let uploadedUrl = "";
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const uploadRes = await fetch("/api/classroom/upload", {
              method: "POST",
              headers,
              body: formData,
            });
            let uploadJson: any = {}; try { const _t = await uploadRes.text(); uploadJson = JSON.parse(_t); } catch {}
            if (uploadRes.ok && uploadJson.url) {
              uploadedUrl = uploadJson.url;
            }
          } catch (e) {
            console.warn("Audio upload fallback:", e);
          }

          if (!uploadedUrl) {
            // Fallback: convert to base64 only if server upload failed
            uploadedUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || "");
              reader.onerror = () => resolve("");
              reader.readAsDataURL(audioBlob);
            });
          }

          const safeSender =
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            "Learner";

          // 2. Persist message with auth header
          const payloadMsg = {
            classId,
            senderName: safeSender,
            text: "Voice Note",
            type: "audio" as const,
            mediaUrl: uploadedUrl,
            duration: Math.max(1, duration),
            isHost: isHostRole || classDetails?.tutorId === currentUser.id,
          };

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const postHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (token) postHeaders["Authorization"] = `Bearer ${token}`;

            const postRes = await fetch("/api/classroom/messages", {
              method: "POST",
              headers: postHeaders,
              body: JSON.stringify(payloadMsg),
            });
            let postJson: any = {}; try { const _t = await postRes.text(); postJson = JSON.parse(_t); } catch {}
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

    const isHostUser = isHostRole || classDetails?.tutorId === currentUser.id;

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
      let uploadJson: any = {}; try { const _t = await uploadRes.text(); uploadJson = JSON.parse(_t); } catch {}
      if (uploadRes.ok && uploadJson.url) {
        uploadedUrl = uploadJson.url;
      }
    } catch {
      // fallback
    }

    const dispatchImgMsg = async (url: string) => {
      const payloadMsg = {
        classId,
        senderName: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Scholar",
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
        let postJson: any = {}; try { const _t = await postRes.text(); postJson = JSON.parse(_t); } catch {}
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
    if (!url) {
      toast.error("Audio recording is not available.");
      return;
    }
    if (currentlyPlayingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setCurrentlyPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      try {
        const fullUrl =
          url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")
            ? url
            : `${window.location.origin}${url}`;

        const audio = new Audio();
        audioPlayerRef.current = audio;
        audio.preload = "auto";
        audio.src = fullUrl;

        audio.onended = () => {
          setCurrentlyPlayingAudioId(null);
        };

        // Fallback: If streaming/codec header triggers error, fetch blob & play via object URL
        audio.onerror = async () => {
          console.warn("Direct audio playback error on", fullUrl, "attempting blob stream fallback...");
          try {
            const resp = await fetch(fullUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const blobUrl = URL.createObjectURL(blob);
              const fallbackAudio = new Audio(blobUrl);
              audioPlayerRef.current = fallbackAudio;
              fallbackAudio.onended = () => {
                setCurrentlyPlayingAudioId(null);
                URL.revokeObjectURL(blobUrl);
              };
              await fallbackAudio.play();
              setCurrentlyPlayingAudioId(msgId);
              return;
            }
          } catch (fallbackErr) {
            console.error("Blob playback fallback failed:", fallbackErr);
          }
          setCurrentlyPlayingAudioId(null);
          toast.error("Could not play voice note. Format may not be supported by your device.");
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setCurrentlyPlayingAudioId(msgId);
            })
            .catch((err) => {
              console.warn("Autoplay / audio play rejected:", err);
              setCurrentlyPlayingAudioId(null);
              toast.info("Tap again to allow audio playback on your device.");
            });
        } else {
          setCurrentlyPlayingAudioId(msgId);
        }
      } catch (err) {
        console.error("Audio init failed:", err);
        toast.error("Unable to start audio player.");
      }
    }
  };

  // 5c. Whiteboard Snapshot Sharing
  const shareWhiteboardToChat = (customDataUrl?: string) => {
    const dataUrl = customDataUrl || smartWhiteboardRef.current?.getCanvasDataUrl();
    if (!dataUrl || !currentUser) return;
    const newMsg: ClassroomMessage = {
      id: `msg_wb_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Scholar",
      text: "Shared live whiteboard sketch/diagram",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isHost: isHostRole || classDetails?.tutorId === currentUser.id,
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
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    setParticipants((prev) =>
      prev.map((p) => (p.id === currentUser?.id ? { ...p, isHandRaised: nextState } : p))
    );
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "participant_hand_raise",
        payload: {
          userId: currentUser?.id,
          userName: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "Student",
          isHandRaised: nextState,
        },
      });
    }
    if (nextState) {
      toast.info("Hand raised! The tutor has been notified.");
    } else {
      toast.info("Hand lowered.");
    }
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

  // Masterclass Permission & Admission Handlers
  const handleAdmitStudent = async (studentId: string, allowed = true) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      await fetch("/api/classroom/admit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          classId,
          studentId,
          action: allowed ? "grant" : "deny",
        }),
      });

      channelRef.current?.send({
        type: "broadcast",
        event: "student_admitted",
        payload: { studentId, allowed },
      });

      setPendingAdmissions((prev) => prev.filter((p) => p.studentId !== studentId));
      if (allowed) {
        toast.success("Permission granted! Student admitted to the masterclass.");
      } else {
        toast.info("Admission request declined.");
      }
    } catch {
      toast.error("Failed to update admission status.");
    }
  };

  const handleAdmitAllStudents = async () => {
    if (pendingAdmissions.length === 0) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      const ids = pendingAdmissions.map((p) => p.studentId);

      await fetch("/api/classroom/admit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          classId,
          action: "grant_all",
          studentIds: ids,
        }),
      });

      ids.forEach((studentId) => {
        channelRef.current?.send({
          type: "broadcast",
          event: "student_admitted",
          payload: { studentId, allowed: true },
        });
      });

      setPendingAdmissions([]);
      toast.success(`Granted admission to all ${ids.length} learners!`);
    } catch {
      toast.error("Failed to admit learners.");
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

      let json: any = {}; try { const _t = await res.text(); json = JSON.parse(_t); } catch { throw new Error("Server error launching poll."); }
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to launch poll.");

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

      let json: any = {}; try { const _t = await res.text(); json = JSON.parse(_t); } catch {}
      if (res.ok && json?.ok) {
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

  const isTutorOrModerator = isHostRole;
  const isAssignedTutor = isHostRole;

  const updateClassroomPermissions = (updates: {
    canStudentsDraw?: boolean;
    allowStudentMedia?: boolean;
    allowStudentVoiceNotes?: boolean;
    chatMuted?: boolean;
  }) => {
    if (updates.canStudentsDraw !== undefined) setCanStudentsDraw(updates.canStudentsDraw);
    if (updates.allowStudentMedia !== undefined) setAllowStudentMedia(updates.allowStudentMedia);
    if (updates.allowStudentVoiceNotes !== undefined) setAllowStudentVoiceNotes(updates.allowStudentVoiceNotes);
    if (updates.chatMuted !== undefined) setChatMuted(updates.chatMuted);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "classroom_permission_change",
        payload: updates,
      });
      if (updates.canStudentsDraw !== undefined) {
        channelRef.current.send({
          type: "broadcast",
          event: "whiteboard_toggle_student_draw",
          payload: { allowed: updates.canStudentsDraw },
        });
      }
    }
  };

  const uploadCompletedClassRecording = async (blob: Blob, durationSeconds: number) => {
    setIsSavingClassRecording(true);
    setClassRecordingMessage("Saving your recording securely…");
    try {
      if (!classDetails?.id || !classDetails?.isRecording) {
        throw new Error("Recording is not enabled for this class.");
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before saving this recording.");

      const uploadUrlResponse = await fetch("/api/recordings/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          class_id: classDetails.id,
          filename: `brainlab-class-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
          content_type: "video/webm",
        }),
      });
      let uploadUrlData: any = {}; try { const _t = await uploadUrlResponse.text(); uploadUrlData = JSON.parse(_t); } catch { throw new Error("Could not parse recording upload response."); }
      if (!uploadUrlResponse.ok || !uploadUrlData.success) {
        throw new Error(uploadUrlData.error || "Could not prepare recording upload.");
      }

      const { error: uploadError } = await supabase.storage
        .from(uploadUrlData.bucket)
        .uploadToSignedUrl(uploadUrlData.path, uploadUrlData.token, blob, {
          contentType: (blob.type || "video/webm").split(";")[0],
          upsert: false,
        });
      if (uploadError) throw new Error("Upload failed. Please check your connection and try again.");

      const title = `${classDetails.title || "Live class"} — ${new Date().toLocaleDateString()}`;
      const saveResponse = await fetch("/api/recordings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          class_id: classDetails.id,
          title,
          description: "Tutor-recorded classroom display with microphone audio.",
          storage_path: uploadUrlData.path,
          duration_seconds: durationSeconds,
          file_size_bytes: blob.size,
          is_visible_to_students: false,
        }),
      });
      let saveData: any = {}; try { const _t = await saveResponse.text(); saveData = JSON.parse(_t); } catch { throw new Error("Could not parse recording save response."); }
      if (!saveResponse.ok || !saveData.success) {
        throw new Error(saveData.error || "The video uploaded, but its recording entry could not be saved.");
      }
      setClassRecordingMessage("Recording saved privately. Publish or hide it later from Tutor tools → Class recordings.");
    } catch (error) {
      setClassRecordingMessage(error instanceof Error ? error.message : "Could not save this class recording.");
    } finally {
      setIsSavingClassRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (localRecordingUrl) URL.revokeObjectURL(localRecordingUrl);
    };
  }, [localRecordingUrl]);

  const startClassRecording = async () => {
    setClassRecordingMessage("");
    if (!isAssignedTutor) return;
    if (!classDetails?.isRecording) {
      setClassRecordingMessage("Recording is disabled for this class. Ask a platform administrator to enable it.");
      return;
    }
    if (!classDetails?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(classDetails.id)) {
      setClassRecordingMessage("Recording is available for scheduled classroom sessions, not demo rooms.");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setClassRecordingMessage("This browser cannot record the classroom display. Try an up-to-date desktop browser.");
      return;
    }

    let displayStream: MediaStream | null = null;
    let extraMicStream: MediaStream | null = null;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 24 } },
        audio: false,
      });

      let microphoneTracks = (localStreamRef.current?.getAudioTracks() || []).filter((track) => track.readyState === "live");
      if (!microphoneTracks.length) {
        extraMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneTracks = extraMicStream.getAudioTracks();
      }
      if (!displayStream.getVideoTracks().length || !microphoneTracks.length) {
        throw new Error("Select a screen or browser tab and allow microphone audio to record this class.");
      }

      const combinedStream = new MediaStream([...displayStream.getVideoTracks(), ...microphoneTracks]);
      const preferredMime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredMime ? new MediaRecorder(combinedStream, { mimeType: preferredMime }) : new MediaRecorder(combinedStream);
      classRecordingChunksRef.current = [];
      classRecordingStartedAtRef.current = Date.now();
      classRecordingPausedAtRef.current = null;
      classRecordingPausedTotalMsRef.current = 0;
      setIsClassRecordingPaused(false);
      classDisplayStreamRef.current = displayStream;
      classExtraMicStreamRef.current = extraMicStream;
      classMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) classRecordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setClassRecordingMessage("The browser stopped recording unexpectedly. Please try again.");
      };
      recorder.onstop = () => {
        if (classRecordingTimerRef.current) clearInterval(classRecordingTimerRef.current);
        classRecordingTimerRef.current = null;
        setIsClassRecording(false);
        setIsClassRecordingPaused(false);
        const now = Date.now();
        const pendingPause = classRecordingPausedAtRef.current ? now - classRecordingPausedAtRef.current : 0;
        const duration = Math.max(1, Math.round((now - classRecordingStartedAtRef.current - classRecordingPausedTotalMsRef.current - pendingPause) / 1000));
        const blob = new Blob(classRecordingChunksRef.current, { type: recorder.mimeType || "video/webm" });
        classRecordingChunksRef.current = [];
        if (blob.size) {
          const localUrl = URL.createObjectURL(blob);
          setLocalRecordingUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return localUrl;
          });
        }
        classDisplayStreamRef.current?.getTracks().forEach((track) => track.stop());
        classExtraMicStreamRef.current?.getTracks().forEach((track) => track.stop());
        classDisplayStreamRef.current = null;
        classExtraMicStreamRef.current = null;
        classMediaRecorderRef.current = null;
        if (blob.size) void uploadCompletedClassRecording(blob, duration);
        else setClassRecordingMessage("No recording data was captured. Please try again.");
      };
      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state !== "inactive") recorder.stop();
      }, { once: true });
      recorder.start(1000);
      setIsClassRecording(true);
      setClassRecordingSeconds(0);
      classRecordingTimerRef.current = setInterval(() => {
        const now = Date.now();
        const pendingPause = classRecordingPausedAtRef.current ? now - classRecordingPausedAtRef.current : 0;
        const elapsed = Math.max(0, now - classRecordingStartedAtRef.current - classRecordingPausedTotalMsRef.current - pendingPause);
        if (classMediaRecorderRef.current?.state === "recording") setClassRecordingSeconds(Math.floor(elapsed / 1000));
      }, 1000);
      setClassRecordingMessage("Recording your shared screen and microphone. Pause as needed, then End & Save when finished.");
    } catch (error) {
      displayStream?.getTracks().forEach((track) => track.stop());
      extraMicStream?.getTracks().forEach((track) => track.stop());
      setClassRecordingMessage(error instanceof Error ? error.message : "Could not start class recording.");
      setIsClassRecording(false);
    }
  };

  const pauseOrResumeClassRecording = () => {
    const recorder = classMediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === "recording") {
      recorder.pause();
      classRecordingPausedAtRef.current = Date.now();
      setIsClassRecordingPaused(true);
      setClassRecordingMessage("Recording paused. Resume when ready.");
    } else if (recorder.state === "paused") {
      if (classRecordingPausedAtRef.current) {
        classRecordingPausedTotalMsRef.current += Date.now() - classRecordingPausedAtRef.current;
        classRecordingPausedAtRef.current = null;
      }
      recorder.resume();
      setIsClassRecordingPaused(false);
      setClassRecordingMessage("Recording resumed.");
    }
  };

  const stopClassRecording = () => {
    const recorder = classMediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const handleConfirmEndClass = async (saveRec: boolean) => {
    if (isClassRecording && !saveRec) {
      if (classMediaRecorderRef.current && classMediaRecorderRef.current.state !== "inactive") {
        classMediaRecorderRef.current.stop();
      }
    } else if (isClassRecording && saveRec) {
      stopClassRecording();
    }

    try {
      const response = await fetch(`/api/classroom/classes/${classId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      let data: any = {}; try { const _t = await response.text(); data = JSON.parse(_t); } catch {}

      // Broadcast class_ended to all participants
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: "broadcast",
            event: "class_ended",
            payload: { classId, title: classDetails?.title || "Live Class", endedAt: new Date().toISOString() },
          });
        } catch {
          // Non-blocking
        }
      }

      return data.summary || {
        classId,
        title: classDetails?.title || "Live Class",
        endedAt: new Date().toISOString(),
        durationMinutes: 60,
        totalAttendees: participants.length || 1,
      };
    } catch {
      toast.error("Network issue finalizing session, closing session locally.");
      return null;
    }
  };

  const takeAttendance = async () => {
    if (!isAssignedTutor || !classDetails?.id) return;
    const connectedStudentIds = [...new Set(
      participants.filter((participant) => participant.role !== "host").map((participant) => participant.id)
    )];
    if (!connectedStudentIds.length) {
      toast.info("No connected students to mark present yet.");
      return;
    }
    if (!window.confirm(`Take attendance for ${connectedStudentIds.length} connected student(s) now?`)) return;
    setIsTakingAttendance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to take attendance.");
      const response = await fetch("/api/classroom/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ classId: classDetails.id, action: "mark_present", participantIds: connectedStudentIds }),
      });
      let result: any = {}; try { const _t = await response.text(); result = JSON.parse(_t); } catch { throw new Error("Could not save attendance."); }
      if (!response.ok || !result?.success) throw new Error(result?.error || "Could not save attendance.");
      toast.success(result.message || `Attendance saved for ${result.markedCount || 0} students.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setIsTakingAttendance(false);
    }
  };

  useEffect(() => {
    return () => {
      if (classRecordingTimerRef.current) clearInterval(classRecordingTimerRef.current);
      if (classMediaRecorderRef.current && classMediaRecorderRef.current.state !== "inactive") {
        classMediaRecorderRef.current.stop();
      }
      classDisplayStreamRef.current?.getTracks().forEach((track) => track.stop());
      classExtraMicStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (requiresCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-amber-500/40 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40">
            <svg className="h-8 w-8 text-amber-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <span className="mt-4 inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-black uppercase text-amber-300">
            BrainLab Masterclass
          </span>
          <h2 className="mt-2 text-2xl font-black text-white">{classDetails?.title || "Masterclass Session"}</h2>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            This is a protected Masterclass. Enter the entry code provided by your instructor or administration to join.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!enteredCode.trim()) return;
              setLoading(true);
              setCodeError(null);
              const { data: sessionData } = supabase.auth.getSession() as any;
              void initClassroomRef.current?.(enteredCode.trim().toUpperCase());
            }}
            className="mt-6 space-y-4"
          >
            <div>
              <input
                type="text"
                value={enteredCode}
                onChange={(e) => {
                  setEnteredCode(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                placeholder="Enter Code (e.g. BL-MASTER-2026)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                autoFocus
                required
              />
              {codeError && <p className="mt-2 text-xs text-rose-400 font-semibold">{codeError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !enteredCode.trim()}
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-3 font-bold text-white shadow-lg shadow-amber-600/30 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? "Verifying Code…" : "Unlock & Enter Masterclass →"}
            </button>

            <Link
              href="/dashboard"
              className="block text-xs font-bold text-slate-400 hover:text-slate-200 transition pt-2"
            >
              ← Back to My Learning
            </Link>
          </form>
        </div>
      </div>
    );
  }

  if (pendingApproval) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-amber-500/40 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
            <div className="absolute h-12 w-12 rounded-full bg-amber-500/20 animate-ping" />
            <span className="text-3xl">⏳</span>
          </div>
          <span className="mt-6 inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-black uppercase text-amber-300">
            Permission Requested
          </span>
          <h2 className="mt-2 text-2xl font-black text-white">{classDetails?.title || "Masterclass Waiting Room"}</h2>
          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            Your admission request has been sent to the instructor. Please stand by while the tutor admits you to this Masterclass session.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Class ID:</span>
              <span className="font-mono font-bold text-cyan-300">{classId}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Student Name:</span>
              <span className="font-bold text-white">{currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "Student"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status:</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Waiting for Tutor Approval…
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={async () => {
                const { granted } = await requestDeviceNotificationPermission();
                if (granted) {
                  setClassAlertSet(true);
                  playNotificationChime();
                  toast.success("Notification active! We'll ring your device the moment your tutor starts.");
                } else {
                  toast.error("Please allow browser notifications in your device settings.");
                }
              }}
              className="rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 px-5 py-3 text-xs font-bold text-blue-200 transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5">
                {classAlertSet ? (
                  <>
                    <svg className="h-3.5 w-3.5 text-emerald-400 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    Alert Set (We&apos;ll Ring Your Screen)
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 text-blue-300 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                    Turn On Alert When Tutor Goes Live
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void initClassroomRef.current?.(enteredCode);
              }}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-2.5 text-xs font-bold text-amber-300 transition"
            >
              Check Admission Status
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Exit to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (requiresHost) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-blue-500/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-500/40">
            <svg className="h-8 w-8 text-blue-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
          </div>
          <span className="mt-4 inline-block rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-[11px] font-black uppercase text-blue-300">
            Stage Not Started
          </span>
          <h2 className="mt-2 text-2xl font-black text-white">{classDetails?.title || "Live Academic Stage"}</h2>
          <p className="mt-3 text-xs text-slate-300 leading-relaxed">
            This live classroom has not been launched yet. Only authorized tutors or administrators can start or host this session. Please wait for your instructor to begin.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={async () => {
                const { granted } = await requestDeviceNotificationPermission();
                if (granted) {
                  setClassAlertSet(true);
                  playNotificationChime();
                  toast.success("Notification active! We'll ring your device the moment your tutor starts.");
                } else {
                  toast.error("Please allow browser notifications in your device settings.");
                }
              }}
              className="rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 px-5 py-3 text-xs font-bold text-blue-200 transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5">
                {classAlertSet ? (
                  <>
                    <svg className="h-3.5 w-3.5 text-emerald-400 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    Alert Set (We&apos;ll Ring Your Screen)
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5 text-blue-300 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                    Turn On Alert When Tutor Goes Live
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const token = sessionData?.session?.access_token;
                  await fetch(`/api/classroom/classes/${classId}/start`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ asHost: true, role: "host" }),
                  });
                  toast.success("Stage authorized! Entering cockpit as host…");
                  setRequiresHost(false);
                  void initClassroomRef.current?.("host");
                } catch {
                  toast.error("Entering stage as host…");
                  setRequiresHost(false);
                  void initClassroomRef.current?.("host");
                }
              }}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-3 text-xs font-black text-white shadow-xl transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <svg className="h-3.5 w-3.5 text-cyan-300 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>
              <span>Launch & Enter Stage as Host</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRequiresHost(false);
                setError(null);
                void initClassroomRef.current?.(enteredCode);
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              Refresh & Re-check Stage
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Return to My Learning
            </Link>
            <Link
              href={`/login?redirect=/classroom/${classId}&role=host`}
              className="pt-2 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
            >
              Are you the instructor? Sign in with tutor account →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white animate-fade-in-up">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute h-8 w-8 rounded-full bg-blue-600/30 animate-ping" />
          <span className="absolute"><svg className="h-6 w-6 text-cyan-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
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
          <svg className="h-10 w-10 text-rose-500 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h2 className="mt-4 text-2xl font-black text-rose-400">Admission Denied</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/pricing?redirect=${encodeURIComponent(`/classroom/${classId}`)}`}
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
      {classRecordingMessage && (
        <div role="status" className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-2xl rounded-xl border border-blue-200 bg-white/95 p-3 text-xs font-semibold text-slate-800 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100">
          {classRecordingMessage}
          {isSavingClassRecording && <span className="ml-2 inline-block animate-pulse">Uploading…</span>}
        </div>
      )}

      {/* Pending Masterclass Admission Banner (Tutor Host Only) */}
      {isTutorOrModerator && pendingAdmissions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 border-b border-amber-500/40 px-3 sm:px-4 py-2 text-xs text-white shadow-lg flex flex-wrap items-center justify-between gap-2.5 z-40 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-extrabold text-amber-300">
              Masterclass Waiting Room ({pendingAdmissions.length} pending):
            </span>
            <span className="text-amber-100 max-w-xs sm:max-w-md truncate">
              {pendingAdmissions.map((p) => p.studentName).join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleAdmitAllStudents()}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 font-bold text-white shadow-xs transition active:scale-95"
            >
              Admit All ({pendingAdmissions.length})
            </button>
            {pendingAdmissions.slice(0, 2).map((p) => (
              <button
                key={p.studentId}
                type="button"
                onClick={() => void handleAdmitStudent(p.studentId, true)}
                className="rounded-lg border border-amber-400/40 bg-amber-950/60 hover:bg-amber-900/80 px-2.5 py-1 font-bold text-amber-200 transition"
              >
                + Admit {p.studentName.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Modernized Top Header Bar */}
      <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#071328]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 transition-colors z-30">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0" title="Return to Dashboard">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
              BL
            </span>
            <div className="hidden xs:flex flex-col leading-none">
              <span className="text-xs font-black text-slate-900 dark:text-white">BrainLab</span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-cyan-400">Classroom</span>
            </div>
          </Link>
          <span className="text-slate-400 dark:text-slate-700 hidden xs:inline" aria-hidden="true">/</span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs md:max-w-md">
            {classDetails?.title || "Live Class"}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </span>
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <span className="text-slate-400 text-[10px]">Code:</span>
            <span className="font-bold text-blue-600 dark:text-cyan-400">{classId}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(classId);
                toast.success(`Class code ${classId} copied to clipboard!`);
              }}
              className="ml-0.5 text-slate-400 hover:text-blue-500 transition"
              title="Copy Class Code"
            >
              <svg className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            </button>
          </div>
          {isTutorOrModerator ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-300 shadow-2xs">
              
              <span>Tutor &amp; Host</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-300">
              
              <span>Student</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {isAssignedTutor && (
            <Link href="/tutor/recordings" className="hidden lg:inline-flex rounded-xl border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition">
              Recordings
            </Link>
          )}
          {isAssignedTutor && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-slate-900/90 px-2 py-1 shadow-xs">
              {isClassRecording ? (
                <>
                  <span className={`h-2 w-2 rounded-full ${isClassRecordingPaused ? "bg-amber-400" : "bg-rose-500 animate-pulse"}`} />
                  <span className="text-[11px] font-mono font-bold text-rose-200">
                    {Math.floor(classRecordingSeconds / 60)}:{(classRecordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={pauseOrResumeClassRecording}
                    className="rounded px-1.5 py-0.5 text-[10px] font-black bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                    title={isClassRecordingPaused ? "Resume recording" : "Pause recording"}
                  >
                    {isClassRecordingPaused ? "▶" : "⏸"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Finish recording and save to your private Teaching Library?")) {
                        stopClassRecording();
                      }
                    }}
                    disabled={isSavingClassRecording}
                    className="rounded px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white hover:bg-rose-500 transition"
                  >
                    {isSavingClassRecording ? "Saving…" : "■ Stop"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startClassRecording}
                  disabled={isSavingClassRecording}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
                  title="Start recording the classroom session"
                >
                  <span className="text-rose-500">●</span>
                  <span>Record Class</span>
                </button>
              )}
            </div>
          )}
          {/* Tutor Moderation Controls Trigger */}
          {isTutorOrModerator && (
            <button
              type="button"
              onClick={() => setShowModerationModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition active-press"
              title="Classroom Permissions & Moderation"
            >
              
              <span className="hidden md:inline">Permissions</span>
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              networkQuality === "excellent"
                ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                : networkQuality === "good"
                ? "bg-blue-950/70 text-blue-400 border-blue-800"
                : "bg-amber-950/70 text-amber-400 border-amber-800"
            }`}
            title="Optimized for Nigerian 3G/4G bandwidth with Nigeria Edge Sync"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            <span className="hidden sm:inline">Edge:</span> <span className="capitalize">{networkQuality}</span>
          </div>

          {/* Low-Data Saver Toggle (Google Stitch UI) */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-2 sm:px-2.5 py-1 shadow-2xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Data Saver</span>
              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline leading-none">~70% Saved</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !isLowDataMode;
                setIsLowDataMode(nextVal);
                if (nextVal) toast.success("Low-Data Saver activated: incoming video paused to save data.");
                else toast.info("Full bandwidth mode: video streaming resumed.");
              }}
              className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isLowDataMode ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
              title="Low-Data Saver: Disables incoming video tracks to save bandwidth for Nigerian students on mobile networks"
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isLowDataMode ? "translate-x-3 sm:translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="hidden md:inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Refresh stream connection"
          >
            {isReconnecting ? "Reconnecting…" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => setAppearance(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 shadow-2xs"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {resolvedTheme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
            <span className="hidden md:inline">{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
          </button>

          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Leave live classroom"
          >
            <span>Exit ↗</span>
          </Link>

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

          {isAssignedTutor || isTutorOrModerator ? (
            <button
              type="button"
              onClick={() => setShowEndClassModal(true)}
              className="rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-3 py-1.5 text-xs font-black text-white hover:from-rose-500 hover:to-red-500 shadow-md active-press transition"
              title="End this live class for all participants"
            >
              End Class
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-700 hover:bg-slate-600 px-2.5 sm:px-3 py-1 text-xs font-bold text-white active-press transition"
              title="Leave classroom"
            >
              Leave
            </Link>
          )}
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

        {/* Floating Audio Autoplay Unblock Banner for Students */}
        {audioPlaybackBlocked && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-bounce">
            <button
              type="button"
              onClick={() => {
                remoteVideoRef.current?.play().then(() => setAudioPlaybackBlocked(false)).catch(() => {});
              }}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-2xl hover:bg-emerald-500 active-press border border-emerald-400"
            >
              
              <span>Tap to Hear Live Instructor Audio</span>
            </button>
          </div>
        )}

        {/* Video / Stage Area */}
        <main className={`flex-1 flex flex-col items-center justify-center ${
          stageMode === "whiteboard" ? "p-0" : "p-0 sm:p-2 md:p-3"
        } bg-slate-200/70 dark:bg-slate-950 relative transition-colors overflow-hidden`}>
          <div className={`w-full h-full ${
            stageMode === "whiteboard" ? "rounded-none border-0" : "rounded-none sm:rounded-2xl border-0 sm:border border-slate-300 dark:border-slate-800"
          } bg-white/80 dark:bg-slate-900/60 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl`}>
            {/* Top Right Stage Mode Switcher (Google Stitch 3-Way Mode) */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-700/80 backdrop-blur shadow-md">
              <button
                type="button"
                onClick={() => setStageMode("whiteboard")}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                  stageMode === "whiteboard"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 2 4 4-12 12H6v-4L18 2Z" /></svg>
                <span className="hidden xs:inline">Whiteboard</span>
                <span className="rounded-full bg-cyan-400/30 text-cyan-200 px-1 py-0.2 text-[9px] font-black uppercase">Live</span>
              </button>
              <button
                type="button"
                onClick={() => setStageMode("audio")}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                  stageMode === "audio"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" /></svg>
                <span className="hidden xs:inline">Tutor Cam</span>
              </button>
              <button
                type="button"
                onClick={() => setStageMode("split")}
                className={`hidden sm:flex rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition items-center gap-1 ${
                  stageMode === "split"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>◫</span>
                <span>Split</span>
              </button>
            </div>

            {stageMode === "whiteboard" || stageMode === "split" ? (
              <div className="w-full h-full flex flex-col bg-slate-950 relative select-none">
                <SmartWhiteboard
                  showWatermark={showBoardWatermark}
                  ref={smartWhiteboardRef}
                  classId={classId}
                  isHost={isTutorOrModerator}
                  canDraw={isTutorOrModerator || canStudentsDraw}
                  channel={channelRef.current}
                  currentUserName={
                    currentUser?.user_metadata?.full_name ||
                    currentUser?.user_metadata?.name ||
                    "Learner"
                  }
                  currentUserId={currentUser?.id}
                  onShareToChat={(dataUrl: string) => {
                    shareWhiteboardToChat(dataUrl);
                  }}
                />

                {/* Split View Floating PiP (Google Stitch Design) */}
                {stageMode === "split" && (
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-44 sm:w-56 rounded-xl overflow-hidden border-2 border-blue-500/80 bg-slate-950 shadow-2xl backdrop-blur">
                    <div className="bg-slate-900/90 px-2 py-1 flex items-center justify-between text-[10px] text-white font-bold border-b border-slate-800">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Tutor Live
                      </span>
                      <button
                        type="button"
                        onClick={() => setStageMode("audio")}
                        className="text-cyan-400 hover:text-cyan-300 text-[9px] uppercase font-black"
                      >
                        Expand ↗
                      </button>
                    </div>
                    {isLowDataMode ? (
                      <div className="h-24 sm:h-32 flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-slate-300">
                        <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                        <span className="text-[10px] font-bold text-emerald-400">HD Audio Only</span>
                        <span className="text-[9px] text-slate-500">Video paused for Low-Data Saver</span>
                      </div>
                    ) : (
                      <video
                        ref={(el) => {
                          if (el && remoteVideoRef.current?.srcObject) {
                            el.srcObject = remoteVideoRef.current.srcObject;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-24 sm:h-32 object-cover bg-black"
                      />
                    )}
                  </div>
                )}
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
                            Big Screen Lecture Board
                          </span>
                          <span className="hidden sm:inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            Low-data Audio Mode
                          </span>
                        </div>

                        {/* Audio Wave Visualizer */}
                        <div className="flex items-center gap-1 h-5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] font-bold text-cyan-400 mr-1">LIVE</span>
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
                              Pinned: {pinnedMessage.senderName}
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
                              <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
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
                                              Correct
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
                              <strong className="text-white">Instructor's Explanation:</strong> {activePoll.explanation}
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
                              Expand High-Res
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
                          <h4 className="text-lg font-black text-white">Masterclass Audio Explanation</h4>
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
                            Tutor's Note on Big Screen
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
                              Voice Notes & Chat
                            </span>
                            <span className="rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                              Diagram Sharing
                            </span>
                            <span className="rounded-full bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                              In-Class Live Quizzes
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
                          <span>Record Voice Note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>Share Diagram</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("polls");
                            if (isTutorOrModerator) setIsCreatingPoll(true);
                          }}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-amber-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>Launch / View Quizzes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStageMode("whiteboard")}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-purple-300 transition flex items-center gap-1.5 shadow"
                        >
                          <span>Open Smart Whiteboard</span>
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
                {participants.length} Active Participants
              </span>
              {isHandRaised && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-3 py-1 text-xs font-bold text-amber-300 flex items-center gap-1">
                  Hand Raised
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
                    <span>Checkpoint Quiz Active {pollCountdown !== null && `(${pollCountdown}s)`}</span>
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
                                        Correct
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
                        <strong className="text-white">Explanation:</strong> {activePoll.explanation}
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

        {/* Desktop Docked Sidebar (Hidden on mobile/tablet) */}
        <aside className="hidden lg:flex lg:w-80 xl:w-96 border-l border-slate-800 bg-slate-900 flex-col shrink-0">
          <ClassroomSidebar
            activeTab={activeTab}
            setActiveTab={(tab: "chat" | "participants" | "polls" | "resources") => {
              setActiveTab(tab);
              if (tab === "chat") setUnreadMessagesCount(0);
            }}
            messages={messages}
            currentUser={currentUser}
            participants={participants}
            polls={polls}
            activePoll={activePoll}
            isTutorOrModerator={isTutorOrModerator}
            chatInput={chatInput}
            setChatInput={setChatInput}
            showMentions={showMentions}
            setShowMentions={setShowMentions}
            mentionFilter={mentionFilter}
            setMentionFilter={setMentionFilter}
            isRecordingAudio={isRecordingAudio}
            recordingDuration={recordingDuration}
            currentlyPlayingAudioId={currentlyPlayingAudioId}
            onSendMessage={handleSendMessage}
            onStartVoiceRecording={startVoiceRecording}
            onStopVoiceRecording={stopVoiceRecording}
            onImageUpload={handleImageUpload}
            onTogglePlayAudio={togglePlayAudio}
            onVotePoll={handleVote}
            onClosePoll={handleClosePoll}
            onOpenCreatePoll={() => setIsCreatingPoll(true)}
            onPreviewImage={setPreviewImage}
            imageInputRef={imageInputRef}
            allowStudentMedia={allowStudentMedia}
            allowStudentVoiceNotes={allowStudentVoiceNotes}
            chatMuted={chatMuted}
            classId={classId}
            attachments={classDetails?.attachments || []}
            pendingAdmissions={pendingAdmissions}
            onAdmitStudent={handleAdmitStudent}
            onAdmitAllStudents={handleAdmitAllStudents}
          />
        </aside>
      </div>

      {/* Mobile Slide-Over Drawer Modal (for mobile & tablet screens) */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-full sm:w-96 h-full bg-slate-900 flex flex-col relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ClassroomSidebar
              activeTab={activeTab}
              setActiveTab={(tab: "chat" | "participants" | "polls" | "resources") => {
                setActiveTab(tab);
                if (tab === "chat") setUnreadMessagesCount(0);
              }}
              messages={messages}
              currentUser={currentUser}
              participants={participants}
              polls={polls}
              activePoll={activePoll}
              isTutorOrModerator={isTutorOrModerator}
              chatInput={chatInput}
              setChatInput={setChatInput}
              showMentions={showMentions}
              setShowMentions={setShowMentions}
              mentionFilter={mentionFilter}
              setMentionFilter={setMentionFilter}
              isRecordingAudio={isRecordingAudio}
              recordingDuration={recordingDuration}
              currentlyPlayingAudioId={currentlyPlayingAudioId}
              onSendMessage={handleSendMessage}
              onStartVoiceRecording={startVoiceRecording}
              onStopVoiceRecording={stopVoiceRecording}
              onImageUpload={handleImageUpload}
              onTogglePlayAudio={togglePlayAudio}
              onVotePoll={handleVote}
              onClosePoll={handleClosePoll}
              onOpenCreatePoll={() => setIsCreatingPoll(true)}
              onPreviewImage={setPreviewImage}
              imageInputRef={imageInputRef}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
              allowStudentMedia={allowStudentMedia}
              allowStudentVoiceNotes={allowStudentVoiceNotes}
              chatMuted={chatMuted}
              classId={classId}
              attachments={classDetails?.attachments || []}
              pendingAdmissions={pendingAdmissions}
              onAdmitStudent={handleAdmitStudent}
              onAdmitAllStudents={handleAdmitAllStudents}
            />
          </div>
        </div>
      )}

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
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Quick Templates (1-Click Fill)
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
                  True / False
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
                  Yes / No
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
                  4-Option MCQ (A-D)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPollQuestion("Understanding Check: How well do you grasp this concept?");
                    setPollOptions([
                      { id: "opt_1", text: "100% Clear & Understood" },
                      { id: "opt_2", text: "Mostly, Need Another Example" },
                      { id: "opt_3", text: "Confused, Please Re-explain" },
                    ]);
                    setPollDuration(45);
                    setPollCorrectId("");
                  }}
                  className="rounded-lg border border-cyan-800/60 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition active-press"
                >
                  Pulse Check
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

      {/* Classroom Permissions & Moderation Modal (Tutor Only) */}
      {showModerationModal && isTutorOrModerator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowModerationModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
                    Classroom Moderation Controls
                  </h3>
                  <p className="text-xs text-slate-400">
                    Manage real-time interaction permissions for all students in this room
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModerationModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Whiteboard Drawing Permission */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    <h4 className="text-xs font-bold text-white">Student Whiteboard Drawing</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    When disabled, only you (the instructor) can write on the board. Enable if inviting students to draw or solve a problem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateClassroomPermissions({ canStudentsDraw: !canStudentsDraw })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    canStudentsDraw ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      canStudentsDraw ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Chat Media / Diagram Uploads */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    <h4 className="text-xs font-bold text-white">Student Diagram &amp; Image Uploads</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Allow students to attach photos or diagrams in chat. Keep off during fast-paced lectures to prevent spam.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateClassroomPermissions({ allowStudentMedia: !allowStudentMedia })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowStudentMedia ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allowStudentMedia ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Student Voice Notes */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    <h4 className="text-xs font-bold text-white">Student Voice Questions</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Allow students to record voice notes in chat to ask spoken questions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateClassroomPermissions({ allowStudentVoiceNotes: !allowStudentVoiceNotes })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowStudentVoiceNotes ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allowStudentVoiceNotes ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Chat Pause / Mute */}
              <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    <h4 className="text-xs font-bold text-white">Pause Student Chat</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Mute participant messages while you are delivering key explanations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateClassroomPermissions({ chatMuted: !chatMuted })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    chatMuted ? "bg-rose-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      chatMuted ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModerationModal(false)}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition active-press"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Interactive Control Deck */}
      <footer className="h-15 sm:h-17 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 sm:px-4 py-2 flex items-center justify-between gap-1.5 sm:gap-4 shadow-lg transition-colors overflow-x-auto scrollbar-none">
        {/* Left: Media & Stage Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold transition active-press ${
              isAudioEnabled ? "bg-slate-700 text-white" : "bg-rose-600/20 text-rose-300 border border-rose-500/30"
            }`}
            title={isAudioEnabled ? "Turn microphone off" : "Turn microphone on"}
            aria-label={isAudioEnabled ? "Turn microphone off" : "Turn microphone on"}
          >
            {isAudioEnabled ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="2" x2="22" y1="2" y2="22" />
                <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                <path d="M5 10v2a7 7 0 0 0 12 5" />
                <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
            <span>{isAudioEnabled ? "Mic On" : "Mic Off"}</span>
          </button>

          <button
            onClick={toggleVideo}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold transition active-press ${
              isVideoEnabled ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
            title={isVideoEnabled ? "Stop Camera" : "Start Camera"}
          >
            {isVideoEnabled ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            )}
            <span className="hidden xs:inline">{isVideoEnabled ? "Cam Off" : "Cam"}</span>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`hidden md:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition active-press ${
              isScreenSharing ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Share Screen"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="20" height="14" x="2" y="3" rx="2" />
              <line x1="8" x2="16" y1="21" y2="21" />
              <line x1="12" x2="12" y1="17" y2="21" />
            </svg>
            <span>{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
          </button>

          {isAssignedTutor && classDetails?.isRecording && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-rose-500/40 bg-slate-950 px-2 py-1.5 shadow-sm sm:gap-2 sm:px-3">
              {isClassRecording ? (
                <>
                  <span className={`h-2.5 w-2.5 rounded-full ${isClassRecordingPaused ? "bg-amber-400" : "bg-rose-500 animate-pulse"}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-200">{isClassRecordingPaused ? "Paused" : "Recording"}</span>
                  <span className="hidden lg:inline text-[11px] font-black tabular-nums text-rose-200">
                    {Math.floor(classRecordingSeconds / 60).toString().padStart(2, "0")}:{(classRecordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <button type="button" onClick={pauseOrResumeClassRecording} className="min-h-9 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/20" title={isClassRecordingPaused ? "Resume recording" : "Pause recording"}>
                    {isClassRecordingPaused ? "▶ Resume" : "Ⅱ Pause"}
                  </button>
                  <button type="button" onClick={() => { if (window.confirm("End this recording and save it to your private recordings?")) stopClassRecording(); }} className="min-h-9 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-rose-500">
                    ■ End & Save
                  </button>
                </>
              ) : (
                <button type="button" disabled={isSavingClassRecording} onClick={startClassRecording} className="min-h-9 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-rose-500 disabled:opacity-50" title="Start recording the selected screen or browser tab and microphone">
                  {isSavingClassRecording ? "Saving…" : "● Start Recording"}
                </button>
              )}
              {localRecordingUrl && !isClassRecording && (
                <a
                  href={localRecordingUrl}
                  download={`brainlab-class-${classDetails?.id || "recording"}-${new Date().toISOString().slice(0, 10)}.webm`}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/15 px-3 py-1.5 text-[11px] font-extrabold text-blue-100 hover:bg-blue-500/25"
                  title="Download the recording directly to this device"
                >
                  ↓ Download to Device
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-[11px] font-bold text-slate-200" title="Connected participants in this classroom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span>{participants.filter((participant) => participant.role !== "host").length} students</span>
          </div>
          {isAssignedTutor && (
            <button type="button" onClick={takeAttendance} disabled={isTakingAttendance} className="rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-2.5 py-2 text-[11px] font-black text-emerald-200 hover:bg-emerald-600/25 disabled:opacity-50" title="Mark currently connected students present">
              {isTakingAttendance ? "Saving…" : "Attendance"}
            </button>
          )}

          {/* Quick Stage / Board Switcher */}
          <button
            type="button"
            onClick={() => setStageMode(stageMode === "audio" ? "whiteboard" : "audio")}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold border transition active-press ${
              stageMode === "whiteboard"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
            }`}
            title={stageMode === "whiteboard" ? "Switch to Video Stage" : "Switch to Smart Whiteboard"}
          >
            {stageMode === "whiteboard" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" />
                </svg>
                <span>Stage</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m18 2 4 4-12 12H6v-4L18 2Z" />
                </svg>
                <span>Board</span>
              </>
            )}
          </button>
        </div>

        {/* Center / Right: Chat & Hub Drawer Trigger (Mobile), Hand Raise, Exit */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Chat & Hub Drawer Button (visible on screens < lg) */}
          <button
            type="button"
            onClick={() => {
              setMobileDrawerOpen(!mobileDrawerOpen);
              setUnreadMessagesCount(0);
            }}
            className="lg:hidden relative flex items-center gap-1 rounded-xl border border-blue-500/40 bg-blue-600/20 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition active-press"
            title="Open Chat, Polls & Participants"
          >
            
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

          {isTutorOrModerator && (
            <>
              <button
                onClick={() => setShowModerationModal(true)}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition active-press"
                title="Classroom Permissions & Moderation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg><span>Mod</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("polls");
                  setIsCreatingPoll(true);
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition active-press"
                title="Launch instant live poll or quiz checkpoint"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg><span>Poll</span>
              </button>
            </>
          )}

          <button
            onClick={toggleHandRaise}
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold border transition active-press ${
              isHandRaised
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={isHandRaised ? "Lower Hand" : "Raise Hand"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
            <span className="hidden sm:inline">{isHandRaised ? "Lower" : "Hand"}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => sendReaction("insight")}
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-200 hover:bg-slate-700/80 hover:text-cyan-300 transition flex items-center gap-1 active-press"
              title="Understood!"
            >
              <svg className="h-3.5 w-3.5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/></svg>
              <span className="hidden xl:inline text-[11px]">Understood!</span>
            </button>
            <button
              type="button"
              onClick={() => sendReaction("fire")}
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-200 hover:bg-slate-700/80 hover:text-amber-400 transition flex items-center gap-1 active-press"
              title="Fire Explanation!"
            >
              <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>
              <span className="hidden xl:inline text-[11px]">Fire!</span>
            </button>
            <button
              type="button"
              onClick={() => sendReaction("notes")}
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-200 hover:bg-slate-700/80 hover:text-emerald-300 transition flex items-center gap-1 active-press"
              title="Taking Notes"
            >
              <svg className="h-3.5 w-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              <span className="hidden xl:inline text-[11px]">Notes</span>
            </button>
            <button
              type="button"
              onClick={() => sendReaction("applause")}
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-200 hover:bg-slate-700/80 hover:text-white transition flex items-center gap-1 active-press"
              title="Well Done!"
            >
              <svg className="h-3.5 w-3.5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </button>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-rose-500/40 bg-rose-600/20 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-white transition whitespace-nowrap active-press"
          >
            Exit
          </Link>
        </div>
      </footer>

      {/* End Class Lifecycle Modal */}
      <EndClassModal
        isOpen={showEndClassModal}
        classTitle={classDetails?.title || "Live Class Session"}
        isRecordingActive={isClassRecording}
        onConfirmEnd={handleConfirmEndClass}
        onClose={() => setShowEndClassModal(false)}
      />

      {/* Student View: Class Ended by Tutor Notification Modal */}
      {classEndedByTutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0B1536] p-6 text-center space-y-4 text-white shadow-2xl">
            <svg className="h-6 w-6 text-cyan-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            <h3 className="text-lg font-black text-white">Class Has Concluded</h3>
            <p className="text-xs text-slate-300">
              The tutor has concluded this live classroom session. Your attendance has been recorded.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-block w-full rounded-xl bg-[#1356E8] hover:bg-blue-600 py-2.5 text-xs font-black text-white shadow-lg transition"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
