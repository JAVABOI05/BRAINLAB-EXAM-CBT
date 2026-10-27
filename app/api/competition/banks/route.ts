import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { CompetitionActor, hasPermissionInScope, logCompetitionAuditEvent } from "@/app/lib/competitionRbac";

async function getActor(req: NextRequest): Promise<CompetitionActor | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  const supabase = getSupabaseServerClient();
  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (profile?.role || "student") as CompetitionActor["role"];
  return {
    id: user.id,
    email: user.email || "",
    role,
  };
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getActor(req);
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("competition_question_banks")
      .select("*, competition_questions(count)")
      .order("created_at", { ascending: false });

    // Scope check: If not super/platform admin, only show owned, shared, or public banks
    if (!actor || (actor.role !== "super_admin" && actor.role !== "platform_admin" && actor.role !== "competition_admin")) {
      if (!actor) {
        query = query.eq("visibility", "public").eq("status", "active");
      } else {
        query = query.or(`owner_id.eq.${actor.id},visibility.in.(public,shared)`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ banks: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error listing banks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perm = hasPermissionInScope(actor, "question_bank.create");
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, subject, academic_level, visibility } = body;

    if (!name || !subject) {
      return NextResponse.json({ error: "Bank name and subject are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: bank, error } = await supabase
      .from("competition_question_banks")
      .insert({
        name: name.trim(),
        description: (description || "").trim(),
        subject: subject.trim(),
        academic_level: academic_level || "Secondary / UTME",
        visibility: visibility || "private",
        status: "active",
        owner_id: actor.id,
        created_by: actor.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await logCompetitionAuditEvent({
      action: "question_bank_created",
      resourceType: "competition_question_banks",
      resourceId: bank.id,
      actorId: actor.id,
      actorEmail: actor.email,
      details: { name: bank.name, subject: bank.subject, visibility: bank.visibility },
    });

    return NextResponse.json({ bank }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating bank";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
