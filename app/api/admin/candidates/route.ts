import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/app/lib/adminAuth";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;
type SubscriptionRow = { user_id: string | null; plan_id: string | null; status: string | null; current_period_end: string | null; current_period_start: string | null; payment_provider: string | null; price_paid_kobo: number | null };
type GamificationRow = {
  user_id: string | null;
  lifetime_xp?: number | null;
  xp?: number | null;
  current_streak_days?: number | null;
  streak_days?: number | null;
  current_level?: number | null;
  last_activity_date?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = searchParams.get("status") || "all";
    const tierFilter = searchParams.get("tier") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));

    const supabase = getSupabaseServerClient();

    // Fetch list of users from Auth Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json(
        { ok: false, error: authError.message || "Could not retrieve user directory" },
        { status: 500 }
      );
    }

    const users = authData.users || [];

    // Fetch all active admin user IDs to distinguish staff from candidates
    const { data: adminRows } = await supabase.from("admin_users").select("id, role");
    const adminMap = new Map<string, string>();
    (adminRows || []).forEach((row: { id: string; role: string }) => {
      adminMap.set(row.id, row.role);
    });

    // Fetch active user subscriptions
    const { data: subRows } = await supabase
      .from("user_subscriptions")
      .select("user_id, plan_id, status, current_period_end, current_period_start, payment_provider, price_paid_kobo");
    const subMap = new Map<string, SubscriptionRow>();
    (subRows || []).forEach((s) => {
      if (s.user_id) subMap.set(s.user_id, s);
    });

    // Fetch gamification profiles (authoritative lifetime XP, streaks, and activity dates)
    const { data: gamificationRows } = await supabase
      .from("user_gamification_profiles")
      .select("user_id, lifetime_xp, current_streak_days, current_level, last_activity_date");
    const gamificationMap = new Map<string, GamificationRow>();
    (gamificationRows || []).forEach((g) => {
      if (g.user_id) gamificationMap.set(g.user_id, g);
    });

    // Fetch historical exam results to compute all-time highest score / personal best
    const { data: resultsRows } = await supabase
      .from("results")
      .select("name, phone, score, total, created_at");

    type HighestScoreInfo = { score: number; total: number; percentage: number };
    const highestScoreByName = new Map<string, HighestScoreInfo>();
    const highestScoreByPhone = new Map<string, HighestScoreInfo>();

    (resultsRows || []).forEach((r) => {
      const score = Number(r.score) || 0;
      const total = Number(r.total) || 400;
      const percentage = Math.min(100, Math.max(0, Math.round((score / total) * 100)));
      const info: HighestScoreInfo = { score, total, percentage };

      const nameKey = String(r.name || "").trim().toLowerCase();
      if (nameKey) {
        const existing = highestScoreByName.get(nameKey);
        if (!existing || score > existing.score) {
          highestScoreByName.set(nameKey, info);
        }
      }

      const rawPhone = String(r.phone || "").replace(/\D/g, "");
      const phoneKey = rawPhone.length >= 10 ? rawPhone.slice(-10) : "";
      if (phoneKey) {
        const existing = highestScoreByPhone.get(phoneKey);
        if (!existing || score > existing.score) {
          highestScoreByPhone.set(phoneKey, info);
        }
      }
    });

    // Filter and map candidate records
    const nonStaffUsers = users.filter((u) => !adminMap.has(u.id));

    // Global summary statistics across entire candidate directory
    let atRiskCount = 0;
    let unconfirmedCount = 0;
    let activeSubscribersCount = 0;
    let suspendedCount = 0;

    nonStaffUsers.forEach((u) => {
      const meta = (u.user_metadata || {}) as JsonRecord;
      const isSuspended =
        meta.is_suspended === true ||
        (u.banned_until && new Date(u.banned_until) > new Date());
      const g = gamificationMap.get(u.id);
      
      const lastSignInMs = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      const lastActivityMs = g?.last_activity_date ? new Date(g.last_activity_date).getTime() : 0;
      const latestActivityMs = Math.max(lastSignInMs, lastActivityMs);

      const isAtRisk =
        !isSuspended &&
        (latestActivityMs === 0 || latestActivityMs < Date.now() - 14 * 86400 * 1000);

      if (isSuspended) suspendedCount++;
      if (!u.email_confirmed_at) unconfirmedCount++;
      if (isAtRisk) atRiskCount++;

      const sub = subMap.get(u.id);
      if (sub && sub.status === "active" && sub.plan_id !== "free") {
        activeSubscribersCount++;
      }
    });

    const candidates = nonStaffUsers
      .filter((u) => {
        const meta = (u.user_metadata || {}) as JsonRecord;
        const fullName = String(meta.full_name || meta.name || "").toLowerCase();
        const email = String(u.email || "").toLowerCase();
        const phone = String(meta.phone || u.phone || "").toLowerCase();
        const targetExam = String(meta.target_exam || meta.exam_type || "UTME").toLowerCase();

        // Search matching
        if (search) {
          const matches =
            email.includes(search) ||
            fullName.includes(search) ||
            phone.includes(search) ||
            targetExam.includes(search);
          if (!matches) return false;
        }

        const isSuspended =
          meta.is_suspended === true ||
          (u.banned_until && new Date(u.banned_until) > new Date());

        const g = gamificationMap.get(u.id);
        const lastSignInMs = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        const lastActivityMs = g?.last_activity_date ? new Date(g.last_activity_date).getTime() : 0;
        const latestActivityMs = Math.max(lastSignInMs, lastActivityMs);

        const isAtRisk =
          !isSuspended &&
          (latestActivityMs === 0 || latestActivityMs < Date.now() - 14 * 86400 * 1000);

        // Status matching
        if (statusFilter === "active" && isSuspended) return false;
        if (statusFilter === "suspended" && !isSuspended) return false;
        if (statusFilter === "unverified" && u.email_confirmed_at) return false;
        if (statusFilter === "at-risk" && !isAtRisk) return false;

        // Tier matching
        const sub = subMap.get(u.id);
        const userTier = sub?.status === "active" ? (sub.plan_id || "free").toLowerCase() : "free";
        if (tierFilter !== "all" && userTier !== tierFilter.toLowerCase()) return false;

        return true;
      })
      .map((u) => {
        const meta = (u.user_metadata || {}) as JsonRecord;
        const sub = subMap.get(u.id);
        const gamification = gamificationMap.get(u.id);
        const isSuspended =
          meta.is_suspended === true ||
          (u.banned_until && new Date(u.banned_until) > new Date());

        const lastSignInMs = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
        const lastActivityMs = gamification?.last_activity_date ? new Date(gamification.last_activity_date).getTime() : 0;
        const latestActivityMs = Math.max(lastSignInMs, lastActivityMs);
        const lastSeenAt = latestActivityMs > 0 ? new Date(latestActivityMs).toISOString() : null;

        const effectiveXp = gamification?.lifetime_xp ?? gamification?.xp ?? 0;
        const effectiveStreak = gamification?.current_streak_days ?? gamification?.streak_days ?? 0;

        const candidateFullName = (meta.full_name as string) || (meta.name as string) || "Candidate";
        const candidatePhone = (meta.phone as string) || u.phone || "N/A";

        const nameKey = candidateFullName.trim().toLowerCase();
        const rawPhone = candidatePhone.replace(/\D/g, "");
        const phoneKey = rawPhone.length >= 10 ? rawPhone.slice(-10) : "";
        const highestScore =
          (phoneKey && highestScoreByPhone.get(phoneKey)) ||
          (nameKey && highestScoreByName.get(nameKey)) ||
          null;

        return {
          id: u.id,
          email: u.email,
          fullName: candidateFullName,
          phone: candidatePhone,
          targetExam: (meta.target_exam as string) || (meta.exam_type as string) || "JAMB UTME",
          targetScore: Number(meta.target_score) || 280,
          targetCourse: (meta.target_course as string) || (meta.course as string) || null,
          dreamSchool: (meta.dream_school as string) || (meta.institution as string) || (meta.university as string) || null,
          selectedSubjects: meta.selected_subjects || null,
          stateOfOrigin: (meta.state as string) || (meta.state_of_origin as string) || "N/A",
          highestScore,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
          lastActivityDate: gamification?.last_activity_date || null,
          lastSeenAt,
          emailConfirmed: Boolean(u.email_confirmed_at),
          isSuspended: Boolean(isSuspended),
          isAtRisk: Boolean(
            !isSuspended &&
            (latestActivityMs === 0 || latestActivityMs < Date.now() - 14 * 86400 * 1000)
          ),
          bannedUntil: u.banned_until || null,
          subscription: {
            planId: sub?.status === "active" ? sub.plan_id : "free",
            status: sub?.status || "inactive",
            expiresAt: sub?.current_period_end || null,
            provider: sub?.payment_provider || "N/A",
          },
          gamification: {
            xp: effectiveXp,
            streakDays: effectiveStreak,
            level: gamification?.current_level || 1,
          },
        };
      });

    // Sort by latest created first
    candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paging
    const total = candidates.length;
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = candidates.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      ok: true,
      candidates: paginatedCandidates,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      stats: {
        totalCandidates: nonStaffUsers.length,
        activeSubscribers: activeSubscribersCount,
        suspendedAccounts: suspendedCount,
        freeTierCandidates: nonStaffUsers.length - activeSubscribersCount,
        atRiskCount,
        unconfirmedCount,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load candidates" },
      { status: 500 }
    );
  }
}
