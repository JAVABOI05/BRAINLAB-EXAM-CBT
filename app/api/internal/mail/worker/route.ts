import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processMailOutboxBatch } from "@/app/lib/mailEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestedBatch = Number(request.nextUrl.searchParams.get("limit") || 20);
    const batchSize = Number.isFinite(requestedBatch)
      ? Math.min(100, Math.max(1, Math.floor(requestedBatch)))
      : 20;
    const result = await processMailOutboxBatch(batchSize);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mail worker failed";
    console.error("[Mail Outbox Worker]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
