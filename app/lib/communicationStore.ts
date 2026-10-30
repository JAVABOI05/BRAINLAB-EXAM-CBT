import { getSupabaseServerClient } from "./supabaseServer";

export interface RealPeer {
  user_id: string;
  display_name: string;
  email: string;
  role: "admin" | "tutor" | "student";
  status: "online" | "in_class" | "studying" | "away" | "offline";
  custom_status?: string | null;
  activity_context?: string;
  avatar_url?: string | null;
  last_heartbeat_at?: string;
  is_self?: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: "text" | "audio_note" | "announcement" | "resource";
  audio_asset_id?: string | null;
  audio_url?: string | null;
  duration_seconds?: number;
  reply_to_id?: string | null;
  created_at: string;
  reactions?: Record<string, string[]>; // emoji -> array of user_ids
  delivery_status?: "sent" | "delivered" | "read";
  read_at?: string | null;
}

export interface ChatConversation {
  id: string;
  type: "direct" | "group" | "cohort";
  title: string;
  course_id?: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
  last_message_preview?: string;
  participants: {
    user_id: string;
    role: string;
    last_read_at?: string;
    invite_status?: "pending" | "accepted" | "declined";
  }[];
  other_participant?: RealPeer | null;
  unread_count?: number;
  status?: "pending" | "accepted" | "declined";
  request_by?: string;
}

// ----------------------------------------------------------------------------
// Presence & Real Peer Directory
// ----------------------------------------------------------------------------

