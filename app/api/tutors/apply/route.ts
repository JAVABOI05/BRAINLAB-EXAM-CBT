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

const ALLOWED_QUALIFICATIONS = [
  "B.Ed (Education)",
  "B.Sc / B.A (Subject Area)",
  "M.Ed / M.Sc / M.A",
  "Ph.D / Doctorate",
  "NCE (National Certificate in Education)",
  "TRCN Certified Professional",
  "HND / Undergraduate Finalist",
  "Other Professional Credential",
];

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
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServerClient(token);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const subject = searchParams.get("subject");

    let query = supabase
      .from("tutor_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "All") {
      query = query.eq("status", status);
    }
    if (subject && subject !== "All") {
      query = query.contains("primary_subjects", [subject]);
    }

    const { data, error } = await query;

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

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse Protection: Rate Limiting
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(`tutor-apply:${ip}`, 3, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds before submitting another application.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid submission payload." },
        { status: 400 }
      );
    }

    // 2. Abuse Protection: Honeypot check
    if (isHoneypotTriggered(body.website_url_hp)) {
      // Silently discard spam bots with neutral success
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
      stateOfResidence,
      highestQualification,
      primarySubjects,
      targetCurricula,
      yearsExperience,
      portfolioUrl,
      statementOfPedagogy,
      isAdultConfirmed,
      privacyConsent,
    } = body;

    // 3. Strict Input Validation & NDPA Requirements
    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please provide your full legal name (minimum 2 characters)." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid official email address." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid telephone number reachable on WhatsApp." },
        { status: 400 }
      );
    }

    if (!highestQualification || !ALLOWED_QUALIFICATIONS.includes(highestQualification)) {
      return NextResponse.json(
        { ok: false, error: "Please select a recognized academic qualification." },
        { status: 400 }
      );
    }

    if (!Array.isArray(primarySubjects) || primarySubjects.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Please select at least one primary teaching subject." },
        { status: 400 }
      );
    }

    if (!Array.isArray(targetCurricula) || targetCurricula.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Please select at least one curriculum you teach (e.g. JAMB UTME, WAEC)." },
        { status: 400 }
      );
    }

    if (!statementOfPedagogy || typeof statementOfPedagogy !== "string" || statementOfPedagogy.trim().length < 20) {
      return NextResponse.json(
        { ok: false, error: "Please outline your teaching approach (minimum 20 characters, maximum 1000)." },
        { status: 400 }
      );
    }

    if (statementOfPedagogy.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "Pedagogical statement must not exceed 1000 characters." },
        { status: 400 }
      );
    }

    // 4. Minor Protection & NDPA Consent Verification
    if (!isAdultConfirmed) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must confirm you are 18 years of age or older to apply as an independent tutor.",
        },
        { status: 400 }
      );
    }

    if (!privacyConsent) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must review and accept the NDPA 2023 Data Privacy Notice to submit your application.",
        },
        { status: 400 }
      );
    }

    // 5. Generate Immutable Reference Code
    const referenceCode = generateReferenceCode("BL-TTR");

    // 6. Persist to Database using Public Server Client (RLS enforces INSERT-only for anon)
    const publicClient = getSupabasePublicServerClient();
    const { error: insertError } = await publicClient.from("tutor_applications").insert([
      {
        reference_code: referenceCode,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        state_of_residence: stateOfResidence ? String(stateOfResidence).trim() : "Nigeria",
        highest_qualification: highestQualification,
        primary_subjects: primarySubjects.map((s: string) => String(s).trim()),
        target_curricula: targetCurricula.map((c: string) => String(c).trim()),
        years_experience: yearsExperience || "1-3 years",
        portfolio_url: portfolioUrl && typeof portfolioUrl === "string" ? portfolioUrl.trim().slice(0, 300) : null,
        statement_of_pedagogy: statementOfPedagogy.trim(),
        status: "Pending",
        consent_version: "NDPA-2023-V1",
        consent_recorded_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.warn(`[TUTOR APPLICATION] DB Insert failed for Ref ${referenceCode}: ${insertError.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to record application automatically at this time. Please contact our Academic Desk directly via WhatsApp or email.",
        },
        { status: 503 }
      );
    }

    // 7. Internal Broadcast Alert across Supabase Realtime (No external tracking)
    try {
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_tutor_application",
        payload: {
          referenceCode,
          subjectsCount: primarySubjects.length,
          highestQualification,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (bcErr) {
      console.warn("[TUTOR APPLICATION] Realtime alert broadcast note:", bcErr);
    }

    // 8. Sanitized Server Log (Zero PII)
    console.info(`[TUTOR APPLICATION] Ref: ${referenceCode} | Status: Stored | Subjects: ${primarySubjects.length}`);

    return NextResponse.json(
      {
        ok: true,
        referenceCode,
        message: "Your application has been successfully recorded. The BrainLab Academic Review Committee will inspect your submission within 5 business days.",
        submittedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}

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
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Application ID is required." }, { status: 400 });
    }

    const validStatuses = ["Pending", "Shortlisted", "Interviewed", "Approved", "Rejected"];
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
