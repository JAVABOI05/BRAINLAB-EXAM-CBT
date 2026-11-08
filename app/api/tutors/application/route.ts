import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
  resolveAdminRole,
} from "@/app/lib/supabaseServer";
import { isGovernanceAdminRole } from "@/app/lib/adminRoles";
import {
  checkRateLimit,
  getClientIp,
  isHoneypotTriggered,
  generateReferenceCode,
} from "@/app/lib/abuseProtection";
import { sendEmail } from "@/app/lib/emailService";
import { CANONICAL_PHONE_DISPLAY, CANONICAL_PHONE_DIGITS } from "@/app/lib/contactConfig";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch tutor applications (Governance Administrators only)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    if (!isGovernanceAdminRole(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden: Governance privilege required." }, { status: 403 });
    }

    const supabase = getSupabaseServerClient(token);
    const { data, error } = await supabase
      .from("tutor_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, applications: data || [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Submit new educator / tutor application (Public with Rate Limiting & Bot Protection)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Abuse Protection: Rate Limiting
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`tutor-app:${ip}`, 3, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many submissions from this connection. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid application payload." }, { status: 400 });
    }

    // 2. Abuse Protection: Honeypot check
    if (isHoneypotTriggered(body.website_url_hp)) {
      return NextResponse.json({
        ok: true,
        referenceCode: generateReferenceCode("BL-TTR"),
        message: "Your application has been received.",
        submittedAt: new Date().toISOString(),
      });
    }

    const {
      fullName,
      email,
      phone,
      location,
      subjects,
      highestQualification,
      yearsOfExperience,
      curriculumExperience,
      linkedinOrCvUrl,
      introStatement,
      consentNdpa,
    } = body;

    // 3. Strict Validation & Data Minimization
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 120) {
      return NextResponse.json(
        { ok: false, error: "Please enter your full name (between 2 and 120 characters)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid official email address." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 10 || phone.trim().length > 25) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid phone or WhatsApp number (10 to 25 characters)." },
        { status: 400 }
      );
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Please select at least one teaching subject." },
        { status: 400 }
      );
    }

    const validQualifications = ["NCE", "OND", "HND", "B.Sc / B.Ed", "M.Sc / M.Ed", "Ph.D", "Other"];
    if (!highestQualification || !validQualifications.includes(highestQualification)) {
      return NextResponse.json(
        { ok: false, error: "Please select your highest academic qualification." },
        { status: 400 }
      );
    }

    const validExperience = ["Under 1 year", "1-3 years", "4-7 years", "8+ years"];
    if (!yearsOfExperience || !validExperience.includes(yearsOfExperience)) {
      return NextResponse.json(
        { ok: false, error: "Please select your teaching experience level." },
        { status: 400 }
      );
    }

    if (
      !introStatement ||
      typeof introStatement !== "string" ||
      introStatement.trim().length < 20 ||
      introStatement.trim().length > 1200
    ) {
      return NextResponse.json(
        { ok: false, error: "Please provide a brief teaching philosophy statement (between 20 and 1,200 characters)." },
        { status: 400 }
      );
    }

    // 4. Mandatory NDPA 2023 Explicit Consent Verification
    if (consentNdpa !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must review and consent to the Nigeria Data Protection Act (NDPA) privacy terms before submitting.",
        },
        { status: 400 }
      );
    }

    // Generate cryptographic reference code BL-TTR-XXXXX
    const referenceCode = generateReferenceCode("BL-TTR");
    const submittedAt = new Date().toISOString();

    // 5. Database Persistence using Public Client (RLS enforces INSERT-only for anon)
    const publicClient = getSupabasePublicServerClient();
    const { error: insertError } = await publicClient.from("tutor_applications").insert([
      {
        reference_code: referenceCode,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        location: location ? location.trim() : "Nigeria",
        subjects: subjects.map((s: string) => String(s).trim()),
        highest_qualification: highestQualification,
        years_of_experience: yearsOfExperience,
        curriculum_experience: Array.isArray(curriculumExperience)
          ? curriculumExperience.map((c: string) => String(c).trim())
          : [],
        linkedin_or_cv_url: linkedinOrCvUrl ? String(linkedinOrCvUrl).trim().slice(0, 300) : null,
        intro_statement: introStatement.trim(),
        consent_ndpa_at: submittedAt,
        status: "Pending",
      },
    ]);

    if (insertError) {
      // Fail closed: Do NOT report false success if database persistence fails
      console.warn(`[TUTOR APPLICATION] Database persistence failed for Ref ${referenceCode}: ${insertError.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: `Unable to record application automatically at this time. Please contact our Academic Desk directly via WhatsApp (${CANONICAL_PHONE_DISPLAY}) with your details.`,
        },
        { status: 503 }
      );
    }

    // 6. Realtime Alert Broadcast to Connected Admin Consoles
    try {
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_tutor_application",
        payload: {
          referenceCode,
          location: location || "Nigeria",
          subjects,
          qualification: highestQualification,
          submittedAt,
        },
      });
    } catch (bcErr) {
      console.warn("[TUTOR APPLICATION] Real-time broadcast notice:", bcErr);
    }

    // 7. Submitter Transactional Email Acknowledgement (Asynchronous, Non-blocking)
    try {
      void sendEmail({
        to: email.trim().toLowerCase(),
        subject: `BrainLab Academy — Tutor Application Received [Ref: ${referenceCode}]`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #0f172a; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #1e3a8a; margin: 0; font-size: 20px; font-weight: 800;">BRAINLAB ACADEMY</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Educator Evaluation Desk</p>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin-top: 0; font-size: 15px;">Dear <strong>${fullName.trim()}</strong>,</p>
              <p style="font-size: 14px; color: #334155;">Thank you for your interest in joining the BrainLab educator community. Your application has been logged under official tracking reference:</p>
              <div style="text-align: center; margin: 16px 0; padding: 12px; background-color: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px;">
                <span style="font-family: monospace; font-size: 18px; font-weight: bold; color: #1e40af; letter-spacing: 0.1em;">${referenceCode}</span>
              </div>
              <p style="font-size: 13px; color: #475569;">Our Academic Vetting Committee reviews candidate credentials against curriculum standards. If shortlisted, you will be invited for a vector whiteboard teaching demonstration.</p>
            </div>
            <div style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              <p style="margin: 0;">Processed under the Nigeria Data Protection Act (NDPA) 2023.</p>
              <p style="margin: 4px 0 0 0;">For urgent inquiries: <a href="https://wa.me/${CANONICAL_PHONE_DIGITS}" style="color: #2563eb; text-decoration: none;">WhatsApp Academic Desk (${CANONICAL_PHONE_DISPLAY})</a></p>
            </div>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("[TUTOR APPLICATION] Confirmation email dispatch note:", mailErr);
    }

    // 8. Sanitized Server Log (Zero PII emitted)
    console.info(`[TUTOR APPLICATION] Ref: ${referenceCode} | Status: Persisted`);

    return NextResponse.json(
      {
        ok: true,
        referenceCode,
        message: "Your application has been received. Our Academic Vetting Committee will review your submission and contact you within 24-48 business hours.",
        submittedAt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * PATCH: Update application status or append internal administrative notes (Governance Admins only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const role = await resolveAdminRole(user.id, token, user.email ?? undefined);

    if (!isGovernanceAdminRole(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden: Governance privilege required." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid update payload." }, { status: 400 });
    }

    const { id, status, adminNotes } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Application ID is required." }, { status: 400 });
    }

    const validStatuses = ["Pending", "Reviewing", "Interview_Scheduled", "Approved", "Rejected", "Withdrawn"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status value." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(token);
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;
    if (typeof adminNotes === "string") updatePayload.admin_notes = adminNotes.trim();

    const { data, error } = await supabase
      .from("tutor_applications")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, application: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
