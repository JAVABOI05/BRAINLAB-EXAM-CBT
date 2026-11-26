import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

function calculateLevelFromXp(xp: number): { level: number; name: string } {
  if (xp >= 5000) return { level: 10, name: "Grandmaster" };
  if (xp >= 3500) return { level: 9, name: "Scholar Supreme" };
  if (xp >= 2500) return { level: 8, name: "Master" };
  if (xp >= 1750) return { level: 7, name: "Expert" };
  if (xp >= 1200) return { level: 6, name: "Adept" };
  if (xp >= 800) return { level: 5, name: "Senior Scholar" };
  if (xp >= 500) return { level: 4, name: "Intermediate" };
  if (xp >= 300) return { level: 3, name: "Junior Scholar" };
  if (xp >= 150) return { level: 2, name: "Apprentice" };
  return { level: 1, name: "Beginner" };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { activityType, referenceId, amount, description, scorePercent } = body;

    // Resolve caller identity: prioritize authenticated JWT, fall back to body.userId
    const authenticatedUser = await getUserFromRequest(request);
    let resolvedUserId = authenticatedUser?.id || body.userId;

    if (!resolvedUserId || resolvedUserId === "candidate-guest") {
      // Guest or unauthenticated candidate: return success acknowledging local caching
      return NextResponse.json({
        ok: true,
        guest: true,
        awarded_xp: Number(amount) || 0,
        message: "Activity logged locally for guest session.",
      });
    }

    const supabase = getSupabaseServerClient();
    const todayStr = new Date().toISOString().split("T")[0];
    const xpToAdd = Math.max(0, Number(amount) || 0);

    // 1. Fetch current profile from user_gamification_profiles
    const { data: currentProfile } = await supabase
      .from("user_gamification_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    const currentXp = currentProfile?.lifetime_xp || 0;
    const newLifetimeXp = currentXp + xpToAdd;
    const { level: newLevel, name: newLevelName } = calculateLevelFromXp(newLifetimeXp);

    // Calculate streak
    let currentStreak = currentProfile?.current_streak_days || 1;
    if (currentProfile?.last_activity_date && currentProfile.last_activity_date !== todayStr) {
      const lastDate = new Date(currentProfile.last_activity_date);
      const today = new Date(todayStr);
      const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    const newLongestStreak = Math.max(currentProfile?.longest_streak_days || 1, currentStreak);
    const perfectCount = (scorePercent ?? 0) >= 100
      ? (currentProfile?.perfect_scores_count || 0) + 1
      : (currentProfile?.perfect_scores_count || 0);
    const quizzesCount = (currentProfile?.quizzes_completed_count || 0) + 1;

    // 2. Upsert profile with service role (never blocked by RLS)
    const { error: upsertErr } = await supabase
      .from("user_gamification_profiles")
      .upsert({
        user_id: resolvedUserId,
        lifetime_xp: newLifetimeXp,
        current_level: newLevel,
        level_name: newLevelName,
        current_streak_days: currentStreak,
        longest_streak_days: newLongestStreak,
        last_activity_date: todayStr,
        quizzes_completed_count: quizzesCount,
        perfect_scores_count: perfectCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[api/gamification/award] Upsert error:", upsertErr.message);
    }

    // 3. Record in user_xp_ledger
    const idempKey = `xp_${resolvedUserId}_${activityType || "activity"}_${referenceId || Date.now()}`;
    await supabase
      .from("user_xp_ledger")
      .upsert({
        user_id: resolvedUserId,
        amount: xpToAdd,
        activity_type: activityType || "learning_activity",
        idempotency_key: idempKey,
        description: description || `Awarded ${xpToAdd} XP`,
        metadata: { score: scorePercent, ref_id: referenceId },
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });

    return NextResponse.json({
      ok: true,
      awarded_xp: xpToAdd,
      lifetime_xp: newLifetimeXp,
      current_level: newLevel,
      level_name: newLevelName,
      streak_days: currentStreak,
      leveled_up: newLevel > (currentProfile?.current_level || 1),
    });
  } catch (err) {
    console.error("[api/gamification/award] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to record gamification" },
      { status: 500 }
    );
  }
}
