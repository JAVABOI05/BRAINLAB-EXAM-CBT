"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminSignOut, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";

type Access = Partial<Record<AdminPermission, boolean>>;
type SettingLink = { title: string; description: string; href: string; allowed: (user: AdminUser, access: Access) => boolean };
const platformAdmin = (user: AdminUser) => user.role === "super_admin" || user.role === "platform_admin";

const SETTINGS: { heading: string; links: SettingLink[] }[] = [
  { heading: "Exams & assessment", links: [
    { title: "Exam Configuration", description: "Review exam rules, timing and result-release settings.", href: "/admin/config", allowed: (_u,a) => a["cbt.config.read"] === true || a["cbt.config.manage"] === true },
    { title: "Academic Structure", description: "Manage academic sessions, curricula and available subjects.", href: "/admin/academic", allowed: (u,a) => platformAdmin(u) || a["learning.content.manage"] === true },
    { title: "Question Bank", description: "Open question management and related maintenance tools.", href: "/admin/questions/manage", allowed: (_u,a) => a["cbt.questions.manage"] === true },
  ]},
  { heading: "Learning & community", links: [
    { title: "AI Controls & Quotas", description: "Open the existing AI provider, model and quota controls.", href: "/admin/ai", allowed: (u) => platformAdmin(u) },
    { title: "Content Management", description: "Manage learning resources and content workflows.", href: "/admin/content", allowed: (_u,a) => a["learning.content.manage"] === true },
    { title: "Classes & Attendance", description: "Open classroom governance and available class policies.", href: "/admin/classroom", allowed: (u,a) => platformAdmin(u) || a["institution.manage"] === true || a["learning.content.manage"] === true },
    { title: "Communication & Audio", description: "Manage communication and audio policies where permitted.", href: "/admin/communication", allowed: (u,a) => platformAdmin(u) || a["community.moderate"] === true },
  ]},
  { heading: "Finance & business", links: [
    { title: "Plans & Pricing", description: "Review plans, entitlements and existing pricing controls.", href: "/admin/pricing", allowed: (u,a) => platformAdmin(u) || a["finance.billing.manage"] === true },
    { title: "Coupons & Campaigns", description: "Manage existing promotional campaign tools.", href: "/admin/coupons", allowed: (u,a) => platformAdmin(u) || a["finance.billing.manage"] === true },
    { title: "Refund Queue", description: "Review refund requests using the existing workflow.", href: "/admin/refunds", allowed: (u,a) => platformAdmin(u) || a["finance.billing.manage"] === true },
    { title: "Schools & Organisations", description: "Open institutional access and school management.", href: "/admin/schools", allowed: (u,a) => platformAdmin(u) || a["institution.manage"] === true },
  ]},
  { heading: "Security & administration", links: [
    { title: "Administrator Roles", description: "Review role assignment tools (super administrators only).", href: "/admin/users", allowed: (u) => u.role === "super_admin" },
    { title: "Security Workspace", description: "Review security controls and administrator session checks.", href: "/admin/security", allowed: (u,a) => platformAdmin(u) || a["audit.logs.read"] === true },
    { title: "Audit Trail", description: "Review the administrative change history.", href: "/admin/audit", allowed: (u,a) => platformAdmin(u) || a["audit.logs.read"] === true },
  ]},
];

const PERMISSIONS: AdminPermission[] = [
  "cbt.config.read", "cbt.config.manage", "cbt.questions.manage", "learning.content.manage",
  "community.moderate", "institution.manage", "finance.billing.manage", "audit.logs.read",
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Access>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function initialise() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      setUser(admin);
      const entries = await Promise.all(PERMISSIONS.map(async (permission) => [permission, await adminHasPermission(permission)] as const));
      if (!active) return;
      setPermissions(Object.fromEntries(entries) as Access);
      setLoading(false);
    }
    void initialise().catch(() => { if (active) router.replace("/account"); });
    return () => { active = false; };
  }, [router]);

  async function handleLogout() {
    await adminSignOut();
    router.replace("/account");
  }

  if (loading || !user) return <main className="admin-login-shell"><section className="admin-login-card"><p>{loading ? "Verifying administrator session…" : "Redirecting to sign in…"}</p></section></main>;

  return <AdminWorkspaceShell user={user} permissions={permissions} onLogout={handleLogout}>
    <section className="admin-overview-heading">
      <div><h1>Settings & configuration</h1><p>A central directory for existing BrainLab controls. Each section opens its current management page; settings are not duplicated or silently rewritten here.</p></div>
      <span className="admin-overview-date">Permission-aware access</span>
    </section>
    <div className="admin-workspace-message" role="note">Only settings pages authorised for your role are listed. Access is still enforced by each destination page and its server/database policies.</div>
    {SETTINGS.map((section) => {
      const links = section.links.filter((link) => link.allowed(user, permissions));
      if (!links.length) return null;
      return <section key={section.heading} className="admin-panel" style={{ marginBottom: 16 }}>
        <div className="admin-panel-heading"><div><h2>{section.heading}</h2><p>Open an existing configuration workspace.</p></div></div>
        <div className="admin-settings-directory">
          {links.map((link) => <Link key={link.href} href={link.href}><strong>{link.title}</strong><span>{link.description}</span></Link>)}
        </div>
      </section>;
    })}
  </AdminWorkspaceShell>;
}
