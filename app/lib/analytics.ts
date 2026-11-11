/**
 * BrainLab First-Party Analytics & Privacy-Preserving Telemetry Bus
 * NDPA 2023 Compliant: Zero PII, strict consent handling, deduplication,
 * and fail-safe execution when blocked by client extensions or privacy shields.
 */

export type AnalyticsEventName =
  | "programme_viewed"
  | "programme_selected"
  | "channel_join_clicked"
  | "countdown_viewed"
  | "free_practice_started"
  | "demo_completed"
  | "signup_started"
  | "signup_completed"
  | "enrolment_started"
  | "payment_completed"
  | "school_enquiry_submitted"
  | "tutor_application_submitted"
  | "student_goal_wizard_completed"
  | "instant_mini_mock_answered"
  | "instant_mini_mock_completed"
  | "diagnostic_assessment_completed"
  | "stem_molecule_viewed"
  | "stem_3d_action_triggered"
  | "stem_copilot_prompt_sent"
  | "stem_representation_changed";

export type CookieConsentStatus = "undecided" | "essential_only" | "all";

export const CONSENT_STORAGE_KEY = "brainlab-cookie-consent";
export const ANALYTICS_DISPATCH_EVENT = "brainlab-analytics-event";

// Forbidden keys that must never enter telemetry payloads (Anti-PII Rule)
const SENSITIVE_KEYS = [
  "password",
  "passcode",
  "token",
  "secret",
  "email",
  "phone",
  "mobile",
  "fullname",
  "full_name",
  "name",
  "contactname",
  "contact_name",
  "address",
  "bvn",
  "nin",
  "card",
  "cvv",
  "expiry",
  "account_number",
  "answer",
  "answers",
  "option_selected",
  "statement",
];

// In-memory deduplication window (2000ms suppression of duplicate event + payload)
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

/**
 * Checks whether user has explicitly granted analytics consent.
 * Respects browser Do Not Track (DNT) and Global Privacy Control (GPC).
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Honor browser-level privacy signals
  const nav = window.navigator as Navigator & {
    globalPrivacyControl?: boolean;
    doNotTrack?: string;
  };

  if (nav.globalPrivacyControl === true || nav.doNotTrack === "1") {
    return false;
  }

  // 2. Check local consent preference
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === "all";
  } catch {
    return false;
  }
}

/**
 * Retrieves the current cookie consent status.
 */
export function getCookieConsent(): CookieConsentStatus {
  if (typeof window === "undefined") return "undecided";
  try {
    const val = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "all" || val === "essential_only") {
      return val;
    }
  } catch {}
  return "undecided";
}

/**
 * Sets user cookie consent status and dispatches update.
 */
export function setCookieConsent(status: CookieConsentStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
    window.dispatchEvent(
      new CustomEvent("brainlab-consent-updated", { detail: { status } })
    );
  } catch {}
}

/**
 * Sanitizes an event payload by stripping any accidental personal data keys.
 */
export function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isForbidden = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));

    if (isForbidden) {
      // Redact sensitive values completely
      continue;
    }

    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      sanitized[key] = sanitizePayload(val as Record<string, unknown>);
    } else if (
      typeof val === "string" ||
      typeof val === "number" ||
      typeof val === "boolean" ||
      Array.isArray(val)
    ) {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Dispatches a privacy-preserving analytics event.
 * Guaranteed never to throw or disrupt site operation if blocked or offline.
 */
export function trackEvent(
  name: AnalyticsEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Consent Gate: Non-essential events suppressed without consent
    if (!hasAnalyticsConsent()) {
      return;
    }

    // 2. Deduplication check: Ensure event fires once within window
    const sanitized = sanitizePayload(payload);
    const signature = `${name}:${JSON.stringify(sanitized)}`;
    const now = Date.now();
    const lastFired = recentEvents.get(signature);

    if (lastFired && now - lastFired < DEDUP_WINDOW_MS) {
      return; // Deduplicate rapid multiple triggers
    }
    recentEvents.set(signature, now);

    // Prune old entries
    for (const [sig, ts] of recentEvents.entries()) {
      if (now - ts > DEDUP_WINDOW_MS * 2) {
        recentEvents.delete(sig);
      }
    }

    // 3. Dispatch in-memory custom DOM event for testing and extensions
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_DISPATCH_EVENT, {
        detail: { event: name, payload: sanitized, timestamp: now },
      })
    );

    // 4. Server transmission via beacon or fetch with keepalive (fail-safe)
    const body = JSON.stringify({
      event: name,
      payload: sanitized,
      timestamp: new Date(now).toISOString(),
    });

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const success = navigator.sendBeacon("/api/analytics/events", blob);
      if (success) return;
    }

    // Fallback fetch
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Intentionally silent: Ad-blockers or connection drops must never break UX
    });
  } catch {
    // Always fail safe: Never crash UI
  }
}
