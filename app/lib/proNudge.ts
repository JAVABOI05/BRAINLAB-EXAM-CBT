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
    title: "Apex Cohort Guided Tutorials",
    message: "Looking for intensive personal mentoring? Join Apex Cohort for scheduled live masterclasses and dedicated tutor guidance.",
    actionLabel: "Discover Apex Cohort →",
  },
  cbt_corrections: {
    title: "Step-by-Step Corrections",
    message: "Full step-by-step master derivations and solutions are open for your independent practice.",
    actionLabel: "Continue Practice →",
  },
  live_classroom: {
    title: "Apex Cohort Live Masterclasses",
    message: "Structured subject-by-subject live classes with verified Nigerian tutors are conducted inside Apex Cohort rooms.",
    actionLabel: "Explore Apex Cohort →",
  },
  academic_resources: {
    title: "Curriculum Notes & Study Material",
    message: "High-yield curriculum formula sheets and notes are available in the Learning Hub.",
    actionLabel: "Explore Learning Hub →",
  },
  challenge_arena: {
    title: "National Challenge Arena",
    message: "Challenge peers nationwide to 1v1 academic sprint duels on the national leaderboard.",
    actionLabel: "Enter Arena →",
  },
  general: {
    title: "Apex Cohort Intensive Programme",
    message: "Experience structured live teaching, assigned weekly roadmaps, and dedicated tutor accountability.",
    actionLabel: "Discover Apex Cohort →",
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
    title = NUDGE_PRESETS[feature]?.title ?? "BrainLab Academic Insight",
    message = NUDGE_PRESETS[feature]?.message ?? "Discover Apex Cohort for intensive tutorials and dedicated tutor guidance.",
    linkUrl,
    actionLabel = NUDGE_PRESETS[feature]?.actionLabel ?? "Discover Apex Cohort →",
    cooldownHours = 24,
  } = options;

  const currentPath = window.location.pathname + window.location.search;
  const resolvedLinkUrl = linkUrl || "/apex";

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
          link_url: resolvedLinkUrl,
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
        href: resolvedLinkUrl,
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
