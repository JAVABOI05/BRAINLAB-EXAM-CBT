import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// In-memory sliding-window rate limiter: max 20 attempts per 60s per IP/User to prevent code enumeration
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 20;

function checkCodeResolveRateLimit(identifier: string): { allowed: boolean; remaining: number; resetInSec: number } {
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
    const rawCode = String(body.code || body.pin || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!rawCode) {
      return NextResponse.json(
        { ok: false, error: "empty_code", message: "Please enter an examination code or access PIN." },
        { status: 400 }
      );
    }

    const cleanCode = rawCode.toUpperCase();

    // Resolve optional caller identity
    const user = await getUserFromRequest(request);
    const userId = user?.id || null;

    // Rate limiting
    const rateKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const rateCheck = checkCodeResolveRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          message: `Too many validation attempts. Please wait ${rateCheck.resetInSec} seconds before trying again.`,
        },
        { status: 429, headers: { "Retry-After": String(rateCheck.resetInSec) } }
      );
    }

    const supabase = getSupabaseServerClient();
    const now = new Date();

    // =========================================================================
    // 1. CHECK MASTER ACCESS CODE (UTME MOCK ENGINE)
    // =========================================================================
    try {
      const { data: masterRow } = await supabase
        .from("exam_config")
        .select("config_value")
        .eq("config_key", "master_access_code")
        .maybeSingle();

      const masterCode = String(masterRow?.config_value || "STAGING-MASTER-TEST-001").trim().toUpperCase();

      if (cleanCode === masterCode) {
        return NextResponse.json({
          ok: true,
          type: "utme_mock",
          access_mode: "master",
          code: cleanCode,
          title: "JAMB / UTME Mock Simulator",
          description: "Official 4-subject 180-question computerized simulation paper.",
          duration_seconds: 7200,
          question_count: 180,
          destination: "/instructions",
          message: "Authorized Master Access Code verified.",
        });
      }
    } catch (e) {
      console.warn("[resolve-code] Master code check error:", e);
    }

    // =========================================================================
    // 2. CHECK INSTRUCTOR / ORG ASSESSMENT CODES (learning_access_codes)
    // =========================================================================
    const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

    const { data: learningCode, error: lcErr } = await supabase
      .from("learning_access_codes")
      .select("id, code_hint, scope_type, assessment_id, organisation_id, max_questions, permanent, expires_at, max_redemptions, redemption_count, revoked_at")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (!lcErr && learningCode && learningCode.scope_type === "assessment" && learningCode.assessment_id) {
      // Fetch assessment details
      const { data: assessment, error: assessErr } = await supabase
        .from("learning_assessments")
        .select("id, title, description, assessment_type, question_count, duration_seconds, max_attempts, starts_at, ends_at, is_published, organisation_id, access_code_required")
        .eq("id", learningCode.assessment_id)
        .maybeSingle();

      if (assessErr || !assessment) {
        return NextResponse.json(
          { ok: false, error: "assessment_not_found", message: "The examination associated with this code is not available." },
          { status: 404 }
        );
      }

      if (!assessment.is_published) {
        return NextResponse.json(
          { ok: false, error: "assessment_unpublished", message: "This examination has not yet been published by the instructor." },
          { status: 400 }
        );
      }

      // Check Revocation
      if (learningCode.revoked_at) {
        return NextResponse.json(
          { ok: false, error: "code_revoked", message: "This examination code has been revoked by the instructor." },
          { status: 403 }
        );
      }

      // Check Expiration
      if (!learningCode.permanent && learningCode.expires_at && new Date(learningCode.expires_at) <= now) {
        return NextResponse.json(
          { ok: false, error: "code_expired", message: "This examination access code has expired." },
          { status: 410 }
        );
      }

      // Check Schedule: Starts at
      if (assessment.starts_at && new Date(assessment.starts_at) > now) {
        const opensFormatted = new Date(assessment.starts_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return NextResponse.json(
          {
            ok: false,
            error: "assessment_not_started",
            message: `This examination is not open yet. Scheduled to open on ${opensFormatted}.`,
            starts_at: assessment.starts_at,
          },
          { status: 400 }
        );
      }

      // Check Schedule: Ends at
      if (assessment.ends_at && new Date(assessment.ends_at) <= now) {
        return NextResponse.json(
          { ok: false, error: "assessment_closed", message: "This examination has concluded and is closed." },
          { status: 400 }
        );
      }

      // Check Redemptions Limit
      let alreadyRedeemed = false;
      if (userId) {
        const { data: redemption } = await supabase
          .from("learning_access_code_redemptions")
          .select("id")
          .eq("access_code_id", learningCode.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (redemption) alreadyRedeemed = true;
      }

      if (!alreadyRedeemed && learningCode.redemption_count >= learningCode.max_redemptions) {
        return NextResponse.json(
          { ok: false, error: "code_fully_redeemed", message: "This examination code has reached its maximum redemptions limit." },
          { status: 409 }
        );
      }

      // Check Student Attempt Limit
      let attemptsCount = 0;
      if (userId) {
        const { count } = await supabase
          .from("learning_practice_attempts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("assessment_id", assessment.id);
        attemptsCount = count || 0;

        if (assessment.max_attempts > 0 && attemptsCount >= assessment.max_attempts) {
          return NextResponse.json(
            {
              ok: false,
              error: "attempt_limit_reached",
              message: `You have exhausted all allowed attempts (${attemptsCount} of ${assessment.max_attempts}) for this examination.`,
              attempts_used: attemptsCount,
              max_attempts: assessment.max_attempts,
            },
            { status: 400 }
          );
        }
      }

      // Fetch host organisation name if available
      let organisationName = "BrainLab Instructor Assessment";
      if (assessment.organisation_id) {
        const { data: org } = await supabase
          .from("learning_organisations")
          .select("name")
          .eq("id", assessment.organisation_id)
          .maybeSingle();
        if (org?.name) organisationName = org.name;
      }

      return NextResponse.json({
        ok: true,
        type: "instructor_assessment",
        code: cleanCode,
        assessment_id: assessment.id,
        title: assessment.title,
        description: assessment.description || "Instructor-assigned computer-based examination.",
        assessment_type: assessment.assessment_type,
        organisation_name: organisationName,
        duration_seconds: assessment.duration_seconds || 1800,
        question_count: assessment.question_count || 20,
        max_attempts: assessment.max_attempts || 1,
        attempts_used: attemptsCount,
        starts_at: assessment.starts_at,
        ends_at: assessment.ends_at,
        destination: `/assessments/${assessment.id}?code=${encodeURIComponent(cleanCode)}`,
        message: "Authorized instructor examination code verified.",
      });
    }

    // =========================================================================
    // 3. CHECK UTME CBT VOUCHER CODES (public.access_codes)
    // =========================================================================
    const { data: codeRecord, error: codeErr } = await supabase
      .from("access_codes")
      .select("id, code, subject, is_used, used_by, used_at, grants_plan, cohort")
      .eq("code", cleanCode)
      .maybeSingle();

    if (!codeErr && codeRecord) {
      if (codeRecord.is_used) {
        return NextResponse.json(
          {
            ok: false,
            error: "code_used",
            type: "utme_mock",
            message: "This UTME CBT access voucher has already been used.",
            used_at: codeRecord.used_at,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        type: "utme_mock",
        access_mode: "voucher",
        code: cleanCode,
        preconfigured_subject: codeRecord.subject || null,
        title: "JAMB / UTME Mock Simulator",
        description: "Official 4-subject 180-question computerized simulation paper.",
        duration_seconds: 7200,
        question_count: 180,
        destination: "/instructions",
        message: "Valid UTME CBT access voucher verified.",
      });
    }

    // =========================================================================
    // 4. NEITHER MATCHED: SAFE GENERIC ERROR
    // =========================================================================
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_code",
        message: "Invalid examination code or access PIN. Please double-check with your instructor or administrator.",
      },
      { status: 404 }
    );
  } catch (err) {
    console.error("[api/exam/resolve-code] Internal error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Failed to validate examination code. Please try again." },
      { status: 500 }
    );
  }
}
