// BRAINLAB ACADEMY COMPETITION ARENA
// ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION ENGINE
// Enforces granular permissions, scope boundaries, separation of duties, and audit logging.

import type { NextRequest } from "next/server";
import { supabase } from "./supabase";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "./supabaseServer";

export type CompetitionRole =
  | "super_admin"
  | "platform_admin"
  | "competition_admin"
  | "competition_moderator"
  | "competition_host"
  | "student"
  | "guest";

export const COMPETITION_PERMISSIONS = [
  "competition.view",
  "competition.create",
  "competition.edit_own",
  "competition.edit_assigned",
  "competition.publish",
  "competition.schedule",
  "competition.cancel",
  "competition.manage_participants",
  "competition.view_results",
  "competition.publish_results",
  "competition.correct_results",
  "competition.disqualify_participant",
  "competition.manage_rounds",
  "competition.manage_rewards",
  "competition.approve_rewards",
  "question_bank.create",
  "question_bank.view",
  "question_bank.edit_own",
  "question_bank.edit_assigned",
  "question_bank.delete_own",
  "question_bank.delete_assigned",
  "question_bank.import_csv",
  "question_bank.export",
  "question_bank.publish",
  "question_bank.moderate",
  "question_builder.use",
  "question_bank.link_main_bank",
  "competition.manage_roles",
  "competition.view_audit_logs",
] as const;

export type CompetitionPermission = (typeof COMPETITION_PERMISSIONS)[number];

export type PermissionScopeType =
  | "global"
  | "competition"
  | "question_bank"
  | "moderation"
  | "reward_limit";

export interface UserScopedPermission {
  permission_key: CompetitionPermission;
  scope_type: PermissionScopeType;
  scope_id: string; // 'all' or specific entity ID
}

export interface CompetitionActor {
  id: string;
  email: string;
  role: CompetitionRole;
  scoped_permissions?: UserScopedPermission[];
  max_reward_xp_limit?: number;
}

/**
 * Default base permissions granted intrinsically by role
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<CompetitionRole, readonly CompetitionPermission[]> = {
  super_admin: COMPETITION_PERMISSIONS,
  platform_admin: COMPETITION_PERMISSIONS.filter(
    (p) => p !== "competition.manage_roles" && p !== "competition.view_audit_logs"
  ),
  competition_admin: [
    "competition.view",
    "competition.create",
    "competition.edit_assigned",
    "competition.publish",
    "competition.schedule",
    "competition.cancel",
    "competition.manage_participants",
    "competition.view_results",
    "competition.publish_results",
    "competition.manage_rounds",
    "competition.manage_rewards",
    "competition.approve_rewards",
    "question_bank.create",
    "question_bank.view",
    "question_bank.edit_assigned",
    "question_bank.import_csv",
    "question_bank.export",
    "question_bank.publish",
    "question_builder.use",
    "question_bank.link_main_bank",
  ],
  competition_moderator: [
    "competition.view",
    "competition.manage_participants",
    "competition.view_results",
    "question_bank.view",
    "question_bank.moderate",
    "question_builder.use",
  ],
  competition_host: [
    "competition.view",
    "competition.create",
    "competition.edit_own",
    "competition.view_results",
    "question_bank.create",
    "question_bank.view",
    "question_bank.edit_own",
    "question_bank.import_csv",
    "question_builder.use",
  ],
  student: [
    "competition.view",
    "competition.create", // student-created quizzes when enabled
    "competition.edit_own",
    "competition.view_results", // own results only
    "question_builder.use",
  ],
  guest: [
    "competition.view", // public open link
  ],
};

/**
 * Evaluates whether an actor has permission to perform an action on a target resource within scope.
 */
