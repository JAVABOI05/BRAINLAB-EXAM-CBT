import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

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

    // Generate reference code BL-SCH-[Random 5 chars]
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const referenceCode = `BL-SCH-${randomHex}`;

    // Broadcast instant alert to Admin Notification Bell via Supabase channel
    try {
      const supabase = getSupabaseServerClient();
      const channel = supabase.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_school_inquiry",
        payload: {
          referenceCode,
          schoolName,
          contactName,
          phone,
          email,
          location: location || "Nigeria",
          studentCount: studentCount || "Unspecified",
          examType: examType || "JAMB CBT",
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (bcErr) {
      console.warn("Failed to broadcast real-time school inquiry alert:", bcErr);
    }

    // Log the inquiry for administration
    console.info(`[INSTITUTIONAL INQUIRY] Ref: ${referenceCode} | School: ${schoolName} | Contact: ${contactName} (${phone}, ${email}) | Students: ${studentCount || "Unspecified"} | Exam: ${examType || "General"}`);

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