export async function recordUserHeartbeat(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  options: {
    status?: "online" | "in_class" | "studying" | "away";
    customStatus?: string;
    currentClassId?: string;
    activityContext?: string;
    isVisible?: boolean;
  }
) {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const status = options.status || "online";
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const displayName =
    (typeof metadataName === "string" ? metadataName : null) ||
    user.email?.split("@")[0] ||
    "BrainLab Member";

  // Check admin role
  const { data: adminRecord } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role: "admin" | "tutor" | "student" = adminRecord?.role
    ? adminRecord.role === "super_admin" || adminRecord.role === "platform_admin"
      ? "admin"
      : "tutor"
    : "student";

  const entry: RealPeer = {
    user_id: user.id,
    display_name: displayName,
    email: user.email || "",
    role,
    status,
    custom_status: options.customStatus || null,
    activity_context:
      options.activityContext ||
      (options.currentClassId ? "In Live Classroom" : "Studying in BrainLab"),
    avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    last_heartbeat_at: now,
  };

  // Try native table first
  try {
    const { error } = await supabase.from("user_presence").upsert({
      user_id: user.id,
      status: entry.status,
      custom_status: entry.custom_status,
      current_class_id: options.currentClassId || null,
      last_heartbeat_at: now,
      is_visible: options.isVisible !== false,
      metadata: {
        display_name: entry.display_name,
        role: entry.role,
        avatar_url: entry.avatar_url,
        activity_context: entry.activity_context,
      },
    });

    if (!error) return { success: true, timestamp: now };
  } catch {
    // Ignore and proceed to resilient config fallback
  }

  // Fallback: Store in exam_config
  try {
    const { data: row } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "platform_user_presence")
      .maybeSingle();

    const currentPresenceMap: Record<string, RealPeer> =
      row && typeof row.config_value === "object" && row.config_value !== null
        ? row.config_value
        : {};

    currentPresenceMap[user.id] = entry;

    await supabase.from("exam_config").upsert(
      {
        config_key: "platform_user_presence",
        config_value: currentPresenceMap,
        updated_at: now,
      },
      { onConflict: "config_key" }
    );

    return { success: true, timestamp: now };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getRealPeersAndPresence(currentUserId?: string) {
  const supabase = getSupabaseServerClient();
  const thresholdMs = 180 * 1000; // 3 minutes
  const nowMs = Date.now();

  // 1. Load real registered users from auth.admin
  type AuthUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };
  let realUsers: AuthUser[] = [];
  try {
    const { data: authData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    realUsers = authData?.users || [];
  } catch (err) {
    console.warn("Could not list auth users:", err);
  }

  // 2. Load admin users to map staff roles
  const adminUsersMap = new Map<string, string>();
  try {
    const { data: adminRows } = await supabase.from("admin_profiles").select("user_id, role");
    for (const a of adminRows || []) {
      adminUsersMap.set(a.user_id, a.role);
    }
  } catch {
    // ignore
  }

  // 3. Load presence map from user_presence or exam_config
  let presenceMap: Record<string, { status?: RealPeer["status"]; custom_status?: string | null; last_heartbeat_at?: string; activity_context?: string; display_name?: string }> = {};

  try {
    const thresholdDate = new Date(nowMs - thresholdMs).toISOString();
    const { data: presences, error } = await supabase
      .from("user_presence")
      .select("*")
      .gte("last_heartbeat_at", thresholdDate);

    if (!error && Array.isArray(presences)) {
      for (const p of presences) {
        presenceMap[p.user_id] = {
          status: p.status,
          custom_status: p.custom_status,
          last_heartbeat_at: p.last_heartbeat_at,
          activity_context: p.metadata?.activity_context,
          display_name: p.metadata?.display_name,
        };
      }
    } else {
      throw new Error("fallback to config");
    }
  } catch {
    try {
      const { data: row } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", "platform_user_presence")
        .maybeSingle();

      if (row && typeof row.config_value === "object" && row.config_value !== null) {
        presenceMap = row.config_value as typeof presenceMap;
      }
    } catch {
      // ignore
    }
  }

  // 4. Transform all real users into RealPeer list
  const allPeers: RealPeer[] = realUsers.map((u) => {
    const p = presenceMap[u.id];
    const lastHeartbeat = p?.last_heartbeat_at;
    const isOnline = lastHeartbeat
      ? nowMs - new Date(lastHeartbeat).getTime() < thresholdMs
      : false;

    const adminRole = adminUsersMap.get(u.id);
    const role: "admin" | "tutor" | "student" = adminRole
      ? adminRole === "super_admin" || adminRole === "platform_admin"
        ? "admin"
        : "tutor"
      : u.user_metadata?.role === "tutor"
      ? "tutor"
      : "student";

    const displayName =
      (typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name : null) ||
      (typeof u.user_metadata?.name === "string" ? u.user_metadata.name : null) ||
      p?.display_name ||
      u.email?.split("@")[0] ||
      "Learner";

    return {
      user_id: u.id,
      display_name: displayName,
      email: u.id === currentUserId ? (u.email || "") : (u.user_metadata?.hide_email === false ? (u.email || "") : ""),
      role,
      status: isOnline ? (p?.status || "online") : "offline",
      custom_status: isOnline ? p?.custom_status || null : null,
      activity_context: isOnline
        ? p?.activity_context || "Active on BrainLab"
        : lastHeartbeat
        ? `Last seen ${formatRelativeTime(lastHeartbeat)}`
        : "Registered Candidate",
      avatar_url: typeof u.user_metadata?.avatar_url === "string" ? u.user_metadata.avatar_url : null,
      last_heartbeat_at: lastHeartbeat || undefined,
      is_self: u.id === currentUserId,
    };
  });

  // Sort: online first, then tutors/admins, then name
  allPeers.sort((a, b) => {
    if (a.status !== "offline" && b.status === "offline") return -1;
    if (a.status === "offline" && b.status !== "offline") return 1;
    if (a.role !== "student" && b.role === "student") return -1;
    if (a.role === "student" && b.role !== "student") return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const activeUsers = allPeers.filter((p) => p.status !== "offline");

  return {
    allPeers,
    activeUsers,
    onlineCount: activeUsers.length,
    inClassCount: activeUsers.filter((p) => p.status === "in_class").length,
    tutorCount: activeUsers.filter((p) => p.role === "tutor" || p.role === "admin").length,
  };
}

// ----------------------------------------------------------------------------
// Conversations Management
// ----------------------------------------------------------------------------

export async function getUserConversations(userId: string): Promise<ChatConversation[]> {
  const supabase = getSupabaseServerClient();
  const { allPeers } = await getRealPeersAndPresence(userId);
  const peersById = new Map<string, RealPeer>(allPeers.map((p) => [p.user_id, p]));

  // Try native tables first
  try {
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, role, last_read_at")
      .eq("user_id", userId);

    if (!partError && Array.isArray(participations)) {
      if (participations.length === 0) return [];
      const convIds = participations.map((p) => p.conversation_id);

      const { data: convs, error: convError } = await supabase
        .from("conversations")
        .select("*, messages(content, created_at, sender_id, message_type), conversation_participants(user_id, role)")
        .in("id", convIds)
        .order("last_message_at", { ascending: false });

      if (!convError && Array.isArray(convs)) {
        return (convs as unknown as Array<{
          id: string; type?: ChatConversation["type"]; title?: string | null; created_by: string;
          created_at: string; last_message_at?: string | null;
          messages?: { content?: string | null; created_at: string; sender_id: string; message_type: string }[];
          conversation_participants?: { user_id: string; role: string }[];
        }>).map((c) => {
          const parts = c.conversation_participants || [];
          const otherId = parts.find((p: { user_id: string }) => p.user_id !== userId)?.user_id;
          const other = otherId ? peersById.get(otherId) || null : null;
          const lastMsg = c.messages?.[c.messages.length - 1];

          return {
            id: c.id,
            type: c.type || "direct",
            title: c.type === "direct" && other ? other.display_name : c.title || "Conversation",
            created_by: c.created_by,
            created_at: c.created_at,
            last_message_at: c.last_message_at || c.created_at,
            last_message_preview: lastMsg?.content || "No messages yet",
            participants: parts,
            other_participant: other,
          };
        });
      }
    }
  } catch {
    // Proceed to fallback
  }

  // Fallback: Read from exam_config
  try {
    const { data: row } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "platform_chat_conversations")
      .maybeSingle();

    const convsMap: Record<string, ChatConversation> =
      row && typeof row.config_value === "object" && row.config_value !== null
        ? row.config_value
        : {};

    const list = Object.values(convsMap).filter((c) =>
      c.participants?.some((p) => p.user_id === userId)
    );

    // Enrich with current presence & title
    return list
      .map((c) => {
        const otherId = c.participants?.find((p) => p.user_id !== userId)?.user_id;
        const other = otherId ? peersById.get(otherId) || null : null;
        return {
          ...c,
          title: c.type === "direct" && other ? other.display_name : c.title,
          other_participant: other,
        };
      })
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  } catch (err) {
    console.warn("Could not load conversations from config fallback:", err);
    return [];
  }
}

export async function createOrGetDirectChat(
  userId: string,
  recipientId: string
): Promise<ChatConversation> {
  const supabase = getSupabaseServerClient();
  const { allPeers } = await getRealPeersAndPresence(userId);
  const peersById = new Map<string, RealPeer>(allPeers.map((p) => [p.user_id, p]));
  const recipient = peersById.get(recipientId);

  const defaultTitle = recipient?.display_name || "Direct Message";
  const now = new Date().toISOString();

  // Try native tables first
  try {
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myConvs && myConvs.length > 0) {
      const cIds = myConvs.map((c) => c.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id, conversations!inner(id, type, title, last_message_at)")
        .eq("user_id", recipientId)
        .in("conversation_id", cIds);

      const directMatch = (shared as unknown as Array<{ conversation_id: string; conversations: { type: string } | null }> | null)?.find((s) => s.conversations?.type === "direct");
      if (directMatch) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("*, messages(content, created_at, sender_id, message_type)")
          .eq("id", directMatch.conversation_id)
          .single();

        if (existing) {
          return {
            id: existing.id,
            type: "direct",
            title: defaultTitle,
            created_by: existing.created_by,
            created_at: existing.created_at,
            last_message_at: existing.last_message_at || existing.created_at,
            participants: [
              { user_id: userId, role: "admin" },
              { user_id: recipientId, role: "member" },
            ],
            other_participant: recipient || null,
          };
        }
      }
    }

    // Insert native
    const { data: newConv, error: newConvErr } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        title: defaultTitle,
        created_by: userId,
      })
      .select()
      .single();

    if (!newConvErr && newConv) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: userId, role: "admin" },
        { conversation_id: newConv.id, user_id: recipientId, role: "member" },
      ]);

      return {
        id: newConv.id,
        type: "direct",
        title: defaultTitle,
        created_by: userId,
        created_at: newConv.created_at,
        last_message_at: newConv.last_message_at || newConv.created_at,
        participants: [
          { user_id: userId, role: "admin" },
          { user_id: recipientId, role: "member" },
        ],
        other_participant: recipient || null,
      };
    }
  } catch {
    // Proceed to fallback
  }

  // Fallback: exam_config
  const { data: row } = await supabase
    .from("exam_config")
    .select("config_value")
    .eq("config_key", "platform_chat_conversations")
    .maybeSingle();

  const convsMap: Record<string, ChatConversation> =
    row && typeof row.config_value === "object" && row.config_value !== null
      ? row.config_value
      : {};

  // Find existing direct chat between these two
  const existing = Object.values(convsMap).find(
    (c) =>
      c.type === "direct" &&
      c.participants?.some((p) => p.user_id === userId) &&
      c.participants?.some((p) => p.user_id === recipientId)
  );

  if (existing) {
    return {
      ...existing,
      title: defaultTitle,
      other_participant: recipient || null,
    };
  }

  // Create new direct conversation
  const newId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdConv: ChatConversation = {
    id: newId,
    type: "direct",
    title: defaultTitle,
    created_by: userId,
    created_at: now,
    last_message_at: now,
    last_message_preview: "Direct conversation started",
    participants: [
      { user_id: userId, role: "admin" },
      { user_id: recipientId, role: "member" },
    ],
    other_participant: recipient || null,
  };

  convsMap[newId] = createdConv;

  await supabase.from("exam_config").upsert(
    {
      config_key: "platform_chat_conversations",
      config_value: convsMap,
      updated_at: now,
    },
    { onConflict: "config_key" }
  );

  return createdConv;
}

