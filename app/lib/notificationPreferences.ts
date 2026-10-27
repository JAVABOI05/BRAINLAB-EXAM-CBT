import crypto from "crypto";
import { getSupabaseServerClient } from "./supabaseServer";

export interface NotificationPreferences {
  email: string;
  user_id?: string | null;
  exam_results: boolean;
  classroom_alerts: boolean;
  streak_reminders: boolean;
  assignments: boolean;
  marketing_announcements: boolean;
  sms_alerts: boolean;
  unsubscribed_all: boolean;
  unsubscribed_at?: string | null;
  updated_at?: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, "email"> = {
  exam_results: true,
  classroom_alerts: true,
  streak_reminders: true,
  assignments: true,
  marketing_announcements: true,
  sms_alerts: true,
  unsubscribed_all: false,
  unsubscribed_at: null,
};

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || "brainlab-notif-secret-2026";

/**
 * Generates an HMAC-signed one-click unsubscribe token for a given email.
 */
export function generateUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(normalized)
    .digest("hex")
    .slice(0, 24);
  const data = Buffer.from(`${normalized}:${signature}`).toString("base64url");
  return data;
}

/**
 * Verifies an unsubscribe token and returns the normalized email if valid.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [email, signature] = decoded.split(":");
    if (!email || !signature) return null;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(email.trim().toLowerCase())
      .digest("hex")
      .slice(0, 24);
    if (signature === expectedSig) {
      return email.trim().toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches notification preferences for a candidate or subscriber by email or userId.
 */
export async function getPreferences(
  identifier: { email?: string; userId?: string }
): Promise<NotificationPreferences> {
  const supabase = getSupabaseServerClient();
  const email = identifier.email?.trim().toLowerCase();

  try {
    let query = supabase.from("notification_preferences").select("*");
    if (identifier.userId) {
      query = query.eq("user_id", identifier.userId);
    } else if (email) {
      query = query.eq("email", email);
    } else {
      return { email: "", ...DEFAULT_NOTIFICATION_PREFERENCES };
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("[notificationPreferences] DB select warning:", error.message);
    }

    if (data) {
      return {
        email: data.email,
        user_id: data.user_id,
        exam_results: Boolean(data.exam_results),
        classroom_alerts: Boolean(data.classroom_alerts),
        streak_reminders: Boolean(data.streak_reminders),
        assignments: Boolean(data.assignments),
        marketing_announcements: Boolean(data.marketing_announcements),
        sms_alerts: Boolean(data.sms_alerts),
        unsubscribed_all: Boolean(data.unsubscribed_all),
        unsubscribed_at: data.unsubscribed_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("[notificationPreferences] Error fetching preferences:", err);
  }

  return {
    email: email || "",
    user_id: identifier.userId || null,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };
}

/**
 * Updates or creates notification preferences for a subscriber.
 */
export async function savePreferences(
  email: string,
  updates: Partial<NotificationPreferences>,
  userId?: string | null
): Promise<NotificationPreferences> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const isUnsubscribingAll = updates.unsubscribed_all === true;
  const unsubscribedAt = isUnsubscribingAll ? now : (updates.unsubscribed_all === false ? null : updates.unsubscribed_at);

  const payload: Record<string, unknown> = {
    email: normalizedEmail,
    updated_at: now,
  };

  if (userId) payload.user_id = userId;
  if (updates.exam_results !== undefined) payload.exam_results = updates.exam_results;
  if (updates.classroom_alerts !== undefined) payload.classroom_alerts = updates.classroom_alerts;
  if (updates.streak_reminders !== undefined) payload.streak_reminders = updates.streak_reminders;
  if (updates.assignments !== undefined) payload.assignments = updates.assignments;
  if (updates.marketing_announcements !== undefined) payload.marketing_announcements = updates.marketing_announcements;
  if (updates.sms_alerts !== undefined) payload.sms_alerts = updates.sms_alerts;
  if (updates.unsubscribed_all !== undefined) {
    payload.unsubscribed_all = updates.unsubscribed_all;
    payload.unsubscribed_at = unsubscribedAt;
    // If unsubscribed from all, set all individual channels to false
    if (updates.unsubscribed_all) {
      payload.exam_results = false;
      payload.classroom_alerts = false;
      payload.streak_reminders = false;
      payload.assignments = false;
      payload.marketing_announcements = false;
      payload.sms_alerts = false;
    }
  }

  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "email" })
      .select("*")
      .single();

    if (error) {
      console.warn("[notificationPreferences] DB upsert fallback:", error.message);
    } else if (data) {
      return {
        email: data.email,
        user_id: data.user_id,
        exam_results: Boolean(data.exam_results),
        classroom_alerts: Boolean(data.classroom_alerts),
        streak_reminders: Boolean(data.streak_reminders),
        assignments: Boolean(data.assignments),
        marketing_announcements: Boolean(data.marketing_announcements),
        sms_alerts: Boolean(data.sms_alerts),
        unsubscribed_all: Boolean(data.unsubscribed_all),
        unsubscribed_at: data.unsubscribed_at,
        updated_at: data.updated_at,
      };
    }
  } catch (err) {
    console.warn("[notificationPreferences] Exception during save:", err);
  }

  return {
    email: normalizedEmail,
    user_id: userId || null,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...updates,
    updated_at: now,
  };
}

/**
 * Checks if a candidate is subscribed to a specific notification channel.
 */
export async function isChannelSubscribed(
  email: string | undefined | null,
  channel: "exam_results" | "classroom_alerts" | "streak_reminders" | "assignments" | "marketing_announcements" | "sms_alerts"
): Promise<boolean> {
  if (!email || !email.trim()) return true;
  const prefs = await getPreferences({ email: email.trim().toLowerCase() });
  if (prefs.unsubscribed_all) return false;
  return prefs[channel] !== false;
}
