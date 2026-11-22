import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: automations, error } = await supabase
      .from("mail_automations")
      .select("*, template:template_id(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, automations: automations || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load automations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.automations.manage");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.trigger_event) {
      return NextResponse.json({ error: "Name and trigger event are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: automation, error } = await supabase
      .from("mail_automations")
      .insert({
        name: body.name,
        trigger_event: body.trigger_event,
        template_id: body.template_id || null,
        is_active: body.is_active !== false,
        delay_minutes: body.delay_minutes || 0,
        conditions: body.conditions || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "automation.create",
      resource_type: "mail_automations",
      resource_id: automation.id,
      details: { name: body.name, trigger: body.trigger_event },
    });

    return NextResponse.json({ success: true, automation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.automations.manage");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Automation ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) updatePayload.name = body.name;
    if (body.trigger_event) updatePayload.trigger_event = body.trigger_event;
    if (body.template_id !== undefined) updatePayload.template_id = body.template_id;
    if (typeof body.is_active === "boolean") updatePayload.is_active = body.is_active;
    if (typeof body.delay_minutes === "number") updatePayload.delay_minutes = body.delay_minutes;
    if (body.conditions) updatePayload.conditions = body.conditions;

    const { data: updated, error } = await supabase
      .from("mail_automations")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, automation: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
