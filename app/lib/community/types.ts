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
