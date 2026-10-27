import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data: configRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", `blocked_users_${user.id}`)
      .maybeSingle();

    const blockedList: string[] =
      configRow && Array.isArray(configRow.config_value)
        ? configRow.config_value
        : (user.user_metadata?.blocked_users as string[] | undefined) || [];

    return NextResponse.json({ success: true, blockedUsers: blockedList });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { targetUserId, action = "block" } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Load current blocked list
    const { data: configRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", `blocked_users_${user.id}`)
      .maybeSingle();

    let blockedList: string[] =
      configRow && Array.isArray(configRow.config_value)
        ? configRow.config_value
        : (user.user_metadata?.blocked_users as string[] | undefined) || [];

    if (action === "block") {
      if (!blockedList.includes(targetUserId)) {
        blockedList.push(targetUserId);
      }
    } else {
      blockedList = blockedList.filter((id) => id !== targetUserId);
    }

    // 2. Persist to exam_config
    await supabase.from("exam_config").upsert(
      {
        config_key: `blocked_users_${user.id}`,
        config_value: blockedList,
      },
      { onConflict: "config_key" }
    );

    // 3. Update user metadata if auth admin available
    try {
      const meta = user.user_metadata || {};
      await supabase.auth.updateUser({
        data: {
          ...meta,
          blocked_users: blockedList,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      blockedUsers: blockedList,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
