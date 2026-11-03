"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Entitlement = {
  id: string;
  entitlement_type: string;
  membership_type?: string | null;
  resource_key?: string | null;
  organisation_id?: string | null;
  assessment_id?: string | null;
  max_questions: number;
  status: string;
  permanent: boolean;
  starts_at: string;
  expires_at?: string | null;
};

type RedeemResult = {
  ok: boolean;
  message?: string;
  error?: string;
  scope_type?: string;
  already_redeemed?: boolean;
  permanent?: boolean;
  expires_at?: string | null;
  max_questions?: number;
  entitlement_id?: string;
};

export default function MyAccessPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState("");

  async function loadAccessData(currentUser: User) {
    try {
      const { data } = await supabase
        .from("learning_entitlements")
        .select("id, entitlement_type, membership_type, resource_key, organisation_id, assessment_id, max_questions, status, permanent, starts_at, expires_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (data && Array.isArray(data)) {
        setEntitlements(data as Entitlement[]);
      }
    } catch {
      // Fallback gracefully if database table is undergoing migration
    }
  }

  useEffect(() => {
    let active = true;

    async function init() {
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) {
        router.replace("/account");
        return;
      }

      setUser(data.user);
      await loadAccessData(data.user);
      if (active) setLoading(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleRedeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || !user) return;

    setRedeeming(true);
    setError("");
    setResult(null);

    const normalizedCode = code.trim().toUpperCase();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = "Bearer " + session.access_token;
      }

      // Try unified PIN voucher redemption API
      const pinRes = await fetch("/api/access/redeem-pin", {
        method: "POST",
        headers,
        body: JSON.stringify({ code: normalizedCode }),
      });
      const pinData = await pinRes.json();

      if (pinRes.ok && pinData.ok) {
        setResult({
          ok: true,
          message: pinData.message || `Upgraded to ${pinData.plan_name || 'Premium'} successfully!`,
          scope_type: pinData.plan_id || "premium",
          expires_at: pinData.expires_at,
        });
        setCode("");
        await loadAccessData(user);
      } else if (pinData?.error === "single_exam_pass" || pinData?.error === "already_used" || pinData?.error === "auth_required") {
        setError(pinData.message || "This access code could not be redeemed.");
      } else {
        // Fallback to legacy learning_access_codes RPC
        const { data, error: rpcError } = await supabase.rpc("redeem_learning_access_code", {
          p_code: normalizedCode,
        });

        if (rpcError) {
          setError(pinData.message || rpcError.message || "Could not redeem this access code.");
        } else if (!data?.ok) {
          setError(pinData.message || (data as RedeemResult).message || "This code could not be redeemed.");
        } else {
          setResult(data as RedeemResult);
          setCode("");
          await loadAccessData(user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred while redeeming.");
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-10 w-96 rounded-2xl bg-slate-200" />
          <div className="h-44 rounded-3xl bg-slate-200" />
          <div className="h-44 rounded-3xl bg-slate-200" />
        </div>
      </main>
    );
  }

  const activeEntitlements = entitlements.filter((e) => e.status === "active");
  const maxPracticeQuestions = activeEntitlements.length > 0
    ? Math.max(...activeEntitlements.map((e) => e.max_questions || 50))
    : 50;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">
                BrainLab Academy · Membership &amp; Permissions
              </p>
              <h1 className="mt-1.5 text-2xl font-black text-slate-950 sm:text-3xl">
                My Access &amp; Entitlements
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review your active learning permissions, allowed question quotas, and redeem access codes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/account/subscription/refund" className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100">📄 Billing & Receipts</Link>
              <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Back to Dashboard
            </Link>
            </div>
          </div>
        </header>

        {/* Current Account Status Card */}
        <section className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/70 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
                Account Status
              </span>
              <h2 className="mt-3 text-xl font-extrabold text-slate-900">
                {activeEntitlements.length > 0 ? "Active Access Enrolled" : "Standard Learner Access"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Signed in as <strong className="text-slate-800">{user?.email}</strong>
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Paper Limit</span>
              <p className="mt-1 text-2xl font-black text-blue-900">{maxPracticeQuestions} questions</p>
              <p className="text-[11px] text-slate-500">per Self Practice session</p>
            </div>
          </div>

          <div className="mt-6 border-t border-blue-100 pt-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-3">
              Included Platform Features
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-xs font-bold text-slate-800">Learning Hub Access</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-xs font-bold text-slate-800">CBT Candidate Portal</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-slate-200/80">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="text-xs font-bold text-slate-800">Synced Revision Planner</span>
              </div>
            </div>
          </div>
        </section>

        {/* Active Entitlements List */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-slate-950">Active Entitlements &amp; Permissions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Codes and institutional memberships bound to your learner profile.
          </p>

          {activeEntitlements.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No custom institution codes redeemed yet.</p>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                You currently have standard learner access. To unlock school quiz pools, competition entries, or higher question limits, redeem an access code below.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {activeEntitlements.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      {item.entitlement_type.replaceAll("_", " ")}
                    </span>
                    <h4 className="font-extrabold text-slate-900">
                      {item.membership_type ? `${item.membership_type.toUpperCase()} Membership` : "Authorized Access"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quota: Up to {item.max_questions} questions/attempt
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      {item.permanent ? "Permanent Access" : item.expires_at ? `Expires ${new Date(item.expires_at).toLocaleDateString()}` : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Redeem Access Code Form */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-950">Redeem an Access Code</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Enter a code issued by BrainLab Academy, a tutorial center, or your school administrator to unlock specific cohorts, resources, or competition assessments.
            </p>

            <form onSubmit={handleRedeem} className="mt-5 space-y-4">
              <div>
                <label htmlFor="code-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Access Code
                </label>
                <input
                  id="code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="BLT-XXXX-XXXX"
                  className="w-full rounded-xl border border-slate-300 p-3.5 font-mono text-base uppercase tracking-wider outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  required
                  autoComplete="off"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={redeeming || !code.trim()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-800 disabled:opacity-50"
              >
                {redeeming ? "Verifying Code…" : "Redeem Code →"}
              </button>
            </form>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
                {error}
              </div>
            )}

            {result && (
              <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                <h4 className="font-extrabold text-sm">
                  {result.already_redeemed ? "Code already active on this account" : "✓ Access Code Activated Successfully"}
                </h4>
                <p className="mt-1 text-xs text-emerald-800">
                  Access type: <strong>{(result.scope_type || "Access").replaceAll("_", " ")}</strong>
                  {typeof result.max_questions === "number" ? ` · Question limit: ${result.max_questions} questions` : ""}
                  {result.permanent ? " · Permanent" : result.expires_at ? ` · Valid until ${new Date(result.expires_at).toLocaleDateString()}` : ""}
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    href="/self-practice"
                    className="inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    Start Self Practice →
                  </Link>
                  <Link
                    href="/assessments"
                    className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    View Assessments →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
