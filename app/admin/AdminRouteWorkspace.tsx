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
      <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-700">Verifying administrator session…</p>
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
