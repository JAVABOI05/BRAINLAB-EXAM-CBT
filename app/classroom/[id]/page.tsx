"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLearnerTheme } from "../../components/LearnerThemeProvider";
import type {
  Participant,
  ClassroomMessage,
  LiveRoomTokenResponse,
} from "../../lib/liveClassroom/types";

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

  // Roster
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [reactionFloat, setReactionFloat] = useState<{ id: string; emoji: string }[]>([]);

  // Video streams refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
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

        // Welcoming chat message
        setMessages([
          {
            id: "msg_welcome",
            senderId: "system",
            senderName: "BrainLab Classroom",
            text: `Welcome to ${json.data.classDetails.title}. Please keep your microphone muted unless invited to speak.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

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
          }
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
      alert("Audio publishing is restricted for this session or requires host permission.");
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
      alert("Unable to access microphone. Check browser permissions.");
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
    } catch {
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
    } catch {
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
    setShowMentions(false);

    // Broadcast in real-time to all classroom participants
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "chat_message",
        payload: { message: newMsg },
      });
    } catch (broadcastErr) {
      console.warn("Could not broadcast message:", broadcastErr);
    }
  };

  // 5b. Voice Note Recording & Media Handlers
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
      alert("Microphone permission was denied or not available on this device.");
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
      recorder.onstop = () => {
        if (send && audioChunksRef.current.length > 0 && currentUser) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const newMsg: ClassroomMessage = {
            id: `msg_audio_${Date.now()}`,
            senderId: currentUser.id,
            senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
            text: "Voice Note",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isHost: classDetails?.tutorId === currentUser.id,
            type: "audio",
            mediaUrl: audioUrl,
            duration: Math.max(1, duration),
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      };
      recorder.stop();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newMsg: ClassroomMessage = {
          id: `msg_img_${Date.now()}`,
          senderId: currentUser.id,
          senderName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Me",
          text: file.name || "Academic diagram / problem snapshot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isHost: classDetails?.tutorId === currentUser.id,
          type: "image",
          mediaUrl: dataUrl,
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    };
    reader.readAsDataURL(file);
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
      alert("Provide a question and at least 2 answer choices.");
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
      alert(err.message || "Failed to launch poll.");
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
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors duration-150">
      {/* Top Header Bar */}
      <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="text-sm font-black text-blue-400 hover:text-blue-300">
            BrainLab Live
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
            {classDetails?.title || "Live Class"}
          </h1>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-400 border border-emerald-500/20">
            Live
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              networkQuality === "excellent"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : networkQuality === "good"
                ? "bg-blue-950 text-blue-400 border border-blue-800"
                : "bg-amber-950 text-amber-400 border border-amber-800"
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

          <button
            type="button"
            onClick={() => setAppearance(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-2xs"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
          >
            <span>{resolvedTheme === "dark" ? "☀️" : "🌙"}</span>
            <span className="hidden sm:inline">{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
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
            <div key={r.id} className="text-4xl animate-bounce transition duration-1000 ease-out">
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Video / Stage Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-200/70 dark:bg-slate-950 relative transition-colors">
          <div className="w-full h-full max-w-5xl rounded-2xl border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {isVideoEnabled || isScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="flex flex-col items-center text-center p-6 max-w-xl">
                {/* Audio Wave Visualizer */}
                <div className="flex items-center gap-1.5 h-14 mb-4 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-inner">
                  {[20, 36, 16, 48, 30, 52, 24, 44, 18, 34, 48, 22].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${(i % 4) * 180}ms`,
                        animationDuration: "1.1s",
                      }}
                    />
                  ))}
                </div>

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

                {/* Quick Stage Actions */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={isRecordingAudio}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5"
                  >
                    <span>🎙️ Record Voice Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5"
                  >
                    <span>📷 Share Diagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("polls");
                      if (isTutorOrModerator) setIsCreatingPoll(true);
                    }}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-bold text-amber-300 transition flex items-center gap-1.5"
                  >
                    <span>🎯 Launch / View Polls</span>
                  </button>
                </div>

                {classDetails?.isRecording && (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-xs font-semibold text-rose-300">
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

            {/* IN-STAGE FLOATING LIVE QUIZ / POLL HUD */}
            {activePoll && (
              <div className="absolute bottom-4 right-4 z-20 w-80 sm:w-96 rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      {activePoll.is_open ? "Live Quiz Checkpoint" : "Quiz Checkpoint Result"}
                    </span>
                  </div>
                  {activePoll.is_open && pollCountdown !== null && (
                    <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-800">
                      ⏱️ {pollCountdown}s
                    </span>
                  )}
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
                      <span className={`font-bold ${m.isHost ? "text-amber-400" : "text-blue-400"}`}>
                        {m.senderName} {m.isHost && "(Tutor)"}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.timestamp}</span>
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

        {/* Center: Hand Raise & Quick Reactions */}
        <div className="flex items-center gap-2">
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
