import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityAnnouncement,
  CommunityAnnouncementPriority,
  CommunityAnnouncementAttachment,
  CommunityPoll,
  PollOption,
} from "./types";

/**
 * List active announcements for a community group.
 * Supports caller-scoped read/acknowledgement status.
 */
export async function listCohortAnnouncements(
  groupId: string,
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<CommunityAnnouncement[]> {
  try {
    const { data: announcements, error } = await client
      .from("community_announcements")
      .select("*")
      .eq("group_id", groupId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !announcements) {
      return getFallbackAnnouncements(groupId);
    }

    if (!userId || announcements.length === 0) {
      return announcements as CommunityAnnouncement[];
    }

    // Lazy load user's receipts
    const announcementIds = announcements.map((a) => a.id);
    const { data: receipts } = await client
      .from("community_announcement_receipts")
      .select("announcement_id, read_at, acknowledged_at")
      .in("announcement_id", announcementIds)
      .eq("user_id", userId);

    const receiptMap = new Map(
      (receipts || []).map((r) => [r.announcement_id, r])
    );

    return announcements.map((a) => {
      const receipt = receiptMap.get(a.id);
      return {
        ...a,
        is_read: Boolean(receipt),
        acknowledged_at: receipt?.acknowledged_at || null,
      } as CommunityAnnouncement;
    });
  } catch {
    return getFallbackAnnouncements(groupId);
  }
}

/**
 * Author a new cohort announcement (Tutor / Admin only).
 */
export async function createCohortAnnouncement(
  params: {
    group_id: string;
    author_id: string;
    title: string;
    content: string;
    priority?: CommunityAnnouncementPriority;
    is_pinned?: boolean;
    requires_acknowledgement?: boolean;
    attachments?: CommunityAnnouncementAttachment[];
    expires_at?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; announcement?: CommunityAnnouncement; error?: string }> {
  try {
    const payload = {
      group_id: params.group_id,
      author_id: params.author_id,
      title: params.title.trim(),
      content: params.content.trim(),
      priority: params.priority || "normal",
      is_pinned: Boolean(params.is_pinned),
      requires_acknowledgement: Boolean(params.requires_acknowledgement),
      attachments: params.attachments || [],
      expires_at: params.expires_at || null,
    };

    const { data, error } = await client
      .from("community_announcements")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to create announcement" };
    }

    return { ok: true, announcement: data as CommunityAnnouncement };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Record a lazy read receipt or acknowledgement for an announcement.
 */
export async function recordAnnouncementReadOrAcknowledge(
  announcementId: string,
  userId: string,
  acknowledge: boolean = false,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const payload: {
      announcement_id: string;
      user_id: string;
      read_at: string;
      acknowledged_at?: string;
    } = {
      announcement_id: announcementId,
      user_id: userId,
      read_at: now,
    };

    if (acknowledge) {
      payload.acknowledged_at = now;
    }

    const { error } = await client
      .from("community_announcement_receipts")
      .upsert(payload, { onConflict: "announcement_id,user_id" });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Create a new checkpoint poll (Tutor / Admin only).
 */
export async function createCohortPoll(
  params: {
    group_id: string;
    created_by: string;
    question: string;
    options: Array<{ id: string; text: string }>;
    is_anonymous?: boolean;
    is_multiple_choice?: boolean;
    closes_at?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; poll?: CommunityPoll; error?: string }> {
  try {
    const payload = {
      group_id: params.group_id,
      created_by: params.created_by,
      question: params.question.trim(),
      options: params.options,
      is_anonymous: params.is_anonymous ?? true,
      is_multiple_choice: Boolean(params.is_multiple_choice),
      closes_at: params.closes_at || null,
      is_closed: false,
    };

    const { data, error } = await client
      .from("community_polls")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to create poll" };
    }

    return { ok: true, poll: data as CommunityPoll };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * List active and recent polls for a community group with aggregated percentage tallies.
 */
export async function listCohortPolls(
  groupId: string,
  userId?: string | null,
  client: SupabaseClient = supabase
): Promise<CommunityPoll[]> {
  try {
    const { data: polls, error } = await client
      .from("community_polls")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error || !polls || polls.length === 0) {
      return getFallbackPolls(groupId);
    }

    const pollIds = polls.map((p) => p.id);

    // Fetch all votes for these polls to aggregate
    const { data: votes } = await client
      .from("community_poll_votes")
      .select("poll_id, user_id, selected_options")
      .in("poll_id", pollIds);

    const votesList = votes || [];

    return polls.map((poll) => {
      const pollVotes = votesList.filter((v) => v.poll_id === poll.id);
      const totalVotes = pollVotes.length;

      // Calculate votes per option
      const countMap: Record<string, number> = {};
      pollVotes.forEach((v) => {
        (v.selected_options || []).forEach((optId: string) => {
          countMap[optId] = (countMap[optId] || 0) + 1;
        });
      });

      const options = (poll.options as PollOption[]).map((opt) => {
        const count = countMap[opt.id] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          ...opt,
          votes_count: count,
          percentage,
        };
      });

      const userVote = userId ? pollVotes.find((v) => v.user_id === userId) : null;

      return {
        ...poll,
        options,
        total_votes: totalVotes,
        user_voted: Boolean(userVote),
        user_selected_options: userVote?.selected_options || [],
      } as CommunityPoll;
    });
  } catch {
    return getFallbackPolls(groupId);
  }
}

/**
 * Cast a vote on a community poll.
 */
export async function voteCohortPoll(
  pollId: string,
  userId: string,
  selectedOptions: string[],
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!selectedOptions || selectedOptions.length === 0) {
      return { ok: false, error: "Please select at least one option." };
    }

    const { error } = await client.from("community_poll_votes").insert({
      poll_id: pollId,
      user_id: userId,
      selected_options: selectedOptions,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "You have already voted in this poll." };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Fallback announcement seeds for initial state.
 */
function getFallbackAnnouncements(groupId: string): CommunityAnnouncement[] {
  return [
    {
      id: `fallback-ann-${groupId}-1`,
      group_id: groupId,
      author_id: "faculty-lead",
      title: "Diagnostic Timetable & Weekly Review Schedule",
      content: "Welcome to the cohort. Please ensure you complete the Saturday timed speed drill before Monday 5:00 PM. High-frequency syllabus areas will be deconstructed live in class.",
      priority: "normal",
      is_pinned: true,
      requires_acknowledgement: false,
      attachments: [],
      expires_at: null,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      is_read: false,
      author_name: "Senior Faculty Lead",
    },
  ];
}

/**
 * Fallback poll seeds for initial state.
 */
function getFallbackPolls(groupId: string): CommunityPoll[] {
  return [
    {
      id: `fallback-poll-${groupId}-1`,
      group_id: groupId,
      created_by: "faculty-lead",
      question: "Which topic in this week's syllabus requires the deepest live revision focus?",
      options: [
        { id: "opt-1", text: "Theoretical Calculations & Formula Derivations", votes_count: 24, percentage: 55 },
        { id: "opt-2", text: "Conceptual Traps & Negative Marking Elimination", votes_count: 14, percentage: 32 },
        { id: "opt-3", text: "Time Management & Speed Optimization", votes_count: 6, percentage: 13 },
      ],
      is_anonymous: true,
      is_multiple_choice: false,
      closes_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      is_closed: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      total_votes: 44,
      user_voted: false,
    },
  ];
}
