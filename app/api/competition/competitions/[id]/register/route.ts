import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";
import { BachsPaymentProvider } from "@/app/lib/payments/bachsProvider";
import { isCurrentUserAdmin } from "@/app/lib/subscriptionEntitlements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: competitionId } = await params;
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

    // 3. Check entry fee & Admin bypass
    const isAdmin = await isCurrentUserAdmin(user.id);
    const entryFeeKobo = Math.round((Number(comp.entry_fee) || 0) * 100);

    // Get user profile for display name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, username, email")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = profile?.full_name || profile?.username || user.email || "Candidate";

    // If paid and not admin -> Initialize BACHS payment
    if (entryFeeKobo > 0 && !isAdmin) {
      const bachs = new BachsPaymentProvider();
      const reference = `COMP_${competitionId.slice(0, 8)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.brainlabacademy.com.ng"}/challenge-arena?registered=${competitionId}`;

      const paymentResult = await bachs.initializePayment({
        reference,
        amountKobo: entryFeeKobo,
        email: user.email || profile?.email || "",
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

    // Direct Free Registration (or Super Admin bypass)
    const { data: newParticipant, error: partErr } = await supabase
      .from("competition_participants")
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        display_name: displayName,
        status: "registered",
        score: 0,
        raw_score: 0,
      })
      .select()
      .single();

    if (partErr) throw partErr;

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
      message: "Successfully registered for competition!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error registering for competition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
