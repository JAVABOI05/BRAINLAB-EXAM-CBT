import { NextRequest, NextResponse } from "next/server";
import {
  CompetitionRole,
  ROLE_DEFAULT_PERMISSIONS,
  getCompetitionActor,
} from "@/app/lib/competitionRbac";

export async function GET(req: NextRequest) {
  try {
    const actor = await getCompetitionActor(req);
    if (!actor) {
      // Guest or Unauthenticated
      return NextResponse.json({
        authenticated: false,
        role: "guest" as CompetitionRole,
        permissions: ROLE_DEFAULT_PERMISSIONS.guest,
        scoped_permissions: [],
      });
    }

    const basePermissions = ROLE_DEFAULT_PERMISSIONS[actor.role] || [];

    return NextResponse.json({
      authenticated: true,
      userId: actor.id,
      email: actor.email,
      role: actor.role,
      permissions: basePermissions,
      scoped_permissions: actor.scoped_permissions || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