export async function createGroupChat(
  userId: string,
  title: string,
  memberIds: string[]
): Promise<ChatConversation> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const allParticipantIds = Array.from(new Set([userId, ...memberIds]));

  // Fallback map storage
  const { data: row } = await supabase
    .from("exam_config")
    .select("config_value")
    .eq("config_key", "platform_chat_conversations")
    .maybeSingle();

  const convsMap: Record<string, ChatConversation> =
    row && typeof row.config_value === "object" && row.config_value !== null
      ? row.config_value
      : {};

  const newId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdConv: ChatConversation = {
    id: newId,
    type: "group",
    title: title.trim(),
    created_by: userId,
    created_at: now,
    last_message_at: now,
    last_message_preview: "Study circle created",
    participants: allParticipantIds.map((id) => ({
      user_id: id,
      role: id === userId ? "admin" : "member",
      invite_status: id === userId ? ("accepted" as const) : ("pending" as const),
    })),
  };

  convsMap[newId] = createdConv;

  await supabase.from("exam_config").upsert(
    {
      config_key: "platform_chat_conversations",
      config_value: convsMap,
      updated_at: now,
    },
    { onConflict: "config_key" }
  );

  return createdConv;
}

// ----------------------------------------------------------------------------
// Messages Management
// ----------------------------------------------------------------------------

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  readerUser?: { id: string; user_metadata?: Record<string, unknown> }
): Promise<ChatMessage[]> {
  const supabase = getSupabaseServerClient();
  const { allPeers } = await getRealPeersAndPresence(userId);
  const peersById = new Map<string, RealPeer>(allPeers.map((p) => [p.user_id, p]));
  const now = new Date().toISOString();

  // Check reader's read receipts privacy setting
  let readerAllowsReadReceipts = true;
  if (readerUser?.user_metadata && typeof readerUser.user_metadata.read_receipts === "boolean") {
    readerAllowsReadReceipts = readerUser.user_metadata.read_receipts;
  } else {
    try {
      const { data: privacyRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", `privacy_settings_${userId}`)
        .maybeSingle();
      if (privacyRow && typeof privacyRow.config_value === "object" && privacyRow.config_value && (privacyRow.config_value as Record<string, unknown>).read_receipts === false) {
        readerAllowsReadReceipts = false;
      }
    } catch {
      // default true
    }
  }

  // Try native table first
  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*, audio_assets(*), message_reactions(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(messages)) {
      return messages.map((m) => {
        let status = (m.delivery_status as "sent" | "delivered" | "read") || "delivered";
        if (m.sender_id !== userId) {
          status = readerAllowsReadReceipts ? "read" : "delivered";
        }
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          sender_name: peersById.get(m.sender_id)?.display_name || "Classmate",
          content: m.content,
          message_type: m.message_type || "text",
          audio_asset_id: m.audio_asset_id,
          audio_url: m.audio_assets?.file_url || null,
          duration_seconds: m.audio_assets?.duration_seconds || 0,
          reply_to_id: m.reply_to_id,
          created_at: m.created_at,
          reactions: formatNativeReactions(m.message_reactions),
          delivery_status: status,
          read_at: m.read_at || (status === "read" ? now : null),
        };
      });
    }
  } catch {
    // Proceed to fallback
  }

  // Fallback: Read from exam_config
  try {
    const { data: row } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "platform_chat_messages")
      .maybeSingle();

    const messagesMap: Record<string, ChatMessage[]> =
      row && typeof row.config_value === "object" && row.config_value !== null
        ? row.config_value
        : {};

    const rawList = messagesMap[conversationId] || [];
    let hasUpdates = false;

    const updatedList = rawList.map((m) => {
      let status = m.delivery_status || "sent";
      if (m.sender_id !== userId) {
        // Current user is viewing messages sent by peer
        const targetStatus: "sent" | "delivered" | "read" = readerAllowsReadReceipts ? "read" : "delivered";
        if (status !== targetStatus) {
          status = targetStatus;
          hasUpdates = true;
          return { ...m, delivery_status: status, read_at: targetStatus === "read" ? now : m.read_at };
        }
      }
      return { ...m, delivery_status: status };
    });

    if (hasUpdates) {
      messagesMap[conversationId] = updatedList;
      void supabase.from("exam_config").upsert(
        {
          config_key: "platform_chat_messages",
          config_value: messagesMap,
          updated_at: now,
        },
        { onConflict: "config_key" }
      );
    }

    return updatedList.map((m) => ({
      ...m,
      sender_name: peersById.get(m.sender_id)?.display_name || m.sender_name || "Learner",
    }));
  } catch (err) {
    console.warn("Could not load messages from config fallback:", err);
    return [];
  }
}

