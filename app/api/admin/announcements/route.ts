import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import {
  getAnnouncementConfig,
  saveAnnouncementConfig,
  getMaintenanceModeConfig,
  saveMaintenanceModeConfig,
  type AnnouncementConfig,
  type MaintenanceModeConfig,
} from "@/app/lib/platformConfig";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";
import { sendEmail } from "@/app/lib/emailService";
import { isChannelSubscribed } from "@/app/lib/notificationPreferences";

export const dynamic = "force-dynamic";

async function authorize(request: NextRequest, permission: "cbt.config.read" | "cbt.config.manage") {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const user = await getUserFromRequest(request);
  if (!user) return null;

  const role = await resolveAdminRole(user.id, token);
  if (!role) return null;

  // Super admin and platform admin always have full management permissions
  if (role === "super_admin" || role === "platform_admin") {
    return { id: user.id, email: user.email || "", role };
  }

  const supabase = getSupabaseServerClient(token);
  const { data: allowed, error } = await supabase.rpc("admin_has_permission", {
    permission_key: permission,
  });
  if (error || allowed !== true) return null;

  return { id: user.id, email: user.email || "", role };
}

export async function GET(request: NextRequest) {
  try {
    const admin = (await authorize(request, "cbt.config.read")) || (await getAdminSession(request));
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [announcement, maintenance] = await Promise.all([
      getAnnouncementConfig(),
      getMaintenanceModeConfig(),
    ]);

    return NextResponse.json({
      ok: true,
      announcement,
      maintenance,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load announcement config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = (await authorize(request, "cbt.config.manage")) || (await getAdminSession(request));
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const bearerToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const body = await request.json().catch(() => ({}));
    const {
      announcement,
      maintenance,
      broadcast_maintenance_now,
    } = body as {
      announcement?: AnnouncementConfig;
      maintenance?: MaintenanceModeConfig;
      broadcast_maintenance_now?: boolean;
    };

    if (announcement) {
      const saved = await saveAnnouncementConfig(announcement, admin, undefined, bearerToken);
      if (!saved) throw new Error("Could not save announcement configuration.");
    }

    let broadcastResult: { in_app_count: number; email_sent: number; email_skipped: number } | null = null;

    if (maintenance) {
      const shouldBroadcast = Boolean(broadcast_maintenance_now || maintenance.notify_users);

      if (shouldBroadcast) {
        broadcastResult = await dispatchMaintenanceNotification(maintenance, admin);
        maintenance.last_notified_at = new Date().toISOString();
        maintenance.notify_users = false;
      }

      const saved = await saveMaintenanceModeConfig(maintenance, admin, undefined, bearerToken);
      if (!saved) throw new Error("Could not save maintenance configuration.");
    }

    return NextResponse.json({
      ok: true,
      message: broadcastResult
        ? `Maintenance configurations updated & notification broadcast to users (${broadcastResult.in_app_count} in-app, ${broadcastResult.email_sent} emails).`
        : "Announcement and maintenance configurations updated successfully.",
      broadcast_result: broadcastResult,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save announcement config" },
      { status: 500 }
    );
  }
}

/**
 * Dispatches customizable maintenance notifications across in-app, email, and banner channels.
 */
async function dispatchMaintenanceNotification(
  config: MaintenanceModeConfig,
  admin: { id: string; email: string }
): Promise<{ in_app_count: number; email_sent: number; email_skipped: number }> {
  const supabase = getSupabaseServerClient();
  const title = config.notification_title || config.title || "Scheduled CBT Engine Maintenance";
  const customMessage = config.notification_message || config.message;
  const resumption = config.estimated_resumption || "Shortly";
  const channels = config.notification_channels || { in_app: true, email: true, device_push: true };

  let inAppCount = 0;
  let emailSent = 0;
  let emailSkipped = 0;

  // 1. In-App Notifications
  if (channels.in_app) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("broadcast_system_notification", {
        p_title: title,
        p_message: `${customMessage}${resumption ? `\n\nEstimated Resumption: ${resumption}` : ""}`,
        p_type: "system",
        p_link_url: "/cbt",
      });

      if (!rpcErr && rpcRes && typeof rpcRes === "object" && "inserted_count" in rpcRes) {
        inAppCount = Number(rpcRes.inserted_count) || 0;
      } else {
        const { data: users } = await supabase.from("profiles").select("id").limit(300);
        if (users && users.length > 0) {
          const rows = users.map((u) => ({
            user_id: u.id,
            title,
            message: `${customMessage}${resumption ? ` (Resuming: ${resumption})` : ""}`,
            type: "system",
            link_url: "/cbt",
            is_read: false,
          }));
          const { error: insErr } = await supabase.from("notifications").insert(rows);
          if (!insErr) inAppCount = rows.length;
        }
      }
    } catch (err) {
      console.warn("[announcements/maintenance] In-app notification error:", err);
    }
  }

  // 2. Email Notifications
  if (channels.email) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null)
        .limit(200);

      const validProfiles = (profiles || []).filter(
        (p) => p.email && typeof p.email === "string" && p.email.includes("@")
      );

      for (const recipient of validProfiles) {
        try {
          const isSubscribed = await isChannelSubscribed(recipient.email, "marketing_announcements");
          if (!isSubscribed) {
            emailSkipped++;
            continue;
          }

          const recipientName = recipient.full_name || "Learner";
          const emailSubject = `[BrainLab CBT] ${title}`;
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0f172a; font-size: 24px; margin: 0;">BrainLab CBT Academy</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Examination & Learning Intelligence System</p>
              </div>

              <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="color: #b45309; font-size: 18px; margin: 0 0 10px 0;">🔧 ${title}</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">Hello ${recipientName},</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; white-space: pre-line;">${customMessage}</p>
                <div style="background: #ffffff; border: 1px dashed #cbd5e1; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #475569;">
                  <strong>⏱️ Estimated Resumption:</strong> ${resumption}
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="https://brainlab.ng/cbt" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Check CBT Status</a>
              </div>

              <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                You received this operational advisory because you are an active BrainLab candidate.
              </p>
            </div>
          `;

          const result = await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: emailHtml,
            text: `[BrainLab CBT] ${title}\n\nHello ${recipientName},\n\n${customMessage}\n\nEstimated Resumption: ${resumption}\n\nCheck status: https://brainlab.ng/cbt`,
          });

          if (result.success) {
            emailSent++;
          } else {
            emailSkipped++;
          }
        } catch {
          emailSkipped++;
        }
      }
    } catch (err) {
      console.warn("[announcements/maintenance] Email notification error:", err);
    }
  }

  return { in_app_count: inAppCount, email_sent: emailSent, email_skipped: emailSkipped };
}
