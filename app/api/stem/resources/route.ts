import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
  resolveAdminRole,
} from "@/app/lib/supabaseServer";
import { listStemResources, createStemResource } from "@/app/lib/stem/stemService";
import { getStemResourceAccess, resolveStemAccessContext } from "@/app/lib/stem/stemAccess";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject_id = searchParams.get("subject_id") || undefined;
    const topic_id = searchParams.get("topic_id") || undefined;
    const tier = searchParams.get("tier") ? Number(searchParams.get("tier")) : undefined;
    const resource_type = (searchParams.get("resource_type") as any) || undefined;
    const requestedStatus = searchParams.get("status");
    const search = searchParams.get("search") || undefined;
    const featured_only = searchParams.get("featured") === "true";

    // Authentication and authorization check for non-published content access
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = await getUserFromRequest(request);

    const accessContext = await resolveStemAccessContext(user, token);
    const isAuthorizedReviewer = accessContext.isPrivileged;
    // Public / unauthenticated callers can ONLY view published resources
    const effectiveStatus = isAuthorizedReviewer && requestedStatus
      ? (requestedStatus as any)
      : "published";

    // Use anon client for public reads to ensure RLS compliance
    const client = isAuthorizedReviewer && token
      ? getSupabaseServerClient(token)
      : getSupabasePublicServerClient();

    const resources = await listStemResources(
      { subject_id, topic_id, tier, resource_type, status: effectiveStatus, search, featured_only },
      client
    );

    const decoratedResources = resources.map((resource) => {
      const stem_access = getStemResourceAccess(accessContext, resource);
      if (stem_access.locked && resource.current_version) {
        return {
          ...resource,
          stem_access,
          current_version: {
            ...resource.current_version,
            initial_state: {},
            content_payload: {},
          },
        };
      }
      return { ...resource, stem_access };
    });

    return NextResponse.json({ ok: true, resources: decoratedResources, plan_access: {
      plan_id: accessContext.planId,
      access_level: accessContext.accessLevel,
      monthly_lab_quota: accessContext.monthlyLabQuota,
    } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load STEM resources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // STEM authoring is limited to verified teachers/tutors and governance administrators.
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    const isStemGovernanceRole = ["super_admin", "platform_admin", "content_reviewer", "ai_learning_admin", "admin"].includes(role || "");
    const { data: approvedTutor } = await getSupabaseServerClient(token)
      .from("tutor_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("profile_status", "approved")
      .maybeSingle();
    const isPermitted = role === "teacher" || Boolean(approvedTutor) || isStemGovernanceRole;
    if (!isPermitted) {
      return NextResponse.json(
        { ok: false, error: "Only tutors, instructors and administrators can author STEM resources." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { slug, title, summary, subject_id, topic_id, tier, resource_type, entitlement_tier, tags } = body;

    if (!slug || !title || !summary || !subject_id || !resource_type) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: slug, title, summary, subject_id, resource_type." },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient(token);
    const { resource, error } = await createStemResource(
      { slug, title, summary, subject_id, topic_id, tier, resource_type, entitlement_tier, tags },
      user.id,
      client
    );

    if (error || !resource) {
      return NextResponse.json({ ok: false, error: error || "Failed to create resource" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, resource }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Creation failed" },
      { status: 500 }
    );
  }
}