export function hasPermissionInScope(
  actor: CompetitionActor,
  permission: CompetitionPermission,
  target?: {
    scopeType?: PermissionScopeType;
    scopeId?: string;
    ownerId?: string;
    isFinalized?: boolean;
    rewardAmount?: number;
  }
): { allowed: boolean; reason?: string } {
  // Super admin has global authority, but cannot bypass audit logging
  if (actor.role === "super_admin") {
    return { allowed: true };
  }

  // Finalized competition outcomes protection:
  // Cannot alter questions or scoring in a finalized competition in a way that mutates participant outcomes
  if (target?.isFinalized && (permission === "competition.edit_own" || permission === "competition.edit_assigned")) {
    return {
      allowed: false,
      reason: "Cannot edit questions or scoring rules in a finalized competition. Historical attempts are frozen.",
    };
  }

  // Boundary check: Students and Guests cannot access restricted banks or publish without approval
  if (actor.role === "student" || actor.role === "guest") {
    if (permission.startsWith("question_bank.delete") || permission === "question_bank.publish" || permission === "competition.publish_results") {
      return { allowed: false, reason: "Students and guests cannot publish or delete institutional resources." };
    }
  }

  // Boundary check: Reward authorization limit check for admins and managers
  if (permission === "competition.approve_rewards" && target?.rewardAmount) {
    const limit = actor.max_reward_xp_limit ?? (actor.role === "competition_admin" ? 5000 : 0);
    if (target.rewardAmount > limit) {
      return {
        allowed: false,
        reason: `Requested reward amount (${target.rewardAmount} XP) exceeds authorized limit of ${limit} XP.`,
      };
    }
  }

  // 1. Check direct role default permissions
  const defaults = ROLE_DEFAULT_PERMISSIONS[actor.role] || [];
  const hasBasePermission = defaults.includes(permission);

  // If action requires ownership:
  if (permission.endsWith("_own")) {
    if (target?.ownerId && target.ownerId !== actor.id) {
      return { allowed: false, reason: "Permission applies only to resources owned by this user." };
    }
    if (hasBasePermission) return { allowed: true };
  }

  // If user has base permission without scope restrictions:
  if (hasBasePermission) {
    // If target has specific non-owned scope, verify actor isn't barred
    if (permission === "question_bank.edit_assigned" || permission === "competition.edit_assigned") {
      // Must have assignment or ownership
      if (target?.ownerId && target.ownerId !== actor.id && !hasExplicitScopedAssignment(actor, permission, target.scopeId)) {
        return { allowed: false, reason: "Resource is neither owned by nor explicitly assigned to this user." };
      }
    }
    return { allowed: true };
  }

  // 2. Check granular assigned scoped permissions
  if (actor.scoped_permissions && target?.scopeType && target?.scopeId) {
    const matched = actor.scoped_permissions.some(
      (sp) =>
        sp.permission_key === permission &&
        (sp.scope_type === "global" ||
          (sp.scope_type === target.scopeType && (sp.scope_id === "all" || sp.scope_id === target.scopeId)))
    );
    if (matched) return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${actor.role}' lacks '${permission}' permission in scope '${target?.scopeType || "global"}'.`,
  };
}

function hasExplicitScopedAssignment(actor: CompetitionActor, permission: CompetitionPermission, scopeId?: string): boolean {
  if (!scopeId || !actor.scoped_permissions) return false;
  return actor.scoped_permissions.some(
    (sp) => sp.permission_key === permission && (sp.scope_id === "all" || sp.scope_id === scopeId)
  );
}

// ============================================================================
// SEPARATION OF DUTIES LOGIC
// ============================================================================

/**
 * Checks whether publishing this competition requires independent administrator approval.
 */
export function requiresPublicationApproval(competition: { creator_id: string; visibility: string }, creatorRole: CompetitionRole): boolean {
  // Super admins and competition admins publishing official competitions don't require independent approval
  if (creatorRole === "super_admin" || creatorRole === "competition_admin") {
    return false;
  }
  // Public quizzes created by tutors, hosts, moderators, or students require independent admin approval
  if (competition.visibility === "public") {
    return true;
  }
  return false;
}

/**
 * Separation of duties for publication:
 * Question creators must not be able to approve their own questions/competitions where independent approval is required.
 */
