import { NextRequest, NextResponse } from "next/server";
import {
  getPreferences,
  savePreferences,
  verifyUnsubscribeToken,
  generateUnsubscribeToken,
} from "@/app/lib/notificationPreferences";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token");
    const rawEmail = searchParams.get("email");

    let email: string | null = null;
    if (token) {
      email = verifyUnsubscribeToken(token);
    } else if (rawEmail) {
      email = rawEmail.trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link." },
        { status: 400 }
      );
    }

    const preferences = await getPreferences({ email });
    return NextResponse.json({
      success: true,
      email,
      preferences,
      validToken: Boolean(token && email),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify unsubscribe link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Missing body" }, { status: 400 });
    }

    let email: string | null = null;
    if (body.token) {
      email = verifyUnsubscribeToken(body.token);
    } else if (body.email && typeof body.email === "string" && body.email.includes("@")) {
      email = body.email.trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json(
        { error: "A valid email or signed unsubscribe token is required." },
        { status: 400 }
      );
    }

    // Resubscribe action
    if (body.resubscribe === true) {
      const updated = await savePreferences(email, {
        unsubscribed_all: false,
        exam_results: true,
        classroom_alerts: true,
        streak_reminders: true,
        assignments: true,
        marketing_announcements: true,
        sms_alerts: true,
      });
      return NextResponse.json({
        success: true,
        action: "resubscribed",
        message: "You have successfully resubscribed to BrainLab notifications.",
        preferences: updated,
      });
    }

    // Unsubscribe from all action
    if (body.unsubscribeAll !== false) {
      const updated = await savePreferences(email, {
        unsubscribed_all: true,
      });
      return NextResponse.json({
        success: true,
        action: "unsubscribed_all",
        message: "You have been unsubscribed from all BrainLab notification dispatches.",
        preferences: updated,
      });
    }

    // Granular channel updates
    const channelUpdates: Record<string, boolean> = {};
    const validChannels = [
      "exam_results",
      "classroom_alerts",
      "streak_reminders",
      "assignments",
      "marketing_announcements",
      "sms_alerts",
    ];

    for (const ch of validChannels) {
      if (typeof body[ch] === "boolean") {
        channelUpdates[ch] = body[ch];
      }
    }

    const updated = await savePreferences(email, channelUpdates);
    return NextResponse.json({
      success: true,
      action: "updated",
      message: "Notification preferences updated successfully.",
      preferences: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process unsubscribe request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
