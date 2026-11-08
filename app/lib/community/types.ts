export type CommunityGroupType =
  | "academic_cohort"
  | "tutor_class"
  | "subject_community"
  | "public_community"
  | "special_programme";

export type CommunityVisibility = "public" | "unlisted" | "private";
export type CommunityMembershipPolicy = "open" | "approval_required" | "invite_only";
export type CommunityGroupRole = "owner" | "tutor" | "moderator" | "student";
export type CommunityMembershipStatus = "active" | "pending_approval" | "suspended" | "left";

export interface CommunityGroup {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  group_type: CommunityGroupType;
  category: string;
  subject_id: string | null;
  owner_id: string;
  cover_image_url: string | null;
  icon_emoji: string;
  visibility: CommunityVisibility;
  membership_policy: CommunityMembershipPolicy;
  capacity: number;
  status: "active" | "archived" | "suspended";
  group_rules: string | null;
  settings: {
    allow_student_posts: boolean;
    show_leaderboard: boolean;
    mask_member_names: boolean;
    enable_daily_quests: boolean;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  member_count?: number;
  is_member?: boolean;
  user_role?: CommunityGroupRole | null;
  membership_status?: CommunityMembershipStatus | null;
  subject?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  owner_profile?: {
    display_name?: string;
    email?: string;
  } | null;
}

export interface CommunityGroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  group_role: CommunityGroupRole;
  status: CommunityMembershipStatus;
  joined_via: "direct" | "invite_link" | "csv_import" | "admin_assign";
  display_handle: string | null;
  is_ranking_opted_out: boolean;
  joined_at: string;
  updated_at: string;
  group?: CommunityGroup | null;
}

export interface CommunityGroupInvitation {
  id: string;
  group_id: string;
  token_hash: string;
  created_by: string;
  target_email: string | null;
  max_uses: number;
  uses_count: number;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
}

export interface CommunityFilterOptions {
  category?: string;
  group_type?: CommunityGroupType;
  subject_id?: string;
  search?: string;
}


export type CommunityAnnouncementPriority = "normal" | "urgent" | "critical";

export interface CommunityAnnouncementAttachment {
  title: string;
  url: string;
  file_type?: string;
  size_bytes?: number;
}

export interface CommunityAnnouncement {
  id: string;
  group_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: CommunityAnnouncementPriority;
  is_pinned: boolean;
  requires_acknowledgement: boolean;
  attachments: CommunityAnnouncementAttachment[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed / Caller-specific fields
  is_read?: boolean;
  acknowledged_at?: string | null;
  author_name?: string;
}

export interface CommunityAnnouncementReceipt {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
  acknowledged_at: string | null;
}

export interface PollOption {
  id: string;
  text: string;
  votes_count?: number;
  percentage?: number;
}

export interface CommunityPoll {
  id: string;
  group_id: string;
  created_by: string;
  question: string;
  options: PollOption[];
  is_anonymous: boolean;
  is_multiple_choice: boolean;
  closes_at: string;
  is_closed: boolean;
  created_at: string;
  // Computed / Aggregated fields
  total_votes?: number;
  user_voted?: boolean;
  user_selected_options?: string[];
}

export interface CommunityPollVote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: string[];
  created_at: string;
}


// ==============================================================================
// PHASE 3: GROUP ASSESSMENT SCHEDULES & ATTEMPTS
// ==============================================================================

export interface GroupAssessmentSchedule {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  subject: string;
  topics: string[];
  question_count: number;
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  max_attempts: number;
  is_published: boolean;
  freeze_eligible_members: boolean;
  frozen_eligible_member_ids?: string[] | null;
  frozen_question_ids?: number[] | null;
  settings: {
    shuffle_options?: boolean;
    show_corrections_after_close?: boolean;
    require_webcam?: boolean;
    allow_late_entry?: boolean;
  };
  created_at: string;
  updated_at: string;
  // Computed caller state
  user_attempts_count?: number;
  user_latest_attempt?: GroupAssessmentAttempt | null;
  is_open?: boolean;
  is_eligible?: boolean;
}

export interface GroupAssessmentAttempt {
  id: string;
  assessment_id: string;
  group_id: string;
  user_id: string;
  exam_session_id?: string | null;
  score: number;
  total_questions: number;
  percentage: number;
  time_spent_seconds: number;
  tab_switch_count: number;
  status: "in_progress" | "completed" | "disqualified" | "expired";
  answers: Record<string, string>;
  started_at: string;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  candidate_name?: string;
}

export interface CreateAssessmentScheduleParams {
  group_id: string;
  created_by: string;
  title: string;
  description?: string;
  subject: string;
  topics?: string[];
  question_count?: number;
  duration_minutes?: number;
  starts_at: string;
  ends_at: string;
  max_attempts?: number;
  is_published?: boolean;
  freeze_eligible_members?: boolean;
  frozen_question_ids?: number[];
}
