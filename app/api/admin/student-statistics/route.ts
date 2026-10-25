import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLearningServiceContext, noStoreJson } from "../../../lib/learningServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthUser = { id: string; created_at: string | undefined };
type Day = { date: string; registrations: number; active: number };

export async function GET(request: NextRequest) {
  const auth = await getLearningServiceContext(request);
  if (!auth.ok) return noStoreJson({ error: auth.message }, auth.status);

  // Resolve the role from the database for this verified user. Never trust a role
  // supplied by the browser or a cached local-storage value.
  // RPCs use auth.uid(), so use a user-scoped client carrying the verified bearer.
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return noStoreJson({ error: "Student statistics are not configured." }, 503);
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const roleResult = await userClient.rpc("get_admin_role");
  if (roleResult.error || !["super_admin", "platform_admin"].includes(String(roleResult.data))) {
    return noStoreJson({ error: "Only Super Admins and Platform Administrators can view global student statistics." }, 403);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return noStoreJson({ error: "Student statistics are unavailable because secure server-side access is not configured." }, 503);
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const adminIds = new Set<string>();
    const { data: admins, error: adminsError } = await service.from("admin_profiles").select("user_id");
    if (adminsError || !admins) return noStoreJson({ error: "Could not distinguish student accounts from administrator accounts." }, 503);
    admins.forEach((row: { user_id: string }) => adminIds.add(row.user_id));
    const { data: legacyAdmins, error: legacyAdminsError } = await service.from("admin_users").select("id");
    if (legacyAdminsError || !legacyAdmins) return noStoreJson({ error: "Could not verify all administrator accounts." }, 503);
    legacyAdmins.forEach((row: { id: string }) => adminIds.add(row.id));

    const users: AuthUser[] = [];
    for (let page = 1; page <= 1000; page += 1) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return noStoreJson({ error: "Could not read registered account totals." }, 503);
      users.push(...data.users.map((user) => ({ id: user.id, created_at: user.created_at })));
      if (data.users.length < 1000) break;
      if (page === 1000) return noStoreJson({ error: "Account total exceeds the safe aggregation limit." }, 503);
    }

    const studentUsers = users.filter((user) => !adminIds.has(user.id));
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 29);
    start.setUTCHours(0, 0, 0, 0);
    const startIso = start.toISOString();
    const registrationsByDay = new Map<string, number>();
    const activeByDay = new Map<string, Set<string>>();
    const days: Day[] = [];
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      days.push({ date: key, registrations: 0, active: 0 });
    }
    const dayKeys = new Set(days.map((day) => day.date));
    let newRegistrations = 0;
    for (const user of studentUsers) {
      if (!user.created_at) continue;
      const created = new Date(user.created_at);
      if (created >= start) {
        newRegistrations += 1;
        const key = created.toISOString().slice(0, 10);
        registrationsByDay.set(key, (registrationsByDay.get(key) ?? 0) + 1);
      }
    }

    // Activity is based on real authenticated Learning Hub events. If the tables
    // are not available in this environment, fail closed instead of reporting zero.
    const [attempts, progress] = await Promise.all([
      service.from("learning_test_attempts").select("student_id,started_at").gte("started_at", startIso),
      service.from("learning_lesson_progress").select("student_id,updated_at").gte("updated_at", startIso),
    ]);
    if (attempts.error || progress.error || !attempts.data || !progress.data) {
      return noStoreJson({ error: "Learning activity data is not available yet; student activity is not being reported as zero." }, 503);
    }
    const addActivity = (userId: string, timestamp: string) => {
      if (adminIds.has(userId)) return;
      const key = new Date(timestamp).toISOString().slice(0, 10);
      if (!dayKeys.has(key)) return;
      if (!activeByDay.has(key)) activeByDay.set(key, new Set<string>());
      activeByDay.get(key)!.add(userId);
    };
    attempts.data.forEach((row: { student_id: string; started_at: string }) => addActivity(row.student_id, row.started_at));
    progress.data.forEach((row: { student_id: string; updated_at: string }) => addActivity(row.student_id, row.updated_at));
    const activeIds = new Set<string>();
    activeByDay.forEach((ids) => ids.forEach((id) => activeIds.add(id)));
    const chart = days.map((day) => ({
      ...day,
      registrations: registrationsByDay.get(day.date) ?? 0,
      active: activeByDay.get(day.date)?.size ?? 0,
    }));
    return noStoreJson({
      registeredStudents: studentUsers.length,
      activeStudents30d: activeIds.size,
      newRegistrations30d: newRegistrations,
      chart,
      activityDefinition: "Distinct non-admin accounts with Learning Hub assessment attempts or lesson-progress updates, grouped by UTC calendar day.",
    });
  } catch {
    return noStoreJson({ error: "Student statistics could not be calculated safely." }, 503);
  }
}
