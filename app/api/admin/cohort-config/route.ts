import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import {
  getCohortConfig,
  saveCohortConfig,
  DEFAULT_COHORT_CONFIG,
  type CohortPlatformConfig,
} from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cohort-config
 * Retrieves the authoritative active cohort configuration and programme registry.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email || undefined);
    if (!adminRole) {
      return NextResponse.json({ ok: false, error: "Administrator privileges required" }, { status: 403 });
    }

    const [cohortConfig, supabase] = await Promise.all([
      getCohortConfig(),
      Promise.resolve(getSupabaseServerClient()),
    ]);

    // Also fetch database records from cohort_programmes and cohorts if available
    let dbProgrammes: any[] = [];
    try {
      const { data } = await supabase
        .from("cohort_programmes")
        .select(`
          id, programme_key, title, examination_target, academic_session, description, is_active,
          cohorts(id, name, capacity, status)
        `)
        .order("created_at", { ascending: false });
      if (data) dbProgrammes = data;
    } catch {}

    return NextResponse.json({
      ok: true,
      config: cohortConfig,
      programmes: dbProgrammes,
    });
  } catch (err: any) {
    console.error("[api/admin/cohort-config:GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load cohort configuration." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cohort-config
 * Authoritatively updates active cohort name and settings, propagating dynamically
 * across all public marketing and student surfaces.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id, undefined, user.email || undefined);
    if (!adminRole) {
      return NextResponse.json({ ok: false, error: "Administrator privileges required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "save_config").trim();
    const currentConfig = await getCohortConfig();
    const supabase = getSupabaseServerClient();

    let updatedConfig: CohortPlatformConfig = {
      ...currentConfig,
      active_cohort_name: body.active_cohort_name?.trim() || currentConfig.active_cohort_name,
      active_cohort_tagline: body.active_cohort_tagline?.trim() || currentConfig.active_cohort_tagline,
      active_cohort_session: body.active_cohort_session?.trim() || currentConfig.active_cohort_session,
      active_cohort_target: body.active_cohort_target?.trim() || currentConfig.active_cohort_target,
      active_cohort_slug: body.active_cohort_slug?.trim() || currentConfig.active_cohort_slug,
      is_enrolling: typeof body.is_enrolling === "boolean" ? body.is_enrolling : currentConfig.is_enrolling,
      whatsapp_inquiry_phone: body.whatsapp_inquiry_phone?.trim() || currentConfig.whatsapp_inquiry_phone,
      whatsapp_inquiry_digits: body.whatsapp_inquiry_digits?.trim() || currentConfig.whatsapp_inquiry_digits,
    };

    // If action is create_new_cohort, register it in the database and activate it
    if (action === "create_new_cohort") {
      const newCohortName = String(body.new_cohort_name || "").trim();
      const newSlug = String(body.new_cohort_slug || newCohortName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")).trim();
      const session = String(body.session || updatedConfig.active_cohort_session).trim();
      const examTarget = String(body.exam_target || "UTME").trim();
      const capacity = Number(body.capacity || 100);

      if (!newCohortName) {
        return NextResponse.json({ ok: false, error: "New cohort name is required." }, { status: 400 });
      }

      try {
        // 1. Insert into cohort_programmes
        const { data: prog, error: progErr } = await supabase
          .from("cohort_programmes")
          .insert({
            programme_key: newSlug.toUpperCase(),
            title: newCohortName,
            examination_target: examTarget,
            academic_session: session,
            description: body.description || `Active cohort for ${session} academic preparation.`,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
          })
          .select()
          .maybeSingle();

        if (prog && !progErr) {
          // 2. Insert into cohorts table
          await supabase.from("cohorts").insert({
            programme_id: prog.id,
            name: `${newCohortName} (General Track)`,
            capacity: capacity > 0 ? capacity : 100,
            status: "enrolling",
          });
        }
      } catch (dbErr) {
        console.warn("[api/admin/cohort-config] DB sync note (table may be managed via migration):", dbErr);
      }

      // Set as active cohort name across the platform
      updatedConfig.active_cohort_name = newCohortName;
      updatedConfig.active_cohort_slug = newSlug;
      updatedConfig.active_cohort_session = session;
      updatedConfig.active_cohort_target = examTarget;
    } else {
      // Also update the flagship programme title in DB if it exists
      try {
        await supabase
          .from("cohort_programmes")
          .update({
            title: updatedConfig.active_cohort_name,
            academic_session: updatedConfig.active_cohort_session,
            updated_at: new Date().toISOString(),
          })
          .eq("programme_key", "APEX-UTME-2027");
      } catch {}
    }

    // Save authoritative configuration in exam_config
    const success = await saveCohortConfig(
      updatedConfig,
      { id: user.id, email: user.email || "admin@brainlabacademy.com" },
      body.reason || `Admin changed cohort name to "${updatedConfig.active_cohort_name}"`
    );

    if (!success) {
      return NextResponse.json({ ok: false, error: "Failed to persist cohort configuration." }, { status: 500 });
    }

    // Record immutable audit log
    try {
      await supabase.from("access_audit_logs").insert({
        actor_id: user.id,
        action: action === "create_new_cohort" ? "created_new_cohort" : "updated_cohort_name",
        entity_type: "cohort_platform_config",
        entity_id: updatedConfig.active_cohort_slug,
        new_state: updatedConfig,
        reason: `Cohort name set to "${updatedConfig.active_cohort_name}"`,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      message: `Cohort configuration saved! Active cohort is now "${updatedConfig.active_cohort_name}".`,
      config: updatedConfig,
    });
  } catch (err: any) {
    console.error("[api/admin/cohort-config:POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to update cohort configuration." },
      { status: 500 }
    );
  }
}
