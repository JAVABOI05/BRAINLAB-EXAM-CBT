import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";
import { canManageClassroom } from "@/app/lib/liveClassroom/authorization";
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

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const config = await getLiveClassroomConfig();
    const isAuthorized = await canManageClassroom(user, classId, token);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden. Only the assigned tutor or a platform administrator can manage admission for this class." },
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
