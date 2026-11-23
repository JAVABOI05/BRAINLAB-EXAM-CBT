import { NextRequest, NextResponse } from "next/server";
import {
  getPreferences,
  savePreferences,
  verifyUnsubscribeToken,
} from "@/app/lib/notificationPreferences";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      // Do not reveal another person's notification settings based on an email address alone.
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: "Open the secure preferences link in a BrainLab email to view or change settings.",
      });
    }

    const email = verifyUnsubscribeToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid unsubscribe link. Request a fresh link from BrainLab support." }, { status: 400 });
    }

    const preferences = await getPreferences({ email });
    return NextResponse.json({ success: true, email, preferences, validToken: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify preference link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.token !== "string") {
      return NextResponse.json({ error: "A secure, signed preference token is required." }, { status: 401 });
    }

    const email = verifyUnsubscribeToken(body.token);
    if (!email) {
      return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 401 });
    }

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

    if (body.unsubscribeAll !== false) {
      const updated = await savePreferences(email, { unsubscribed_all: true });
      return NextResponse.json({
        success: true,
        action: "unsubscribed_all",
        message: "You have been unsubscribed from non-critical BrainLab notifications.",
        preferences: updated,
      });
    }

    const validChannels = [
      "exam_results",
      "classroom_alerts",
      "streak_reminders",
      "assignments",
      "marketing_announcements",
      "sms_alerts",
    ] as const;
    const channelUpdates: Record<string, boolean> = {};
    for (const channel of validChannels) {
      if (typeof body[channel] === "boolean") channelUpdates[channel] = body[channel];
    }

    const updated = await savePreferences(email, channelUpdates);
    return NextResponse.json({
      success: true,
      action: "updated",
      message: "Notification preferences updated successfully.",
      preferences: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process preference update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
