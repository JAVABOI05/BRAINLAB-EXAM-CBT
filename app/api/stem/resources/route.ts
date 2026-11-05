import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { listStemResources, createStemResource } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject_id = searchParams.get("subject_id") || undefined;
    const topic_id = searchParams.get("topic_id") || undefined;
    const tier = searchParams.get("tier") ? Number(searchParams.get("tier")) : undefined;
    const resource_type = searchParams.get("resource_type") as any || undefined;
    const status = searchParams.get("status") as any || "published";
    const search = searchParams.get("search") || undefined;
    const featured_only = searchParams.get("featured") === "true";

    // Server client with request context
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);

    const resources = await listStemResources(
      { subject_id, topic_id, tier, resource_type, status, search, featured_only },
      client
    );

    return NextResponse.json({ ok: true, resources });
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

    // Verify role: tutor, instructor, or admin
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    const isPermitted = isInstructorRole(role) || isGovernanceAdminRole(role);
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
