import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient } from "../../lib/supabaseServer";
import { CANONICAL_PHONE_DIGITS, CANONICAL_PHONE_DISPLAY } from "../../lib/contactConfig";

function generateContactReferenceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BL-CNT-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, category, message } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide your full name." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid phone or WhatsApp number." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Please provide your inquiry or support message." },
        { status: 400 }
      );
    }

    const referenceCode = generateContactReferenceCode();
    const sanitizedEmail = email && typeof email === "string" ? email.trim().toLowerCase() : null;
    const sanitizedCategory = category && typeof category === "string" ? category.trim() : "general_inquiry";

    // Attempt to broadcast to active admin support channels
    try {
      const publicClient = getSupabasePublicServerClient();
      const channel = publicClient.channel("admin_live_alerts");
      await channel.send({
        type: "broadcast",
        event: "new_contact_inquiry",
        payload: {
          referenceCode,
          name: name.trim(),
          phone: phone.trim(),
          email: sanitizedEmail,
          category: sanitizedCategory,
          preview: message.trim().slice(0, 100),
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (bcErr) {
      console.warn("[CONTACT INQUIRY] Real-time broadcast notice:", bcErr);
    }

    console.info(`[CONTACT INQUIRY] Reference: ${referenceCode} | Category: ${sanitizedCategory}`);

    // Pre-format official WhatsApp fallback redirect URL
    const encodedWaMsg = encodeURIComponent(
      `Hello BrainLab Academy Desk [Ticket: ${referenceCode}],\n\nName: ${name.trim()}\nPhone: ${phone.trim()}\nCategory: ${sanitizedCategory}\n\nMessage:\n${message.trim()}`
    );
    const whatsappUrl = `https://wa.me/${CANONICAL_PHONE_DIGITS}?text=${encodedWaMsg}`;

    return NextResponse.json({
      ok: true,
      referenceCode,
      message: "Your inquiry ticket has been registered. Our Academic Support Desk will follow up promptly.",
      whatsappUrl,
      supportPhone: CANONICAL_PHONE_DISPLAY,
      submittedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
