"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
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
  status?: "pending" | "accepted" | "declined";
  request_by?: string;
  participants?: { user_id: string; role?: string; invite_status?: "pending" | "accepted" | "declined" }[];
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
  delivery_status?: "sent" | "delivered" | "read";
  read_at?: string | null;
};

type OnlinePeer = {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: "online" | "in_class" | "studying" | "away" | "offline";
  custom_status?: string | null;
  activity_context?: string;
  avatar_url?: string | null;
  last_heartbeat_at?: string;
  field?: string;
  is_self?: boolean;
  public_profile_slug?: string;
};

const CURATED_STUDY_CIRCLES = [
  {
    id: "pre_med",
    name: "Pre-Med & Healthcare Study Circle",
    icon: "🩺",
    description: "Biology, Chemistry, Physics & Human Physiology JAMB drills",
  },
  {
    id: "engineering",
    name: "Engineering & Physical Sciences Guild",
    icon: "⚙️",
    description: "Calculus, Mechanics, Thermodynamics & Technical Drawing",
  },
  {
    id: "legal",
    name: "Legal Studies & Humanities Syndicate",
    icon: "⚖️",
    description: "Government, Literature in English, CRS/IRS & History",
  },
  {
    id: "commercial",
    name: "Commercial & Management Sciences Circle",
    icon: "💼",
    description: "Economics, Financial Accounting, Commerce & Mathematics",
  },
  {
    id: "sprint_2026",
    name: "2026 JAMB/UTME Speed Sprint Group",
    icon: "⚡",
    description: "High-yield daily question marathons and past question speed drills",
  },
];

