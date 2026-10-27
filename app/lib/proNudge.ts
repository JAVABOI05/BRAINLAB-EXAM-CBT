import { supabase } from "./supabase";
import { isCurrentUserAdmin } from "./subscriptionEntitlements";
import { toast } from "./toast";

export type ProFeatureId =
  | "ai_tutor"
  | "cbt_corrections"
  | "live_classroom"
  | "academic_resources"
  | "challenge_arena"
  | "general";

export interface ProNudgeOptions {
  feature: ProFeatureId;
  title: string;
  message: string;
  linkUrl?: string; // defaults to "/pricing"
  actionLabel?: string; // defaults to "Explore Pro & Plans →"
  cooldownHours?: number; // defaults to 24 hours
}

const NUDGE_PRESETS: Record<ProFeatureId, { title: string; message: string; actionLabel: string }> = {
  ai_tutor: {
    title: "Unlock Unlimited AI Tutor Queries & Derivations",
    message: "Learning fast? BrainLab Pro unlocks unlimited step-by-step problem derivations, audio explanations, and formula breakdowns.",
    actionLabel: "Upgrade for Unlimited AI →",
  },
  cbt_corrections: {
    title: "Master Mistakes with Full Step-by-Step Solutions",
    message: "Reviewing your CBT test? Pro members get full step-by-step master workings, examiner tips, and targeted practice for every missed question.",
    actionLabel: "Unlock Full Solutions →",
  },
  live_classroom: {
    title: "Access Live Interactive Classes & Replays",
    message: "Get complete access to all live tutor sessions, interactive stage participation, and downloadable lecture notes with BrainLab Pro.",
    actionLabel: "Join Live Masterclasses →",
  },
  academic_resources: {
    title: "Download Printable Formula Sheets & Guides",
    message: "Take your formulas offline! Pro members get printable PDF packs, formula flashcards, and high-yield UTME/WAEC summary booklets.",
    actionLabel: "Get Printable Resources →",
  },
  challenge_arena: {
    title: "Earn 2× XP & Unlock Custom 1v1 Arenas",
    message: "Power up your leaderboard climb! Pro contenders receive a double XP multiplier and can challenge peers to private custom battle rooms.",
    actionLabel: "Accelerate XP with Pro →",
  },
  general: {
    title: "Supercharge Your Exam Preparation",
    message: "Take your learning to the highest percentile with unlimited CBT tests, AI explanations, and live masterclasses.",
    actionLabel: "Explore Pro & Plans →",
  },
};

/**
 * Triggers an educational pro feature nudge for free-tier users.
 * - Does NOTHING if the user is an admin or is already on an active paid plan.
 * - Throttles notifications via localStorage so users are never spammed.
 * - Dispatches an in-app database notification to the student's Notification Centre.
 * - Emits a rich interactive toast with direct link to /pricing.
 */
export async function triggerProFeatureNudge(options: ProNudgeOptions): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const {
    feature,
    title = NUDGE_PRESETS[feature]?.title ?? "BrainLab Pro Tip",
    message = NUDGE_PRESETS[feature]?.message ?? "Accelerate your learning with BrainLab Pro.",
    linkUrl = "/pricing",
    actionLabel = NUDGE_PRESETS[feature]?.actionLabel ?? "Explore Pro →",
    cooldownHours = 24,
  } = options;

  // 1. Check local cooldown to prevent repeated nudges in a short timeframe
  const storageKey = `bl_nudge_last_${feature}`;
  try {
    const lastTriggered = localStorage.getItem(storageKey);
    if (lastTriggered) {
      const elapsedMs = Date.now() - parseInt(lastTriggered, 10);
      if (elapsedMs < cooldownHours * 60 * 60 * 1000) {
        return false;
      }
    }
  } catch {
    // localStorage not accessible
  }

  // 2. Check current user authentication
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return false;

    // 3. Admin Check: Administrators NEVER receive upgrade nudges
    const isAdmin = await isCurrentUserAdmin(user.id);
    if (isAdmin) return false;

    // 4. Subscription Check: Paid subscribers (Pro, Scholar, Distinction) NEVER receive nudges
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (sub && sub.plan_id && sub.plan_id !== "free") {
      return false;
    }

    // 5. Mark cooldown in storage
    try {
      localStorage.setItem(storageKey, Date.now().toString());
    } catch {
      // ignore
    }

    // 6. Record notification in database via /api/notifications
    const token = sessionData.session?.access_token;
    if (token) {
      void fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          message,
          type: "billing",
          link_url: linkUrl,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            window.dispatchEvent(new CustomEvent("brainlab:notification-received"));
          }
        })
        .catch(() => {
          // non-critical if background fetch fails
        });
    }

    // 7. Show user-facing toast
    toast.pro(
      message,
      title,
      {
        label: actionLabel,
        href: linkUrl,
      },
      7000
    );

    return true;
  } catch (err) {
    console.warn("Pro feature nudge error:", err);
    return false;
  }
}

/** Convenience helper for AI Tutor / AI Learning Studio */
export function nudgeAITutorHint() {
  return triggerProFeatureNudge({
    feature: "ai_tutor",
    ...NUDGE_PRESETS.ai_tutor,
  });
}

/** Convenience helper for CBT Corrections */
export function nudgeCBTCorrections() {
  return triggerProFeatureNudge({
    feature: "cbt_corrections",
    ...NUDGE_PRESETS.cbt_corrections,
  });
}

/** Convenience helper for Classroom */
export function nudgeLiveClassroom() {
  return triggerProFeatureNudge({
    feature: "live_classroom",
    ...NUDGE_PRESETS.live_classroom,
  });
}

/** Convenience helper for Academic Resources */
export function nudgeAcademicResources() {
  return triggerProFeatureNudge({
    feature: "academic_resources",
    ...NUDGE_PRESETS.academic_resources,
  });
}

/** Convenience helper for Challenge Arena */
export function nudgeChallengeArena() {
  return triggerProFeatureNudge({
    feature: "challenge_arena",
    ...NUDGE_PRESETS.challenge_arena,
  });
}
