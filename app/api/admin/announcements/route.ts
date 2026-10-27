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

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
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
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { announcement, maintenance } = body as {
      announcement?: AnnouncementConfig;
      maintenance?: MaintenanceModeConfig;
    };

    if (announcement) {
      await saveAnnouncementConfig(announcement, admin);
    }

    if (maintenance) {
      await saveMaintenanceModeConfig(maintenance, admin);
    }

    return NextResponse.json({
      ok: true,
      message: "Announcement and maintenance configurations updated successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save announcement config" },
      { status: 500 }
    );
  }
}
