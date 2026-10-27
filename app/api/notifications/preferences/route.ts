import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/lib/supabaseServer";
import {
  getPreferences,
  savePreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/app/lib/notificationPreferences";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getPreferences({ email: user.email, userId: user.id });
    return NextResponse.json({ success: true, preferences });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updated = await savePreferences(user.email, body, user.id);
    return NextResponse.json({ success: true, preferences: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
