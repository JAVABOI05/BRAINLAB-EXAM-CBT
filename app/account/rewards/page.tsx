"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import BrandHeader from "../../components/BrandHeader";
import BrandFooter from "../../components/BrandFooter";

interface Campaign {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_spend_kobo: number;
  expires_at?: string;
}

interface UserRedemption {
  id: string;
  discount_applied_kobo: number;
  redeemed_at: string;
  coupon_campaigns?: {
    code: string;
    name: string;
  };
}

export default function StudentRewardsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    // 1. Fetch available public campaigns
    const { data: camps } = await supabase
      .from("coupon_campaigns")
      .select("id, code, name, description, discount_type, discount_value, min_spend_kobo, expires_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (camps) setCampaigns(camps as Campaign[]);

    // 2. Fetch learner redemptions if signed in
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: reds } = await supabase
        .from("coupon_redemptions")
        .select("id, discount_applied_kobo, redeemed_at, coupon_campaigns(code, name)")
        .eq("user_id", auth.user.id)
        .order("redeemed_at", { ascending: false });

      if (reds) setRedemptions(reds as any);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  function copyToClipboard(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <BrandHeader />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-8">
            <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-800">
              🎁 Student Rewards &amp; Promo Codes
            </span>
            <h1 className="mt-3 text-3xl font-black text-slate-950">My Rewards &amp; Offers</h1>
            <p className="mt-1 text-sm text-slate-600">
              Claim verified discount codes to save on monthly study passes and CBT test packs.
            </p>
          </div>

          {/* Active Campaigns */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900">Available Promotions</h2>
            {loading ? (
              <p className="mt-4 text-xs font-semibold text-slate-500">Loading offers...</p>
            ) : campaigns.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">No public promotions active at this moment.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {campaigns.map((camp) => (
                  <article
                    key={camp.id}
                    className="relative flex flex-col justify-between rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-indigo-50 px-2.5 py-1 font-mono text-sm font-black text-indigo-700 border border-indigo-200">
                          {camp.code}
                        </span>
                        <span className="text-xs font-black uppercase text-emerald-700">
                          {camp.discount_type === "percentage"
                            ? `${camp.discount_value}% OFF`
                            : `₦${Number(camp.discount_value).toLocaleString()} OFF`}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-900">{camp.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{camp.description}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Min. spend: ₦{(camp.min_spend_kobo / 100).toLocaleString()} · Valid until{" "}
                        {camp.expires_at ? new Date(camp.expires_at).toLocaleDateString() : "further notice"}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => copyToClipboard(camp.code)}
                        className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
                      >
                        {copiedCode === camp.code ? "✓ Code Copied!" : "Copy Code"}
                      </button>
                      <Link
                        href="/pricing"
                        className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white hover:bg-[#093278] transition"
                      >
                        Use Now →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Past Redemptions & Total Savings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Your Redeemed Savings</h2>
            <div className="mt-4">
              {redemptions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  You haven&apos;t redeemed any discount codes yet. Copy one of the codes above to apply at checkout!
                </p>
              ) : (
                <div className="space-y-3">
                  {redemptions.map((red) => (
                    <div
                      key={red.id}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100"
                    >
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">
                          {red.coupon_campaigns?.code || "PROMO"}
                        </p>
                        <p className="text-[11px] text-slate-500">{red.coupon_campaigns?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-emerald-600">
                          Saved ₦{(red.discount_applied_kobo / 100).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(red.redeemed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}
