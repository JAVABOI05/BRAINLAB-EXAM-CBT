import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { CompetitionRole, ROLE_DEFAULT_PERMISSIONS, UserScopedPermission } from "@/app/lib/competitionRbac";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      // Guest or Unauthenticated
      return NextResponse.json({
        authenticated: false,
        role: "guest" as CompetitionRole,
        permissions: ROLE_DEFAULT_PERMISSIONS.guest,
        scoped_permissions: [],
      });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch user's role from admin_profiles
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    let role: CompetitionRole = "student";
    if (adminProfile?.role) {
      if (adminProfile.role === "super_admin") role = "super_admin";
      else if (adminProfile.role === "platform_admin") role = "platform_admin";
      else if (adminProfile.role === "competition_admin") role = "competition_admin";
      else if (adminProfile.role === "community_moderator") role = "competition_moderator";
      else if (adminProfile.role === "competition_moderator") role = "competition_moderator";
      else if (adminProfile.role === "competition_host" || adminProfile.role === "teacher") role = "competition_host";
      else role = "platform_admin";
    }

    // 2. Fetch scoped permissions
    const { data: scopedPerms } = await supabase
      .from("competition_user_permissions")
      .select("permission_key, scope_type, scope_id")
      .eq("user_id", user.id);

    const basePermissions = ROLE_DEFAULT_PERMISSIONS[role] || [];

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      role,
      permissions: basePermissions,
      scoped_permissions: (scopedPerms || []) as UserScopedPermission[],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
