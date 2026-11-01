import { NextResponse } from "next/server";
import {
  getAnnouncementConfig,
  getMaintenanceModeConfig,
} from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [announcement, maintenance] = await Promise.all([
      getAnnouncementConfig(),
      getMaintenanceModeConfig(),
    ]);

    return NextResponse.json({
      ok: true,
      announcement: announcement.enabled ? announcement : null,
      maintenance: {
        active: maintenance.cbt_maintenance_enabled,
        title: maintenance.title || "CBT Examination Engine Maintenance",
        message: maintenance.message,
        estimated_resumption: maintenance.estimated_resumption,
        allow_admin_bypass: maintenance.allow_admin_bypass,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error retrieving announcements" },
      { status: 500 }
    );
  }
}
