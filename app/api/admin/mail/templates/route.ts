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
    const { data: templates, error } = await supabase
      .from("mail_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, templates: templates || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.templates.manage");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden: Cannot create templates." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.subject || !body.html_content) {
      return NextResponse.json({ error: "Name, subject, and HTML content are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: template, error } = await supabase
      .from("mail_templates")
      .insert({
        name: body.name,
        description: body.description || null,
        category: body.category || "marketing",
        subject: body.subject,
        html_content: body.html_content,
        text_content: body.text_content || null,
        available_tokens: body.available_tokens || [
          "{{first_name}}",
          "{{full_name}}",
          "{{email}}",
          "{{subscription_plan}}",
          "{{unsubscribe_url}}",
          "{{current_year}}",
        ],
        is_active: body.is_active !== false,
        created_by: admin.email,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "template.create",
      resource_type: "mail_templates",
      resource_id: template.id,
      details: { name: body.name, category: body.category },
    });

    return NextResponse.json({ success: true, template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("mail.templates.manage");
    if (!hasPerm && !["super_admin", "platform_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Template ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) updatePayload.name = body.name;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.category) updatePayload.category = body.category;
    if (body.subject) updatePayload.subject = body.subject;
    if (body.html_content) updatePayload.html_content = body.html_content;
    if (body.text_content !== undefined) updatePayload.text_content = body.text_content;
    if (typeof body.is_active === "boolean") updatePayload.is_active = body.is_active;

    const { data: updated, error } = await supabase
      .from("mail_templates")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("mail_audit_logs").insert({
      admin_id: admin.id,
      admin_name: admin.email,
      action: "template.update",
      resource_type: "mail_templates",
      resource_id: body.id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
