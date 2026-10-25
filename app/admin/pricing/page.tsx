"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import {
  getSubscriptionPlans,
  saveSubscriptionPlan,
  deleteSubscriptionPlan,
  type SubscriptionPlan,
} from "../../lib/platformConfig";
import "../admin.css";

export default function AdminPricingPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Plan Edit Modal State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPriceNaira, setEditPriceNaira] = useState<number>(0);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFeatures, setEditFeatures] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  const [changeReason, setChangeReason] = useState("");

  async function loadPlansData() {
    try {
      const data = await getSubscriptionPlans();
      setPlans(data);
    } catch {
      setError("Could not load plans from central configuration.");
    }
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/account");
        return;
      }
      setAdmin(session);
      await loadPlansData();
      if (active) setLoading(false);
    }
    void init();
    return () => {
      active = false;
    };
  }, [router]);

  function openEditModal(plan: SubscriptionPlan) {
    setEditingPlan(plan);
    setEditPriceNaira(plan.price_naira);
    setEditName(plan.name);
    setEditDescription(plan.description);
    setEditFeatures(plan.features.join("\n"));
    setEditActive(plan.is_active);
    setChangeReason("");
    setError("");
    setMessage("");
  }

  function openCreateModal() {
    const newId = `plan_${Date.now().toString(36)}`;
    const newPlan: SubscriptionPlan = {
      id: newId,
      name: "New Tier",
      description: "Custom study tier",
      price_kobo: 200000,
      price_naira: 2000,
      currency: "NGN",
      interval: "monthly",
      features: ["CBT practice", "AI Tutor assistance"],
      entitlements: { cbt_unlimited: true, ai_monthly_quota: 250 },
      is_active: true,
      display_order: plans.length + 1,
    };
    openEditModal(newPlan);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlan || !admin) return;

    if (editPriceNaira < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    const featuresList = editFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const updatedPlan: SubscriptionPlan = {
      ...editingPlan,
      name: editName.trim(),
      description: editDescription.trim(),
      price_naira: editPriceNaira,
      price_kobo: Math.round(editPriceNaira * 100),
      features: featuresList,
      is_active: editActive,
    };

    const success = await saveSubscriptionPlan(
      updatedPlan,
      { id: admin.id, email: admin.email },
      changeReason.trim() || `Admin updated plan ${updatedPlan.name} price to ₦${updatedPlan.price_naira.toLocaleString()}`
    );

    if (success) {
      setMessage(`Plan "${updatedPlan.name}" successfully updated and audited!`);
      setEditingPlan(null);
      await loadPlansData();
    } else {
      setError("Failed to save plan to database. Please check permissions.");
    }
    setWorking(false);
  }

  async function handleDeletePlan(planId: string) {
    if (!admin || !window.confirm(`Are you sure you want to delete plan "${planId}"? This action is audited.`)) return;
    setWorking(true);
    const success = await deleteSubscriptionPlan(planId, { id: admin.id, email: admin.email }, "Admin deleted subscription tier");
    if (success) {
      setMessage(`Plan "${planId}" deleted.`);
      await loadPlansData();
    } else {
      setError("Could not delete plan.");
    }
    setWorking(false);
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading subscription plans…</section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Navigation Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Platform Control Engine · Pricing &amp; Billing</div>
              <h1 className="admin-title">Subscription Plans &amp; Dynamic Pricing</h1>
              <p className="admin-subtitle">
                Configure live plan pricing, billing intervals, quotas, and entitlements without editing code or redeploying.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <Link href="/admin/dashboard" className="admin-btn-light">
                ← Dashboard
              </Link>
              <Link href="/pricing" target="_blank" className="admin-btn-light">
                View Public Pricing ↗
              </Link>
              <button type="button" onClick={openCreateModal} className="admin-btn-primary">
                + Create New Plan
              </button>
            </div>
          </div>
        </section>

        {message && <div className="admin-message" role="status">✓ {message}</div>}
        {error && <div className="admin-message" role="alert" style={{ background: "#fee2e2", color: "#991b1b" }}>⚠️ {error}</div>}

        {/* Plans Grid */}
        <section className="admin-section admin-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Active Subscription Products</h2>
              <p className="text-xs text-slate-500">Live prices are enforced server-side during student checkout.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 border border-blue-200">
              {plans.length} Configured Tiers
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition shadow-sm ${
                  p.is_active ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50 opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
                      ID: {p.id}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        p.is_active ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {p.is_active ? "Active" : "Archived"}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xl font-black text-slate-950">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 min-h-[32px]">{p.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-3xl font-black text-slate-900">
                      {p.price_naira === 0 ? "Free" : `₦${p.price_naira.toLocaleString()}`}
                    </span>
                    {p.price_naira > 0 && <span className="text-xs text-slate-500 font-bold"> / month</span>}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <span className="block font-bold text-slate-800">Included Features:</span>
                    {p.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-black">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="flex-1 rounded-xl bg-[#061a3a] py-2 text-xs font-extrabold text-white hover:bg-[#123566] transition"
                  >
                    Edit Pricing &amp; Entitlements
                  </button>
                  {p.id !== "free" && (
                    <button
                      type="button"
                      onClick={() => void handleDeletePlan(p.id)}
                      className="px-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition"
                      title="Delete tier"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Edit Plan Modal */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Configure Plan: {editingPlan.id}
                  </h3>
                  <p className="text-xs text-slate-500">All adjustments are recorded in the central audit log.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl border p-2 text-slate-500 hover:bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="mt-5 space-y-4 text-sm">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 p-3 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Price in Naira (₦)</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={editPriceNaira}
                      onChange={(e) => setEditPriceNaira(Number(e.target.value) || 0)}
                      required
                      className="w-full rounded-xl border border-slate-300 p-3 font-mono font-bold text-slate-900"
                    />
                    <span className="text-[11px] text-slate-500">
                      = {(editPriceNaira * 100).toLocaleString()} kobo
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Plan Status</label>
                    <select
                      value={editActive ? "active" : "inactive"}
                      onChange={(e) => setEditActive(e.target.value === "active")}
                      className="w-full rounded-xl border border-slate-300 p-3 bg-white"
                    >
                      <option value="active">Active &amp; Published</option>
                      <option value="inactive">Archived / Hidden</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Features Bullet Points (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={editFeatures}
                    onChange={(e) => setEditFeatures(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900"
                  />
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block font-bold text-amber-950 mb-1 text-xs">
                    Administrative Change Reason (Required for Audit Trail)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Approved promotional discount for Q4 2026 JAMB mock season"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 p-2.5 text-xs text-slate-900 bg-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={working}
                    className="rounded-xl bg-[#061a3a] px-6 py-2.5 font-extrabold text-white hover:bg-[#123566] disabled:opacity-50"
                  >
                    {working ? "Saving…" : "Save & Audit Price Change"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
