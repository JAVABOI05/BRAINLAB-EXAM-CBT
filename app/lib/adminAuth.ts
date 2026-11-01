// Admin identity helper for UI routing and server-side request authentication.
// It authoritatively verifies session credentials against Supabase and administrator role hierarchies.
import { supabase } from "./supabase";
import { ADMIN_ROLES, type AdminRole } from "./adminRoles";
import type { NextRequest } from "next/server";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};

export async function getAdminSession(req?: NextRequest): Promise<AdminUser | null> {
  // 1. If NextRequest is explicitly passed in a route handler, inspect its authorization headers / cookies
  if (req) {
    try {
      const { getUserFromRequest, resolveAdminRole } = await import("./supabaseServer");
      const user = await getUserFromRequest(req);
      if (!user) return null;

      const authHeader = req.headers.get("authorization");
      const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
      const role = await resolveAdminRole(user.id, token);

      if (role && ADMIN_ROLES.includes(role as AdminRole)) {
        return {
          id: user.id,
          email: user.email ?? "",
          role: role as AdminRole,
        };
      }
      return null;
    } catch (err) {
      console.warn("[adminAuth] Request-scoped admin resolution error:", err);
      return null;
    }
  }

  // 2. If running on Node.js server without explicit req, attempt next/headers resolution
  if (typeof window === "undefined") {
    try {
      const { headers, cookies } = await import("next/headers");
      const { resolveAdminRole, getSupabaseServerClient } = await import("./supabaseServer");
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      let token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
      let user = null;

      if (token) {
        const serverSupabase = getSupabaseServerClient(token);
        const { data } = await serverSupabase.auth.getUser(token);
        user = data?.user ?? null;
      }

      if (!user) {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        for (const c of allCookies) {
          if (c.name.includes("auth-token") || c.name.startsWith("sb-")) {
            try {
              const parsed = JSON.parse(c.value);
              const candidate = Array.isArray(parsed) ? parsed[0] : (parsed?.access_token || parsed);
              if (typeof candidate === "string" && candidate.length > 20) {
                token = candidate;
                const serverSupabase = getSupabaseServerClient(token);
                const { data } = await serverSupabase.auth.getUser(token);
                if (data?.user) {
                  user = data.user;
                  break;
                }
              }
            } catch {
              // ignore cookie parse error
            }
          }
        }
      }

      if (user) {
        const role = await resolveAdminRole(user.id, token);
        if (role && ADMIN_ROLES.includes(role as AdminRole)) {
          return {
            id: user.id,
            email: user.email ?? "",
            role: role as AdminRole,
          };
        }
      }
    } catch {
      // In case next/headers is accessed outside of request context, fall through
    }
  }

  // 3. Client-side browser execution (or fallback)
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
