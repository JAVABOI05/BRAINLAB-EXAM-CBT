import { supabase } from "./supabase";

/**
 * Client-side authenticated fetch utility.
 * Automatically resolves the active Supabase session and attaches the
 * Bearer access token to request headers so admin API routes can authenticate
 * the caller securely.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let headers = new Headers(init?.headers || {});

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  } catch (err) {
    console.warn("[authFetch] Failed to retrieve session token:", err);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
