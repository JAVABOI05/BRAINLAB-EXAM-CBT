// Admin identity helper for UI routing. It is not an authorization boundary: every protected
// database operation must still be enforced by RLS or a permission-checking database RPC.
import { supabase } from "./supabase";
import { ADMIN_ROLES, type AdminRole } from "./adminRoles";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};

export async function getAdminSession(): Promise<AdminUser | null> {
  // getUser() validates the identity with Supabase Auth; browser storage is never
  // used as proof of an administrator role.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  let resolvedRole: string | null = null;

  try {
    const { data: role, error: roleError } = await supabase.rpc("get_admin_role");
    if (!roleError && typeof role === "string" && ADMIN_ROLES.includes(role as AdminRole)) {
      resolvedRole = role;
    }
  } catch {
    // proceed to table checks
  }

  if (!resolvedRole) {
    try {
      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile && typeof profile.role === "string" && ADMIN_ROLES.includes(profile.role as AdminRole)) {
        resolvedRole = profile.role;
      }
    } catch {
      // proceed
    }
  }

  if (!resolvedRole) {
    try {
      const { data: userRole } = await supabase
        .from("admin_user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (userRole && typeof userRole.role === "string" && ADMIN_ROLES.includes(userRole.role as AdminRole)) {
        resolvedRole = userRole.role;
      }
    } catch {
      // proceed
    }
  }

  if (!resolvedRole) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: resolvedRole as AdminRole,
  };
}

export async function adminSignIn(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Invalid login credentials." };

  const admin = await getAdminSession();
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account is not an administrator." };
  }

  // Set the operator gate cookie so protected admin middleware passes seamlessly
  if (data?.session?.access_token) {
    try {
      await fetch("/api/auth/operator-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });
    } catch {
      // Non-fatal if operator-gate endpoint fails or is in dev
    }
  }

  return { ok: true };
}

export async function adminSignOut(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("admin_user");
    try {
      await fetch("/api/auth/operator-gate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Always complete Supabase sign-out even if gate-cookie cleanup fails.
    }
  }
  await supabase.auth.signOut();
}
