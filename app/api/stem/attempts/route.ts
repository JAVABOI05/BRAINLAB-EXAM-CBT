import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { recordStemExperimentAttempt, listStemExperimentAttempts } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";
import { canAccessStemResource, getStemRequiredAccessLevel, resolveStemAccessContext } from "@/app/lib/stem/stemAccess";

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

    const accessContext = await resolveStemAccessContext(user, token);
    if (!accessContext.isPrivileged && accessContext.accessLevel === "none") {
      return NextResponse.json({
        ok: false,
        error: "STEM Studio is not included in your current plan.",
        upgrade_url: "/pricing?feature=stem",
      }, { status: 403 });
    }

    const body = await request.json();
    const { resource_version_id, class_id, assignment_id, observations, measurements, conclusion } = body;

    if (!resource_version_id) {
      return NextResponse.json(
        { ok: false, error: "Missing required resource_version_id" },
        { status: 400 }
      );
    }

    const serviceClient = getSupabaseServerClient();
    const { data: versionRow, error: versionLookupError } = await serviceClient
      .from("stem_resource_versions")
      .select("id, resource:stem_resources!inner(id, slug, status, entitlement_tier, current_published_version_id)")
      .eq("id", resource_version_id)
      .maybeSingle();

    if (versionLookupError) {
      return NextResponse.json({ ok: false, error: "Unable to verify the selected STEM resource version." }, { status: 503 });
    }
    const resource = versionRow?.resource as unknown as {
      id: string;
      slug: string;
      status: string;
      entitlement_tier: string;
      current_published_version_id: string | null;
    } | null;
    if (!versionRow || !resource || resource.status !== "published" ||
      resource.current_published_version_id !== resource_version_id) {
      return NextResponse.json({ ok: false, error: "The selected STEM resource version is not currently published." }, { status: 404 });
    }

    if (!canAccessStemResource(accessContext, resource)) {
      return NextResponse.json({
        ok: false,
        locked: true,
        error: "Your current plan does not include this STEM lab.",
        required_access_level: getStemRequiredAccessLevel(resource.entitlement_tier),
        current_access_level: accessContext.accessLevel,
        upgrade_url: "/pricing?feature=stem",
      }, { status: 403 });
    }

    const quota = accessContext.monthlyLabQuota;
    const isUnlimited = accessContext.isPrivileged || quota >= 999999;
    let usedThisMonth = 0;
    let nextMonthStart: string | null = null;
    if (!isUnlimited) {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
      const { count, error: countError } = await serviceClient
        .from("stem_experiment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .in("status", ["completed", "graded"])
        .gte("started_at", monthStart)
        .lt("started_at", nextMonthStart);

      if (countError) {
        return NextResponse.json({ ok: false, error: "Unable to verify your monthly STEM lab allowance. Please try again." }, { status: 503 });
      }
      const used = count || 0;
      usedThisMonth = used;
      if (used >= quota) {
        return NextResponse.json({
          ok: false,
          quota_exceeded: true,
          error: "You have used all saved lab attempts included in your plan for this month.",
          quota: { limit: quota, used, remaining: 0, resets_at: nextMonthStart },
          upgrade_url: "/pricing?feature=stem",
        }, { status: 429 });
      }
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

    return NextResponse.json({
      ok: true,
      attempt,
      quota: isUnlimited ? { unlimited: true } : {
        limit: quota,
        used: usedThisMonth + 1,
        remaining: Math.max(0, quota - usedThisMonth - 1),
        resets_at: nextMonthStart,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to submit experiment attempt" },
      { status: 500 }
    );
  }
}