export async function sendChatMessage(
  conversationId: string,
  sender: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  payload: {
    content: string;
    messageType?: "text" | "audio_note" | "announcement" | "resource";
    audioAssetId?: string | null;
    audioUrl?: string | null;
    durationSeconds?: number;
    replyToId?: string | null;
  }
): Promise<ChatMessage> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const senderId = sender.id;
  const senderMetadataName = sender.user_metadata?.full_name ?? sender.user_metadata?.name;
  const senderName =
    (typeof senderMetadataName === "string" ? senderMetadataName : null) ||
    sender.email?.split("@")[0] ||
    "BrainLab Member";

  // Check if sender or recipient is blocked in direct chat
  let initialStatus: "sent" | "delivered" | "read" = "sent";
  try {
    const { data: convRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "platform_chat_conversations")
      .maybeSingle();

    const convsMap: Record<string, ChatConversation> =
      convRow && typeof convRow.config_value === "object" && convRow.config_value !== null
        ? (convRow.config_value as Record<string, ChatConversation>)
        : {};

    const activeConv = convsMap[conversationId];
    if (activeConv && activeConv.type === "direct") {
      const otherPart = activeConv.participants.find((p) => p.user_id !== senderId);
      if (otherPart) {
        // 1. Has recipient blocked sender?
        const { data: blockedRow } = await supabase
          .from("exam_config")
          .select("config_value")
          .eq("config_key", `blocked_users_${otherPart.user_id}`)
          .maybeSingle();

        const blockedList: string[] = Array.isArray(blockedRow?.config_value) ? blockedRow.config_value : [];
        if (blockedList.includes(senderId)) {
          throw new Error("You cannot send messages to this learner.");
        }

        // 2. Has sender blocked recipient?
        const { data: myBlockedRow } = await supabase
          .from("exam_config")
          .select("config_value")
          .eq("config_key", `blocked_users_${senderId}`)
          .maybeSingle();

        const myBlockedList: string[] = Array.isArray(myBlockedRow?.config_value) ? myBlockedRow.config_value : [];
        if (myBlockedList.includes(otherPart.user_id)) {
          throw new Error("You have blocked this learner. Unblock them first to send messages.");
        }

        // Check if recipient is online for immediate delivery tick (2 grey ticks)
        const { allPeers } = await getRealPeersAndPresence(senderId);
        const recipientPeer = allPeers.find((p) => p.user_id === otherPart.user_id);
        if (recipientPeer && recipientPeer.status !== "offline") {
          initialStatus = "delivered";
        }
      }
    }
  } catch (blockErr) {
    if (
      blockErr instanceof Error &&
      (blockErr.message.includes("cannot send messages") ||
        blockErr.message.includes("blocked this learner"))
    ) {
      throw blockErr;
    }
  }

  const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const message: ChatMessage = {
    id: newMsgId,
    conversation_id: conversationId,
    sender_id: senderId,
    sender_name: senderName,
    content: payload.content || (payload.audioAssetId ? "Voice note attachment" : ""),
    message_type: payload.audioAssetId ? "audio_note" : payload.messageType || "text",
    audio_asset_id: payload.audioAssetId || null,
    audio_url: payload.audioUrl || null,
    duration_seconds: payload.durationSeconds || 0,
    reply_to_id: payload.replyToId || null,
    created_at: now,
    reactions: {},
    delivery_status: initialStatus,
  };

  // Try native table first
  try {
    const { data: nativeMsg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: message.content,
        message_type: message.message_type,
        audio_asset_id: message.audio_asset_id,
        reply_to_id: message.reply_to_id,
      })
      .select("*, audio_assets(*)")
      .single();

    if (!error && nativeMsg) {
      await supabase
        .from("conversations")
        .update({ last_message_at: now })
        .eq("id", conversationId);

      return {
        ...message,
        id: nativeMsg.id,
        created_at: nativeMsg.created_at,
        audio_url: nativeMsg.audio_assets?.file_url || message.audio_url,
      };
    }
  } catch {
    // Proceed to fallback
  }

  // Fallback: exam_config
  const { data: mRow } = await supabase
    .from("exam_config")
    .select("config_value")
    .eq("config_key", "platform_chat_messages")
    .maybeSingle();

  const messagesMap: Record<string, ChatMessage[]> =
    mRow && typeof mRow.config_value === "object" && mRow.config_value !== null
      ? mRow.config_value
      : {};

  if (!messagesMap[conversationId]) messagesMap[conversationId] = [];
  messagesMap[conversationId].push(message);

  await supabase.from("exam_config").upsert(
    {
      config_key: "platform_chat_messages",
      config_value: messagesMap,
      updated_at: now,
    },
    { onConflict: "config_key" }
  );

  // Update conversation last_message_at
  try {
    const { data: cRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "platform_chat_conversations")
      .maybeSingle();

    if (cRow && typeof cRow.config_value === "object") {
      const convs = cRow.config_value;
      if (convs[conversationId]) {
        convs[conversationId].last_message_at = now;
        convs[conversationId].last_message_preview = message.content.slice(0, 80);
        await supabase.from("exam_config").upsert(
          {
            config_key: "platform_chat_conversations",
            config_value: convs,
            updated_at: now,
          },
          { onConflict: "config_key" }
        );
      }
    }
  } catch {
    // ignore
  }

  return message;
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string
) {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // Fallback: exam_config
  const { data: row } = await supabase
    .from("exam_config")
    .select("config_value")
    .eq("config_key", "platform_chat_messages")
    .maybeSingle();

  if (row && typeof row.config_value === "object") {
    const msgs = row.config_value[conversationId] || [];
    const target = msgs.find((m: ChatMessage) => m.id === messageId);
    if (target) {
      if (!target.reactions) target.reactions = {};
      const currentList: string[] = target.reactions[emoji] || [];
      if (currentList.includes(userId)) {
        target.reactions[emoji] = currentList.filter((id) => id !== userId);
        if (target.reactions[emoji].length === 0) delete target.reactions[emoji];
      } else {
        target.reactions[emoji] = [...currentList, userId];
      }

      await supabase.from("exam_config").upsert(
        {
          config_key: "platform_chat_messages",
          config_value: row.config_value,
          updated_at: now,
        },
        { onConflict: "config_key" }
      );

      return { success: true, reactions: target.reactions };
    }
  }

  return { success: false };
}

