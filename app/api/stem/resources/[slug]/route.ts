import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
  resolveAdminRole,
} from "@/app/lib/supabaseServer";
import { getStemResourceBySlug } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";
import { getStemResourceAccess, resolveStemAccessContext } from "@/app/lib/stem/stemAccess";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = await getUserFromRequest(request);

    const accessContext = await resolveStemAccessContext(user, token);
    let isAuthorizedReviewer = accessContext.isPrivileged;
    if (user && !isAuthorizedReviewer) {
      const role = await resolveAdminRole(user.id, token, user.email ?? undefined);
      isAuthorizedReviewer = isInstructorRole(role) || isGovernanceAdminRole(role);
    }

    const client = isAuthorizedReviewer && token
      ? getSupabaseServerClient(token)
      : getSupabasePublicServerClient();

    const resource = await getStemResourceBySlug(slug, client);
    if (!resource) {
      return NextResponse.json({ ok: false, error: "STEM resource not found" }, { status: 404 });
    }

    // Unauthenticated or regular users cannot view draft or archived resources
    if (!isAuthorizedReviewer && resource.status !== "published") {
      return NextResponse.json({ ok: false, error: "STEM resource not found" }, { status: 404 });
    }

    const stem_access = getStemResourceAccess(accessContext, resource);
    if (stem_access.locked) {
      return NextResponse.json({
        ok: false,
        locked: true,
        error: "This STEM resource requires a higher subscription access level.",
        required_access_level: stem_access.requiredLevel,
        current_access_level: stem_access.currentLevel,
        upgrade_url: "/pricing?feature=stem",
      }, { status: 403 });
    }

    // Also fetch curriculum mappings
    const { data: mappings } = await client
      .from("stem_curriculum_mappings")
      .select("*, topic:learning_topics(id, title, slug)")
      .eq("resource_id", resource.id);

    return NextResponse.json({
      ok: true,
      resource: { ...resource, stem_access },
      curriculum_mappings: mappings || [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load resource" },
      { status: 500 }
    );
  }
}
