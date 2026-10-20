"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import "../admin.css";

interface CouponRow {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_spend_kobo: number;
  max_redemptions: number;
  current_redemptions: number;
  is_active: boolean;
  starts_at: string;
  expires_at?: string;
  created_at: string;
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  // New coupon form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minSpendNaira, setMinSpendNaira] = useState<number>(1000);
  const [maxRedemptions, setMaxRedemptions] = useState<number>(100);
  const [expiryDays, setExpiryDays] = useState<number>(30);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupon_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCoupons(data as CouponRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      await loadCoupons();
    }
    checkAuth();
  }, [router, loadCoupons]);

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");

    try {
      const cleanCode = code.trim().toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expiryDays));

      const payload = {
        code: cleanCode,
        name: name.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_spend_kobo: Math.round(Number(minSpendNaira) * 100),
        max_redemptions: Number(maxRedemptions),
        current_redemptions: 0,
        is_active: true,
        expires_at: expiresAt.toISOString(),
      };

      const { data, error } = await supabase
        .from("coupon_campaigns")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("configuration_audit_logs").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        entity_type: "coupon",
        entity_id: data.id,
        action: "created",
        new_value: payload,
        change_reason: `Admin created coupon campaign ${cleanCode}`,
      });

      setFeedback(`Campaign ${cleanCode} created successfully!`);
      setShowCreateModal(false);
      setCode("");
      setName("");
      setDescription("");
      loadCoupons();
    } catch (err) {
      setFeedback("Failed to create campaign: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCouponStatus(coupon: CouponRow) {
    try {
      const nextActive = !coupon.is_active;
      const { error } = await supabase
        .from("coupon_campaigns")
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", coupon.id);

      if (error) throw error;

      await supabase.from("configuration_audit_logs").insert({
        admin_id: adminUser?.id,
        admin_email: adminUser?.email,
        entity_type: "coupon",
        entity_id: coupon.id,
        action: "updated",
        previous_value: { is_active: coupon.is_active },
        new_value: { is_active: nextActive },
        change_reason: `Admin toggled coupon ${coupon.code} active state to ${nextActive}`,
      });

      loadCoupons();
    } catch (err) {
      setFeedback("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Commercial · Campaigns &amp; Promo Codes</div>
              <h1 className="admin-title">Coupons &amp; Campaigns</h1>
              <p className="admin-subtitle">
                Create and govern discount codes, track concurrent redemption caps, and view real-time promotion utilization.
              </p>
            </div>
            <div className="admin-actions">
              <button
                onClick={() => setShowCreateModal(true)}
                className="admin-btn-primary"
              >
                + Create Campaign
              </button>
              <button onClick={() => router.push("/admin/pricing")} className="admin-btn-light">
                Plans &amp; Pricing
              </button>
              <button onClick={() => router.push("/admin/dashboard")} className="admin-btn-light">
                Dashboard
              </button>
            </div>
          </div>
        </section>

        {feedback && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-semibold text-indigo-900">
            {feedback}
          </div>
        )}

        {/* Coupons List */}
        <section className="admin-section admin-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="admin-card-title">Promotional Campaigns</h2>
              <p className="admin-card-text">All discount codes with atomic quota enforcement.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {coupons.length} Campaigns
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs font-semibold text-slate-500">
              Loading campaign records...
            </p>
          ) : coupons.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No coupon campaigns created yet. Click &apos;+ Create Campaign&apos; above.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Code / Name</th>
                    <th className="py-3 px-3">Discount</th>
                    <th className="py-3 px-3">Min Spend</th>
                    <th className="py-3 px-3">Redemptions</th>
                    <th className="py-3 px-3">Expiry</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => {
                    const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                    const isExhausted = c.current_redemptions >= c.max_redemptions;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <span className="font-mono text-sm font-black text-indigo-700">{c.code}</span>
                          <p className="text-slate-900 font-medium">{c.name}</p>
                          {c.description && <p className="text-[11px] text-slate-500">{c.description}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900">
                            {c.discount_type === "percentage"
                              ? `${c.discount_value}% OFF`
                              : `₦${Number(c.discount_value).toLocaleString()} OFF`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          ₦{(c.min_spend_kobo / 100).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {c.current_redemptions} / {c.max_redemptions}
                            </span>
                            <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{
                                  width: `${Math.min(100, (c.current_redemptions / c.max_redemptions) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              !c.is_active
                                ? "bg-slate-100 text-slate-600"
                                : isExpired
                                ? "bg-rose-100 text-rose-800"
                                : isExhausted
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {!c.is_active ? "Paused" : isExpired ? "Expired" : isExhausted ? "Capped" : "Active"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => toggleCouponStatus(c)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {c.is_active ? "Pause" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">Create New Coupon Campaign</h3>
              <p className="mt-1 text-xs text-slate-600">
                Set campaign discount rates, minimum purchase amount, and quota limits.
              </p>

              <form onSubmit={handleCreateCoupon} className="mt-5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Promo Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. JAMB2026"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Campaign Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Early Bird UTME Discount"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Get 20% off all quarterly and annual study tiers"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₦)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Value {discountType === "percentage" ? "(%)" : "(₦)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={discountType === "percentage" ? 100 : 50000}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Min Spend (₦)</label>
                    <input
                      type="number"
                      min={0}
                      value={minSpendNaira}
                      onChange={(e) => setMinSpendNaira(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Max Redemptions Cap</label>
                    <input
                      type="number"
                      min={1}
                      value={maxRedemptions}
                      onChange={(e) => setMaxRedemptions(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase">Valid for (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#012153] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#093278] disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Campaign"}
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