function formatNativeReactions(reactions: { emoji: string; user_id: string }[]): Record<string, string[]> {
  if (!Array.isArray(reactions)) return {};
  const map: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.user_id);
  }
  return map;
}

function formatRelativeTime(dateString: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ----------------------------------------------------------------------------
// Message Requests & Group Invites Moderation
// ----------------------------------------------------------------------------

export async function updateConversationRequestStatus(
  userId: string,
  conversationId: string,
  action: "accept" | "decline" | "accept_group" | "decline_group"
): Promise<ChatConversation | null> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // 1. Update in exam_config platform_chat_conversations
  const { data: row } = await supabase
    .from("exam_config")
    .select("config_value")
    .eq("config_key", "platform_chat_conversations")
    .maybeSingle();

  const convsMap: Record<string, ChatConversation> =
    row && typeof row.config_value === "object" && row.config_value !== null
      ? (row.config_value as Record<string, ChatConversation>)
      : {};

  const conv = convsMap[conversationId];

  if (conv) {
    if (action === "accept") {
      conv.status = "accepted";
    } else if (action === "decline") {
      conv.status = "declined";
    } else if (action === "accept_group") {
      conv.participants = conv.participants.map((p) =>
        p.user_id === userId ? { ...p, invite_status: "accepted" } : p
      );
    } else if (action === "decline_group") {
      conv.participants = conv.participants.filter((p) => p.user_id !== userId);
    }

    convsMap[conversationId] = conv;

    await supabase.from("exam_config").upsert(
      {
        config_key: "platform_chat_conversations",
        config_value: convsMap,
        updated_at: now,
      },
      { onConflict: "config_key" }
    );
  }

  // 2. Also try native tables if conversation exists there
  try {
    if (action === "accept_group" || action === "decline_group") {
      if (action === "accept_group") {
        await supabase
          .from("conversation_participants")
          .update({ is_muted: false })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
      }
    }
  } catch {
    // ignore
  }

  return conv || null;
}
