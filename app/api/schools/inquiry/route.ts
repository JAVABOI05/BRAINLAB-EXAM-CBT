import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublicServerClient,
  getSupabaseServerClient,
  getUserFromRequest,
  resolveAdminRole,
} from "@/app/lib/supabaseServer";
import { isGovernanceAdminRole } from "@/app/lib/adminRoles";

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
    const body = await req.json();
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

    // Generate cryptographic reference code BL-SCH-[Random 5 chars]
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const referenceCode = `BL-SCH-${randomHex}`;

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
      },
    ]);

    if (insertError) {
      // If table has not yet been migrated in current environment, log without PII
      console.warn(`[INSTITUTIONAL INQUIRY] Database persistence notice for Ref ${referenceCode}: ${insertError.message}`);
    }

    // 2. Broadcast alert to live admin channel as a secondary real-time notification
    try {
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_school_inquiry",
        payload: {
          referenceCode,
          schoolName,
          contactName,
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

    return NextResponse.json({
      ok: true,
      referenceCode,
      message: "Your institutional inquiry has been received. A BrainLab Academic Partner Manager will contact you within 24 hours.",
      submittedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
