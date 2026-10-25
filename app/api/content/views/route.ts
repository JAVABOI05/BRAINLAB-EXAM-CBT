import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contentType, contentId, viewingSessionId, durationSeconds = 0 } = body;

    if (!contentType || !contentId || !viewingSessionId) {
      return NextResponse.json(
        { error: "contentType, contentId, and viewingSessionId are required." },
        { status: 400 }
      );
    }

    // Meaningful view rule: Only register views where duration is at least 3 seconds
    // to prevent counting background requests, accidental clicks, or instant navigations.
    if (durationSeconds < 3) {
      return NextResponse.json({ success: true, ignored: true, reason: "Duration below threshold" });
    }

    const supabase = getSupabaseServerClient();

    const { error } = await supabase.from("content_views").upsert(
      {
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        viewing_session_id: viewingSessionId,
        duration_seconds: durationSeconds,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id, content_type, content_id, viewing_session_id" }
    );

    if (error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");

    if (!contentType || !contentId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: views, error } = await supabase
      .from("content_views")
      .select("user_id, duration_seconds, viewed_at")
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });

    const uniqueUsers = new Set((views ?? []).map((v) => v.user_id));
    const totalViews = (views ?? []).length;
    const avgDuration =
      totalViews > 0
        ? Math.round(
            (views ?? []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) / totalViews
          )
        : 0;

    return NextResponse.json({
      success: true,
      uniqueViewers: uniqueUsers.size,
      totalViews,
      averageDurationSeconds: avgDuration,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
