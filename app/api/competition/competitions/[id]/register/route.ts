import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { BachsPaymentProvider } from "@/app/lib/payments/bachsProvider";
import { isCurrentUserAdmin } from "@/app/lib/subscriptionEntitlements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: competitionId } = await params;
    const body = await req.json().catch(() => ({}));
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to register." }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch competition details
    const { data: comp, error: compErr } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competitionId)
      .single();

    if (compErr || !comp) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    if (comp.status !== "published" && comp.status !== "scheduled" && comp.status !== "active") {
      return NextResponse.json({ error: `Registration is not open for this event (status: ${comp.status}).` }, { status: 400 });
    }

    const now = new Date();
    const { data: registrationControls } = await supabase
      .from("competition_emergency_controls")
      .select("target_id, is_paused, maintenance_mode")
      .eq("scope", "registration")
      .in("target_id", ["all", competitionId]);
    if (registrationControls?.some((control) => control.is_paused || control.maintenance_mode)) {
      return NextResponse.json({ error: "Arena registration is temporarily paused by Super Admin." }, { status: 423 });
    }
    if (comp.registration_opens_at && now < new Date(comp.registration_opens_at)) {
      return NextResponse.json({ error: "Registration has not opened yet." }, { status: 400 });
    }
    if (comp.registration_closes_at && now > new Date(comp.registration_closes_at)) {
      return NextResponse.json({ error: "Registration is closed." }, { status: 400 });
    }

    if (Number.isInteger(comp.max_participants) && comp.max_participants > 0) {
      const { count, error: countError } = await supabase
        .from("competition_participants")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId)
        .in("status", ["registered", "approved", "pending_approval"]);
      if (countError) throw countError;
      if ((count || 0) >= comp.max_participants) {
        return NextResponse.json({ error: "This competition has reached its participant limit." }, { status: 409 });
      }
    }

    // 2. Check if already registered
    const { data: existingParticipant } = await supabase
      .from("competition_participants")
      .select("id")
      .eq("competition_id", competitionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingParticipant) {
      return NextResponse.json({ error: "You are already registered for this competition." }, { status: 400 });
    }

    // 3. Resolve configured access mode and the canonical fee in kobo.
    const isAdmin = await isCurrentUserAdmin(user.id);
    const accessMode = comp.access_mode || "free";
    const entryFeeKobo = accessMode === "paid"
      ? Math.max(0, Math.round(Number(comp.entry_fee_kobo) || 0))
      : 0;

    let validatedAccessCode: { id: string; used_count: number; max_uses: number | null } | null = null;
    if (accessMode === "code" && !isAdmin) {
      const accessCodeText = typeof body.accessCode === "string" ? body.accessCode.trim().toUpperCase() : "";
      if (!accessCodeText) {
        return NextResponse.json({ error: "An event access code is required." }, { status: 403 });
      }
      const codeHash = createHash("sha256").update(accessCodeText).digest("hex");
      const { data: accessCode, error: codeError } = await supabase
        .from("competition_access_codes")
        .select("id, used_count, max_uses, expires_at")
        .eq("competition_id", competitionId)
        .is("round_id", null)
        .eq("code_hash", codeHash)
        .eq("is_active", true)
        .maybeSingle();
      if (codeError) throw codeError;
      if (!accessCode || (accessCode.expires_at && new Date(accessCode.expires_at) <= now) ||
          (accessCode.max_uses !== null && accessCode.used_count >= accessCode.max_uses)) {
        return NextResponse.json({ error: "The access code is invalid, expired or exhausted." }, { status: 403 });
      }
      validatedAccessCode = accessCode;
    }

    if (!["free", "code", "request", "paid"].includes(accessMode)) {
      return NextResponse.json({ error: "This competition has an unsupported access configuration." }, { status: 409 });
    }
    if (accessMode === "paid" && entryFeeKobo < 1 && !isAdmin) {
      return NextResponse.json({ error: "This paid competition has no valid BACHS entry fee configured. Contact the organiser." }, { status: 409 });
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from("competition_public_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const displayName = profile?.display_name || `BrainLab Player ${user.id.slice(0, 4).toUpperCase()}`;

    // If paid and not admin -> Initialize BACHS payment
    if (entryFeeKobo > 0 && !isAdmin) {
      const payerEmail = user.email?.trim();
      if (!payerEmail) {
        return NextResponse.json({ error: "A verified email address is required for BACHS entry payment." }, { status: 400 });
      }
      const bachs = new BachsPaymentProvider();
      const reference = `COMP_${competitionId.slice(0, 8)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.brainlabacademy.com.ng"}/challenge-arena?registered=${competitionId}`;

      const paymentResult = await bachs.initializePayment({
        reference,
        amountKobo: entryFeeKobo,
        email: payerEmail,
        callbackUrl,
        planId: `competition_${competitionId}`,
        userId: user.id,
        metadata: {
          competition_id: competitionId,
          user_id: user.id,
          display_name: displayName,
          type: "competition_entry_fee",
        },
      });

      if (!paymentResult.ok) {
        return NextResponse.json({ error: paymentResult.error || "Failed to initialize tournament payment via BACHS." }, { status: 500 });
      }

      // Record transaction
      await supabase.from("payment_transactions").insert({
        user_id: user.id,
        reference,
        provider: "bachs",
        amount_kobo: entryFeeKobo,
        status: "pending",
        metadata: {
          competition_id: competitionId,
          payment_type: "tournament_entry_fee",
        },
      });

      return NextResponse.json({
        ok: true,
        requiresPayment: true,
        checkoutUrl: paymentResult.authorizationUrl,
        reference,
      });
    }

    // Request-based access and manual approval create a pending participant record.
    const requiresApproval = !isAdmin && (accessMode === "request" || comp.approval_mode === "manual");
    let codeClaimed = false;

    if (validatedAccessCode) {
      const { data: claimedCode, error: claimError } = await supabase
        .from("competition_access_codes")
        .update({ used_count: validatedAccessCode.used_count + 1 })
        .eq("id", validatedAccessCode.id)
        .eq("used_count", validatedAccessCode.used_count)
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedCode) {
        return NextResponse.json({ error: "This access code was just redeemed or is no longer available." }, { status: 409 });
      }
      codeClaimed = true;
    }

    const { data: newParticipant, error: partErr } = await supabase
      .from("competition_participants")
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        display_name: displayName,
        status: requiresApproval ? "pending_approval" : "registered",
        score: 0,
        raw_score: 0,
      })
      .select()
      .single();

    if (partErr) {
      if (codeClaimed && validatedAccessCode) {
        await supabase.from("competition_access_codes")
          .update({ used_count: validatedAccessCode.used_count })
          .eq("id", validatedAccessCode.id)
          .eq("used_count", validatedAccessCode.used_count + 1);
      }
      throw partErr;
    }

    // Increment current_participants count on competition
    try {
      const { error: rpcErr } = await supabase.rpc("increment_competition_participants", { comp_id: competitionId });
      if (rpcErr) throw rpcErr;
    } catch {
      // Fallback manual count update
      const { count } = await supabase
        .from("competition_participants")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId);

      await supabase
        .from("competitions")
        .update({ current_participants: count || 1 })
        .eq("id", competitionId);
    }

    return NextResponse.json({
      ok: true,
      requiresPayment: false,
      participant: newParticipant,
      message: requiresApproval
        ? "Your registration request has been submitted for organiser approval."
        : "Successfully registered for competition!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error registering for competition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
