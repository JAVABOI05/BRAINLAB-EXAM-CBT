import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { recordAnnouncementReadOrAcknowledge } from "@/app/lib/community/announcementService";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const announcementId = resolvedParams?.id;
    if (!announcementId) {
      return NextResponse.json({ ok: false, error: "missing_announcement_id" }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const client = getSupabaseServerClient(token);

    const body = await request.json().catch(() => ({}));
    const acknowledge = Boolean(body?.acknowledge);

    const res = await recordAnnouncementReadOrAcknowledge(announcementId, user.id, acknowledge, client);

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, acknowledged: acknowledge });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
