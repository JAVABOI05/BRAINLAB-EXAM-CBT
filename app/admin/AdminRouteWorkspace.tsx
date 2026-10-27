"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminWorkspaceShell from "./AdminWorkspaceShell";
import { adminSignOut, getAdminSession, type AdminUser } from "../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../lib/adminRoles";

type Access = Partial<Record<AdminPermission, boolean>>;
const PERMISSIONS: AdminPermission[] = [
  "cbt.config.read", "cbt.config.manage", "cbt.questions.manage", "cbt.results.read",
  "cbt.codes.manage", "cbt.sessions.read", "audit.logs.read", "learning.content.manage",
  "community.moderate", "analytics.read", "institution.manage", "finance.billing.manage",
];

export default function AdminRouteWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Access>({});
  const [ready, setReady] = useState(false);

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
      let verifiedAdmin: AdminUser | null = null;
      try {
        const admin = await getAdminSession();
        if (!active) return;
        if (!admin) {
          router.replace("/admin/login?reason=session");
          return;
        }
        verifiedAdmin = admin;
        setUser(admin);
        const entries = await Promise.all(PERMISSIONS.map(async (permission) =>
          [permission, await adminHasPermission(permission)] as const
        ));
        if (!active) return;
        setPermissions(Object.fromEntries(entries) as Access);
        setReady(true);
      } catch {
        if (!active) return;
        if (verifiedAdmin) {
          setUser(verifiedAdmin);
          setPermissions({});
          setReady(true);
        } else {
          router.replace("/admin/login?reason=verify");
        }
      }
    }
    void initialise();
    return () => { active = false; };
  }, [pathname, routeOwnsShell, bypassShell, router]);

  if (routeOwnsShell || bypassShell) return <>{children}</>;
  if (!ready || !user) {
    return <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600"><p className="text-sm">Verifying administrator session…</p></main>;
  }
  return <AdminWorkspaceShell user={user} permissions={permissions} onLogout={async () => {
    await adminSignOut();
    router.replace("/account");
  }}>{children}</AdminWorkspaceShell>;
}
