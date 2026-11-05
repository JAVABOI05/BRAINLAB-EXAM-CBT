import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getStemResourceBySlug, publishStemResourceVersion } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole } from "@/app/lib/adminRoles";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    // Only governance admins or designated content reviewers can publish
    const canPublish =
      role === "super_admin" ||
      role === "platform_admin" ||
      role === "content_reviewer" ||
      role === "ai_learning_admin";

    if (!canPublish) {
      return NextResponse.json(
        { ok: false, error: "Publication requires Super Admin, Platform Admin, or Content Reviewer authorization." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const client = getSupabaseServerClient(token);
    const resource = await getStemResourceBySlug(slug, client);

    if (!resource) {
      return NextResponse.json({ ok: false, error: "Resource not found" }, { status: 404 });
    }

    const body = await request.json();
    const { version_id } = body;

    if (!version_id) {
      return NextResponse.json({ ok: false, error: "Missing version_id to pin as current published version." }, { status: 400 });
    }

    const { ok, error } = await publishStemResourceVersion(resource.id, version_id, user.id, client);
    if (!ok) {
      return NextResponse.json({ ok: false, error: error || "Failed to publish" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: `Resource '${resource.title}' is now published with pinned version ${version_id}.` });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Publish request failed" },
      { status: 500 }
    );
  }
}
