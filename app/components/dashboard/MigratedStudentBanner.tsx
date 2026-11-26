"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

interface MigrationBannerData {
  tierName: string;
  expiresAt: string | null;
  featuresCount: number;
}

export default function MigratedStudentBanner() {
  const [migrationData, setMigrationData] = useState<MigrationBannerData | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkMigrationStatus() {
      if (typeof window === "undefined") return;

      // 1. Check local dismissal state
      const isDismissed = localStorage.getItem("brainlab_migration_banner_dismissed");
      if (isDismissed === "true") return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !mounted) return;

        // 2. Query user's migration item or active verified grant
        // Check if student has a success record in access_migration_items
        const { data: item } = await supabase
          .from("access_migration_items")
          .select("outcome, processed_at")
          .eq("user_id", session.user.id)
          .eq("status", "success")
          .order("processed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (item && mounted) {
          const outcome = (item.outcome as Record<string, any>) || {};
          setMigrationData({
            tierName: outcome.tier_name || "Apex Scholar",
            expiresAt: outcome.expires_at || null,
            featuresCount: outcome.features_count || 14,
          });
          setDismissed(false);
          return;
        }

        // Fallback: check if student has a programme membership with migration tag
        const { data: membership } = await supabase
          .from("programme_memberships")
          .select("status, expires_at, programme:access_programmes(name, slug)")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (membership && mounted) {
          const prog = membership.programme as any;
          if (prog?.slug?.includes("migrated") || prog?.slug?.includes("apex-transition")) {
            setMigrationData({
              tierName: prog.name || "Academic Programme",
              expiresAt: membership.expires_at,
              featuresCount: 14,
            });
            setDismissed(false);
          }
        }
      } catch {
        // Non-intrusive fallback if offline or tables unavailable
      }
    }

    void checkMigrationStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("brainlab_migration_banner_dismissed", "true");
    } catch {}
  };

  if (dismissed || !migrationData) return null;

  const formattedExpiry = migrationData.expiresAt
    ? new Date(migrationData.expiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active Verified Term";

  return (
    <aside
      aria-label="Account Transition Notice"
      className="relative overflow-hidden rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-4 text-white shadow-lg animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shrink-0" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
            </svg>
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 border border-cyan-400/30">
                Account Verified &amp; Upgraded
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {migrationData.tierName}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Welcome to the upgraded BrainLab Central Access platform! Your previous subscription has been verified and migrated with all features preserved. Your verified access is valid through{" "}
              <strong className="text-cyan-300 font-bold">{formattedExpiry}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Link
            href="/cbt"
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3.5 py-1.5 text-xs font-black shadow-md transition active:scale-95"
          >
            Start Practicing &rarr;
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss migration notification"
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center justify-center"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
