import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/adminAuth";
import { adminHasPermission } from "../../../../lib/adminRoles";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const canManage =
      admin.role === "super_admin" ||
      admin.role === "platform_admin" ||
      (await adminHasPermission("finance.billing.manage", admin.role));

    if (!canManage) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { provider, secretKey, apiKey } = body;

    if (provider === "paystack") {
      const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
      if (!key) {
        return NextResponse.json({ ok: false, message: "No Paystack secret key provided to test." });
      }

      try {
        const res = await fetch("https://api.paystack.co/transaction?perPage=1", {
          headers: { Authorization: `Bearer ${key}` },
        });
        const data = await res.json();
        if (res.ok && data.status) {
          return NextResponse.json({
            ok: true,
            message: `✓ Paystack API connection verified successfully!`,
          });
        }
        return NextResponse.json({
          ok: false,
          message: `Paystack rejected credentials: ${data.message || "Invalid Secret Key"}`,
        });
      } catch (e) {
        return NextResponse.json({
          ok: false,
          message: `Network error pinging Paystack: ${e instanceof Error ? e.message : "Error"}`,
        });
      }
    }

    if (provider === "flutterwave") {
      const key = secretKey || process.env.FLUTTERWAVE_SECRET_KEY;
      if (!key) {
        return NextResponse.json({ ok: false, message: "No Flutterwave secret key provided to test." });
      }

      try {
        const res = await fetch("https://api.flutterwave.com/v3/transactions?limit=1", {
          headers: { Authorization: `Bearer ${key}` },
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          return NextResponse.json({
            ok: true,
            message: `✓ Flutterwave API connection verified successfully!`,
          });
        }
        return NextResponse.json({
          ok: false,
          message: `Flutterwave rejected credentials: ${data.message || "Invalid Secret Key"}`,
        });
      } catch (e) {
        return NextResponse.json({
          ok: false,
          message: `Network error pinging Flutterwave: ${e instanceof Error ? e.message : "Error"}`,
        });
      }
    }

    if (provider === "bachs") {
      const key = apiKey || process.env.BACHS_API_KEY;
      if (!key) {
        return NextResponse.json({ ok: false, message: "No Bachs API key provided to test." });
      }

      try {
        const env = key.startsWith("sk_live_") ? "https://api.bachs.io/v1" : "https://sandbox-api.bachs.io/v1";
        const res = await fetch(`${env}/checkouts?limit=1`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          return NextResponse.json({
            ok: true,
            message: `✓ Bachs API connection verified successfully!`,
          });
        }
        return NextResponse.json({
          ok: false,
          message: `Bachs returned status ${res.status}: ${data.message || "Invalid API Key"}`,
        });
      } catch (e) {
        return NextResponse.json({
          ok: false,
          message: `Network error pinging Bachs: ${e instanceof Error ? e.message : "Error"}`,
        });
      }
    }

    return NextResponse.json({ ok: false, message: `Unknown provider '${provider}'.` });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Test failed" },
      { status: 500 }
    );
  }
}
