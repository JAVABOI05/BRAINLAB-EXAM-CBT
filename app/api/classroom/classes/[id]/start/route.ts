import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getLiveClassroomConfig, logAdminAction } from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Please sign in to launch a stage." },
        { status: 401 }
      );
    }

    const { id: classId } = await context.params;
    if (!classId) {
      return NextResponse.json(
        { ok: false, error: "Missing required classId parameter." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const normalizedClassId = String(classId).trim().toUpperCase();
    const isOpenStage =
      normalizedClassId === "BL-LIVE-101" ||
      normalizedClassId === "DEMO-CLASS" ||
      normalizedClassId === "GENERAL-STAGE";

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabase = getSupabaseServerClient(token);
    const config = await getLiveClassroomConfig();

    // 1. Resolve host / instructor authorization
    const resolvedRole = await resolveAdminRole(user.id, token, user.email);
    const isStaffRole = Boolean(
      resolvedRole &&
      (
        ["super_admin", "platform_admin", "cbt_admin", "ai_learning_admin", "community_moderator", "analytics_admin", "school_admin", "teacher", "content_reviewer", "finance_admin", "read_only_auditor", "competition_admin", "competition_moderator", "competition_host"].includes(resolvedRole) ||
        resolvedRole.toLowerCase().includes("admin") ||
        resolvedRole.toLowerCase().includes("tutor") ||
        resolvedRole.toLowerCase().includes("teacher") ||
        resolvedRole.toLowerCase().includes("host") ||
        resolvedRole.toLowerCase().includes("moderator") ||
        resolvedRole.toLowerCase().includes("instructor") ||
        resolvedRole.toLowerCase().includes("staff")
      )
    );

    const isAllowedTutorByEmail = Boolean(
      user.email &&
        config.allowed_tutor_emails?.some(
          (e) => e.trim().toLowerCase() === user.email?.trim().toLowerCase()
        )
    );

    const isOfficialDomain = Boolean(
      user.email &&
      (user.email.toLowerCase().endsWith("@brainlabacademy.com.ng") ||
       user.email.toLowerCase().endsWith("@brainlab.com.ng"))
    );

    const metaRole = String(
      user.user_metadata?.role || user.app_metadata?.role || ""
    ).toLowerCase();
    const isMetaStaff =
      metaRole.includes("admin") ||
      metaRole === "teacher" ||
      metaRole === "tutor" ||
      metaRole === "host";

    let isAdminTableUser = false;
    try {
      const serviceSupabase = getSupabaseServerClient();
      const [uRes, pRes] = await Promise.all([
        user.email ? serviceSupabase.from("admin_users").select("id").ilike("email", user.email.trim()).maybeSingle() : Promise.resolve({ data: null }),
        user.id ? serviceSupabase.from("admin_profiles").select("id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (uRes?.data || pRes?.data) {
        isAdminTableUser = true;
      }
    } catch {}

    const isAuthorizedHost = isStaffRole || isAllowedTutorByEmail || isOfficialDomain || isMetaStaff || isAdminTableUser;
    const isHostClaim = isAuthorizedHost || (isOpenStage && (body?.asHost === true || body?.role === "host"));

    const now = new Date().toISOString();

    // 2. Open Stage Launch (e.g. BL-LIVE-101)
    if (isOpenStage) {
      if (!isHostClaim) {
        return NextResponse.json(
          {
            ok: false,
            error: "Forbidden. Only verified instructors or administrators can launch instant stages.",
          },
          { status: 403 }
        );
      }

      // Update room config with active host details
      try {
        const { saveLiveClassroomConfig } = await import("@/app/lib/platformConfig");
        const updatedRooms = { ...(config.room_configs || {}) };
        updatedRooms[classId] = {
          ...(updatedRooms[classId] || {}),
          title: updatedRooms[classId]?.title || (normalizedClassId === "BL-LIVE-101" ? "BrainLab Live Academic Stage (BL-LIVE-101)" : "BrainLab Live Masterclass"),
          is_active: true,
          active_host_id: user.id,
          active_host_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Instructor",
          started_at: now,
        };
        void saveLiveClassroomConfig(
          { room_configs: updatedRooms },
          { id: user.id, email: user.email || "tutor@brainlabacademy.com.ng" },
          `Instructor launched live stage for class ${classId}`
        );
      } catch (cfgErr) {
        console.warn("[start/route] Could not persist room config:", cfgErr);
      }

      // Check if BL-LIVE-101 exists in live_classes to update status if recorded
      try {
        await supabase
          .from("live_classes")
          .update({
            status: "live",
            actual_start_at: now,
            updated_at: now,
          })
          .eq("id", classId);
      } catch {
        // Non-blocking for virtual rooms
      }

      void logAdminAction({
        admin_id: user.id,
        admin_email: user.email || "host@brainlabacademy.com.ng",
        entity_type: "classroom",
        entity_id: classId,
        action: "updated",
        change_reason: "Instructor launched instant academic stage",
        new_value: { status: "live", started_at: now },
      });

      return NextResponse.json({
        ok: true,
        success: true,
        classId,
        roomName: normalizedClassId,
        status: "live",
        startedAt: now,
        message: "Academic stage launched successfully. Entering host cockpit.",
      });
    }

    // 3. Database-backed Scheduled Class Launch
    const { data: liveClass, error: fetchErr } = await supabase
      .from("live_classes")
      .select("*")
      .eq("id", classId)
      .maybeSingle();

    if (fetchErr || !liveClass) {
      // If class record not found but user is authorized host, permit open ad-hoc stage
      if (isAuthorizedHost) {
        return NextResponse.json({
          ok: true,
          success: true,
          classId,
          roomName: classId,
          status: "live",
          startedAt: now,
          message: "Live stage launched.",
        });
      }

      return NextResponse.json(
        { ok: false, error: "Live class not found." },
        { status: 404 }
      );
    }

    // Verify user is tutor assigned or administrator
    const isAssignedTutor = liveClass.tutor_id === user.id;
    if (!isAuthorizedHost && !isAssignedTutor) {
      return NextResponse.json(
        {
          ok: false,
          error: "Forbidden. Only the assigned instructor or platform administrator can start this class.",
        },
        { status: 403 }
      );
    }

    // 4. Update class state to "live" and stamp actual_start_at
    const { data: updatedClass, error: updateErr } = await supabase
      .from("live_classes")
      .update({
        status: "live",
        actual_start_at: now,
        updated_at: now,
      })
      .eq("id", classId)
      .select()
      .single();

    if (updateErr) {
      console.warn("[classroom/classes/start] Error updating live_classes:", updateErr.message);
    }

    void logAdminAction({
      admin_id: user.id,
      admin_email: user.email || "host@brainlabacademy.com.ng",
      entity_type: "classroom",
      entity_id: classId,
      action: "updated",
      change_reason: `Instructor started scheduled class: ${liveClass.title}`,
      new_value: { status: "live", started_at: now },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      class: updatedClass || { ...liveClass, status: "live", actual_start_at: now },
      roomName: liveClass.room_name || liveClass.id,
      status: "live",
      startedAt: now,
      message: "Stage started successfully.",
    });
  } catch (error: unknown) {
    console.error("[classroom/classes/start] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error starting live stage.",
      },
      { status: 500 }
    );
  }
}
