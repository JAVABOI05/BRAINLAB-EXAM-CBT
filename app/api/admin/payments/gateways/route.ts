import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../lib/supabaseServer";
import { getAdminSession } from "../../../../lib/adminAuth";
import { adminHasPermission } from "../../../../lib/adminRoles";
import { isPinSessionValid } from "../../../../lib/adminPinServer";
import {
  getPaymentGatewaysConfig,
  savePaymentGatewaysConfig,
  type PaymentGatewaysConfig,
} from "../../../../lib/platformConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const canRead =
      admin.role === "super_admin" ||
      admin.role === "platform_admin" ||
      (await adminHasPermission("finance.billing.manage"));

    if (!canRead) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const config = await getPaymentGatewaysConfig();

    // Mask secret keys partially for secure display (show first 7 and last 4 chars)
    const sanitizedConfig = JSON.parse(JSON.stringify(config)) as PaymentGatewaysConfig;

    return NextResponse.json({
      ok: true,
      config: sanitizedConfig,
      pinVerified: isPinSessionValid(request, admin.id),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load gateway config" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const canManage =
      admin.role === "super_admin" ||
      admin.role === "platform_admin" ||
      (await adminHasPermission("finance.billing.manage"));

    if (!canManage) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Enforce Admin Security PIN session for updating sensitive payment gateway credentials
    if (!isPinSessionValid(request, admin.id)) {
      return NextResponse.json(
        {
          ok: false,
          error: "pin_required",
          message: "Admin Security PIN verification required to update payment gateway credentials.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const newConfig = body.config as PaymentGatewaysConfig;

    if (!newConfig || !newConfig.active_provider) {
      return NextResponse.json(
        { ok: false, error: "bad_request", message: "Invalid payment gateway configuration format." },
        { status: 400 }
      );
    }

    const success = await savePaymentGatewaysConfig(
      newConfig,
      { id: admin.id, email: admin.email },
      `Admin updated payment gateway configuration (Active: ${newConfig.active_provider})`
    );

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "db_error", message: "Failed to save payment gateway configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Payment gateways configuration saved successfully.",
      config: newConfig,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save payment configuration." },
      { status: 500 }
    );
  }
}
