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
  type PlanEntitlements,
  normalizePlanEntitlements,
  DEFAULT_FREE_ENTITLEMENTS,
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
  const [activeModalTab, setActiveModalTab] = useState<"pricing" | "entitlements">("pricing");
  const [editPriceNaira, setEditPriceNaira] = useState<number>(0);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFeatures, setEditFeatures] = useState<string>("");
  const [editActive, setEditActive] = useState(true);
  const [editInterval, setEditInterval] = useState<"monthly" | "yearly">("monthly");
  const [changeReason, setChangeReason] = useState("");

  // Entitlements State
  const [editEntitlements, setEditEntitlements] = useState<PlanEntitlements>(DEFAULT_FREE_ENTITLEMENTS);

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
    setActiveModalTab("pricing");
    setEditPriceNaira(plan.price_naira);
    setEditName(plan.name);
    setEditDescription(plan.description);
    setEditFeatures(plan.features.join("\n"));
    setEditActive(plan.is_active);
    setEditInterval(plan.interval || "monthly");
    setEditEntitlements(normalizePlanEntitlements(plan.entitlements, plan.id === "free"));
    setChangeReason("");
    setError("");
    setMessage("");
  }

  function openCreateModal() {
    const newId = `plan_${Date.now().toString(36)}`;
    const newPlan: SubscriptionPlan = {
      id: newId,
      name: "Custom Study Tier",
      description: "Customized study & CBT access tier",
      price_kobo: 200000,
      price_naira: 2000,
      currency: "NGN",
      interval: "monthly",
      features: ["Full CBT Practice", "AI Tutor Study Guidance"],
      entitlements: {
        cbt_access: true,
        cbt_unlimited: true,
        cbt_daily_limit: 0,
        cbt_corrections: true,
        offline_saving: true,
        ai_tutor_enabled: true,
        ai_monthly_quota: 500,
        ai_voice_tutor: true,
        classroom_access: true,
        competitions_included: true,
        advanced_analytics: true,
        certificates_issued: false,
        calculator_type: "scientific",
        vip_support: false,
        stem_studio_access: true,
        stem_access_level: "practise",
        stem_monthly_lab_quota: 25,
      },
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
      interval: editInterval,
      features: featuresList,
      entitlements: editEntitlements,
      is_active: editActive,
    };

    const success = await saveSubscriptionPlan(
      updatedPlan,
      { id: admin.id, email: admin.email },
      changeReason.trim() ||
        `Admin updated tier ${updatedPlan.name} (₦${updatedPlan.price_naira.toLocaleString()} / entitlements)`
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
    const success = await deleteSubscriptionPlan(
      planId,
      { id: admin.id, email: admin.email },
      "Admin deleted subscription tier"
    );
    if (success) {
      setMessage(`Plan "${planId}" deleted.`);
      await loadPlansData();
    } else {
      setError(`Failed to delete plan "${planId}".`);
    }
    setWorking(false);
  }

  function updateEntitlement<K extends keyof PlanEntitlements>(key: K, value: PlanEntitlements[K]) {
    setEditEntitlements((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  if (loading) {
    return (
      <main className="admin-page admin-pricing-page">
        <div className="admin-container">
          <section className="admin-card text-center py-12 text-slate-500 font-semibold">
            Loading subscription plans &amp; feature matrices…
          </section>
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
              <div className="admin-badge">Platform Control Engine · Tiers &amp; Entitlements</div>
              <h1 className="admin-title">Subscription Plans &amp; Feature Access Control</h1>
              <p className="admin-subtitle">
                Configure live pricing and independently govern which features each subscription tier can access (CBT limits, AI Tutor quotas, live classrooms, competitions, and solutions).
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
        {error && (
          <div className="admin-message" role="alert" style={{ background: "#fee2e2", color: "#991b1b" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Active Plans Cards */}
        <section className="admin-section admin-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Active Subscription Tiers</h2>
              <p className="text-xs text-slate-500">Live prices and feature access rules are enforced server-side.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 border border-blue-200">
              {plans.length} Configured Tiers
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
              return (
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

                    {/* Quick Entitlement Pills */}
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${ent.cbt_unlimited ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                        ⚡ {ent.cbt_unlimited ? "Unlimited CBT" : `${ent.cbt_daily_limit}/day CBT`}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${ent.cbt_corrections ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                        🔍 {ent.cbt_corrections ? "Corrections ON" : "No Solutions"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${ent.ai_tutor_enabled ? "bg-indigo-50 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                        🤖 {ent.ai_monthly_quota >= 999999 ? "Unlimited AI" : `${ent.ai_monthly_quota.toLocaleString()} AI/mo`}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${ent.classroom_access ? "bg-purple-50 text-purple-800" : "bg-slate-100 text-slate-500"}`}>
                        🏫 {ent.classroom_access ? "Classrooms ON" : "No Live Class"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${ent.competitions_included ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
                        🏆 {ent.competitions_included ? "Arena ON" : "No Arena"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800">
                        🔬 STEM: {ent.stem_studio_access === false ? "Off" : (ent.stem_access_level || "Discover")}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-slate-600">
                      <span className="block font-bold text-slate-800">Public Features:</span>
                      {p.features.slice(0, 4).map((feat, i) => (
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
                      className="flex-1 rounded-xl bg-[#061a3a] py-2 text-xs font-extrabold text-white hover:bg-[#123566] transition shadow-sm"
                    >
                      Configure Tier & Access
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
              );
            })}
          </div>
        </section>

        {/* Global Feature Entitlements Comparison Matrix */}
        <section className="admin-section admin-card mt-8">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-black text-slate-950">Tier Access Matrix (Bird&apos;s-Eye Comparison)</h2>
            <p className="text-xs text-slate-500">
              Comprehensive overview of student access permissions across all configured subscription levels.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-extrabold uppercase">
                  <th className="py-3 px-4">Feature / Entitlement</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-3 px-4 text-center">
                      <span className="block text-slate-950 font-black">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {p.price_naira === 0 ? "₦0" : `₦${p.price_naira.toLocaleString()}`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">CBT Mock Exam Quota</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-bold">
                        {ent.cbt_unlimited ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Unlimited</span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">{ent.cbt_daily_limit} per day</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Post-Exam Corrections & Explanations</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.cbt_corrections ? (
                          <span className="text-emerald-600">✓ Full Access</span>
                        ) : (
                          <span className="text-slate-400">✗ Locked</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">AI Tutor Monthly Allowance</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-bold">
                        {!ent.ai_tutor_enabled ? (
                          <span className="text-slate-400">Disabled</span>
                        ) : ent.ai_monthly_quota >= 999999 ? (
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Unlimited</span>
                        ) : (
                          <span>{ent.ai_monthly_quota.toLocaleString()} hints/mo</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">AI Voice Pronunciations & Audio Summaries</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.ai_voice_tutor ? <span className="text-emerald-600">✓ Enabled</span> : <span className="text-slate-400">✗ Disabled</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Live Academic Masterclass & Classrooms</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.classroom_access ? <span className="text-emerald-600">✓ Join Live</span> : <span className="text-slate-400">✗ Locked</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Competition Arena & 1v1 Battle Matches</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.competitions_included ? <span className="text-emerald-600">✓ Entry Pass</span> : <span className="text-slate-400">✗ Locked</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">STEM Studio Learning &amp; Virtual Labs</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    const level = ent.stem_studio_access === false ? "none" : (ent.stem_access_level || "discover");
                    const label = ({ none: "No access", discover: "Discover", explore: "Explore", practise: "Practise", advanced: "Advanced", complete: "Complete" } as Record<string, string>)[level] || "Discover";
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-bold">
                        <span className={level === "none" ? "text-slate-400" : "text-cyan-700"}>{label}</span>
                        {level !== "none" && <span className="block text-[10px] text-slate-500">{ent.stem_monthly_lab_quota && ent.stem_monthly_lab_quota >= 999999 ? "Unlimited labs" : `${ent.stem_monthly_lab_quota ?? 0} saved labs/mo`}</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Psychometrics & Topic Diagnostics</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.advanced_analytics ? <span className="text-emerald-600">✓ In-Depth</span> : <span className="text-slate-400">Standard</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Verified Digital Certificates</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.certificates_issued ? <span className="text-emerald-600">✓ Issued</span> : <span className="text-slate-400">✗ None</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">Exam Calculator Type</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-bold capitalize">
                        {ent.calculator_type}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">VIP 24/7 Priority Support</td>
                  {plans.map((p) => {
                    const ent = normalizePlanEntitlements(p.entitlements, p.id === "free");
                    return (
                      <td key={p.id} className="py-3 px-4 text-center font-extrabold">
                        {ent.vip_support ? <span className="text-purple-600">✓ Dedicated Priority</span> : <span className="text-slate-400">Standard</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Edit Plan Modal with Tabbed Entitlements & Pricing */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-900 uppercase">
                      Tier ID: {editingPlan.id}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">· Admin Control</span>
                  </div>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Configure {editName || editingPlan.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl border p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="mt-4 flex gap-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("pricing")}
                  className={`pb-3 px-4 text-xs font-black transition border-b-2 ${
                    activeModalTab === "pricing"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Plan Details & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("entitlements")}
                  className={`pb-3 px-4 text-xs font-black transition border-b-2 ${
                    activeModalTab === "entitlements"
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Feature Entitlements & Access Controls
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="mt-5 space-y-4 text-sm">
                {activeModalTab === "pricing" ? (
                  <>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="block font-bold text-slate-800 mb-1">Billing Interval</label>
                        <select
                          value={editInterval}
                          onChange={(e) => setEditInterval(e.target.value as "monthly" | "yearly")}
                          className="w-full rounded-xl border border-slate-300 p-3 bg-white text-slate-900 font-semibold"
                        >
                          <option value="monthly">Monthly Subscription</option>
                          <option value="yearly">Yearly Pass</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">Plan Status</label>
                        <select
                          value={editActive ? "active" : "inactive"}
                          onChange={(e) => setEditActive(e.target.value === "active")}
                          className="w-full rounded-xl border border-slate-300 p-3 bg-white text-slate-900"
                        >
                          <option value="active">Active &amp; Published to Public</option>
                          <option value="inactive">Archived / Hidden</option>
                        </select>
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
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Features Bullet Points (Shown on Public Pricing Page)
                      </label>
                      <textarea
                        rows={4}
                        value={editFeatures}
                        onChange={(e) => setEditFeatures(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900"
                        placeholder="One feature per line"
                      />
                    </div>
                  </>
                ) : (
                  /* Entitlements Tab */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                      💡 These server-enforced entitlements dictate what students on this tier can perform in the CBT exam portal, live classrooms, AI study buddy, and competition arena.
                    </p>

                    {/* CBT Mock Exams */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-900 block">CBT Mock Exam Quota</span>
                          <span className="text-xs text-slate-500">Allow taking simulated CBT examinations.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editEntitlements.cbt_unlimited}
                            onChange={(e) => updateEntitlement("cbt_unlimited", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {!editEntitlements.cbt_unlimited && (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
                          <label className="text-xs font-bold text-slate-700">Daily Mock Attempt Limit:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={editEntitlements.cbt_daily_limit || 1}
                            onChange={(e) => updateEntitlement("cbt_daily_limit", Math.max(1, Number(e.target.value) || 1))}
                            className="w-24 rounded-lg border border-slate-300 p-2 text-center font-bold text-slate-900"
                          />
                        </div>
                      )}
                    </div>

                    {/* Post-Exam Corrections & Solutions */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Post-Exam Corrections & Explanations</span>
                        <span className="text-xs text-slate-500">Allow candidate to review step-by-step solution keys after submitting.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.cbt_corrections}
                          onChange={(e) => updateEntitlement("cbt_corrections", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* AI Tutor & Monthly Quota */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-slate-900 block">AI Tutor & Question Hints</span>
                          <span className="text-xs text-slate-500">Allow AI assistant explanation and practice queries.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editEntitlements.ai_tutor_enabled}
                            onChange={(e) => updateEntitlement("ai_tutor_enabled", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {editEntitlements.ai_tutor_enabled && (
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                          <div className="text-xs">
                            <span className="font-bold text-slate-700 block">Monthly Question Quota:</span>
                            <span className="text-slate-500">(Enter 999999 for unlimited)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={editEntitlements.ai_monthly_quota}
                              onChange={(e) => updateEntitlement("ai_monthly_quota", Number(e.target.value) || 0)}
                              className="w-32 rounded-lg border border-slate-300 p-2 text-center font-bold text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => updateEntitlement("ai_monthly_quota", 999999)}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1.5 text-xs font-black text-indigo-800 hover:bg-indigo-100"
                            >
                              Set Unlimited
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Voice Pronunciations */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">AI Audio Voice Notes & Read-Aloud</span>
                        <span className="text-xs text-slate-500">Enable synthesized speech explanations for verbal learners.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.ai_voice_tutor}
                          onChange={(e) => updateEntitlement("ai_voice_tutor", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Live Academic Masterclass */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Live Academic Classrooms & Masterclasses</span>
                        <span className="text-xs text-slate-500">Allow joining live video and whiteboard tutor streams.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.classroom_access}
                          onChange={(e) => updateEntitlement("classroom_access", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {/* Competition Arena */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Competition Arena & 1v1 Battle Matches</span>
                        <span className="text-xs text-slate-500">Allow entering live timed battles and official school contests.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.competitions_included}
                          onChange={(e) => updateEntitlement("competitions_included", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* STEM Studio Plan Access */}
                    <div className="rounded-2xl border border-cyan-200 p-4 bg-cyan-50/60 space-y-3">
                      <div>
                        <span className="font-extrabold text-slate-900 block">🔬 STEM Studio Access Level</span>
                        <span className="text-xs text-slate-600">Set the depth of interactive science, 3D models, pathways and virtual laboratory access included in this plan.</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Access level</label>
                          <select
                            value={editEntitlements.stem_studio_access === false ? "none" : (editEntitlements.stem_access_level || "discover")}
                            onChange={(e) => {
                              const level = e.target.value as NonNullable<PlanEntitlements["stem_access_level"]>;
                              updateEntitlement("stem_access_level", level);
                              updateEntitlement("stem_studio_access", level !== "none");
                            }}
                            className="w-full rounded-xl border border-cyan-300 bg-white p-2.5 text-sm font-bold text-slate-900"
                          >
                            <option value="none">No STEM Studio access</option>
                            <option value="discover">Discover — previews and introductory 2D content</option>
                            <option value="explore">Explore — interactive models and basic pathways</option>
                            <option value="practise">Practise — guided pathways, labs and assessments</option>
                            <option value="advanced">Advanced — advanced 3D, simulations and reports</option>
                            <option value="complete">Complete — all learner-facing STEM experiences</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Monthly saved lab attempts</label>
                          <input
                            type="number"
                            min={0}
                            max={999999}
                            value={editEntitlements.stem_monthly_lab_quota ?? 3}
                            disabled={!editEntitlements.stem_studio_access}
                            onChange={(e) => updateEntitlement("stem_monthly_lab_quota", Math.max(0, Number(e.target.value) || 0))}
                            className="w-full rounded-xl border border-cyan-300 bg-white p-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                          />
                          <span className="text-[10px] text-slate-500">Use 999999 for unlimited. Zero allows viewing but no saved submissions.</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-cyan-200 bg-white p-3 text-xs text-slate-600">
                        The access level is a baseline. STEM resources can require a higher level, and the server will enforce the learner&apos;s active plan.
                      </div>
                    </div>

                    {/* Advanced Analytics */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">In-Depth Analytics & Psychometrics</span>
                        <span className="text-xs text-slate-500">Provide topic-by-topic weakness diagnostics &amp; item difficulty index.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.advanced_analytics}
                          onChange={(e) => updateEntitlement("advanced_analytics", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Verified Digital Certificates */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Verified Achievement Certificates</span>
                        <span className="text-xs text-slate-500">Issue verifiable completion &amp; merit certificates.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.certificates_issued}
                          onChange={(e) => updateEntitlement("certificates_issued", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* Exam Calculator Tier */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Exam Calculator Tier</span>
                        <span className="text-xs text-slate-500">Select calculator functionality enabled during CBT exams.</span>
                      </div>
                      <select
                        value={editEntitlements.calculator_type}
                        onChange={(e) => updateEntitlement("calculator_type", e.target.value as "none" | "standard" | "scientific")}
                        className="rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800 bg-white"
                      >
                        <option value="none">No Calculator (Disabled)</option>
                        <option value="standard">Standard 4-Function</option>
                        <option value="scientific">Scientific (Advanced Functions)</option>
                      </select>
                    </div>

                    {/* VIP Priority Support */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">VIP 24/7 Priority Support</span>
                        <span className="text-xs text-slate-500">Expedited tutor support and direct dispute escalation queue.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editEntitlements.vip_support}
                          onChange={(e) => updateEntitlement("vip_support", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Audit Reason Input */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <label className="block font-bold text-amber-950 mb-1 text-xs">
                    Administrative Change Reason (Required for Audit Trail)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Updated AI quota and enabled Masterclass access for Plus tier"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 p-2.5 text-xs text-slate-900 bg-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={working}
                    className="rounded-xl bg-[#061a3a] px-6 py-2.5 font-extrabold text-white hover:bg-[#123566] disabled:opacity-50 transition shadow-sm"
                  >
                    {working ? "Saving Plan & Entitlements…" : "Save & Audit Tier Configuration"}
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
