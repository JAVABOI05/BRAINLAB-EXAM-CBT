import { supabase } from "./supabase";

export const ADMIN_ROLES = [
  "super_admin",
  "platform_admin",
  "cbt_admin",
  "ai_learning_admin",
  "community_moderator",
  "analytics_admin",
  "school_admin",
  "teacher",
  "content_reviewer",
  "finance_admin",
  "read_only_auditor",
  "competition_admin",
  "competition_moderator",
  "competition_host",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const GOVERNANCE_ADMIN_ROLES = [
  "super_admin",
  "platform_admin",
  "cbt_admin",
  "ai_learning_admin",
  "finance_admin",
  "analytics_admin",
  "school_admin",
  "content_reviewer",
  "read_only_auditor",
] as const;

export type GovernanceAdminRole = (typeof GOVERNANCE_ADMIN_ROLES)[number];

export const INSTRUCTOR_ROLES = [
  "teacher",
  "competition_host",
  "competition_moderator",
] as const;

export function isGovernanceAdminRole(role?: string | null): boolean {
  if (!role || typeof role !== "string") return false;
  return (GOVERNANCE_ADMIN_ROLES as readonly string[]).includes(role.trim());
}

export function isInstructorRole(role?: string | null): boolean {
  if (!role || typeof role !== "string") return false;
  const clean = role.trim().toLowerCase();
  return clean === "teacher" || clean === "tutor" || clean === "competition_host" || clean === "competition_moderator";
}

export const INSTRUCTOR_PERMISSIONS = [
  "learning.content.manage",
  "student.support",
  "cbt.questions.manage",
  "cbt.questions.delete",
  "cbt.results.read",
  "ai.content.manage",
  "question_bank.create",
  "question_bank.view",
  "question_bank.edit_own",
  "question_bank.import_csv",
  "question_builder.use",
  "stem.resource.view",
  "stem.resource.manage",
] as const;

export const ADMIN_ROLE_DETAILS: Record<
  AdminRole,
  { label: string; summary: string; level: number }
> = {
  super_admin: {
    label: "Super Admin",
    summary: "Platform governance, security ownership and administrator role management.",
    level: 1,
  },
  platform_admin: {
    label: "Platform Administrator",
    summary: "Broad operational administration; cannot manage administrator roles.",
    level: 2,
  },
  cbt_admin: {
    label: "CBT & Examination Administrator",
    summary: "Question bank, approved exam configuration, access codes, sessions and results.",
    level: 3,
  },
  ai_learning_admin: {
    label: "AI & Learning Administrator",
    summary: "AI learning content, Learning Lab materials and quality review.",
    level: 4,
  },
  community_moderator: {
    label: "Community & Student Support Moderator",
    summary: "Community safety, reports and scoped learner support.",
    level: 5,
  },
  analytics_admin: {
    label: "Analytics & Institutional Reporting",
    summary: "Permitted aggregate analytics, results reporting and audit review.",
    level: 6,
  },
  school_admin: {
    label: "School Administrator",
    summary: "Institution-scoped management and approved cohort reports.",
    level: 7,
  },
  teacher: {
    label: "Teacher / Instructor",
    summary: "Assigned learning activities and scoped student support.",
    level: 8,
  },
  content_reviewer: {
    label: "Content Reviewer",
    summary: "Review and approve learning resources and AI content quality.",
    level: 9,
  },
  finance_admin: {
    label: "Finance Administrator",
    summary: "Billing and subscription operations when enabled.",
    level: 10,
  },
  read_only_auditor: {
    label: "Read-only Auditor",
    summary: "Approved audit and aggregate reporting without write access.",
    level: 11,
  },
  competition_admin: {
    label: "Competition Administrator",
    summary: "Manages assigned competitions, question banks, registrations, and rewards within authorization limits.",
    level: 12,
  },
  competition_moderator: {
    label: "Competition Moderator",
    summary: "Operational moderation of public quizzes, reported misconduct, and flagged questions.",
    level: 13,
  },
  competition_host: {
    label: "Tutor / Competition Host",
    summary: "Creates and manages hosted quizzes, questions in owned banks, and private participant challenges.",
    level: 14,
  },
};

export const ADMIN_PERMISSION_KEYS = [
  "admin.roles.manage",
  "security.settings.manage",
  "cbt.questions.manage",
  "cbt.questions.delete",
  "cbt.answers.read",
  "cbt.answers.manage",
  "cbt.results.read",
  "cbt.results.create",
  "cbt.results.manage",
  "cbt.results.delete",
  "cbt.sessions.read",
  "cbt.sessions.create",
  "cbt.sessions.manage",
  "cbt.sessions.delete",
  "cbt.codes.manage",
  "cbt.codes.delete",
  "cbt.config.read",
  "cbt.config.manage",
  "cbt.config.delete",
  "ai.content.manage",
  "learning.content.manage",
  "ai.quality.review",
  "analytics.ai.read",
  "community.moderate",
  "student.support",
  "analytics.read",
  "institution.reports.read",
  "institution.manage",
  "learning.content.review",
  "finance.billing.manage",
  "audit.logs.read",
  "audit.logs.write",
  // Competition Arena permissions
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
  // STEM Studio permissions
  "stem.resource.view",
  "stem.resource.manage",
  "stem.resource.publish",
  "stem.resource.review",
  "stem.experiments.grade",
  // National Exam Calendar & Live Dynamic Slots
  "exam.calendar.manage",
  // Mail Centre & Communications Hub permissions
  "mail.view",
  "mail.compose",
  "mail.send",
  "mail.campaign.create",
  "mail.campaign.submit",
  "mail.campaign.approve",
  "mail.campaign.reject",
  "mail.campaign.dispatch",
  "mail.inbox.view",
  "mail.inbox.reply",
  "mail.inbox.manage",
  "mail.contacts.manage",
  "mail.templates.manage",
  "mail.automations.manage",
  "mail.settings.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];

// Client-side cache and in-flight request deduplication
let memoryPermsCache: Record<string, boolean> = {};
let permsCacheExpiresAt = 0;
const PERM_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL
const inFlightPermRequests = new Map<AdminPermission, Promise<boolean>>();

export function getCachedAdminPermissions(): Partial<Record<AdminPermission, boolean>> {
  if (typeof window === "undefined") return {};
  const now = Date.now();
  if (permsCacheExpiresAt > now && Object.keys(memoryPermsCache).length > 0) {
    return { ...memoryPermsCache };
  }
  try {
    const raw = window.sessionStorage.getItem("brainlab_admin_permissions_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.expiresAt === "number" && parsed.expiresAt > now && parsed.permissions) {
        memoryPermsCache = parsed.permissions;
        permsCacheExpiresAt = parsed.expiresAt;
        return { ...parsed.permissions };
      }
    }
  } catch {}
  return {};
}

export function setCachedAdminPermissions(perms: Partial<Record<AdminPermission, boolean>>): void {
  if (typeof window === "undefined") return;
  memoryPermsCache = { ...memoryPermsCache, ...perms };
  permsCacheExpiresAt = Date.now() + PERM_CACHE_TTL_MS;
  try {
    window.sessionStorage.setItem(
      "brainlab_admin_permissions_cache",
      JSON.stringify({ permissions: memoryPermsCache, expiresAt: permsCacheExpiresAt })
    );
  } catch {}
}

export function clearAdminPermissionsCache(): void {
  memoryPermsCache = {};
  permsCacheExpiresAt = 0;
  inFlightPermRequests.clear();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("brainlab_admin_permissions_cache");
    } catch {}
  }
}

