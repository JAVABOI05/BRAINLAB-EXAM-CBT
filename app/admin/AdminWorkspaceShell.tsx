"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import type { AdminPermission } from "../lib/adminRoles";
import type { AdminUser } from "../lib/adminAuth";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "./admin-workspace.css";

type Access = Partial<Record<AdminPermission, boolean>>;
type Item = { label: string; href: string; description: string; visible: (user: AdminUser, access: Access) => boolean };
type Group = { label: string; items: Item[] };
const platformAdmin = (user: AdminUser) => user.role === "super_admin" || user.role === "platform_admin";
const always = () => true;

const GROUPS: Group[] = [
  { label: "Overview", items: [
    { label: "Dashboard", href: "/admin/dashboard", description: "Platform overview and quick actions", visible: always },
    { label: "Analytics & Reports", href: "/admin/analytics", description: "Permitted aggregate reporting", visible: (_u,a) => a["analytics.read"] === true },
  ]},
  { label: "Manage the academy", items: [
    { label: "Question Bank", href: "/admin/questions/manage", description: "Questions and question-bank maintenance", visible: (_u,a) => a["cbt.questions.manage"] === true },
    { label: "Exam Blueprints", href: "/admin/questions/blueprints", description: "UTME English & subject blueprints and quotas", visible: (_u,a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
    { label: "High-Yield Topics", href: "/admin/questions/high-yield", description: "Syllabus topic quotas and shortage alerts", visible: (_u,a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
    { label: "Duplicate Questions", href: "/admin/questions/duplicates", description: "Intelligent duplicate detection and safe archival", visible: (_u,a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
    { label: "Exam Sessions", href: "/admin/sessions", description: "Authorised exam-session activity", visible: (_u,a) => a["cbt.sessions.read"] === true },
    { label: "Access Codes", href: "/admin/codes", description: "Generate and monitor exam access codes", visible: (_u,a) => a["cbt.codes.manage"] === true },
    { label: "Results", href: "/admin/results", description: "Authorised candidate results", visible: (_u,a) => a["cbt.results.read"] === true },
    { label: "Learning Content", href: "/admin/content", description: "Learning resources and content tools", visible: (_u,a) => a["learning.content.manage"] === true },
    { label: "Tutors & Testimonials", href: "/admin/public-content", description: "Manage tutor bios and approved student stories", visible: (_u,a) => a["learning.content.manage"] === true },
    { label: "Content Intelligence", href: "/admin/content-intelligence", description: "Content coverage and quality", visible: (_u,a) => a["learning.content.manage"] === true },
    { label: "Learning Assessments", href: "/admin/academy-assessments", description: "Topic tests and learning assessments", visible: (_u,a) => a["learning.content.manage"] === true },
    { label: "Schools & Organisations", href: "/admin/schools", description: "Institutional CBT and school access", visible: (u,a) => a["institution.manage"] === true || platformAdmin(u) },
    { label: "Classes", href: "/admin/classroom", description: "Classroom governance and rules", visible: (u,a) => a["institution.manage"] === true || a["learning.content.manage"] === true || platformAdmin(u) },
    { label: "Community Moderation", href: "/admin/moderation", description: "Community safety and moderation", visible: (_u,a) => a["community.moderate"] === true },
  ]},
  { label: "Insights & business", items: [
    { label: "AI Controls & Quotas", href: "/admin/ai", description: "AI provider configuration and quotas", visible: (u) => platformAdmin(u) },
    { label: "Plans & Pricing", href: "/admin/pricing", description: "Subscription plans and entitlements", visible: (u,a) => a["finance.billing.manage"] === true || platformAdmin(u) },
    { label: "Refund Queue", href: "/admin/refunds", description: "Review refund requests", visible: (u,a) => a["finance.billing.manage"] === true || platformAdmin(u) },
    { label: "Coupons & Campaigns", href: "/admin/coupons", description: "Promotional offers and campaigns", visible: (u,a) => a["finance.billing.manage"] === true || platformAdmin(u) },
    { label: "Gamification & Rewards", href: "/admin/gamification", description: "Badges, XP and rewards configuration", visible: (u,a) => a["learning.content.manage"] === true || platformAdmin(u) },
  ]},
  { label: "Administration", items: [
    { label: "Settings", href: "/admin/settings", description: "Central configuration workspace", visible: always },
    { label: "Exam Configuration", href: "/admin/config", description: "Exam rules and configuration", visible: (_u,a) => a["cbt.config.read"] === true || a["cbt.config.manage"] === true },
    { label: "Academic Structure", href: "/admin/academic", description: "Academic sessions, curricula and subjects", visible: (u,a) => a["learning.content.manage"] === true || platformAdmin(u) },
    { label: "Communication & Audio", href: "/admin/communication", description: "Messaging and audio policies", visible: (u,a) => a["community.moderate"] === true || platformAdmin(u) },
    { label: "Administrator Roles", href: "/admin/users", description: "Assign and review admin roles", visible: (u) => u.role === "super_admin" },
    { label: "Security & Audit", href: "/admin/security", description: "Security workspace and access review", visible: (u,a) => platformAdmin(u) || a["audit.logs.read"] === true },
    { label: "Audit Trail", href: "/admin/audit", description: "Administrative change history", visible: (u,a) => platformAdmin(u) || a["audit.logs.read"] === true },
  ]},
];

type Props = { user: AdminUser; permissions: Access; onLogout: () => void; children: ReactNode };

export default function AdminWorkspaceShell({ user, permissions, onLogout, children }: Props) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const groups = useMemo(() => GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.visible(user, permissions)).filter((item) => {
      const q = query.trim().toLowerCase();
      return !q || item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }),
  })).filter((group) => group.items.length > 0), [user, permissions, query]);



  const routeLabels: Record<string, string> = {
    "/admin/dashboard": "Dashboard overview",
    "/admin/operations": "Institutional CBT Operations",
    "/admin/analytics": "Analytics & reports",
    "/admin/questions/manage": "Question bank",
    "/admin/questions/blueprints": "Examination blueprints",
    "/admin/questions/high-yield": "High-yield topics",
    "/admin/questions/duplicates": "Duplicate questions",
    "/admin/sessions": "Exam sessions",
    "/admin/codes": "Access codes",
    "/admin/results": "Results & corrections",
    "/admin/content": "Learning content",
    "/admin/public-content": "Tutors & testimonials",
    "/admin/content-intelligence": "Content intelligence",
    "/admin/academy-assessments": "Learning assessments",
    "/admin/schools": "Schools & organisations",
    "/admin/classroom": "Classrooms",
    "/admin/moderation": "Community moderation",
    "/admin/ai": "AI controls & quotas",
    "/admin/pricing": "Plans & pricing",
    "/admin/refunds": "Refund queue",
    "/admin/coupons": "Coupons & campaigns",
    "/admin/gamification": "Gamification & rewards",
    "/admin/settings": "Settings",
    "/admin/config": "Exam configuration",
    "/admin/academic": "Academic structure",
    "/admin/communication": "Communication & audio",
    "/admin/users": "Administrator roles",
    "/admin/security": "Security & audit",
    "/admin/audit": "Audit trail",
  };
  const currentLabel = routeLabels[pathname] ?? pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") ?? "Workspace";
  const roleLabel = user.role.replaceAll("_", " ");

  return <div className={"admin-workspace" + (collapsed ? " is-collapsed" : "")}>
    <aside className={"admin-sidebar" + (mobileOpen ? " is-open" : "")} aria-label="Admin navigation">
      <Link href="/admin/dashboard" className="admin-brand" onClick={() => setMobileOpen(false)} aria-label="BrainLab Academy admin dashboard">
        <span className="admin-brand-mark" aria-hidden="true">B</span>
        <span className="admin-brand-copy"><strong>BRAINLAB</strong><small>ACADEMY ADMIN</small></span>
      </Link>
      <div className="admin-nav-search"><span aria-hidden="true">⌕</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an admin page" aria-label="Search admin navigation" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
      </div>
      <nav className="admin-nav-groups">
        {groups.length === 0 && <p className="admin-nav-empty">No matching pages.</p>}
        {groups.map((group) => <section className="admin-nav-group" key={group.label}>
          <h2>{group.label}</h2>
          {group.items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href + "/"));
            return <Link key={item.href} href={item.href} className={"admin-nav-link " + (active ? "is-active" : "")} aria-current={active ? "page" : undefined} title={item.label + " — " + item.description} onClick={() => setMobileOpen(false)}>
              <span className="admin-nav-glyph" aria-hidden="true">{item.label.slice(0, 1).toUpperCase()}</span><span className="admin-nav-label">{item.label}</span>
            </Link>;
          })}
        </section>)}
      </nav>
      <div className="admin-sidebar-footer">
        <span className="admin-avatar" aria-hidden="true">{user.email.slice(0,1).toUpperCase() || "A"}</span>
        <div className="admin-sidebar-user"><strong>{user.email}</strong><span>{user.role.replaceAll("_"," ")}</span></div>
        <button className="admin-logout-button" type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">↗</button>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="admin-nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <div className="admin-workspace-main">
      <header className="admin-topbar">
        <button className="admin-sidebar-toggle" type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? "»" : "«"}</button>
        <button className="admin-mobile-menu" type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close navigation" : "Open navigation"}>{mobileOpen ? "×" : "☰"}</button>
        <div className="admin-topbar-heading"><span>ADMINISTRATION</span><strong>{currentLabel}</strong></div>
        <div className="admin-topbar-actions"><span className="admin-environment-label">BrainLab Academy</span><span className="admin-role-chip" title="Your active administrator role">{roleLabel}</span><AdminNotificationBell /></div>
      </header>
      <main className="admin-workspace-content">{children}</main>
    </div>
  </div>;
}
