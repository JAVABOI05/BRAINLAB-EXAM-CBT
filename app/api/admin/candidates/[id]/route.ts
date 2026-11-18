import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const candidateId = resolvedParams.id;
    if (!candidateId) {
      return NextResponse.json({ ok: false, error: "Candidate ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch user from Auth Admin
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(candidateId);
    if (userError || !userData.user) {
      return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
    }

    const u = userData.user;
    const meta = u.user_metadata || {};

    // 2. Fetch subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", candidateId)
      .maybeSingle();

    // 3. Fetch payment transactions & receipts
    const { data: transactions } = await supabase
      .from("payment_transactions")
      .select("id, reference, provider, provider_reference, amount_kobo, currency, status, paid_at, created_at, subscription_plans(name)")
      .eq("user_id", candidateId)
      .order("created_at", { ascending: false });

    // 4. Fetch learning entitlements
    const { data: entitlements } = await supabase
      .from("learning_entitlements")
      .select("*")
      .eq("user_id", candidateId)
      .order("created_at", { ascending: false });

    // 5. Fetch recent CBT exam sessions & results
    const candidateName = meta.full_name || meta.name || "";

    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("*")
      .or(`candidate_name.ilike.%${candidateName}%,phone.eq.${meta.phone || "---"}`)
      .order("created_at", { ascending: false })
      .limit(15);

    // 6. Fetch gamification profile
    const { data: gamification } = await supabase
      .from("user_gamification_profiles")
      .select("lifetime_xp, current_level, level_name, current_streak_days, longest_streak_days, last_activity_date")
      .eq("user_id", candidateId)
      .maybeSingle();

    const isSuspended =
      meta.is_suspended === true ||
      (u.banned_until && new Date(u.banned_until) > new Date());

    const lastSignInMs = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
    const lastActivityMs = gamification?.last_activity_date ? new Date(gamification.last_activity_date).getTime() : 0;
    const latestActivityMs = Math.max(lastSignInMs, lastActivityMs);
    const lastSeenAt = latestActivityMs > 0 ? new Date(latestActivityMs).toISOString() : null;

    return NextResponse.json({
      ok: true,
      candidate: {
        id: u.id,
        email: u.email,
        fullName: candidateName || "Candidate",
        phone: meta.phone || u.phone || "N/A",
        targetExam: meta.target_exam || meta.exam_type || "JAMB UTME",
        targetScore: meta.target_score || 280,
        targetCourse: meta.target_course || meta.course || null,
        dreamSchool: meta.dream_school || meta.institution || meta.university || null,
        selectedSubjects: meta.selected_subjects || null,
        stateOfOrigin: meta.state || meta.state_of_origin || "N/A",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        lastActivityDate: gamification?.last_activity_date || null,
        lastSeenAt,
        emailConfirmed: Boolean(u.email_confirmed_at),
        isSuspended: Boolean(isSuspended),
        bannedUntil: u.banned_until || null,
        subscription: sub || null,
        gamification: {
          xp: gamification?.lifetime_xp || 0,
          level: gamification?.current_level || 1,
          levelName: gamification?.level_name || "Beginner",
          streakDays: gamification?.current_streak_days || 0,
          longestStreakDays: gamification?.longest_streak_days || 0,
        },
        transactions: transactions || [],
        entitlements: entitlements || [],
        sessions: sessions || [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load candidate details" },
      { status: 500 }
    );
  }
}
