import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { CANONICAL_UTME_EVENT, type ExamCalendarEvent, type ChannelConfig, DEFAULT_CHANNEL_CONFIG } from "@/app/lib/services/examCalendarService";

export const dynamic = "force-dynamic";

async function verifyAdminCaller(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const supabase = getSupabaseServerClient();

  // Check admin roles
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = adminRecord?.role;
  const isSuperOrCalendarAdmin =
    role && ["super_admin", "platform_admin", "cbt_admin"].includes(role);

  if (isSuperOrCalendarAdmin) {
    return { ok: true, user, role, supabase };
  }

  // Check RPC permission check if role table differs
  const { data: permAllowed } = await supabase.rpc("admin_has_permission", {
    permission_key: "exam.calendar.manage",
  });

  if (permAllowed === true) {
    return { ok: true, user, role: "admin", supabase };
  }

  return { ok: false, status: 403, error: "Forbidden: 'exam.calendar.manage' permission required." };
}

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminCaller(request);
  if (!authCheck.ok || !authCheck.supabase) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { supabase } = authCheck;

  try {
    // 1. Fetch all events (drafts, published, archived)
    const { data: events, error: eventsError } = await supabase
      .from("exam_calendar_events")
      .select("*")
      .order("priority", { ascending: true })
      .order("start_time", { ascending: true });

    // 2. Fetch channel config
    const { data: channelRow } = await supabase
      .from("platform_configuration")
      .select("value")
      .eq("key", "channel_config")
      .maybeSingle();

    const channelConfig = channelRow?.value
      ? { ...DEFAULT_CHANNEL_CONFIG, ...(channelRow.value as Partial<ChannelConfig>) }
      : DEFAULT_CHANNEL_CONFIG;

    return NextResponse.json({
      events: events && events.length > 0 ? events : [CANONICAL_UTME_EVENT],
      channelConfig,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminCaller(request);
  if (!authCheck.ok || !authCheck.supabase || !authCheck.user) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { supabase, user } = authCheck;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // Action 1: Save Event
    if (action === "save_event") {
      const event: Partial<ExamCalendarEvent> = body.event || {};

      if (!event.name?.trim() || !event.short_name?.trim()) {
        return NextResponse.json(
          { error: "Event name and short name are required." },
          { status: 400 }
        );
      }

      if (!event.start_time) {
        return NextResponse.json(
          { error: "Event start date and time is required." },
          { status: 400 }
        );
      }

      const startMs = new Date(event.start_time).getTime();
      if (isNaN(startMs)) {
        return NextResponse.json({ error: "Invalid start_time format." }, { status: 400 });
      }

      if (event.end_time) {
        const endMs = new Date(event.end_time).getTime();
        if (isNaN(endMs) || endMs < startMs) {
          return NextResponse.json(
            { error: "Event end_time must be on or after start_time." },
            { status: 400 }
          );
        }
      }

      if (event.official_source_url && !/^https?:\/\//i.test(event.official_source_url)) {
        return NextResponse.json(
          { error: "Official source URL must begin with http:// or https://" },
          { status: 400 }
        );
      }

      // Read existing for audit logging
      let previous = null;
      if (event.id && !event.id.startsWith("canonical-")) {
        const { data: prevRow } = await supabase
          .from("exam_calendar_events")
          .select("*")
          .eq("id", event.id)
          .maybeSingle();
        previous = prevRow;
      }

      const eventPayload = {
        name: event.name.trim(),
        short_name: event.short_name.trim(),
        programme: event.programme || "utme",
        start_time: new Date(event.start_time).toISOString(),
        end_time: event.end_time ? new Date(event.end_time).toISOString() : null,
        short_note: event.short_note?.trim() || null,
        official_source_url: event.official_source_url?.trim() || null,
        placement: event.placement || "both",
        priority: typeof event.priority === "number" ? event.priority : 100,
        status: event.status || "draft",
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let savedId = event.id;
      if (event.id && !event.id.startsWith("canonical-")) {
        const { error: updateErr } = await supabase
          .from("exam_calendar_events")
          .update(eventPayload)
          .eq("id", event.id);
        if (updateErr) throw updateErr;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("exam_calendar_events")
          .insert({
            ...eventPayload,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        savedId = inserted.id;
      }

      // Record audit log
      await supabase.from("configuration_audit_logs").insert({
        admin_email: user.email || "admin@brainlabacademy.com",
        entity_type: "exam_calendar",
        entity_id: savedId,
        action: previous ? "updated" : "created",
        previous_value: previous,
        new_value: eventPayload,
        change_reason: body.change_reason || "Admin saved exam calendar event",
      });

      return NextResponse.json({ ok: true, id: savedId });
    }

    // Action 2: Delete Event
    if (action === "delete_event") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Missing event id." }, { status: 400 });

      const { data: prevRow } = await supabase
        .from("exam_calendar_events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { error: delErr } = await supabase
        .from("exam_calendar_events")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      await supabase.from("configuration_audit_logs").insert({
        admin_email: user.email || "admin@brainlabacademy.com",
        entity_type: "exam_calendar",
        entity_id: id,
        action: "reverted",
        previous_value: prevRow,
        new_value: null,
        change_reason: body.change_reason || "Admin deleted exam calendar event",
      });

      return NextResponse.json({ ok: true });
    }

    // Action 3: Save Channel Config
    if (action === "save_channel") {
      const channel: Partial<ChannelConfig> = body.channel || {};

      if (!channel.whatsapp_url?.trim()) {
        return NextResponse.json({ error: "WhatsApp URL is required." }, { status: 400 });
      }

      const { data: prevConfig } = await supabase
        .from("platform_configuration")
        .select("value")
        .eq("key", "channel_config")
        .maybeSingle();

      const newConfigValue: ChannelConfig = {
        whatsapp_url: channel.whatsapp_url.trim(),
        whatsapp_title: channel.whatsapp_title?.trim() || "Official WhatsApp Community",
        telegram_url: channel.telegram_url?.trim() || "",
        // S7 rule: null if unverified or blank, never fake
        verified_member_count:
          typeof channel.verified_member_count === "number" && channel.verified_member_count > 0
            ? channel.verified_member_count
            : null,
        as_of_date: channel.as_of_date?.trim() || null,
        is_active: channel.is_active ?? true,
        show_on_landing: channel.show_on_landing ?? true,
        show_on_dashboard: channel.show_on_dashboard ?? true,
      };

      const { error: configErr } = await supabase.from("platform_configuration").upsert({
        key: "channel_config",
        category: "general",
        value: newConfigValue,
        description: "Official community channel links and verified statistics",
        is_secret: false,
        updated_at: new Date().toISOString(),
      });

      if (configErr) throw configErr;

      await supabase.from("configuration_audit_logs").insert({
        admin_email: user.email || "admin@brainlabacademy.com",
        entity_type: "config",
        entity_id: "channel_config",
        action: prevConfig ? "updated" : "created",
        previous_value: prevConfig?.value ?? null,
        new_value: newConfigValue,
        change_reason: body.change_reason || "Admin updated channel configuration",
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
