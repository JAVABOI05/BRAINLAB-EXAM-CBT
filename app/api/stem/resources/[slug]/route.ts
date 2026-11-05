import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getStemResourceBySlug } from "@/app/lib/stem/stemService";

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
    const client = getSupabaseServerClient(token);

    const resource = await getStemResourceBySlug(slug, client);
    if (!resource) {
      return NextResponse.json({ ok: false, error: "STEM resource not found" }, { status: 404 });
    }

    // Also fetch curriculum mappings
    const { data: mappings } = await client
      .from("stem_curriculum_mappings")
      .select("*, topic:learning_topics(id, title, slug)")
      .eq("resource_id", resource.id);

    return NextResponse.json({
      ok: true,
      resource,
      curriculum_mappings: mappings || [],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load resource" },
      { status: 500 }
    );
  }
}
