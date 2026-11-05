// Server-side Supabase client for Route Handlers and Server actions

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export function getSupabaseServerClient(bearerToken?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  const headers: Record<string, string> = {
    "X-Client-Info": "brainlab-cbt-ai-generator",
  };
  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers },
  });
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  let token = match?.[1];

  if (!token) {
    try {
      const allCookies = request.cookies.getAll();
      for (const c of allCookies) {
        if (c.name.includes("auth-token") || c.name.startsWith("sb-")) {
          try {
            const parsed = JSON.parse(c.value);
            if (Array.isArray(parsed) && parsed[0]) {
              token = parsed[0];
              break;
            } else if (typeof parsed === "string") {
              token = parsed;
              break;
            } else if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          } catch {
            if (c.value && c.value.length > 20) {
              token = c.value;
              break;
            }
          }
        }
      }
    } catch {
      // ignore cookie parse error
    }
  }

  if (!token) return null;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;

    const authClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export interface AIGenerationRecord {
  id?: string;
  user_id?: string | null;
  prompt: string;
  response: string;
  model: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export async function saveAIGeneration(
  record: AIGenerationRecord,
  bearerToken?: string
) {
  const supabase = getSupabaseServerClient(bearerToken);
  const insertPayload = {
    user_id: record.user_id || null,
    prompt: record.prompt,
    response: record.response,
    model: record.model,
    metadata: record.metadata ?? {},
    created_at: record.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ai_generations")
    .insert([insertPayload])
    .select()
    .maybeSingle();

  return { data, error };
}

/**
 * Centrally and authoritatively resolves an administrator's role across all
 * database profile tables (admin_profiles, admin_user_roles, admin_users)
 * or via the get_admin_role RPC.
 */
export async function resolveAdminRole(
  userId: string,
  bearerToken?: string,
  userEmail?: string
): Promise<string | null> {
  if (!userId && !userEmail) return null;

  try {
    // 1. Check RPC get_admin_role if bearerToken is provided
    if (bearerToken) {
      try {
        const tokenSupabase = getSupabaseServerClient(bearerToken);
        const { data: rpcRole } = await tokenSupabase.rpc("get_admin_role");
        if (typeof rpcRole === "string" && rpcRole.trim().length > 0) {
          return rpcRole.trim();
        }
      } catch {
        // proceed to authoritative table checks with service role
      }
    }

    // Direct table checks using privileged server client
    const serviceSupabase = getSupabaseServerClient();

    // 2. Check admin_profiles table
    if (userId) {
      try {
        const { data: profile } = await serviceSupabase
          .from("admin_profiles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile && typeof profile.role === "string" && profile.role.trim().length > 0) {
          return profile.role.trim();
        }
      } catch {
        // proceed
      }
    }

    // 3. Check admin_users table (by id or email)
    try {
      if (userId) {
        const { data: adminUser } = await serviceSupabase
          .from("admin_users")
          .select("role")
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .maybeSingle();
        if (adminUser && typeof adminUser.role === "string" && adminUser.role.trim().length > 0) {
          return adminUser.role.trim();
        }
      }
      if (userEmail) {
        const { data: adminByEmail } = await serviceSupabase
          .from("admin_users")
          .select("role")
          .ilike("email", userEmail.trim())
          .maybeSingle();
        if (adminByEmail && typeof adminByEmail.role === "string" && adminByEmail.role.trim().length > 0) {
          return adminByEmail.role.trim();
        }
        const { data: profByEmail } = await serviceSupabase
          .from("admin_profiles")
          .select("role")
          .ilike("email", userEmail.trim())
          .maybeSingle();
        if (profByEmail && typeof profByEmail.role === "string" && profByEmail.role.trim().length > 0) {
          return profByEmail.role.trim();
        }
      }
    } catch {
      // proceed
    }
  } catch {
    // Return null if resolution encounters an error
  }

  return null;
}
