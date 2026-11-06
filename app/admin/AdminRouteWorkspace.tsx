"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminWorkspaceShell from "./AdminWorkspaceShell";
import {
  adminSignOut,
  getAdminSession,
  getCachedAdminSession,
  clearAdminCache,
  type AdminUser,
} from "../lib/adminAuth";
import {
  adminResolvePermissions,
  getCachedAdminPermissions,
  type AdminPermission,
} from "../lib/adminRoles";

type Access = Partial<Record<AdminPermission, boolean>>;
const PERMISSIONS: AdminPermission[] = [
  "cbt.config.read",
  "cbt.config.manage",
  "cbt.questions.manage",
  "cbt.results.read",
  "cbt.codes.manage",
  "cbt.sessions.read",
  "audit.logs.read",
  "learning.content.manage",
  "community.moderate",
  "analytics.read",
  "institution.manage",
  "finance.billing.manage",
];

export default function AdminRouteWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Instant synchronous state initialization from memory/sessionStorage cache
  const [user, setUser] = useState<AdminUser | null>(() => getCachedAdminSession());
  const [permissions, setPermissions] = useState<Access>(() => getCachedAdminPermissions());
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!getCachedAdminSession();
  });

  const routeOwnsShell =
    pathname === "/admin/dashboard" ||
    pathname === "/admin/settings" ||
    pathname === "/admin/payment-gateways" ||
    pathname === "/admin/announcements" ||
    pathname === "/admin/candidates" ||
    pathname === "/admin/operations" ||
    pathname === "/admin/data-export";
  const bypassShell = pathname === "/admin/login" || pathname === "/admin";

  useEffect(() => {
    if (routeOwnsShell || bypassShell) return;
    let active = true;

    async function initialise() {
      let verifiedAdmin: AdminUser | null = user || getCachedAdminSession();
      try {
        const admin = await getAdminSession();
        if (!active) return;
        if (!admin) {
          clearAdminCache();
          router.replace("/admin/login?reason=session");
          return;
        }
        verifiedAdmin = admin;
        setUser(admin);

        // Batch / cached permission resolution with super_admin fast bypass (0ms)
        const access = await adminResolvePermissions(PERMISSIONS, admin.role);
        if (!active) return;
        setPermissions(access);
        setReady(true);
      } catch {
        if (!active) return;
        if (verifiedAdmin) {
          setUser(verifiedAdmin);
          setReady(true);
        } else {
          router.replace("/admin/login?reason=verify");
        }
      }
    }

    void initialise();
    return () => {
      active = false;
    };
  }, [pathname, routeOwnsShell, bypassShell, router]);

  if (routeOwnsShell || bypassShell) return <>{children}</>;

  if (!ready || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <div className="absolute inset-0 rounded-2xl blur-lg bg-cyan-400/20 animate-pulse pointer-events-none" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-1.5">Securing Administrator Workspace</h2>
          <p className="text-xs text-slate-400 font-medium">Validating security context &amp; operator credentials…</p>
        </div>
      </main>
    );
  }

  return (
    <AdminWorkspaceShell
      user={user}
      permissions={permissions}
      onLogout={async () => {
        await adminSignOut();
        router.replace("/login");
      }}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
