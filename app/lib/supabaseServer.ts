import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServerClient(): SupabaseClient {
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

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "brainlab-cbt-ai-generator",
      },
    },
  });
}

export interface AIGenerationRecord {
  id?: string;
  prompt: string;
  response: string;
  model: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export async function saveAIGeneration(record: AIGenerationRecord) {
  const supabase = getSupabaseServerClient();
  const insertPayload = {
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
