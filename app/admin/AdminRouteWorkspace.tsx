"use client";

import { useEffect, useState } from "react";
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

export default function AdminRouteWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Access>({});
  const [ready, setReady] = useState(false);

  const routeOwnsShell = pathname === "/admin/dashboard" || pathname === "/admin/settings";
  const bypassShell = pathname === "/admin/login" || pathname === "/admin";

  useEffect(() => {
    if (routeOwnsShell || bypassShell) {
      setReady(true);
      return;
    }
    let active = true;
    async function initialise() {
      try {
        const admin = await getAdminSession();
        if (!active) return;
        if (!admin) {
          router.replace("/account");
          return;
        }
        const entries = await Promise.all(PERMISSIONS.map(async (permission) =>
          [permission, await adminHasPermission(permission)] as const
        ));
        if (!active) return;
        setUser(admin);
        setPermissions(Object.fromEntries(entries) as Access);
        setReady(true);
      } catch {
        if (active) router.replace("/account");
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
