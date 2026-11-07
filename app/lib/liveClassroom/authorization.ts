import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig } from "@/app/lib/platformConfig";

/**
 * Classroom host authorization is deliberately narrower than "has an account
 * on the BrainLab domain". Only a database-backed platform role, an explicitly
 * configured tutor email, or an approved tutor profile can establish staff
 * status. Class ownership is checked separately by each route.
 */
const CLASSROOM_STAFF_ROLES = new Set([
  "super_admin",
  "platform_admin",
  "teacher",
]);

export async function resolveClassroomStaffAccess(
  user: User,
  bearerToken?: string
): Promise<{ isStaff: boolean; isPlatformAdmin: boolean; source: "platform_role" | "approved_tutor" | "allowlist" | null }> {
  const role = await resolveAdminRole(user.id, bearerToken, user.email);
  if (role && CLASSROOM_STAFF_ROLES.has(role.trim().toLowerCase())) {
    const normalizedRole = role.trim().toLowerCase();
    return {
      isStaff: true,
      isPlatformAdmin: normalizedRole === "super_admin" || normalizedRole === "platform_admin",
      source: "platform_role",
    };
  }

  const serviceSupabase = getSupabaseServerClient();

  if (user.id) {
    try {
      const { data, error } = await serviceSupabase
        .from("tutor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("profile_status", "approved")
        .limit(1)
        .maybeSingle();

      if (!error && data) return { isStaff: true, isPlatformAdmin: false, source: "approved_tutor" };
    } catch {
      // Fail closed: a profile lookup failure must not grant host privileges.
    }
  }

  // Explicitly configured individual exceptions are retained for operations.
  // A domain match alone is never sufficient.
  try {
    const config = await getLiveClassroomConfig();
    const email = user.email?.trim().toLowerCase();
    const allowed = Boolean(
      email &&
      config.allowed_tutor_emails?.some((entry) => entry.trim().toLowerCase() === email)
    );
    if (allowed) return { isStaff: true, isPlatformAdmin: false, source: "allowlist" };
  } catch {
    // Fail closed when the explicit allowlist cannot be read.
  }

  return { isStaff: false, isPlatformAdmin: false, source: null };
}
