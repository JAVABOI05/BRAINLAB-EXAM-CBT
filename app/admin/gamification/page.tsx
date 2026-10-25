"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { supabase } from "../../lib/supabase";
import "../admin.css";

interface AdminBadge {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  award_type: string;
  is_active: boolean;
  display_order: number;
}

interface AdminLevel {
  level: number;
  name: string;
  min_xp: number;
  badge_reward_id?: string | null;
}

interface AdminReward {
  id: string;
  title: string;
  description: string;
  reward_type: string;
  cost_xp: number;
  min_level: number;
  quantity_available?: number | null;
  redemptions_count: number;
  is_active: boolean;
}

interface LedgerRow {
  id: string;
  user_id: string;
  amount: number;
  activity_type: string;
  idempotency_key: string;
  description?: string;
  created_at: string;
}

export default function AdminGamificationPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"badges" | "levels" | "rewards" | "ledger">("badges");

  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [levels, setLevels] = useState<AdminLevel[]>([]);
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAllData() {
    setError("");
    try {
      const [bRes, lRes, rRes, xRes] = await Promise.all([
        supabase.from("badge_definitions").select("*").order("display_order", { ascending: true }),
        supabase.from("gamification_levels").select("*").order("level", { ascending: true }),
        supabase.from("gamification_rewards").select("*").order("cost_xp", { ascending: true }),
        supabase
          .from("user_xp_ledger")
          .select("id, user_id, amount, activity_type, idempotency_key, description, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (bRes.data) setBadges(bRes.data as AdminBadge[]);
      if (lRes.data) setLevels(lRes.data as AdminLevel[]);
      if (rRes.data) setRewards(rRes.data as AdminReward[]);
      if (xRes.data) setLedger(xRes.data as LedgerRow[]);
    } catch {
      setError("Could not load gamification management data.");
    }
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const session = await getAdminSession();
      if (!session) {
        router.replace("/admin/login");
        return;
      }
      if (!active) return;
      setAdminUser(session);

      await loadAllData();
      if (active) setLoading(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  async function toggleBadgeActive(badgeId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    setBadges((prev) =>
      prev.map((b) => (b.id === badgeId ? { ...b, is_active: nextStatus } : b))
    );

    const { error: updErr } = await supabase
      .from("badge_definitions")
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", badgeId);

    if (updErr) {
      setError(`Failed to update badge: ${updErr.message}`);
      await loadAllData();
    } else {
      setMessage(`Badge "${badgeId}" set to ${nextStatus ? "Active" : "Disabled"}.`);
    }
  }

  async function toggleRewardActive(rewardId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    setRewards((prev) =>
      prev.map((r) => (r.id === rewardId ? { ...r, is_active: nextStatus } : r))
    );

    const { error: updErr } = await supabase
      .from("gamification_rewards")
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", rewardId);

    if (updErr) {
      setError(`Failed to update reward: ${updErr.message}`);
      await loadAllData();
    } else {
      setMessage(`Reward set to ${nextStatus ? "Active" : "Disabled"}.`);
    }
  }

  if (loading) {
    return (
      <main className="admin-shell px-6 py-12">
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-40 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold text-blue-700 hover:text-blue-900"
            >
              ← Back to Admin Control Center
            </Link>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              Gamification, Achievements &amp; Rewards Studio
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure student badges, XP level progressions, rewards catalog, and inspect audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Admin: {adminUser?.email}
            </span>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-900">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-slate-200">
          {[
            { id: "badges", label: `Badges Catalog (${badges.length})` },
            { id: "levels", label: `XP Levels (${levels.length})` },
            { id: "rewards", label: `Rewards Catalog (${rewards.length})` },
            { id: "ledger", label: "XP Audit Ledger" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 px-4 pb-3 text-xs font-black transition ${
                activeTab === tab.id
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: BADGES */}
        {activeTab === "badges" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Badge Definitions</h2>
                <p className="text-xs text-slate-500">
                  Toggle badge availability across the platform in real time.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                    <th className="p-3">Badge</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Rarity</th>
                    <th className="p-3">Award Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {badges.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-base">
                            {b.icon}
                          </span>
                          <div>
                            <p className="font-black text-slate-900">{b.name}</p>
                            <p className="text-[11px] text-slate-500">{b.description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="capitalize font-bold text-slate-700">{b.category}</span>
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px] text-slate-700">
                          {b.rarity}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[11px] text-slate-500">{b.award_type}</td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            b.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleBadgeActive(b.id, b.is_active)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                            b.is_active
                              ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {b.is_active ? "Pause" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: LEVELS */}
        {activeTab === "levels" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-extrabold text-slate-900">XP Level Progression Tiers</h2>
            <p className="mt-1 text-xs text-slate-500">
              Students automatically level up upon reaching these minimum XP thresholds.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {levels.map((lvl) => (
                <div key={lvl.level} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-900">
                      Tier Level {lvl.level}
                    </span>
                    <span className="font-mono text-xs font-black text-blue-900">
                      {lvl.min_xp} XP Min
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{lvl.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Unlock criteria: verified {lvl.min_xp} lifetime XP from tests and learning activity.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: REWARDS */}
        {activeTab === "rewards" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-extrabold text-slate-900">Claimable Rewards Catalog</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage redemption costs, minimum level gates, and review redemption counts.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {rewards.map((rew) => (
                <div
                  key={rew.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                        {rew.cost_xp} XP
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Req Level {rew.min_level}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-black text-slate-950">{rew.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{rew.description}</p>

                    <div className="mt-4 rounded-xl bg-slate-50 p-2.5 text-[11px] font-bold text-slate-700">
                      Redemptions:{" "}
                      <span className="font-black text-blue-900">{rew.redemptions_count}</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span
                      className={`text-[10px] font-black uppercase ${
                        rew.is_active ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {rew.is_active ? "Active" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRewardActive(rew.id, rew.is_active)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        rew.is_active
                          ? "border border-rose-300 bg-rose-50 text-rose-700"
                          : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {rew.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: XP AUDIT LEDGER */}
        {activeTab === "ledger" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-extrabold text-slate-900">XP Transaction Ledger (Immutable)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Audit log of verified XP awards with idempotency keys and activity types.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">XP</th>
                    <th className="p-3">Activity</th>
                    <th className="p-3">Idempotency Key</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-700">
                          {row.user_id.substring(0, 8)}...
                        </td>
                        <td className="p-3 font-mono font-black text-amber-700">+{row.amount}</td>
                        <td className="p-3 font-bold capitalize text-slate-800">
                          {row.activity_type}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">
                          {row.idempotency_key}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600">{row.description || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
