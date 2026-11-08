import { NextRequest, NextResponse } from "next/server";
import { fetchPublishedExamEvents } from "@/app/lib/services/examCalendarService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placementParam = searchParams.get("placement");
    const programmeParam = searchParams.get("programme");

    const placement =
      placementParam === "landing" || placementParam === "dashboard"
        ? placementParam
        : undefined;

    const programme = programmeParam ? programmeParam.trim().toLowerCase() : undefined;

    const events = await fetchPublishedExamEvents({ placement, programme });
    const now = new Date();

    return NextResponse.json(
      {
        events,
        serverTimestamp: now.getTime(),
        serverTimeIso: now.toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
