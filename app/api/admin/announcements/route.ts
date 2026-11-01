import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient, resolveAdminRole } from "@/app/lib/supabaseServer";
import {
  getAnnouncementConfig,
  saveAnnouncementConfig,
  getMaintenanceModeConfig,
  saveMaintenanceModeConfig,
  type AnnouncementConfig,
  type MaintenanceModeConfig,
} from "@/app/lib/platformConfig";

export const dynamic = "force-dynamic";

async function authorize(request: NextRequest, permission: "cbt.config.read" | "cbt.config.manage") {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\\s+(.+)$/i)?.[1];
  const user = await getUserFromRequest(request);
  if (!user || !token) return null;

  const role = await resolveAdminRole(user.id, token);
  if (!role) return null;

  const supabase = getSupabaseServerClient(token);
  const { data: allowed, error } = await supabase.rpc("admin_has_permission", {
    permission_key: permission,
  });
  if (error || allowed !== true) return null;

  return { id: user.id, email: user.email || "" };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await authorize(request, "cbt.config.read");
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
    const admin = await authorize(request, "cbt.config.manage");
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { announcement, maintenance } = body as {
      announcement?: AnnouncementConfig;
      maintenance?: MaintenanceModeConfig;
    };

    if (announcement) {
      const saved = await saveAnnouncementConfig(announcement, admin);
      if (!saved) throw new Error("Could not save announcement configuration.");
    }

    if (maintenance) {
      const saved = await saveMaintenanceModeConfig(maintenance, admin);
      if (!saved) throw new Error("Could not save maintenance configuration.");
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
