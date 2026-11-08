import { supabase } from "../supabase";

export interface ExamCalendarEvent {
  id: string;
  name: string;
  short_name: string;
  programme: "utme" | "waec" | "neco" | "post_utme" | "all";
  start_time: string; // ISO 8601 UTC
  end_time?: string | null;
  short_note?: string | null;
  official_source_url?: string | null;
  placement: "landing" | "dashboard" | "both";
  priority: number;
  status: "draft" | "published" | "archived";
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ChannelConfig {
  whatsapp_url: string;
  whatsapp_title: string;
  telegram_url?: string;
  verified_member_count?: number | null;
  as_of_date?: string | null;
  is_active: boolean;
  show_on_landing: boolean;
  show_on_dashboard: boolean;
}

export const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  whatsapp_url: "https://chat.whatsapp.com/BrainLabAcademy",
  whatsapp_title: "Official WhatsApp Community",
  telegram_url: "",
  verified_member_count: null, // S7 rule: null if unverified, never fake
  as_of_date: null,
  is_active: true,
  show_on_landing: true,
  show_on_dashboard: true,
};

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  state: "UPCOMING" | "IN_PROGRESS" | "ENDED";
  isExpired: boolean;
  formattedLagosDate?: string;
}

// Canonical fallback: 2027 JAMB UTME National Examination (08:00 WAT = 07:00 UTC on 2027-04-18)
export const CANONICAL_UTME_EVENT: ExamCalendarEvent = {
  id: "canonical-utme-2027",
  name: "2027 JAMB UTME National Examination",
  short_name: "JAMB UTME",
  programme: "utme",
  start_time: "2027-04-18T07:00:00.000Z",
  end_time: "2027-04-28T16:00:00.000Z",
  short_note: "Official Computer Based Test across all accredited CBT examination centres nationwide.",
  official_source_url: "https://www.jamb.gov.ng",
  placement: "both",
  priority: 10,
  status: "published",
};

/**
 * Calculates countdown remaining against effective time (adjusted for server skew).
 */
export function calculateExamCountdown(
  event: ExamCalendarEvent,
  effectiveNowMs: number = Date.now()
): TimeRemaining {
  const startTime = new Date(event.start_time).getTime();
  const endTime = event.end_time ? new Date(event.end_time).getTime() : null;

  if (isNaN(startTime)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, state: "ENDED", isExpired: true };
  }

  // State 1: UPCOMING (before start_time)
  if (effectiveNowMs < startTime) {
    const diff = startTime - effectiveNowMs;
    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, state: "UPCOMING", isExpired: false };
  }

  // State 2: IN_PROGRESS (between start_time and end_time)
  if (endTime && effectiveNowMs <= endTime) {
    const diff = endTime - effectiveNowMs;
    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, state: "IN_PROGRESS", isExpired: false };
  }

  // State 3: ENDED
  return { days: 0, hours: 0, minutes: 0, seconds: 0, state: "ENDED", isExpired: true };
}

/**
 * Formats a UTC timestamp into Africa/Lagos (WAT, UTC+1) string representation.
 */
export function formatLagosDate(
  isoDateStr: string,
  options: Intl.DateTimeFormatOptions = {
    timeZone: "Africa/Lagos",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    return new Intl.DateTimeFormat("en-NG", options).format(d);
  } catch {
    return isoDateStr;
  }
}

/**
 * Public query for published exam calendar events.
 */
export async function fetchPublishedExamEvents(options?: {
  placement?: "landing" | "dashboard" | "both";
  programme?: string;
}): Promise<ExamCalendarEvent[]> {
  try {
    let query = supabase
      .from("exam_calendar_events")
      .select("*")
      .eq("status", "published")
      .order("priority", { ascending: true })
      .order("start_time", { ascending: true });

    if (options?.placement && options.placement !== "both") {
      query = query.in("placement", [options.placement, "both"]);
    }

    if (options?.programme && options.programme !== "all") {
      query = query.in("programme", [options.programme.toLowerCase(), "all"]);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Return safe canonical fallback if table not yet populated or offline
      return [CANONICAL_UTME_EVENT];
    }
    return data as ExamCalendarEvent[];
  } catch {
    return [CANONICAL_UTME_EVENT];
  }
}

/**
 * Select the active event to display for a candidate or visitor.
 * Evaluates events in sequence and returns the first UPCOMING or IN_PROGRESS event.
 */
export function getActiveExamEvent(
  events: ExamCalendarEvent[],
  effectiveNowMs: number = Date.now(),
  studentProgramme?: string
): ExamCalendarEvent | null {
  if (!events || events.length === 0) return null;

  // Filter matching programme if specified
  const filtered = studentProgramme
    ? events.filter(
        (e) => e.programme === studentProgramme.toLowerCase() || e.programme === "all"
      )
    : events;

  const candidatePool = filtered.length > 0 ? filtered : events;

  for (const event of candidatePool) {
    const countdown = calculateExamCountdown(event, effectiveNowMs);
    if (countdown.state === "UPCOMING" || countdown.state === "IN_PROGRESS") {
      return event;
    }
  }

  // If all events in pool have ended, return null (cleanly hide)
  return null;
}

/**
 * Fetch Channel Configuration from platform_configuration
 */
export async function getChannelConfig(): Promise<ChannelConfig> {
  try {
    const { data, error } = await supabase
      .from("platform_configuration")
      .select("value")
      .eq("key", "channel_config")
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_CHANNEL_CONFIG;
    }

    return {
      ...DEFAULT_CHANNEL_CONFIG,
      ...(data.value as Partial<ChannelConfig>),
    };
  } catch {
    return DEFAULT_CHANNEL_CONFIG;
  }
}

/**
 * Save Channel Configuration (Admin only)
 */
export async function saveChannelConfig(
  config: ChannelConfig,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: previous } = await supabase
      .from("platform_configuration")
      .select("value")
      .eq("key", "channel_config")
      .maybeSingle();

    const { error } = await supabase.from("platform_configuration").upsert({
      key: "channel_config",
      category: "general",
      value: config,
      description: "Official community channel links and verified statistics",
      is_secret: false,
      updated_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };

    // Record audit log
    await supabase.from("configuration_audit_logs").insert({
      admin_email: adminEmail,
      entity_type: "config",
      entity_id: "channel_config",
      action: previous ? "updated" : "created",
      previous_value: previous?.value ?? null,
      new_value: config,
      change_reason: "Admin updated official community channel configuration",
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error saving channel config",
    };
  }
}
