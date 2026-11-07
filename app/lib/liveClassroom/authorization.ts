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

/**
 * Checks whether the caller may manage a specific classroom. Platform admins
 * may manage any class; tutors and explicitly approved individual exceptions
 * may manage only a class assigned to them (or a virtual stage they currently
 * host). A general tutor profile is never enough to manage another tutor's class.
 */
export async function canManageClassroom(
  user: User,
  classId: string,
  bearerToken?: string
): Promise<boolean> {
  const staff = await resolveClassroomStaffAccess(user, bearerToken);
  if (staff.isPlatformAdmin) return true;

  // This server-only helper uses the service client after the caller has
  // already been authenticated with getUserFromRequest. It needs to read the
  // owner field even when ordinary classroom RLS hides the full class row.
  const supabase = getSupabaseServerClient();
  try {
    const { data: liveClass, error } = await supabase
      .from("live_classes")
      .select("tutor_id")
      .eq("id", classId)
      .maybeSingle();

    if (!error && liveClass?.tutor_id === user.id) return true;
  } catch {
    // Continue to the virtual-stage ownership check.
  }

  try {
    const config = await getLiveClassroomConfig();
    const room = config.room_configs?.[classId];
    return Boolean(staff.isStaff && room?.active_host_id === user.id);
  } catch {
    return false;
  }
}
/**
 * Participant-side authorization for classroom APIs that expose messages or
 * media. This mirrors the join-token admission checks without trusting client
 * role flags. A successful login alone is not classroom membership.
 */
export async function canAccessClassroom(
  user: User,
  classId: string,
  bearerToken?: string
): Promise<boolean> {
  const staff = await resolveClassroomStaffAccess(user, bearerToken);
  if (staff.isPlatformAdmin || (await canManageClassroom(user, classId, bearerToken))) return true;

  const normalizedId = classId.trim().toUpperCase();
  const isVirtualStage = normalizedId === "BL-LIVE-101" || normalizedId === "DEMO-CLASS" ||
    normalizedId === "GENERAL-STAGE" || normalizedId.startsWith("BL-ROOM-") ||
    normalizedId.startsWith("BL-LIVE-") || normalizedId.startsWith("BL-STAGE-");

  let config;
  try {
    config = await getLiveClassroomConfig();
  } catch {
    return false;
  }
  const room = config.room_configs?.[classId] || config.room_configs?.[normalizedId];
  if (room?.require_permission && !room.admitted_students?.includes(user.id)) return false;

  if (isVirtualStage) {
    // Private stages must explicitly admit participants. Public stages remain
    // available to signed-in learners; host rights are checked separately.
    return !room?.require_permission || Boolean(room.admitted_students?.includes(user.id));
  }

  const supabase = getSupabaseServerClient(bearerToken);
  const { data: liveClass, error } = await supabase
    .from("live_classes")
    .select("id, course_id, status, waiting_room_enabled")
    .eq("id", classId)
    .maybeSingle();
  if (error || !liveClass || !["live", "completed"].includes(liveClass.status)) return false;

  if (!liveClass.course_id) return true;
  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", liveClass.course_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (enrollment) return true;

  const { data: subscription } = await supabase
    .from("subscription_records")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(subscription);
}