export default function MessagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Tab state: "chats" vs "peers"
  const [activeTab, setActiveTab] = useState<"chats" | "peers">("chats");
  const [conversationFilter, setConversationFilter] = useState<"all" | "circles" | "direct">("all");

  // Real member directory & presence state
  const [allPeers, setAllPeers] = useState<OnlinePeer[]>([]);
  const [onlinePeers, setOnlinePeers] = useState<OnlinePeer[]>([]);
  const [peerFilter, setPeerFilter] = useState<"all" | "online" | "tutors">("all");
  const [peersLoading, setPeersLoading] = useState(false);

  // Friends state (persisted locally)
  const [friendsList, setFriendsList] = useState<string[]>([]);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // Study Group invite modal state
  const [selectedPeerForGroup, setSelectedPeerForGroup] = useState<OnlinePeer | null>(null);
  const [customGroupName, setCustomGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Mentions autocomplete popup
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // 1. Authenticate and load initial conversations and friends list
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

      // Load saved friends from localStorage
      try {
        const savedFriends = localStorage.getItem(`brainlab_friends_${user.id}`);
        if (savedFriends) {
          setFriendsList(JSON.parse(savedFriends));
        }
      } catch (e) {
        console.warn("Could not load friends cache:", e);
      }

      // Load blocked users from server
      try {
        const blockRes = await fetch("/api/messages/block", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const blockJson = await blockRes.json();
        if (active && blockJson.success && Array.isArray(blockJson.blockedUsers)) {
          setBlockedUsers(blockJson.blockedUsers);
        }
      } catch (e) {
        console.warn("Could not load blocked users:", e);
      }

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

  // 2. Fetch Real Peers & Live Presence from /api/presence
  const fetchOnlinePeers = async () => {
    setPeersLoading(true);
    try {
      // Send presence heartbeat for current user
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "online",
            activityContext: "In Study Messages Portal",
          }),
        }).catch(() => {});
      }

      const res = await fetch("/api/presence");
      const json = await res.json();
      if (json.success) {
        const rawAll: OnlinePeer[] = Array.isArray(json.allPeers) ? json.allPeers : [];
        const rawActive: OnlinePeer[] = Array.isArray(json.activeUsers) ? json.activeUsers : [];

        // Exclude current user from peer list
        const otherAll = rawAll.filter((u) => u.user_id !== currentUser?.id);
        const otherActive = rawActive.filter((u) => u.user_id !== currentUser?.id);

        setAllPeers(otherAll);
        setOnlinePeers(otherActive);
      }
    } catch (e) {
      console.warn("Could not fetch presence:", e);
    } finally {
      setPeersLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      void fetchOnlinePeers();
      const interval = setInterval(() => void fetchOnlinePeers(), 12000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // 3. Load messages for active conversation
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
    const interval = setInterval(() => void loadMessages(false), 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeConvId]);

  // 4. Send text message
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
    setShowMentionSuggestions(false);

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

  // 5. Send recorded voice note
  const handleSendVoiceNote = async (blob: Blob, durationSeconds: number) => {
    if (!activeConvId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

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

    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        conversationId: activeConvId,
        content: "Voice note",
        messageType: "audio_note",
        audioAssetId: uploadJson.asset.id,
      }),
    });

    setIsRecordingVoice(false);
    toast.success("Voice note sent successfully!");
  };

  // 6. Toggle reaction
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

    const res = await fetch(`/api/messages?conversationId=${activeConvId}`, {
      headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    });
    const json = await res.json();
    if (json.success) setMessages(json.messages);
    toast.info(`Reaction updated: ${reaction}`);
  };

  // 7. Start / Open Direct Message with Peer
  const handleMessagePeer = async (peer: OnlinePeer) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          recipientId: peer.user_id,
          title: peer.display_name,
          type: "direct",
        }),
      });

      const json = await res.json();
      if (json.success && json.conversation) {
        // If not already in conversations list, prepend it
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === json.conversation.id);
          return exists ? prev : [json.conversation, ...prev];
        });
        setActiveConvId(json.conversation.id);
        setActiveTab("chats");
        setMobileShowChat(true);
        toast.success(`Chat opened with ${peer.display_name}`);
      } else {
        toast.error(json.error || "Could not open chat with peer.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start direct message.");
    }
  };

  // 8. Add Peer as Friend
  const handleAddFriend = async (peer: { user_id: string; display_name: string }) => {
    if (friendsList.includes(peer.user_id)) {
      toast.info(`${peer.display_name} is already your study buddy!`);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    try {
      const res = await fetch("/api/messages/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          friendId: peer.user_id,
          friendName: peer.display_name,
          action: "add",
        }),
      });

      const updated = [...friendsList, peer.user_id];
      setFriendsList(updated);
      if (currentUser) {
        localStorage.setItem(`brainlab_friends_${currentUser.id}`, JSON.stringify(updated));
      }
      toast.success(`You connected with ${peer.display_name}!`);
    } catch {
      toast.error("Could not send friend request.");
    }
  };

  // 8b-2. Block or Unblock Learner
  const handleToggleBlock = async (targetUserId: string, targetName: string) => {
    const isCurrentlyBlocked = blockedUsers.includes(targetUserId);
    const action = isCurrentlyBlocked ? "unblock" : "block";
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    try {
      const res = await fetch("/api/messages/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ targetUserId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (action === "block") {
          setBlockedUsers((prev) => [...prev, targetUserId]);
          toast.info(`${targetName} has been blocked.`);
        } else {
          setBlockedUsers((prev) => prev.filter((id) => id !== targetUserId));
          toast.success(`${targetName} has been unblocked.`);
        }
      } else {
        toast.error(data.error || "Could not update block status.");
      }
    } catch {
      toast.error("Network error while updating block status.");
    }
  };


  // 8c. Accept or Decline Message Request
  const handleAcceptConversation = async (convId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ conversationId: convId, action: "accept" }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, status: "accepted" } : c))
        );
        toast.success("Message request accepted! You can now chat.");
      } else {
        toast.error("Could not accept request.");
      }
    } catch {
      toast.error("Could not accept request.");
    }
  };

  const handleDeclineConversation = async (convId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ conversationId: convId, action: "decline" }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        setActiveConvId(null);
        toast.info("Message request declined.");
      } else {
        toast.error("Could not decline request.");
      }
    } catch {
      toast.error("Could not decline request.");
    }
  };

  // 8d. Accept or Decline Group Invite
  const handleAcceptGroupInvite = async (convId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ conversationId: convId, action: "accept_group" }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              participants: (c.participants || []).map((p: { user_id: string; role?: string; invite_status?: "pending" | "accepted" | "declined" }) =>
                p.user_id === currentUser?.id ? { ...p, invite_status: "accepted" as const } : p
              ),
            };
          })
        );
        toast.success("Joined study circle! Welcome to the group.");
      } else {
        toast.error("Could not accept group invitation.");
      }
    } catch {
      toast.error("Could not accept group invitation.");
    }
  };

  const handleDeclineGroupInvite = async (convId: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ conversationId: convId, action: "decline_group" }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        setActiveConvId(null);
        toast.info("Group invitation declined.");
      } else {
        toast.error("Could not decline group invite.");
      }
    } catch {
      toast.error("Could not decline group invite.");
    }
  };

  // 8b. Join or open an official BrainLab Study Circle (Stitch UI)
  const handleJoinCuratedCircle = async (circleName: string) => {
    const existing = conversations.find(
      (c) => c.title.toLowerCase().trim() === circleName.toLowerCase().trim()
    );
    if (existing) {
      setActiveConvId(existing.id);
      setActiveTab("chats");
      setMobileShowChat(true);
      toast.success(`Opened ${circleName}!`);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error("Please sign in to join study circles.");
      return;
    }

    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          title: circleName.trim(),
          type: "group",
        }),
      });

      const json = await res.json();
      if (json.success && json.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === json.conversation.id);
          return exists ? prev : [json.conversation, ...prev];
        });
        setActiveConvId(json.conversation.id);
        setActiveTab("chats");
        setMobileShowChat(true);
        toast.success(`Joined ${circleName}! Welcome to the circle`);
      } else {
        toast.error(json.error || "Could not join study circle.");
      }
    } catch {
      toast.error("Network error joining study circle.");
    }
  };

  // 9. Add Peer to Study Group
  const handleJoinOrCreateStudyGroup = async (groupTitle: string) => {
    if (!selectedPeerForGroup || !groupTitle.trim()) return;

    setCreatingGroup(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setCreatingGroup(false);
      return;
    }

    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          recipientId: selectedPeerForGroup.user_id,
          title: groupTitle.trim(),
          type: "group",
        }),
      });

      const json = await res.json();
      if (json.success && json.conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === json.conversation.id);
          return exists ? prev : [json.conversation, ...prev];
        });
        setActiveConvId(json.conversation.id);
        setActiveTab("chats");
        setMobileShowChat(true);
        setSelectedPeerForGroup(null);
        setCustomGroupName("");
        toast.success(`Added ${selectedPeerForGroup.display_name} to ${groupTitle}!`);
      } else {
        toast.error(json.error || "Could not complete study group addition.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update study group.");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Input change with @ mention detection
  const handleTextInputChange = (val: string) => {
    setTextInput(val);
    const lastAtPos = val.lastIndexOf("@");
    if (lastAtPos !== -1 && lastAtPos === val.length - 1) {
      setShowMentionSuggestions(true);
      setMentionQuery("");
    } else if (lastAtPos !== -1 && !val.slice(lastAtPos).includes(" ")) {
      setShowMentionSuggestions(true);
      setMentionQuery(val.slice(lastAtPos + 1).toLowerCase());
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleSelectMention = (name: string) => {
    const lastAtPos = textInput.lastIndexOf("@");
    if (lastAtPos !== -1) {
      const updated = `${textInput.slice(0, lastAtPos)}@${name} `;
      setTextInput(updated);
    }
    setShowMentionSuggestions(false);
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherPeerId =
    activeConv?.type === "direct"
      ? activeConv.participants?.find((p) => p.user_id !== currentUser?.id)?.user_id
      : null;
  const isPeerBlocked = otherPeerId ? blockedUsers.includes(otherPeerId) : false;
  const isFriend = otherPeerId ? friendsList.includes(otherPeerId) : true;
  const hasSentAnyMessage = messages.some((m) => m.sender_id === currentUser?.id);
  const myParticipant = activeConv?.participants?.find((p) => p.user_id === currentUser?.id);
  const isGroupInvitePending = Boolean(
    activeConv?.type === "group" &&
    myParticipant?.invite_status === "pending"
  );
  const isMessageRequestPending = Boolean(
    activeConv?.type === "direct" &&
    otherPeerId &&
    messages.length > 0 &&
    !hasSentAnyMessage &&
    !isFriend &&
    !isPeerBlocked
  );

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (conversationFilter === "circles") {
      list = list.filter((c) => c.type === "group");
    } else if (conversationFilter === "direct") {
      list = list.filter((c) => c.type !== "group");
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, conversationFilter, searchQuery]);

  const filteredOnlinePeers = useMemo(() => {
    let list =
      peerFilter === "online"
        ? onlinePeers
        : peerFilter === "tutors"
        ? allPeers.filter((p) => p.role === "tutor" || p.role === "admin")
        : allPeers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          (p.activity_context || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPeers, onlinePeers, peerFilter, searchQuery]);

  return (
    <main id="main" className="messages-page mx-auto max-w-7xl h-[calc(100vh-80px)] p-2 sm:p-6 flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Left Sidebar: Conversations & Online Peers */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight">Messages & Peers</h1>
              <p className="text-[11px] text-slate-500 font-medium">Connect, collaborate & study together</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              {onlinePeers.length} Online
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 p-1.5 m-3 rounded-2xl bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setActiveTab("chats")}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "chats"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Chats</span>
              <span className="rounded-full bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-bold">
                {conversations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("peers")}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "peers"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Peers & Members
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                {allPeers.length}
              </span>
            </button>
          </div>

          {/* Search Box with ⌘K Badge (Google Stitch Design) */}
          <div className="px-3 pb-2.5 border-b border-slate-100">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder={activeTab === "chats" ? "Search circles, mentors, formulas…" : "Search real classmates or tutors…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-12 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
              />
              <span className="absolute right-2.5 rounded bg-slate-200/70 px-1 py-0.5 text-[9px] font-bold text-slate-600 select-none">
                ⌘K
              </span>
            </div>

            {/* Sub-filter tabs for Chats */}
            {activeTab === "chats" && (
              <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setConversationFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                    conversationFilter === "all"
                      ? "bg-[#012153] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConversationFilter("circles")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 shrink-0 ${
                    conversationFilter === "circles"
                      ? "bg-purple-700 text-white shadow-2xs"
                      : "bg-purple-50 text-purple-800 hover:bg-purple-100"
                  }`}
                >
                  <span>Circles</span> ({conversations.filter((c) => c.type === "group").length})
                </button>
                <button
                  type="button"
                  onClick={() => setConversationFilter("direct")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 ${
                    conversationFilter === "direct"
                      ? "bg-blue-700 text-white shadow-2xs"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                  }`}
                >
                  Direct ({conversations.filter((c) => c.type !== "group").length})
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Conversations List */}
          {activeTab === "chats" && (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-3">
                  <ListSkeleton count={4} />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-3.5 space-y-3">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-center">
                    <p className="text-xs font-black text-blue-950">Join an Academic Study Circle</p>
                    <p className="mt-1 text-[11px] text-blue-800 leading-relaxed">
                      Connect with peers preparing for the same UTME &amp; WAEC subjects:
                    </p>
                  </div>
                  <div className="space-y-2">
                    {CURATED_STUDY_CIRCLES.map((circle) => (
                      <button
                        key={circle.id}
                        type="button"
                        onClick={() => void handleJoinCuratedCircle(circle.name)}
                        className="w-full p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left transition flex items-center justify-between group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl shrink-0">{circle.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                              {circle.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{circle.description}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-blue-700 bg-blue-100/70 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-lg transition ml-2">
                          Join →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  const isGroup = conv.type === "group";
                  const initials = isGroup
                    ? "👥"
                    : conv.title
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                  const isTutorTitle =
                    conv.title.toLowerCase().includes("tutor") ||
                    conv.title.toLowerCase().includes("engr") ||
                    conv.title.toLowerCase().includes("dr.");

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-3 transition flex items-start gap-3 hover:bg-slate-50 active-press border-b border-slate-100 ${
                        isSelected ? "bg-blue-50/80 border-l-4 border-blue-700" : ""
                      }`}
                    >
                      {/* Monogram Avatar with Emerald Ring (Google Stitch) */}
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl text-white font-black text-xs shadow-xs ${
                            isGroup
                              ? "bg-gradient-to-tr from-purple-700 to-indigo-600"
                              : isTutorTitle
                              ? "bg-slate-900 text-amber-300 border border-amber-400/40"
                              : "bg-blue-700"
                          }`}
                        >
                          {initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h2 className="text-xs font-bold text-slate-900 truncate">
                              {conv.title}
                            </h2>
                            {isTutorTitle && (
                              <span className="rounded bg-amber-100 text-amber-900 text-[8px] font-black uppercase px-1 py-0.2 shrink-0">
                                TUTOR
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {new Date(conv.last_message_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {conv.messages?.[0]?.content || (isGroup ? "Academic group collaboration" : "Direct messaging")}
                        </p>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                            {isGroup ? "Study Circle" : "Direct Message"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Real Member Directory & Presence */}
          {activeTab === "peers" && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>Real Learners & Instructors</span>
                <button
                  onClick={() => void fetchOnlinePeers()}
                  className="text-blue-700 hover:text-blue-900 font-bold hover:underline"
                >
                  ↻ Refresh Live Status
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 px-2 pb-1 overflow-x-auto">
                <button
                  onClick={() => setPeerFilter("all")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    peerFilter === "all"
                      ? "bg-[#012153] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Learners ({allPeers.length})
                </button>
                <button
                  onClick={() => setPeerFilter("online")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 ${
                    peerFilter === "online"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Online ({onlinePeers.length})
                </button>
                <button
                  onClick={() => setPeerFilter("tutors")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    peerFilter === "tutors"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Tutors
                </button>
              </div>

              {peersLoading && allPeers.length === 0 ? (
                <div className="p-3">
                  <ListSkeleton count={4} />
                </div>
              ) : filteredOnlinePeers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {peerFilter === "online"
                    ? "No other classmates are currently active right now. Switch to 'All Learners' to send an offline message!"
                    : "No members match your search query."}
                </div>
              ) : (
                filteredOnlinePeers.map((peer) => {
                  const isFriend = friendsList.includes(peer.user_id);
                  const isTutor = peer.role === "tutor" || peer.role === "admin";
                  const isInClass = peer.status === "in_class";
                  const isOnline = peer.status !== "offline";

                  return (
                    <div
                      key={peer.user_id}
                      className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl font-bold text-sm text-white ${
                                isTutor
                                  ? "bg-gradient-to-tr from-amber-600 to-orange-500"
                                  : "bg-gradient-to-tr from-blue-700 to-cyan-600"
                              }`}
                            >
                              {peer.display_name.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                isInClass
                                  ? "bg-amber-500"
                                  : isOnline
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-slate-300"
                              }`}
                              title={isInClass ? "In Live Class" : isOnline ? "Online Now" : "Offline"}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xs font-bold text-slate-900 truncate">
                                {peer.display_name}
                              </h3>
                              {isTutor && (
                                <span className="rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                                  Tutor
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                              @{peer.display_name.toLowerCase().replace(/[^a-z0-9]/g, "")} · Verified Scholar
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isInClass
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : isOnline
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isInClass
                                ? "bg-amber-500"
                                : isOnline
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {isInClass ? "In Class" : isOnline ? "Online" : "Offline"}
                        </span>
                      </div>

                      {/* Context indicator */}
                      <p className="text-[11px] text-slate-600 bg-slate-50 rounded-xl px-2.5 py-1 font-medium truncate flex items-center gap-1 border border-slate-100">
                        <span>{isOnline ? "🟢" : "⚪"}</span> {peer.activity_context || (isOnline ? "Active on BrainLab" : "Offline")}
                      </p>

                      {/* 3 Direct Actions: Message, Add Friend, Add to Study Group */}
                      <div className={`grid ${isTutor ? "grid-cols-4" : "grid-cols-3"} gap-1.5 pt-1`}>
                        <button
                          onClick={() => void handleMessagePeer(peer)}
                          className="flex items-center justify-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-2 py-1.5 text-[11px] font-bold text-blue-900 hover:bg-blue-100 transition active-press"
                          title="Start direct conversation"
                        >
                          <span>Message</span>
                        </button>

                        {isTutor && (peer.public_profile_slug ? (
                          <Link
                            href={`/tutors/${peer.public_profile_slug}`}
                            className="flex items-center justify-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition"
                            title="View tutor profile"
                          >
                            Profile
                          </Link>
                        ) : (
                          <span className="flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 px-1.5 py-1.5 text-[10px] font-semibold text-slate-500" title="This tutor is completing their public profile">
                            Profile pending
                          </span>
                        ))}

                        <button
                          onClick={() => void handleAddFriend(peer)}
                          className={`flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold transition active-press ${
                            isFriend
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-default"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                          title={isFriend ? "Already study buddies" : "Add as study partner"}
                        >
                          <span>{isFriend ? "✓" : "🤝"}</span> {isFriend ? "Friend" : "Add Friend"}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedPeerForGroup(peer);
                            setCustomGroupName(`${peer.display_name} & ${currentUser?.user_metadata?.full_name || "Me"} Study Circle`);
                          }}
                          className="flex items-center justify-center gap-1 rounded-xl bg-purple-50 border border-purple-200 px-2 py-1.5 text-[11px] font-bold text-purple-900 hover:bg-purple-100 transition active-press"
                          title="Invite to Study Circle"
                        >
                          <span>Group</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
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
              <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden text-slate-600 hover:text-slate-900 font-bold text-sm px-2 py-1 rounded-lg bg-slate-100"
                  >
                    ← Back
                  </button>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl text-white font-bold text-sm ${
                      activeConv.type === "group"
                        ? "bg-gradient-to-tr from-purple-700 to-indigo-600"
                        : "bg-[#012153]"
                    }`}
                  >
                    {activeConv.type === "group" ? "👥" : activeConv.title.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                      {activeConv.title}
                      {activeConv.type === "group" && (
                        <span className="rounded-md bg-purple-100 text-purple-800 text-[9px] font-extrabold px-1.5 py-0.2">
                          Group
                        </span>
                      )}
                    </h2>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {activeConv.type === "group" ? "Study Circle Collaboration" : "Direct Message Channel"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.type === "direct" && otherPeerId && (
                    <button
                      type="button"
                      onClick={() => void handleToggleBlock(otherPeerId, activeConv.title)}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition active-press ${
                        isPeerBlocked
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      }`}
                      title={isPeerBlocked ? "Unblock this learner" : "Block this learner"}
                    >
                      <span>{isPeerBlocked ? "✓" : "🚫"}</span>
                      <span>{isPeerBlocked ? "Unblock" : "Block"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab("peers");
                      setMobileShowChat(false);
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>🟢</span> Online Peers
                  </button>
                  <Link
                    href="/dashboard"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>

              {/* Group Invitation Banner */}
              {isGroupInvitePending && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👥</span>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">
                        Group Invitation to {activeConv.title}
                      </h4>
                      <p className="text-[11px] text-blue-800">
                        You were invited to join this study circle. Accept to participate in discussions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleAcceptGroupInvite(activeConv.id)}
                      className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition active-press"
                    >
                      ✓ Accept Invitation
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeclineGroupInvite(activeConv.id)}
                      className="rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold transition active-press"
                    >
                      ✕ Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Message Request Notification Banner */}
              {isMessageRequestPending && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📩</span>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Message Request from {activeConv.title}
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        This learner wants to start a study conversation with you. Accept to allow replies.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (otherPeerId) {
                          void handleAddFriend({ user_id: otherPeerId, display_name: activeConv.title });
                          toast.success(`Accepted message request from ${activeConv.title}!`);
                        }
                      }}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active-press"
                    >
                      Accept Request
                    </button>
                    <button
                      type="button"
                      onClick={() => otherPeerId && void handleToggleBlock(otherPeerId, activeConv.title)}
                      className="rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 px-3 py-1.5 text-xs font-bold transition active-press"
                    >
                      Decline & Block
                    </button>
                  </div>
                </div>
              )}

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
                  <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 p-8 text-center">
                    <span className="text-3xl mb-2">💬</span>
                    <p className="font-bold text-slate-600">Start the discussion</p>
                    <p className="mt-1 max-w-xs text-slate-400">
                      Send a question, exam strategy, voice memo, or type <strong>@</strong> to mention someone.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const isTutorMsg = msg.message_type === "tutor" || msg.sender_id?.includes("tutor");
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        {/* Tutor badge over message */}
                        {isTutorMsg && !isMe && (
                          <span className="mb-1 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase px-1.5 py-0.2 flex items-center gap-1">
                            Official Tutor Response
                          </span>
                        )}
                        <div
                          className={`max-w-md rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                            isMe
                              ? "bg-[#012153] text-white rounded-br-none"
                              : isTutorMsg
                              ? "bg-amber-50/70 text-slate-900 border-2 border-amber-300 rounded-bl-none"
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
                            <p className="whitespace-pre-wrap">{msg.content}</p>
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
                            {isMe && (
                              <span
                                className={
                                  msg.delivery_status === "read"
                                    ? "font-extrabold text-cyan-300 drop-shadow-xs"
                                    : msg.delivery_status === "delivered"
                                    ? "text-blue-200 font-semibold"
                                    : "text-blue-300/80 font-normal"
                                }
                                title={
                                  msg.delivery_status === "read"
                                    ? "Read (Seen)"
                                    : msg.delivery_status === "delivered"
                                    ? "Delivered"
                                    : "Sent"
                                }
                              >
                                {msg.delivery_status === "sent" ? "✓" : "✓✓"}
                              </span>
                            )}
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

              {/* Bottom Input Deck with @ Mention Suggestions */}
              <div className="p-3 border-t border-slate-200 bg-white relative">
                {/* Autocomplete mention popover */}
                {showMentionSuggestions && (
                  <div className="absolute bottom-full left-4 mb-2 w-64 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl z-20 p-1.5 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Mention a classmate or tutor
                    </div>
                    {allPeers
                      .filter((p) => p.display_name.toLowerCase().includes(mentionQuery))
                      .slice(0, 6)
                      .map((p) => (
                        <button
                          key={p.user_id}
                          type="button"
                          onClick={() => handleSelectMention(p.display_name)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 flex items-center gap-2 text-xs transition"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#012153] text-[10px] text-white font-bold">
                            {p.display_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate text-[11px]">{p.display_name}</p>
                            <p className="text-[9px] text-slate-400 truncate">{p.field || p.role}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}

                {isPeerBlocked ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                    <p className="text-xs font-bold text-rose-900">
                      You have blocked {activeConv.title}. You cannot send or receive messages from this learner.
                    </p>
                    <button
                      type="button"
                      onClick={() => otherPeerId && void handleToggleBlock(otherPeerId, activeConv.title)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active-press"
                    >
                      <span>Unblock</span> {activeConv.title}
                    </button>
                  </div>
                ) : isGroupInvitePending ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="text-xs font-bold text-blue-900">
                      Accept the group invitation above to participate and send messages in {activeConv.title}.
                    </p>
                    <div className="mt-2.5 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAcceptGroupInvite(activeConv.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition active-press"
                      >
                        <span>✓ Accept Invitation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeclineGroupInvite(activeConv.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active-press"
                      >
                        <span>✕ Decline</span>
                      </button>
                    </div>
                  </div>
                ) : isMessageRequestPending ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                    <p className="text-xs font-bold text-amber-900">
                      Accept the message request above to reply to {activeConv.title}.
                    </p>
                    <div className="mt-2.5 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (otherPeerId) {
                            void handleAddFriend({ user_id: otherPeerId, display_name: activeConv.title });
                            toast.success(`Accepted message request from ${activeConv.title}!`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active-press"
                      >
                        <span>Accept Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => otherPeerId && void handleToggleBlock(otherPeerId, activeConv.title)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-rose-200 px-4 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition active-press"
                      >
                        <span>Block</span>
                      </button>
                    </div>
                  </div>
                ) : isRecordingVoice ? (
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

                    <button
                      type="button"
                      onClick={() => {
                        handleTextInputChange(`${textInput}@`);
                        setShowMentionSuggestions(true);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition active-press font-bold text-xs"
                      title="Mention someone (@)"
                    >
                      @
                    </button>

                    <input
                      type="text"
                      placeholder="Type a message or @mention a peer…"
                      value={textInput}
                      onChange={(e) => handleTextInputChange(e.target.value)}
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
              <h2 className="mt-3 text-base font-bold text-slate-700">Select a Conversation or Connect with a Peer</h2>
              <p className="mt-1 text-xs max-w-sm text-slate-500">
                Choose a conversation from the left, or browse the <strong>Online Peers</strong> tab to start studying
                with active classmates right now.
              </p>
              <button
                onClick={() => setActiveTab("peers")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-900 transition"
              >
                Browse All Real Learners & Peers ({allPeers.length})
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modal: Add Peer to Study Group */}
      {selectedPeerForGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-950">Add to Study Circle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invite <strong className="text-blue-900">{selectedPeerForGroup.display_name}</strong> to a BrainLab
                  Study Circle
                </p>
              </div>
              <button
                onClick={() => setSelectedPeerForGroup(null)}
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Circles Selector */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select an Academic Circle
              </p>
              {CURATED_STUDY_CIRCLES.map((circle) => (
                <button
                  key={circle.id}
                  disabled={creatingGroup}
                  onClick={() => void handleJoinOrCreateStudyGroup(circle.name)}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-purple-50/80 hover:border-purple-300 transition flex items-center gap-3 active-press"
                >
                  <span className="text-2xl shrink-0">{circle.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{circle.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{circle.description}</p>
                  </div>
                  <span className="text-xs font-black text-purple-700">Add →</span>
                </button>
              ))}
            </div>

            {/* Custom Circle Creation */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-500">Or Create a Custom Study Group:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. UNILAG Post-UTME Sprint Circle"
                  value={customGroupName}
                  onChange={(e) => setCustomGroupName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                />
                <button
                  disabled={!customGroupName.trim() || creatingGroup}
                  onClick={() => void handleJoinOrCreateStudyGroup(customGroupName)}
                  className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-purple-800 disabled:opacity-50 transition"
                >
                  {creatingGroup ? "Adding…" : "Create & Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
