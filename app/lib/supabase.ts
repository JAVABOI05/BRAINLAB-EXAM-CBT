import { createClient } from "@supabase/supabase-js";

// The anon key is public by design: it only identifies your project. What it can DO is
// decided by the database (RLS + the RPC functions), not by hiding this value.
// Configure both variables in .env.local (dev) and in Vercel -> Project Settings -> Environment Variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
