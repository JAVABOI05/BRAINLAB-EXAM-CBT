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
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

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
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];

export async function adminHasPermission(permission: AdminPermission): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_has_permission", {
    permission_key: permission,
  });
  return !error && data === true;
}
