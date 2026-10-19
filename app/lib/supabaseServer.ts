import "server-only";

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
  const token = match?.[1];

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
