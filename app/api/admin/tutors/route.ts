import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { logAdminAction } from "@/app/lib/platformConfig";

async function requireSuperAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const supabase = getSupabaseServerClient();
  const { data: role } = await supabase.from("admin_user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Only the Super Admin can add tutors or assign tutor subjects." }, { status: 403 }) };
  }
  return { user, supabase };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;
    const { user, supabase } = auth;
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const subjectIds: string[] = Array.isArray(body.subject_ids) ? [...new Set((body.subject_ids as unknown[]).map((id) => String(id)))] : [];
    const fullName = String(body.full_name || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid tutor email is required." }, { status: 400 });
    }
    if (subjectIds.length === 0) {
      return NextResponse.json({ error: "Assign at least one subject to the tutor." }, { status: 400 });
    }

    const { data: subjects, error: subjectError } = await supabase
      .from("learning_subjects").select("id").in("id", subjectIds);
    if (subjectError || !subjects || subjects.length !== subjectIds.length) {
      return NextResponse.json({ error: "One or more selected subjects do not exist." }, { status: 400 });
    }

    // Inviting a tutor requires a service-role configured server client. Never expose this key to the browser.
    const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, account_type: "tutor" },
    });
    if (inviteError || !invite.user) {
      return NextResponse.json({ error: inviteError?.message || "Could not invite tutor. Ensure the server has SUPABASE_SERVICE_ROLE_KEY configured." }, { status: 500 });
    }

    const tutorId = invite.user.id;
    const { error: roleError } = await supabase.from("admin_user_roles").upsert(
      { user_id: tutorId, role: "teacher" },
      { onConflict: "user_id" }
    );
    if (roleError) {
      return NextResponse.json({ error: "Tutor invitation was created, but assigning the tutor role failed. Resolve the role assignment before the tutor signs in." }, { status: 500 });
    }

    const { error: assignmentError } = await supabase.from("tutor_subject_assignments").insert(
      subjectIds.map((subject_id: string) => ({ tutor_id: tutorId, subject_id, assigned_by: user.id }))
    );
    if (assignmentError) {
      return NextResponse.json({ error: "Tutor invitation and role were created, but subject assignment failed. Please retry the assignment from Super Admin." }, { status: 500 });
    }

    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "super-admin",
      entity_type: "classroom",
      entity_id: tutorId,
      action: "created",
      new_value: { email, subject_ids: subjectIds },
      change_reason: "Super Admin invited tutor and assigned subjects",
    });

    return NextResponse.json({ success: true, tutor: { id: tutorId, email, full_name: fullName }, subject_ids: subjectIds }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if ("error" in auth) return auth.error;
    const { user, supabase } = auth;
    const body = await request.json();
    const tutorId = String(body.tutor_id || "");
    const subjectIds: string[] = Array.isArray(body.subject_ids) ? [...new Set((body.subject_ids as unknown[]).map((id) => String(id)))] : [];
    if (!tutorId || subjectIds.length === 0) {
      return NextResponse.json({ error: "tutor_id and at least one subject_id are required." }, { status: 400 });
    }

    const { data: role } = await supabase.from("admin_user_roles").select("role").eq("user_id", tutorId).maybeSingle();
    if (role?.role !== "teacher") {
      return NextResponse.json({ error: "Only an existing tutor account can be assigned subjects through this endpoint." }, { status: 400 });
    }
    const { data: subjects, error: subjectError } = await supabase.from("learning_subjects").select("id").in("id", subjectIds);
    if (subjectError || !subjects || subjects.length !== subjectIds.length) {
      return NextResponse.json({ error: "One or more selected subjects do not exist." }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from("tutor_subject_assignments").delete().eq("tutor_id", tutorId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    const { error: insertError } = await supabase.from("tutor_subject_assignments").insert(
      subjectIds.map((subject_id: string) => ({ tutor_id: tutorId, subject_id, assigned_by: user.id }))
    );
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "super-admin",
      entity_type: "classroom",
      entity_id: tutorId,
      action: "updated",
      new_value: { subject_ids: subjectIds },
      change_reason: "Super Admin updated tutor subject assignments",
    });
    return NextResponse.json({ success: true, tutor_id: tutorId, subject_ids: subjectIds });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