export async function adminHasPermission(permission: AdminPermission, role?: AdminRole): Promise<boolean> {
  // 1. super_admin has universal access to all permissions by definition
  if (role === "super_admin") return true;

  // 1b. Instructors / Teachers have immediate academic & content authoring permissions
  if (isInstructorRole(role) && (INSTRUCTOR_PERMISSIONS as readonly string[]).includes(permission)) {
    return true;
  }

  // Note: Client-side sessionStorage is never trusted for super_admin authorization bypass.

  // 2. Check cached permissions
  const cached = getCachedAdminPermissions();
  if (typeof cached[permission] === "boolean") {
    return cached[permission]!;
  }

  // 3. Deduplicate in-flight requests for the same permission
  if (inFlightPermRequests.has(permission)) {
    return inFlightPermRequests.get(permission)!;
  }

  const reqPromise = (async () => {
    try {
      // 2500ms timeout guard to prevent indefinite hanging
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("RPC timeout") }), 2500)
      );

      const rpcCall = supabase.rpc("admin_has_permission", {
        permission_key: permission,
      });

      const { data, error } = await Promise.race([rpcCall, timeoutPromise]);
      const allowed = !error && data === true;

      setCachedAdminPermissions({ [permission]: allowed });
      return allowed;
    } catch {
      return false;
    } finally {
      inFlightPermRequests.delete(permission);
    }
  })();

  inFlightPermRequests.set(permission, reqPromise);
  return reqPromise;
}

export async function adminResolvePermissions(
  permissions: AdminPermission[],
  role?: AdminRole
): Promise<Partial<Record<AdminPermission, boolean>>> {
  // Super admin fast bypass: zero network requests
  if (role === "super_admin") {
    const allTrue = Object.fromEntries(permissions.map((p) => [p, true])) as Partial<Record<AdminPermission, boolean>>;
    setCachedAdminPermissions(allTrue);
    return allTrue;
  }

  const cached = getCachedAdminPermissions();
  const missing = permissions.filter((p) => typeof cached[p] !== "boolean");

  if (missing.length === 0) {
    const result: Partial<Record<AdminPermission, boolean>> = {};
    for (const p of permissions) {
      result[p] = cached[p];
    }
    return result;
  }

  // Fetch only missing permissions with de-duplication and timeout guards
  const fetchedEntries = await Promise.all(
    missing.map(async (perm) => [perm, await adminHasPermission(perm, role)] as const)
  );

  const newPermissions = Object.fromEntries(fetchedEntries);
  setCachedAdminPermissions(newPermissions);

  const combined: Partial<Record<AdminPermission, boolean>> = {};
  for (const p of permissions) {
    combined[p] = cached[p] ?? newPermissions[p] ?? false;
  }
  return combined;
}
