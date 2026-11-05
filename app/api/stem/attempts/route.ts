import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { recordStemExperimentAttempt, listStemExperimentAttempts } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const adminRole = await resolveAdminRole(user.id);
    const isReviewer = isGovernanceAdminRole(adminRole) || isInstructorRole(adminRole);

    const { searchParams } = new URL(request.url);
    const student_id = isReviewer ? (searchParams.get("student_id") || undefined) : user.id;
    const status = (searchParams.get("status") as any) || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;

    const attempts = await listStemExperimentAttempts(
      { student_id, status, limit },
      client
    );

    return NextResponse.json({ ok: true, attempts });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load experiment attempts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { resource_version_id, class_id, assignment_id, observations, measurements, conclusion } = body;

    if (!resource_version_id) {
      return NextResponse.json(
        { ok: false, error: "Missing required resource_version_id" },
        { status: 400 }
      );
    }

    const { attempt, error } = await recordStemExperimentAttempt(
      {
        resource_version_id,
        student_id: user.id,
        class_id,
        assignment_id,
        observations,
        measurements,
        conclusion,
        status: "completed",
      },
      client
    );

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, attempt }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to submit experiment attempt" },
      { status: 500 }
    );
  }
}
