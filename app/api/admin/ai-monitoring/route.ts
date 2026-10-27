import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAIMonitoringData } from "@/app/lib/aiUsageTracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    // Verify admin access
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 503 });
    }

    if (token) {
      const userClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: roleData, error: roleError } = await userClient.rpc("get_admin_role");
      if (
        roleError ||
        !roleData ||
        !["super_admin", "platform_admin", "ai_learning_admin", "teacher"].includes(String(roleData))
      ) {
        return NextResponse.json(
          { error: "Unauthorized: administrator privileges required to view AI quota telemetry." },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const probe = searchParams.get("probe") !== "false";

    const data = await getAIMonitoringData({ probeLive: probe });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[api/admin/ai-monitoring] Error fetching telemetry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load AI monitoring data." },
      { status: 500 }
    );
  }
}
