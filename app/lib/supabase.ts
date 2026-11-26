import { createClient } from "@supabase/supabase-js";

// Publishable/anon keys are public identifiers; database access is controlled by RLS
// and server-side authorization. Never use a service_role or secret key in this client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    // The dedicated callback pages perform the PKCE code exchange explicitly.
    detectSessionInUrl: false,
  },
});

// Automatic cache eviction on logout for shared computers
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      try {
        localStorage.removeItem("bl_student_xp_cache");
        localStorage.removeItem("brainlab_streak_count");
        localStorage.removeItem("brainlab_last_active_date");
        localStorage.removeItem("candidate");
        localStorage.removeItem("candidate_subjects");
        localStorage.removeItem("brainlab_student_goals_set");
        localStorage.removeItem("brainlab_goal_wizard_dismissed");
        localStorage.removeItem("exam_summary");
        localStorage.removeItem("exam_answers");
        localStorage.removeItem("exam_questions_cached");
        localStorage.removeItem("exam_session_id");
        localStorage.removeItem("exam_token");
        localStorage.removeItem("exam_attempt");
        localStorage.removeItem("exam_result");
        window.dispatchEvent(new Event("brainlab-local-storage"));
        window.dispatchEvent(new CustomEvent("brainlab_xp_awarded", { detail: null }));
      } catch {}
    }
  });
}
