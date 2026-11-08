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
    const { data, error } = await supabase
      .from("school_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inquiries: data || [] });
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
    const rateCheck = checkRateLimit(`school-inquiry:${ip}`, 3, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many inquiries submitted from this connection. Please wait ${rateCheck.retryAfterSeconds} seconds before submitting again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid inquiry payload." }, { status: 400 });
    }

    // 2. Abuse Protection: Honeypot check
    if (isHoneypotTriggered(body.website_url_hp)) {
      return NextResponse.json({
        ok: true,
        referenceCode: generateReferenceCode("BL-SCH"),
        message: "Your inquiry has been received.",
        submittedAt: new Date().toISOString(),
      });
    }

    const { schoolName, contactName, email, phone, location, studentCount, examType, notes } = body;

    if (!schoolName || !contactName || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: "Please fill in all required fields (School name, contact person, email, and phone)." },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid official email address." },
        { status: 400 }
      );
    }

    // Generate cryptographic reference code BL-SCH-XXXXX
    const referenceCode = generateReferenceCode("BL-SCH");
    const submittedAt = new Date().toISOString();

    // 1. Persist to database using public client (RLS enforces INSERT-only for anon)
    const publicClient = getSupabasePublicServerClient();
    const { error: insertError } = await publicClient.from("school_inquiries").insert([
      {
        reference_code: referenceCode,
        school_name: schoolName.trim(),
        contact_name: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        location: location ? location.trim() : "Nigeria",
        student_count: studentCount || "Unspecified",
        exam_type: examType || "JAMB UTME Mocks",
        notes: notes ? notes.trim() : null,
        status: "Pending",
        consent_recorded: true,
        consent_ndpa_at: submittedAt,
      },
    ]);

    if (insertError) {
      // Fail closed: Do not report false success if database persistence fails
      console.warn(`[INSTITUTIONAL INQUIRY] Database persistence failed for Ref ${referenceCode}: ${insertError.message}`);
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to record inquiry automatically at this time. Please contact our Academic Desk directly via WhatsApp or email.",
        },
        { status: 503 }
      );
    }

    // 2. Broadcast alert to live admin channel as a secondary real-time notification
    try {
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_school_inquiry",
        payload: {
          referenceCode,
          location: location || "Nigeria",
          studentCount: studentCount || "Unspecified",
          examType: examType || "JAMB CBT",
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (bcErr) {
      console.warn("Real-time broadcast notification notice:", bcErr);
    }

    // 3. Sanitized log without unredacted personal contact details (PII protection)
    console.info(`[INSTITUTIONAL INQUIRY] Ref: ${referenceCode} | Status: Recorded`);

    return NextResponse.json(
      {
        ok: true,
        referenceCode,
        message: "Your institutional inquiry has been received. A BrainLab Academic Partner Manager will contact you within 24 hours.",
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
      return NextResponse.json({ ok: false, error: "Inquiry ID is required." }, { status: 400 });
    }

    const validStatuses = ["Pending", "Contacted", "Quoted", "Active Partner"];
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
      .from("school_inquiries")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inquiry: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
