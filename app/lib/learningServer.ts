import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type LearningServiceContext =
  | { ok: true; user: User; service: SupabaseClient }
  | { ok: false; status: number; message: string };

export async function getLearningServiceContext(request: NextRequest): Promise<LearningServiceContext> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, status: 401, message: "Sign in to continue." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return { ok: false, status: 503, message: "The learning assessment service is not configured yet." };
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await authClient.auth.getUser(match[1]);
  if (error || !data.user) return { ok: false, status: 401, message: "Your session could not be verified. Sign in again." };

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "brainlab-learning-assessment" } },
  });

  return { ok: true, user: data.user, service };
}

export function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeOptions(value: unknown): { id: string; text: string }[] | null {
  if (!Array.isArray(value)) return null;
  const options = value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      text: typeof item.text === "string" ? item.text : "",
    }));
  if (options.length < 2 || options.length > 8 || options.some((item) => !item.id || !item.text)) return null;
  if (new Set(options.map((item) => item.id)).size !== options.length) return null;
  return options;
}

export function noStoreJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
  });
}
