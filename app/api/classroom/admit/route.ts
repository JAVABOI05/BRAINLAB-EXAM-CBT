import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { resolveClassroomStaffAccess } from "@/app/lib/liveClassroom/authorization";
import { getLiveClassroomConfig, saveLiveClassroomConfig } from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { classId, studentId, action = "grant", studentIds } = body;

    if (!classId) {
      return NextResponse.json({ error: "Missing required classId parameter." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const config = await getLiveClassroomConfig();
    const staffAccess = await resolveClassroomStaffAccess(user);
    const isPlatformStaff = staffAccess.source === "platform_role";
    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("tutor_id")
      .eq("id", classId)
      .maybeSingle();

    const isAssignedHost =
      liveClass?.tutor_id === user.id ||
      config.room_configs?.[classId]?.active_host_id === user.id;

    if (!isPlatformStaff && !(staffAccess.isStaff && isAssignedHost)) {
      return NextResponse.json(
        { error: "Forbidden. Only the assigned host or an authorized platform administrator can grant admission." },
        { status: 403 }
      );
    }

    const roomConfigs = config.room_configs ? { ...config.room_configs } : {};
    const room = roomConfigs[classId] ? { ...roomConfigs[classId] } : {
      class_type: "masterclass" as const,
      require_permission: true,
      is_active: true,
      admitted_students: [],
    };

    const admittedSet = new Set<string>(room.admitted_students || []);

    if (action === "grant" && studentId) {
      admittedSet.add(studentId);
    } else if (action === "deny" && studentId) {
      admittedSet.delete(studentId);
    } else if (action === "grant_all" && Array.isArray(studentIds)) {
      studentIds.forEach((id: string) => admittedSet.add(id));
    }

    room.admitted_students = Array.from(admittedSet);
    roomConfigs[classId] = room;

    await saveLiveClassroomConfig(
      { room_configs: roomConfigs },
      { id: user.id, email: user.email || "tutor@brainlabacademy.com.ng" },
      `Tutor updated masterclass permissions for class ${classId}`
    );

    return NextResponse.json({
      success: true,
      admittedStudents: room.admitted_students,
      action,
    });
  } catch (error: unknown) {
    console.error("[classroom/admit] Error granting admission:", error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Failed to process admission request." },
      { status: 500 }
    );
  }
}
