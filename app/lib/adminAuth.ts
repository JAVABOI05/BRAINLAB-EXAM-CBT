// Admin authentication via Supabase Auth. Being logged in is NOT enough: the account must also
// be listed in public.admin_profiles (checked by the is_admin() database function). The database
// enforces the same rule on every table through RLS, so this check is only for the UI.
import { supabase } from "./supabase";

export type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "super_admin";
};

export async function getAdminSession(): Promise<AdminUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;

  const { data: isSuper } = await supabase.rpc("is_super_admin");
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: isSuper === true ? "super_admin" : "admin",
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
  if (typeof window !== "undefined") {
    window.localStorage.setItem("admin_user", JSON.stringify(admin));
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
