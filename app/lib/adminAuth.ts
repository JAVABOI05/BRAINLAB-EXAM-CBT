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

  const { data: role, error: roleError } = await supabase.rpc("get_admin_role");
  if (roleError || typeof role !== "string" || !ADMIN_ROLES.includes(role as AdminRole)) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    role: role as AdminRole,
  };
}

export async function adminSignIn(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Invalid login credentials." };

  const admin = await getAdminSession();
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account is not an administrator." };
  }
  // Do not persist the role as a browser-side authorization credential.
  // Protected data access is enforced by the database permission function/RLS.
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
