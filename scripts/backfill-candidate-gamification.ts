import { getSupabaseServerClient } from "../app/lib/supabaseServer";

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

async function backfill() {
  const supabase = getSupabaseServerClient();
  const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = authData?.users || [];

  const { data: results } = await supabase.from("results").select("*");
  const { data: attempts } = await supabase.from("learning_practice_attempts").select("*");
  const { data: sessions } = await supabase.from("exam_sessions").select("*");

  console.log(`Processing ${users.length} registered users...`);

  let updatedCount = 0;

  for (const u of users) {
    const meta = u.user_metadata || {};
    const name = String(meta.full_name || meta.name || "").trim().toLowerCase();
    const phone = String(meta.phone || u.phone || "").trim().replace(/\s+/g, "");

    // Find matched exam results
    const userResults = (results || []).filter(r => {
      const rName = String(r.name || "").trim().toLowerCase();
      const rPhone = String(r.phone || "").trim().replace(/\s+/g, "");
      return (name && rName === name) || (phone && rPhone && rPhone === phone);
    });

    // Find matched practice attempts
    const userAttempts = (attempts || []).filter(a => a.user_id === u.id);

    // Find matched exam sessions
    const userSessions = (sessions || []).filter(s => {
      const sName = String(s.candidate_name || "").trim().toLowerCase();
      const sPhone = String(s.phone || "").trim().replace(/\s+/g, "");
      return (name && sName === name) || (phone && sPhone && sPhone === phone);
    });

    // Collect all distinct activity dates
    const activityDates = new Set<string>();
    
    // Exam results XP
    let totalXp = 0;
    let perfectScores = 0;

    userResults.forEach(r => {
      const score = Number(r.score) || 0;
      const total = Number(r.total) || 400;
      const pct = Math.min(100, Math.max(0, Math.round((score / total) * 100)));
      // Base: 50 XP + up to 75 XP based on percentage
      const examXp = Math.round(50 + (pct * 0.75));
      totalXp += examXp;
      if (pct >= 100) perfectScores++;
      if (r.created_at) {
        activityDates.add(new Date(r.created_at).toISOString().split("T")[0]);
      }
    });

    // Practice attempts XP
    userAttempts.forEach(a => {
      const score = Number(a.score) || 0;
      const total = Number(a.total) || 25;
      const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((score / total) * 100))) : 50;
      const attemptXp = Math.round(10 + (pct * 0.15)); // 10 to 25 XP
      totalXp += attemptXp;
      if (pct >= 100) perfectScores++;
      if (a.created_at) {
        activityDates.add(new Date(a.created_at).toISOString().split("T")[0]);
      }
    });

    // Add session start dates if any
    userSessions.forEach(s => {
      if (s.created_at) {
        activityDates.add(new Date(s.created_at).toISOString().split("T")[0]);
      }
    });

    // Add user sign-in date
    if (u.last_sign_in_at) {
      activityDates.add(new Date(u.last_sign_in_at).toISOString().split("T")[0]);
    }

    const sortedDates = Array.from(activityDates).sort();
    const lastActiveDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

    // Calculate streak from sorted active dates
    let currentStreak = 0;
    let longestStreak = 0;

    if (sortedDates.length > 0) {
      currentStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]).getTime();
        const curr = new Date(sortedDates[i]).getTime();
        const diffDays = Math.round((curr - prev) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          currentStreak++;
          if (currentStreak > longestStreak) longestStreak = currentStreak;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
    }

    // Default starter XP for registered candidates who haven't taken an exam yet
    const finalXp = totalXp > 0 ? totalXp : (u.email_confirmed_at ? 25 : 0);
    const { level, name: levelName } = calculateLevelFromXp(finalXp);
    const totalQuizzes = userResults.length + userAttempts.length;

    // Upsert into user_gamification_profiles
    const { error: upsertErr } = await supabase
      .from("user_gamification_profiles")
      .upsert({
        user_id: u.id,
        lifetime_xp: finalXp,
        current_level: level,
        level_name: levelName,
        current_streak_days: currentStreak,
        longest_streak_days: Math.max(longestStreak, currentStreak),
        last_activity_date: lastActiveDate,
        quizzes_completed_count: totalQuizzes,
        perfect_scores_count: perfectScores,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error(`Failed to update ${u.email}:`, upsertErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully reconciled and updated ${updatedCount} candidate gamification profiles!`);
}

backfill().catch(console.error);
