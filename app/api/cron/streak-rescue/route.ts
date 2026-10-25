import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { sendStreakRescueEmail } from "../../../lib/emailService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if cronSecret is not set or matches bearer token
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const todayStr = new Date().toISOString().split("T")[0];

    // Query profiles with active streaks that haven't practiced today
    const { data: profiles, error } = await supabase
      .from("learner_profiles")
      .select("user_id, current_streak_days, last_active_date, total_xp")
      .gt("current_streak_days", 0)
      .neq("last_active_date", todayStr)
      .limit(100);

    if (error) {
      console.warn("Could not query learner_profiles for streaks:", (error instanceof Error ? error.message : String(error)));
      return NextResponse.json({
        ok: true,
        dispatched: 0,
        message: "No profiles at risk or table schema uses alternate key.",
      });
    }

    let notifiedCount = 0;

    for (const profile of profiles || []) {
      const streakDays = profile.current_streak_days || 1;

      // 1. In-app notification
      try {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: `🔥 Save Your ${streakDays}-Day Study Streak!`,
          message: `Your streak and multiplier XP are at risk of resetting at midnight. Complete 5 quick questions in the Challenge Arena now!`,
          type: "streak",
          link_url: "/challenge-arena",
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn("Failed to insert streak notification:", notifErr);
      }

      // 2. Email alert
      try {
        const { data: userRecord } = await supabase.auth.admin.getUserById(profile.user_id);
        if (userRecord?.user?.email) {
          const studentName =
            userRecord.user.user_metadata?.full_name ||
            userRecord.user.email.split("@")[0] ||
            "Candidate";

          await sendStreakRescueEmail({
            to: userRecord.user.email,
            studentName,
            currentStreakDays: streakDays,
            xpAtRisk: streakDays * 50,
            practiceUrl: "https://brainlabacademy.com.ng/challenge-arena",
          });
        }
      } catch {
        // Continue loop if single email fails
      }

      notifiedCount++;
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      checkedCount: (profiles || []).length,
      dispatched: notifiedCount,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
