// Admin identity helper for UI routing and server-side request authentication.
// It authoritatively verifies session credentials against Supabase and administrator role hierarchies.
import { supabase } from "./supabase";
import { ADMIN_ROLES, clearAdminPermissionsCache, type AdminRole } from "./adminRoles";
import type { NextRequest } from "next/server";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};

// Client-side in-memory and sessionStorage cache for instant route transitions
let memoryAdminCache: { user: AdminUser; expiresAt: number } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL

export function getCachedAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  if (memoryAdminCache && memoryAdminCache.expiresAt > now) {
    return memoryAdminCache.user;
  }
  try {
    const raw = window.sessionStorage.getItem("brainlab_admin_session_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.expiresAt === "number" && parsed.expiresAt > now && parsed.user) {
        memoryAdminCache = parsed;
        return parsed.user as AdminUser;
      }
    }
  } catch {}
  return null;
}

export function setCachedAdminSession(user: AdminUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    memoryAdminCache = null;
    try {
      window.sessionStorage.removeItem("brainlab_admin_session_cache");
    } catch {}
    return;
  }
  const record = { user, expiresAt: Date.now() + CACHE_TTL_MS };
  memoryAdminCache = record;
  try {
    window.sessionStorage.setItem("brainlab_admin_session_cache", JSON.stringify(record));
  } catch {}
}

export function clearAdminCache(): void {
  memoryAdminCache = null;
  clearAdminPermissionsCache();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("brainlab_admin_session_cache");
      window.sessionStorage.removeItem("brainlab_admin_permissions_cache");
      window.localStorage.removeItem("admin_user");
    } catch {}
  }
}

export async function getAdminSession(req?: NextRequest, forceRefresh = false): Promise<AdminUser | null> {
  // 1. If NextRequest is explicitly passed in a route handler, inspect its authorization headers / cookies
  if (req) {
    try {
      const { getUserFromRequest, resolveAdminRole } = await import("./supabaseServer");
      const user = await getUserFromRequest(req);
      if (!user) return null;

      const authHeader = req.headers.get("authorization");
      const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
      const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

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
        const role = await resolveAdminRole(user.id, token, user.email ?? undefined);
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

  // 3. Client-side browser execution: check cache first for instant UI response
  if (typeof window !== "undefined" && !forceRefresh) {
    const cached = getCachedAdminSession();
    if (cached) {
      return cached;
    }
  }

  // 4. Authoritative client-side verification with timeout guards
  let user: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const getUserTimeout = new Promise<{ data: { user: null }; error: Error }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null }, error: new Error("getUser timeout") }), 3500)
    );
    const { data, error } = await Promise.race([supabase.auth.getUser(), getUserTimeout]);
    if (!error && data?.user) {
      user = data.user;
    }
  } catch {
    // Network jitter
  }

  // Fallback to local session if getUser timed out or had temporary network latency
  if (!user) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
      }
    } catch {}
  }

  if (!user) {
    setCachedAdminSession(null);
    return null;
  }

  let resolvedRole: string | null = null;

  // 4a. Check role from JWT user metadata if available
  const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;
  if (metaRole && ADMIN_ROLES.includes(metaRole as AdminRole)) {
    resolvedRole = metaRole;
  }

  // 4b. Query get_admin_role RPC with 2.5s timeout guard
  if (!resolvedRole) {
    try {
      const rpcTimeout = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("RPC timeout") }), 2500)
      );
      const { data: role, error: roleError } = await Promise.race([
        supabase.rpc("get_admin_role"),
        rpcTimeout,
      ]);
      if (!roleError && typeof role === "string" && ADMIN_ROLES.includes(role as AdminRole)) {
        resolvedRole = role;
      }
    } catch {}
  }

  // 4c. Fallback to admin_profiles table
  if (!resolvedRole) {
    try {
      const profileTimeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 2000)
      );
      const { data: profile } = await Promise.race([
        supabase.from("admin_profiles").select("role").eq("user_id", user.id).maybeSingle(),
        profileTimeout,
      ]);
      if (profile && typeof profile.role === "string" && ADMIN_ROLES.includes(profile.role as AdminRole)) {
        resolvedRole = profile.role;
      }
    } catch {}
  }

  // 4d. Fallback to admin_user_roles table
  if (!resolvedRole) {
    try {
      const userRolesTimeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 2000)
      );
      const { data: userRole } = await Promise.race([
        supabase.from("admin_user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        userRolesTimeout,
      ]);
      if (userRole && typeof userRole.role === "string" && ADMIN_ROLES.includes(userRole.role as AdminRole)) {
        resolvedRole = userRole.role;
      }
    } catch {}
  }

  if (!resolvedRole) {
    setCachedAdminSession(null);
    return null;
  }

  const adminUser: AdminUser = {
    id: user.id,
    email: user.email ?? "",
    role: resolvedRole as AdminRole,
  };

  setCachedAdminSession(adminUser);
  return adminUser;
}

export async function adminSignIn(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Invalid login credentials." };

  // Authoritatively resolve and cache admin session
  const admin = await getAdminSession(undefined, true);
  if (!admin) {
    await supabase.auth.signOut();
    clearAdminCache();
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
  clearAdminCache();
  if (typeof window !== "undefined") {
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
