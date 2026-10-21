import { supabase } from "./supabase";

export interface CalendarEvent {
  id: string;
  user_id?: string;
  course_id?: string;
  class_id?: string;
  title: string;
  description?: string;
  event_type: "class" | "assignment" | "exam" | "revision" | "custom";
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  location_url?: string;
  status: "scheduled" | "rescheduled" | "cancelled" | "completed";
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export async function fetchCalendarEvents(options?: {
  eventType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CalendarEvent[]> {
  try {
    let query = supabase
      .from("calendar_events")
      .select("*")
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });

    if (options?.eventType && options.eventType !== "all") {
      query = query.eq("event_type", options.eventType);
    }
    if (options?.startDate) {
      query = query.gte("start_time", options.startDate);
    }
    if (options?.endDate) {
      query = query.lte("end_time", options.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[calendarService] Error fetching events:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("[calendarService] Exception:", err);
    return [];
  }
}

/**
 * Generates an iCalendar (.ics) string for standards-compliant export
 * to Google Calendar, Apple Calendar, and Outlook.
 */
export function generateIcsContent(event: CalendarEvent): string {
  const formatIcsDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const start = formatIcsDate(event.start_time);
  const end = formatIcsDate(event.end_time);
  const now = formatIcsDate(new Date().toISOString());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BrainLab Academy//Timetable 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event_${event.id}@brainlabacademy.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${(event.description || "").replace(/[,;]/g, " ")}`,
    event.location_url ? `URL:${event.location_url}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
