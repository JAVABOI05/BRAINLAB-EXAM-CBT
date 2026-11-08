import { NextResponse } from "next/server";
import { getAuthoritativePlatformStats } from "@/app/lib/services/platformStatsService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getAuthoritativePlatformStats();
    return NextResponse.json(stats, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
