import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../lib/supabaseServer";
import { recordUserHeartbeat, getRealPeersAndPresence } from "../../lib/communicationStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await recordUserHeartbeat(user, {
      status: body.status || "online",
      customStatus: body.customStatus,
      currentClassId: body.currentClassId,
      activityContext: body.activityContext,
      isVisible: body.isVisible !== false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to record presence" }, { status: 500 });
    }

    return NextResponse.json({ success: true, timestamp: result.timestamp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const data = await getRealPeersAndPresence(user?.id);

    return NextResponse.json({
      success: true,
      onlineCount: data.onlineCount,
      inClassCount: data.inClassCount,
      tutorCount: data.tutorCount,
      activeUsers: data.activeUsers,
      allPeers: data.allPeers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
