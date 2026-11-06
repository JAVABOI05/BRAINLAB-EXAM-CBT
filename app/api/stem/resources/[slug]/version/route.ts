import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { getStemResourceBySlug, createStemResourceVersion } from "@/app/lib/stem/stemService";
import { isGovernanceAdminRole, isInstructorRole } from "@/app/lib/adminRoles";
import { isSupportedStemAdapter } from "@/app/lib/stem/stemAdapters";

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

    if (!adapter_type || !content_payload || typeof adapter_type !== "string" || typeof content_payload !== "object" || Array.isArray(content_payload) || content_payload === null) {
      return NextResponse.json(
        { ok: false, error: "A supported adapter_type and JSON object content_payload are required." },
        { status: 400 }
      );
    }
    if (!isSupportedStemAdapter(slug, adapter_type)) {
      return NextResponse.json(
        { ok: false, error: "This renderer is not supported for the selected STEM resource." },
        { status: 422 }
      );
    }
    if (initial_state !== undefined && (typeof initial_state !== "object" || initial_state === null || Array.isArray(initial_state))) {
      return NextResponse.json({ ok: false, error: "initial_state must be a JSON object." }, { status: 400 });
    }
    if (learning_objectives !== undefined && (!Array.isArray(learning_objectives) || learning_objectives.some((item: unknown) => typeof item !== "string"))) {
      return NextResponse.json({ ok: false, error: "learning_objectives must be an array of strings." }, { status: 400 });
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
