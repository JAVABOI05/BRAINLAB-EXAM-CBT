import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required to trim recordings." }, { status: 401 });
  }

  // The previous endpoint only echoed the supplied URL and returned a
  // completed status; it did not process media. Do not claim a successful
  // trim until a real, durable media-processing pipeline is implemented.
  return NextResponse.json(
    {
      error: "Video trimming is not available yet. The original recording remains unchanged.",
      code: "VIDEO_TRIMMING_UNAVAILABLE",
    },
    { status: 501 }
  );
}
