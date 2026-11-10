import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

// In-memory sliding window rate limiter: 20 redemption attempts per 60 seconds per IP/user
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 20;

function checkRedeemRateLimit(identifier: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - 1, resetInSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  if (bucket.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - bucket.count, resetInSec: Math.ceil((bucket.resetAt - now) / 1000) };
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const body = await request.json().catch(() => ({}));
    const rawCode = String(body.code || body.pin || "").trim().toUpperCase();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "empty_code", message: "Please enter an access PIN or voucher code." },
        { status: 400 }
      );
    }

    // Resolve caller identity from Bearer token or Supabase session cookies
    const user = await getUserFromRequest(request);
    let userId: string | null = user?.id || null;

    // Enforce rate limiting per user or IP
    const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const rateCheck = checkRedeemRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          message: `Too many access code redemption attempts. Please wait ${rateCheck.resetInSec} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetInSec),
          },
        }
      );
    }

    const serviceClient = getSupabaseServerClient();

    // If still no user id, check if candidate provided phone matching an existing profile
    if (!userId && phone) {
      try {
        const { data: matchedUser } = await serviceClient
          .from("profiles")
          .select("id, email")
          .eq("phone", phone)
          .maybeSingle();
        if (matchedUser?.id) {
          userId = matchedUser.id;
        }
      } catch {}
    }

    // 1. Try calling the authoritative hashed code redemption RPC first
    try {
      const { data: hashedData, error: hashedError } = await serviceClient.rpc("redeem_hashed_access_code", {
        p_code: rawCode,
        p_user_id: userId,
      });

      if (!hashedError && hashedData) {
        if (!hashedData.ok) {
          if (hashedData.error !== "invalid_code") {
            const status = hashedData.error === "auth_required" ? 401 : hashedData.error === "not_found" ? 404 : 400;
            return NextResponse.json(hashedData, { status });
          }
        } else {
          return NextResponse.json(hashedData);
        }
      }
    } catch {
      // Continue to legacy voucher redemption
    }

    // 2. Fallback to legacy redeem_plan_voucher RPC
    try {
      const { data: rpcData, error: rpcError } = await serviceClient.rpc("redeem_plan_voucher", {
        p_code: rawCode,
        p_user_id: userId,
        p_phone: phone,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.ok) {
          if (userId && (rpcData.error === "authentication_required" || rpcData.error === "auth_required")) {
            // When user is authenticated, an auth_required error from legacy fallback indicates code was not found
            return NextResponse.json(
              { ok: false, error: "not_found", message: "The access PIN entered is invalid or does not exist." },
              { status: 404 }
            );
          }
          const status = rpcData.error === "auth_required" ? 401 : rpcData.error === "not_found" ? 404 : 400;
          return NextResponse.json(rpcData, { status });
        }
        return NextResponse.json(rpcData);
      }
      if (rpcError) {
        console.warn("[api/access/redeem-pin] RPC error, trying direct fallback:", rpcError.message);
      }
    } catch (rpcErr) {
      console.warn("[api/access/redeem-pin] RPC redeem_plan_voucher call failed, attempting fallback:", rpcErr);
    }

    // 2. Fallback direct execution if RPC is unavailable or encountered an unexpected issue
    const { data: codeRow, error: codeErr } = await serviceClient
      .from("access_codes")
      .select("*")
      .eq("code", rawCode)
      .maybeSingle();

    if (codeErr || !codeRow) {
      return NextResponse.json(
        { ok: false, error: "not_found", message: "The access PIN entered is invalid or does not exist." },
        { status: 404 }
      );
    }

    if (codeRow.is_used) {
      return NextResponse.json(
        {
          ok: false,
          error: "already_used",
          message: `This PIN code has already been redeemed and is no longer valid.`,
          used_at: codeRow.used_at,
        },
        { status: 400 }
      );
    }

    // Preserve Single Exam Pass: A null or blank grants_plan must NEVER become a subscription
    if (!codeRow.grants_plan || String(codeRow.grants_plan).trim() === "") {
      return NextResponse.json(
        {
          ok: false,
          error: "single_exam_pass",
          message: "This PIN is a Single Exam CBT access code for taking mock examinations. It cannot be converted into a subscription membership. Please enter it directly on the CBT exam page to begin your test.",
        },
        { status: 400 }
      );
    }

    const planId = String(codeRow.grants_plan).trim().toLowerCase();
    if (!["premium", "plus", "pro"].includes(planId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_plan",
          message: `This PIN grants an unrecognized plan (${codeRow.grants_plan}). Choose Premium, Plus, or Pro.`,
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "auth_required",
          message: `Please sign in or create an account to activate this ${planId.toUpperCase()} voucher code on your profile.`,
          plan_id: planId,
        },
        { status: 401 }
      );
    }

    const validityDays = Math.max(1, codeRow.validity_days || 30);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + validityDays);

    const planName =
      planId === "pro"
        ? "BrainLab Pro"
        : planId === "plus"
        ? "BrainLab Plus"
        : "Premium Study";

    const maxQuestions = planId === "pro" ? 500 : planId === "plus" ? 400 : 250;

    // A. Revoke superseded active membership entitlements
    try {
      await serviceClient
        .from("learning_entitlements")
        .update({ status: "revoked", revoked_at: startDate.toISOString() })
        .eq("user_id", userId)
        .eq("entitlement_type", "membership")
        .eq("status", "active")
        .is("revoked_at", null);
    } catch {}

    // B. Insert new active membership entitlement conforming strictly to DB constraints
    const { error: entErr } = await serviceClient.from("learning_entitlements").insert({
      user_id: userId,
      entitlement_type: "membership",
      membership_type: planId,
      max_questions: maxQuestions,
      status: "active",
      permanent: false,
      starts_at: startDate.toISOString(),
      expires_at: endDate.toISOString(),
    });

    if (entErr) {
      console.error("[api/access/redeem-pin] Entitlement insert error:", entErr);
      return NextResponse.json(
        { ok: false, error: "entitlement_error", message: `Failed to activate learning entitlements: ${entErr.message}` },
        { status: 500 }
      );
    }

    // C. Upsert into user_subscriptions (resilient query-then-update-or-insert)
    const subPayload = {
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      payment_provider: "voucher_pin",
      price_paid_kobo: 0,
      currency: "NGN",
      provider_subscription_id: `PIN-${rawCode}`,
      metadata: {
        pin_code: rawCode,
        cohort: codeRow.cohort || null,
        subject: codeRow.subject || null,
        redeemed_at: startDate.toISOString(),
        validity_days: validityDays,
      },
      updated_at: startDate.toISOString(),
    };

    const { data: existingSub } = await serviceClient
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let subErr: { message: string } | null = null;
    if (existingSub?.id) {
      const res = await serviceClient
        .from("user_subscriptions")
        .update(subPayload)
        .eq("id", existingSub.id);
      subErr = res.error;
    } else {
      const res = await serviceClient
        .from("user_subscriptions")
        .insert(subPayload);
      subErr = res.error;
    }

    if (subErr) {
      console.error("[api/access/redeem-pin] Subscription upsert error:", subErr);
      return NextResponse.json(
        { ok: false, error: "subscription_error", message: `Failed to activate subscription: ${subErr.message}` },
        { status: 500 }
      );
    }

    // D. Mark code as consumed
    await serviceClient
      .from("access_codes")
      .update({
        is_used: true,
        used_by: userId,
        used_at: startDate.toISOString(),
      })
      .eq("id", codeRow.id);

    // E. Notification
    try {
      await serviceClient.from("notifications").insert({
        user_id: userId,
        title: `🎉 Account Upgraded to ${planName}`,
        message: `Your access voucher ${rawCode} was redeemed successfully! You now have full access to CBT corrections, step-by-step solutions, and AI tutor explanations until ${endDate.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
        type: "subscription",
        is_read: false,
        created_at: startDate.toISOString(),
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      code: rawCode,
      plan_id: planId,
      plan_name: planName,
      validity_days: validityDays,
      expires_at: endDate.toISOString(),
      max_questions: maxQuestions,
      message: `Congratulations! Your account has been upgraded to ${planName}. Full CBT corrections, solutions, and study features are unlocked until ${endDate.toLocaleDateString("en-NG", { dateStyle: "medium" })}.`,
    });
  } catch (err) {
    console.error("[api/access/redeem-pin] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error redeeming PIN voucher" },
      { status: 500 }
    );
  }
}
