"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { isAdminPinLocallyVerified } from "../lib/adminPinAuth";
import { isGovernanceAdminRole, isInstructorRole } from "../lib/adminRoles";

function AccountRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    async function checkAndRedirect() {
      // 1. If auth callback code is present, pass directly to /auth/callback
      const code = searchParams.get("code");
      const err = searchParams.get("error");
      if (code || err) {
        window.location.replace(`/auth/callback${window.location.search}${window.location.hash}`);
        return;
      }

      // 2. Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session || !session.user) {
        // Redirect to unified central login page
        const query = searchParams.toString();
        router.replace(query ? `/login?${query}` : "/login");
        return;
      }

      // 3. User has active session — resolve role authoritatively
      const { data: adminRole } = await supabase.rpc("get_admin_role");
      if (!active) return;

      const roleStr = typeof adminRole === "string" ? adminRole.trim() : null;

      if (isGovernanceAdminRole(roleStr)) {
        if (isAdminPinLocallyVerified()) {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/admin/login?pinRequired=true");
        }
        return;
      }

      if (isInstructorRole(roleStr)) {
        router.replace("/tutor");
        return;
      }

      // Student / Learner
      const redirectTarget = searchParams.get("redirect");
      const safeTarget = redirectTarget && redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
        ? redirectTarget
        : "/dashboard";
      router.replace(safeTarget);
    }

    void checkAndRedirect();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
      Connecting to your BrainLab workspace...
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Connecting to your BrainLab workspace...
        </div>
      }
    >
      <AccountRedirectHandler />
    </Suspense>
  );
}
