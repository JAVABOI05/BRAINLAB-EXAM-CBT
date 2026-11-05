import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getStemResourceBySlug, createStemResourceVersion } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);

    const resource = await getStemResourceBySlug(slug, client);
    if (!resource) {
      return NextResponse.json({ ok: false, error: "Resource not found" }, { status: 404 });
    }

    // Role check: Author or Admin
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);
    const isAuthor = resource.author_id === user.id;
    const isAdmin = isGovernanceAdminRole(role) || isInstructorRole(role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Only the resource author or an administrator can create versions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { adapter_type, initial_state, content_payload, learning_objectives } = body;

    if (!adapter_type || !content_payload) {
      return NextResponse.json(
        { ok: false, error: "Missing required version fields: adapter_type, content_payload." },
        { status: 400 }
      );
    }

    const { version, error } = await createStemResourceVersion(
      resource.id,
      {
        adapter_type,
        initial_state: initial_state || {},
        content_payload,
        learning_objectives: learning_objectives || [],
      },
      user.id,
      client
    );

    if (error || !version) {
      return NextResponse.json({ ok: false, error: error || "Failed to create version" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, version }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Version creation failed" },
      { status: 500 }
    );
  }
}
