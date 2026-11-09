import { supabase } from "../supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunityFilterOptions,
  CommunityGroup,
  CommunityGroupMembership,
  CommunityGroupRole,
} from "./types";
import { INITIAL_COMMUNITY_GROUPS } from "./seedData";

/**
 * List discoverable community groups with optional category, type, and search filters.
 */
export async function listCommunityGroups(
  filter?: CommunityFilterOptions,
  client: SupabaseClient = supabase
): Promise<CommunityGroup[]> {
  try {
    let query = client
      .from("community_groups")
      .select("*, subject:academic_subject_registry(id, name, slug)")
      .eq("status", "active")
      .in("visibility", ["public", "unlisted"]);

    if (filter?.category && filter.category !== "All") {
      query = query.eq("category", filter.category);
    }
    if (filter?.group_type) {
      query = query.eq("group_type", filter.group_type);
    }
    if (filter?.subject_id) {
      query = query.eq("subject_id", filter.subject_id);
    }
    if (filter?.search) {
      const s = `%${filter.search.trim()}%`;
      query = query.or(`name.ilike.${s},description.ilike.${s}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      // Graceful fallback to verified initial cohorts
      let filtered = [...INITIAL_COMMUNITY_GROUPS];
      if (filter?.category && filter.category !== "All") {
        filtered = filtered.filter((g) => g.category.toLowerCase() === filter.category!.toLowerCase());
      }
      if (filter?.group_type) {
        filtered = filtered.filter((g) => g.group_type === filter.group_type);
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        filtered = filtered.filter((g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
      }
      return filtered;
    }

    return data as CommunityGroup[];
  } catch {
    return INITIAL_COMMUNITY_GROUPS;
  }
}

/**
 * Retrieve a single community group by slug.
 */
export async function getGroupBySlug(
  slug: string,
  client: SupabaseClient = supabase
): Promise<CommunityGroup | null> {
  try {
    const { data, error } = await client
      .from("community_groups")
      .select("*, subject:academic_subject_registry(id, name, slug)")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      const match = INITIAL_COMMUNITY_GROUPS.find((g) => g.slug === slug);
      return match || null;
    }

    return data as CommunityGroup;
  } catch {
    const match = INITIAL_COMMUNITY_GROUPS.find((g) => g.slug === slug);
    return match || null;
  }
}

/**
 * Fetch all groups in which the current user holds an active membership.
 */
export async function getUserGroupMemberships(
  userId: string,
  client: SupabaseClient = supabase
): Promise<CommunityGroupMembership[]> {
  try {
    const { data, error } = await client
      .from("community_group_memberships")
      .select("*, group:community_groups(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false });

    if (error || !data) return [];
    return data as CommunityGroupMembership[];
  } catch {
    return [];
  }
}

/**
 * Join an open community group or submit a join request.
 */
export async function joinCommunityGroup(
  groupId: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; status: "active" | "pending_approval"; error?: string }> {
  try {
    // Check group policy
    const { data: group } = await client
      .from("community_groups")
      .select("id, membership_policy, capacity, status")
      .eq("id", groupId)
      .single();

    if (!group || group.status !== "active") {
      return { ok: false, status: "pending_approval", error: "group_not_found_or_inactive" };
    }

    const membershipStatus = group.membership_policy === "open" ? "active" : "pending_approval";

    const { error: insertError } = await client
      .from("community_group_memberships")
      .upsert(
        {
          group_id: groupId,
          user_id: userId,
          group_role: "student",
          status: membershipStatus,
          joined_via: "direct",
        },
        { onConflict: "group_id,user_id" }
      );

    if (insertError) {
      return { ok: false, status: membershipStatus, error: insertError.message };
    }

    return { ok: true, status: membershipStatus };
  } catch (err: unknown) {
    return { ok: false, status: "pending_approval", error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Create a new community group (Tutor / Admin only).
 */
export async function createCommunityGroup(
  params: {
    name: string;
    description: string;
    group_type: CommunityGroup["group_type"];
    category: string;
    subject_id?: string | null;
    owner_id: string;
    icon_emoji?: string;
    visibility?: CommunityGroup["visibility"];
    membership_policy?: CommunityGroup["membership_policy"];
    capacity?: number;
    group_rules?: string;
  },
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; group?: CommunityGroup; error?: string }> {
  try {
    const slug = params.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const payload = {
      slug,
      name: params.name.trim(),
      description: params.description.trim() || null,
      group_type: params.group_type,
      category: params.category || "General",
      subject_id: params.subject_id || null,
      owner_id: params.owner_id,
      icon_emoji: params.icon_emoji || "🎓",
      visibility: params.visibility || "public",
      membership_policy: params.membership_policy || "open",
      capacity: params.capacity || 500,
      group_rules: params.group_rules || null,
      status: "active",
    };

    const { data, error } = await client
      .from("community_groups")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to create group" };
    }

    // Automatically assign owner membership
    await client.from("community_group_memberships").insert({
      group_id: data.id,
      user_id: params.owner_id,
      group_role: "owner" as CommunityGroupRole,
      status: "active",
      joined_via: "direct",
    });

    return { ok: true, group: data as CommunityGroup };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}


/**
 * List all members of a cohort, including pending approval requests (Tutor / Admin only).
 */
export async function listCohortMembers(
  groupId: string,
  client: SupabaseClient = supabase
): Promise<CommunityGroupMembership[]> {
  try {
    const { data, error } = await client
      .from("community_group_memberships")
      .select("*")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false });

    if (error || !data) return [];
    return data as CommunityGroupMembership[];
  } catch {
    return [];
  }
}

/**
 * Approve, suspend, or reject a candidate's membership in a cohort.
 */
export async function updateCohortMemberStatus(
  groupId: string,
  membershipId: string,
  status: "active" | "rejected" | "suspended",
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (status === "rejected") {
      const { error } = await client
        .from("community_group_memberships")
        .delete()
        .eq("id", membershipId)
        .eq("group_id", groupId);

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const { error } = await client
      .from("community_group_memberships")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", membershipId)
      .eq("group_id", groupId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Add a student directly to a cohort by candidate email or student ID.
 */
export async function addCohortMemberByEmail(
  groupId: string,
  emailOrId: string,
  role: CommunityGroupRole = "student",
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error?: string; membership?: CommunityGroupMembership }> {
  try {
    const trimmed = emailOrId.trim();
    if (!trimmed) return { ok: false, error: "Candidate email or ID is required." };

    let targetUserId = trimmed;
    if (trimmed.includes("@")) {
      const { data: userProfile } = await client
        .from("user_profiles")
        .select("id")
        .eq("email", trimmed.toLowerCase())
        .maybeSingle();

      if (userProfile?.id) {
        targetUserId = userProfile.id;
      }
    }

    const { data, error } = await client
      .from("community_group_memberships")
      .upsert(
        {
          group_id: groupId,
          user_id: targetUserId,
          group_role: role,
          status: "active",
          joined_via: "admin_assign",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "group_id,user_id" }
      )
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Failed to add candidate to cohort." };
    }

    return { ok: true, membership: data as CommunityGroupMembership };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Remove a candidate immediately from a cohort, revoking all permissions and access.
 */
export async function removeCohortMember(
  groupId: string,
  membershipId: string,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await client
      .from("community_group_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("group_id", groupId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
