import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { adminHasPermission } from "@/app/lib/adminRoles";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { sendEmail } from "@/app/lib/emailService";
import { isChannelSubscribed } from "@/app/lib/notificationPreferences";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await adminHasPermission("community.moderate");
    if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
      return NextResponse.json(
        { error: "Insufficient privileges to broadcast email announcements." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Subject and message body are required for broadcasting." },
        { status: 400 }
      );
    }

    const {
      subject,
      title = subject,
      message,
      audience = "active_subscribers",
      actionUrl,
      actionLabel = "View on BrainLab",
    } = body;

    const supabase = getSupabaseServerClient();

    // 1. Fetch candidate list according to target audience
    let query = supabase.from("profiles").select("id, email, full_name");
    const { data: candidates, error: candidateErr } = await query.limit(500);

    if (candidateErr) {
      return NextResponse.json({ error: candidateErr.message }, { status: 500 });
    }

    const validCandidates = (candidates || []).filter(
      (c) => c.email && typeof c.email === "string" && c.email.includes("@")
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // 2. Format HTML email
    const buttonHtml = actionUrl
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${actionUrl}" style="background-color:#012153;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">
            ${actionLabel} &rarr;
          </a>
        </div>`
      : "";

    // 3. Dispatch batch with subscriber protection
    for (const cand of validCandidates) {
      // Check if subscriber allows announcements
      if (audience === "active_subscribers") {
        const subscribed = await isChannelSubscribed(cand.email, "marketing_announcements");
        if (!subscribed) {
          skipped++;
          continue;
        }
      }

      const candidateName = cand.full_name || "Learner";
      const personalizedMessage = message.replace(/{{name}}/g, candidateName);

      const htmlContent = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
          <h2 style="color:#012153;margin-top:0;font-size:22px;font-weight:800;">${title}</h2>
          <p style="font-size:15px;line-height:1.6;">Hello <strong>${candidateName}</strong>,</p>
          <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${personalizedMessage}</div>
          ${buttonHtml}
        </div>
      `;

      try {
        const res = await sendEmail({
          to: cand.email,
          subject,
          html: htmlContent,
        });

        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalEvaluated: validCandidates.length,
        sent,
        skipped,
        failed,
      },
      message: `Broadcast complete: ${sent} delivered, ${skipped} skipped (unsubscribed), ${failed} failed.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to broadcast message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
