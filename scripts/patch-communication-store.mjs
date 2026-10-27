import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("app/lib/communicationStore.ts");
let content = fs.readFileSync(filePath, "utf8");

// 1. Update ChatConversation interface
const oldInterface = `export interface ChatConversation {
  id: string;
  type: "direct" | "group" | "cohort";
  title: string;
  course_id?: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
  last_message_preview?: string;
  participants: { user_id: string; role: string; last_read_at?: string }[];
  other_participant?: RealPeer | null;
  unread_count?: number;
}`;

const newInterface = `export interface ChatConversation {
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
}`;

content = content.replace(oldInterface, newInterface);

// 2. Hide peers' emails from public and sanitize display name
const oldPeerMapping = `    const displayName =
      (typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name : null) ||
      (typeof u.user_metadata?.name === "string" ? u.user_metadata.name : null) ||
      p?.display_name ||
      u.email?.split("@")[0] ||
      "Learner";

    return {
      user_id: u.id,
      display_name: displayName,
      email: u.email || "",`;

const newPeerMapping = `    const displayName =
      (typeof u.user_metadata?.full_name === "string" ? u.user_metadata.full_name : null) ||
      (typeof u.user_metadata?.name === "string" ? u.user_metadata.name : null) ||
      p?.display_name ||
      "Learner";

    return {
      user_id: u.id,
      display_name: displayName,
      email: u.id === currentUserId ? (u.email || "") : "", // NEVER expose other users' email addresses to client peers`;

content = content.replace(oldPeerMapping, newPeerMapping);

// 3. In createOrGetDirectChat, mark new direct chats with status: "pending", request_by: userId
const oldDirectNative = `      await supabase.from("conversation_participants").insert([
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
      };`;

const newDirectNative = `      await supabase.from("conversation_participants").insert([
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
          { user_id: userId, role: "admin", invite_status: "accepted" },
          { user_id: recipientId, role: "member", invite_status: "pending" },
        ],
        other_participant: recipient || null,
        status: "pending",
        request_by: userId,
      };`;

content = content.replace(oldDirectNative, newDirectNative);

const oldDirectFallback = `  const newDirect: ChatConversation = {
    id: \`dm_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
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
  };`;

const newDirectFallback = `  const newDirect: ChatConversation = {
    id: \`dm_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
    type: "direct",
    title: defaultTitle,
    created_by: userId,
    created_at: now,
    last_message_at: now,
    last_message_preview: "Direct conversation started",
    participants: [
      { user_id: userId, role: "admin", invite_status: "accepted" },
      { user_id: recipientId, role: "member", invite_status: "pending" },
    ],
    other_participant: recipient || null,
    status: "pending",
    request_by: userId,
  };`;

content = content.replace(oldDirectFallback, newDirectFallback);

// 4. In createGroupChat, mark other participants with invite_status: "pending"
const oldGroupParticipants = `    participants: allParticipantIds.map((id) => ({
      user_id: id,
      role: id === userId ? "admin" : "member",
    })),`;

const newGroupParticipants = `    participants: allParticipantIds.map((id) => ({
      user_id: id,
      role: id === userId ? "admin" : "member",
      invite_status: id === userId ? "accepted" : "pending",
    })),`;

content = content.replace(oldGroupParticipants, newGroupParticipants);

// 5. Add updateConversationRequestStatus helper at end of file
const updateStatusFn = `
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

  let conv = convsMap[conversationId];

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
`;

content += updateStatusFn;

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully patched communicationStore.ts with privacy, message requests, and group invites!");