export function canApprovePublication(actor: CompetitionActor, creatorId: string): { allowed: boolean; reason?: string } {
  if (actor.role === "super_admin") return { allowed: true };
  if (actor.id === creatorId) {
    return {
      allowed: false,
      reason: "Separation of duties violation: Creators cannot approve their own submissions.",
    };
  }
  if (actor.role === "competition_admin" || actor.role === "platform_admin") {
    return { allowed: true };
  }
  return { allowed: false, reason: "Only authorized administrators may approve publication." };
}

/**
 * Separation of duties for score / result corrections:
 * A moderator flags a result for review, while an authorized administrator approves a correction.
 */
export function canApproveResultCorrection(actor: CompetitionActor, flaggingModeratorId?: string): { allowed: boolean; reason?: string } {
  if (actor.role === "super_admin") return { allowed: true };
  if (actor.role !== "competition_admin" && actor.role !== "platform_admin") {
    return { allowed: false, reason: "Only authorized administrators may approve result corrections." };
  }
  if (flaggingModeratorId && actor.id === flaggingModeratorId) {
    return {
      allowed: false,
      reason: "Separation of duties violation: Flagging moderator cannot self-approve result correction.",
    };
  }
  return { allowed: true };
}

/**
 * Separation of duties for rewards:
 * A manager proposes a reward, while an authorized administrator approves its issuance.
 */
export function canApproveRewardProposal(actor: CompetitionActor, proposal: { proposed_by: string; amount?: number }): { allowed: boolean; reason?: string } {
  if (actor.role === "super_admin") return { allowed: true };
  if (actor.id === proposal.proposed_by) {
    return {
      allowed: false,
      reason: "Separation of duties violation: The person who proposed the reward cannot approve it.",
    };
  }
  if (actor.role !== "competition_admin" && actor.role !== "platform_admin") {
    return { allowed: false, reason: "Only an authorized administrator may approve reward issuance." };
  }
  return hasPermissionInScope(actor, "competition.approve_rewards", {
    scopeType: "reward_limit",
    rewardAmount: proposal.amount,
  });
}

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

export interface AuditLogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  actorId?: string;
  actorEmail?: string;
}

/**
 * Records an immutable audit log event on the server side.
 * Logs actor, action, resource, timestamp, and details.
 */
export async function logCompetitionAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    const supabaseServer = getSupabaseServerClient();
    await supabaseServer.from("competition_audit_logs").insert({
      acting_user_id: payload.actorId || null,
      acting_user_email: payload.actorEmail || "system",
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      details: payload.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to write competition audit log:", err);
  }
}

/**
 * Resolves the authenticated actor for competition APIs.
 * Supports Bearer token and cookie authentication, and authoritatively
 * resolves administrator roles across all profile and role tables.
 */
export async function getCompetitionActor(req: NextRequest): Promise<CompetitionActor | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  const resolvedRole = await resolveAdminRole(user.id, token);

  let role: CompetitionRole = "student";
  if (resolvedRole) {
    if (resolvedRole === "super_admin") role = "super_admin";
    else if (resolvedRole === "platform_admin" || resolvedRole === "cbt_admin") role = "platform_admin";
    else if (resolvedRole === "competition_admin") role = "competition_admin";
    else if (resolvedRole === "community_moderator" || resolvedRole === "competition_moderator") role = "competition_moderator";
    else if (resolvedRole === "competition_host" || resolvedRole === "teacher") role = "competition_host";
    // Unknown administrative roles must fail closed. Never convert a role that
    // is not explicitly mapped to a privileged Arena role.
    else role = "student";
  }

  let scopedPerms: UserScopedPermission[] = [];
  try {
    const supabaseServer = getSupabaseServerClient(token);
    const { data } = await supabaseServer
      .from("competition_user_permissions")
      .select("permission_key, scope_type, scope_id")
      .eq("user_id", user.id);
    if (data) scopedPerms = data as UserScopedPermission[];
  } catch {
    // optional table
  }

  return {
    id: user.id,
    email: user.email || "",
    role,
    scoped_permissions: scopedPerms,
  };
}
