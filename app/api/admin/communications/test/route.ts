import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { sendEmail } from "@/app/lib/emailService";
import { sendResultSMS } from "@/app/lib/resultDispatcher";
import { getCommunicationServicesConfig } from "@/app/lib/platformConfig";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.type) {
      return NextResponse.json({ error: "Missing test parameters" }, { status: 400 });
    }

    const config = await getCommunicationServicesConfig();

    // 1. Test Email Dispatch (Resend / Zoho)
    if (body.type === "email") {
      const targetEmail = (body.targetEmail || admin.email || "").trim();
      if (!targetEmail || !targetEmail.includes("@")) {
        return NextResponse.json({ error: "A valid destination email is required for testing." }, { status: 400 });
      }

      const res = await sendEmail({
        to: targetEmail,
        subject: body.testSubject || `[BrainLab Test] Communication Gateway Verified (${new Date().toLocaleTimeString()})`,
        html: body.testHtml || `
          <div style="font-family:sans-serif;padding:24px;background:#f8fafc;border-radius:12px;">
            <h2 style="color:#012153;margin-top:0;">✅ Communication Gateway Test Successful</h2>
            <p style="color:#334155;">This is an automated test message dispatched by administrator <strong>${admin.email}</strong> from the BrainLab Admin Communications Hub.</p>
            <div style="background:#ffffff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
              <strong>Active Provider:</strong> ${config.active_email_provider.toUpperCase()}<br>
              <strong>Sender Address:</strong> ${config.resend.from_email}<br>
              <strong>Timestamp:</strong> ${new Date().toISOString()}
            </div>
            <p style="font-size:12px;color:#64748b;">BrainLab Academy CBT Directorate &bull; Automated Connectivity Test</p>
          </div>
        `,
      });

      return NextResponse.json({
        success: res.success,
        messageId: res.messageId,
        simulated: res.simulated,
        error: res.error,
        message: res.success
          ? res.simulated
            ? `Test email simulated successfully for ${targetEmail} (No API key set). Check server console.`
            : `Test email successfully delivered to ${targetEmail} via ${config.active_email_provider.toUpperCase()}!`
          : `Email test failed: ${res.error}`,
      });
    }

    // 2. Test SMS Dispatch (Termii)
    if (body.type === "sms") {
      const targetPhone = (body.targetPhone || "").trim();
      if (!targetPhone) {
        return NextResponse.json({ error: "A valid mobile phone number is required for SMS testing." }, { status: 400 });
      }

      const res = await sendResultSMS(
        targetPhone,
        "Administrator",
        100,
        100,
        "test-verify-id"
      );

      return NextResponse.json({
        success: res.success,
        messageId: res.messageId,
        error: res.error,
        message: res.success
          ? `Test SMS dispatched successfully to ${targetPhone} via Termii (Sender ID: ${config.termii.sender_id})!`
          : `SMS test failed: ${res.error}`,
      });
    }

    // 3. Test Cloudflare Verification
    if (body.type === "cloudflare") {
      if (!config.cloudflare.api_token) {
        return NextResponse.json({
          success: false,
          error: "Cloudflare API Token is not configured.",
        });
      }

      try {
        const cfRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
          headers: {
            Authorization: `Bearer ${config.cloudflare.api_token}`,
            "Content-Type": "application/json",
          },
        });
        const cfData = await cfRes.json();
        return NextResponse.json({
          success: cfRes.ok && cfData.success,
          message: cfRes.ok && cfData.success
            ? "Cloudflare API Token verified successfully! Status: Active."
            : `Cloudflare verification failed: ${cfData.errors?.[0]?.message || "Invalid Token"}`,
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: err instanceof Error ? err.message : "Network error contacting Cloudflare",
        });
      }
    }

    return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to run test";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
