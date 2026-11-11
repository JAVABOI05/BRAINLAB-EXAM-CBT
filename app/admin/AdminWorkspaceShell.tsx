"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import type { AdminPermission } from "../lib/adminRoles";
import type { AdminUser } from "../lib/adminAuth";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "./admin-workspace.css";

type Access = Partial<Record<AdminPermission, boolean>>;
type Item = {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: string;
  visible: (user: AdminUser, access: Access) => boolean;
};
type Group = { id: string; label: string; items: Item[] };

const platformAdmin = (user: AdminUser) => user.role === "super_admin" || user.role === "platform_admin";
const always = () => true;

// Crisp, modern SVG icons for dashboard navigation
function NavIcon({ name }: { name: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect width="7" height="9" x="3" y="3" rx="1.5" />
          <rect width="7" height="5" x="14" y="3" rx="1.5" />
          <rect width="7" height="9" x="14" y="12" rx="1.5" />
          <rect width="7" height="5" x="3" y="16" rx="1.5" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case "questions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "blueprints":
      return (
        <svg {...common}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" x2="16" y1="13" y2="13" />
          <line x1="8" x2="14" y1="17" y2="17" />
        </svg>
      );
    case "high-yield":
      return (
        <svg {...common}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    case "duplicates":
      return (
        <svg {...common}>
          <rect width="13" height="13" x="9" y="9" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "codes":
      return (
        <svg {...common}>
          <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      );
    case "results":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
          <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "content":
      return (
        <svg {...common}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case "public-content":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "content-intelligence":
      return (
        <svg {...common}>
          <path d="M12 2v4" />
          <path d="m4.93 4.93 2.83 2.83" />
          <path d="M2 12h4" />
          <path d="m4.93 19.07 2.83-2.83" />
          <path d="M12 22v-4" />
          <path d="m19.07 19.07-2.83-2.83" />
          <path d="M22 12h-4" />
          <path d="m19.07 4.93-2.83 2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "assessments":
      return (
        <svg {...common}>
          <rect width="8" height="4" x="8" y="2" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );
    case "schools":
      return (
        <svg {...common}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case "classes":
      return (
        <svg {...common}>
          <path d="M2 3h20" />
          <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
          <path d="m7 21 5-5 5 5" />
        </svg>
      );
    case "moderation":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...common}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "refunds":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case "coupons":
      return (
        <svg {...common}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      );
    case "gamification":
      return (
        <svg {...common}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "competition":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" />
          <path d="M6 4h12v7a6 6 0 0 1-12 0V4Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "config":
      return (
        <svg {...common}>
          <line x1="4" x2="20" y1="21" y2="21" />
          <line x1="4" x2="20" y1="14" y2="14" />
          <line x1="4" x2="20" y1="7" y2="7" />
          <circle cx="9" cy="7" r="2" />
          <circle cx="15" cy="14" r="2" />
          <circle cx="7" cy="21" r="2" />
        </svg>
      );
    case "academic":
      return (
        <svg {...common}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case "communication":
      return (
        <svg {...common}>
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      );
    case "roles":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      );
    case "security":
      return (
        <svg {...common}>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

const GROUPS: Group[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", description: "Platform overview and quick actions", icon: "dashboard", visible: always },
      { id: "student-dashboard", label: "Student Dashboard", href: "/dashboard", description: "Switch to Learner Portal (Universal Admin VIP Preview)", icon: "classes", visible: always },
      { id: "candidates", label: "Candidate Directory", href: "/admin/candidates", description: "Search, inspect, and manage student accounts & tiers", icon: "roles", visible: (u, a) => a["institution.manage"] === true || platformAdmin(u) || a["finance.billing.manage"] === true },
      { id: "analytics", label: "Analytics & Reports", href: "/admin/analytics", description: "Permitted aggregate reporting", icon: "analytics", visible: (_u, a) => a["analytics.read"] === true },
    ],
  },
  {
    id: "manage",
    label: "Academy & Content",
    items: [
      { id: "questions", label: "Question Bank", href: "/admin/questions/manage", description: "Questions and question-bank maintenance", icon: "questions", visible: (_u, a) => a["cbt.questions.manage"] === true },
      { id: "exam-focus", label: "Seasonal Exam Focus", href: "/admin/exam-focus", description: "Seasonal exam campaign, deadlines, and homepage priority banner", icon: "academic", visible: (u, a) => a["learning.content.manage"] === true || platformAdmin(u) },
      { id: "difficulty-model", label: "Difficulty Model", href: "/admin/questions/difficulty-model", description: "Formal difficulty slider, interpolation & shortage policies", icon: "config", visible: (_u, a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
      { id: "blueprints", label: "Exam Blueprints", href: "/admin/questions/blueprints", description: "UTME English & subject blueprints and quotas", icon: "blueprints", visible: (_u, a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
      { id: "high-yield", label: "High-Yield Topics", href: "/admin/questions/high-yield", description: "Syllabus topic quotas and shortage alerts", icon: "high-yield", visible: (_u, a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
      { id: "duplicates", label: "Duplicate Questions", href: "/admin/questions/duplicates", description: "Intelligent duplicate detection and safe archival", icon: "duplicates", visible: (_u, a) => a["cbt.questions.manage"] === true || platformAdmin(_u) },
      { id: "sessions", label: "Exam Sessions", href: "/admin/sessions", description: "Authorised exam-session activity", icon: "sessions", visible: (_u, a) => a["cbt.sessions.read"] === true },
      { id: "operations", label: "Live Invigilator", href: "/admin/operations", description: "Live CBT monitoring, session unlock & timer extension", icon: "sessions", visible: (_u, a) => a["cbt.sessions.read"] === true || platformAdmin(_u) },
      { id: "codes", label: "Access Codes", href: "/admin/codes", description: "Generate and monitor exam access codes", icon: "codes", visible: (_u, a) => a["cbt.codes.manage"] === true },
      { id: "results", label: "Results", href: "/admin/results", description: "Authorised candidate results", icon: "results", visible: (_u, a) => a["cbt.results.read"] === true },
      { id: "content", label: "Learning Content", href: "/admin/content", description: "Learning resources and content tools", icon: "content", visible: (_u, a) => a["learning.content.manage"] === true },
      { id: "stem", label: "STEM Studio", href: "/admin/stem", description: "Author, review and publish STEM simulations and formula cards", icon: "config", visible: (u, a) => a["stem.resource.manage"] === true || a["learning.content.manage"] === true || platformAdmin(u) },
      { id: "syllabus", label: "Syllabus & Curriculum", href: "/admin/syllabus", description: "Manage official syllabus topics, subtopics and objectives", icon: "academic", visible: (u, a) => a["learning.content.manage"] === true || platformAdmin(u) },
      { id: "public-content", label: "Tutor Profiles", href: "/admin/public-content", description: "Review tutor-submitted profiles and publication status", icon: "public-content", visible: (_u, a) => a["learning.content.manage"] === true },
      { id: "content-intelligence", label: "Content Intelligence", href: "/admin/content-intelligence", description: "Content coverage and quality", icon: "content-intelligence", visible: (_u, a) => a["learning.content.manage"] === true },
      { id: "assessments", label: "Learning Assessments", href: "/admin/academy-assessments", description: "Topic tests and learning assessments", icon: "assessments", visible: (_u, a) => a["learning.content.manage"] === true },
      { id: "schools", label: "Schools & Organisations", href: "/admin/schools", description: "Institutional CBT and school access", icon: "schools", visible: (u, a) => a["institution.manage"] === true || platformAdmin(u) },
      { id: "classes", label: "Classes", href: "/admin/classroom", description: "Classroom governance and rules", icon: "classes", visible: (u, a) => a["institution.manage"] === true || a["learning.content.manage"] === true || platformAdmin(u) },
      { id: "moderation", label: "Community Moderation", href: "/admin/moderation", description: "Community safety and moderation", icon: "moderation", visible: (_u, a) => a["community.moderate"] === true },
      { id: "competitions", label: "Competition Arena", href: "/admin/competitions", description: "RBAC, dedicated question banks, battles & moderation", icon: "competition", visible: (u, a) => u.role === "super_admin" || u.role === "platform_admin" || u.role === "competition_admin" || u.role === "competition_moderator" || u.role === "competition_host" || a["competition.view"] === true },
    ],
  },
  {
    id: "insights",
    label: "Business & Growth",
    items: [
      { id: "ai", label: "AI Controls & Quotas", href: "/admin/ai", description: "AI provider configuration and quotas", icon: "ai", visible: (u) => platformAdmin(u) },
      { id: "pricing", label: "Plans & Pricing", href: "/admin/pricing", description: "Subscription plans and entitlements", icon: "pricing", visible: (u, a) => a["finance.billing.manage"] === true || platformAdmin(u) },
      { id: "payment-gateways", label: "Payment Gateways", href: "/admin/payment-gateways", description: "Configure Paystack, Flutterwave, Bachs & API keys", icon: "pricing", visible: (u, a) => a["finance.billing.manage"] === true || platformAdmin(u) },
      { id: "refunds", label: "Refund Queue", href: "/admin/refunds", description: "Review refund requests", icon: "refunds", visible: (u, a) => a["finance.billing.manage"] === true || platformAdmin(u) },
      { id: "coupons", label: "Coupons & Campaigns", href: "/admin/coupons", description: "Promotional offers and campaigns", icon: "coupons", visible: (u, a) => a["finance.billing.manage"] === true || platformAdmin(u) },
      { id: "gamification", label: "Gamification & Rewards", href: "/admin/gamification", description: "Badges, XP and rewards configuration", icon: "gamification", visible: (u, a) => a["learning.content.manage"] === true || platformAdmin(u) },
    ],
  },
  {
    id: "administration",
    label: "System & Governance",
    items: [
      { id: "settings", label: "Settings", href: "/admin/settings", description: "Central configuration workspace", icon: "settings", visible: always },
      { id: "config", label: "Exam Configuration", href: "/admin/config", description: "Exam rules and configuration", icon: "config", visible: (_u, a) => a["cbt.config.read"] === true || a["cbt.config.manage"] === true },
      { id: "academic", label: "Academic Structure", href: "/admin/academic", description: "Academic sessions, curricula and subjects", icon: "academic", visible: (u, a) => a["learning.content.manage"] === true || platformAdmin(u) },
      { id: "communication", label: "Communications & Email Hub", href: "/admin/communication", description: "Resend, Zoho, Cloudflare, Termii & broadcast emails", icon: "communication", visible: (u, a) => a["community.moderate"] === true || platformAdmin(u) },
      { id: "roles", label: "Administrator Roles", href: "/admin/users", description: "Assign and review admin roles", icon: "roles", visible: (u) => u.role === "super_admin" },
      { id: "access", label: "Access & Cohorts", href: "/admin/access", description: "Central entitlement engine, cohorts, grants, quotas and codes", icon: "security", visible: (u, a) => platformAdmin(u) || a["institution.manage"] === true || a["finance.billing.manage"] === true },
      { id: "security", label: "Security & Access", href: "/admin/security", description: "Security workspace and access review", icon: "security", visible: (u, a) => platformAdmin(u) || a["audit.logs.read"] === true },
      { id: "audit", label: "Audit Trail", href: "/admin/audit", description: "Administrative change history", icon: "audit", visible: (u, a) => platformAdmin(u) || a["audit.logs.read"] === true },
      { id: "announcements", label: "Announcements & Maintenance", href: "/admin/announcements", description: "Site-wide broadcast banner and CBT maintenance mode", icon: "communication", visible: (u, a) => platformAdmin(u) || a["cbt.config.manage"] === true },
      { id: "data-export", label: "Data Export & Backups", href: "/admin/data-export", description: "Export candidates, results, payments and questions to CSV", icon: "content", visible: (u, a) => platformAdmin(u) || a["finance.billing.manage"] === true || a["cbt.config.manage"] === true },
    ],
  },
];

const AdminShellContext = createContext<boolean>(false);

type Props = { user: AdminUser; permissions: Access; onLogout: () => void; children: ReactNode };

export default function AdminWorkspaceShell({ user, permissions, onLogout, children }: Props) {
  const isInsideShell = useContext(AdminShellContext);
  const pathname = usePathname();
  const searchInputId = useId();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Restore collapsed preferences from localStorage
  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem("brainlab_admin_sidebar_collapsed");
      if (storedCollapsed !== null) {
        setCollapsed(storedCollapsed === "true");
      }
      const storedSections = localStorage.getItem("brainlab_admin_sidebar_sections");
      if (storedSections) {
        setCollapsedSections(JSON.parse(storedSections));
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("brainlab_admin_sidebar_collapsed", String(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("brainlab_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const toggleSection = (groupId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem("brainlab_admin_sidebar_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isSearching = Boolean(query.trim());

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.visible(user, permissions))
        .filter((item) => !q || item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [user, permissions, query]);

  const routeLabels: Record<string, string> = {
    "/admin/dashboard": "Dashboard Overview",
    "/admin/operations": "Institutional CBT Operations",
    "/admin/analytics": "Analytics & Reports",
    "/admin/questions/manage": "Question Bank",
    "/admin/questions/blueprints": "Examination Blueprints",
    "/admin/questions/high-yield": "High-Yield Topics",
    "/admin/questions/duplicates": "Duplicate Questions",
    "/admin/competitions": "Competition Arena & Question Banks",
    "/admin/sessions": "Exam Sessions",
    "/admin/codes": "Access Codes",
    "/admin/results": "Results & Corrections",
    "/admin/content": "Learning Content",
    "/admin/public-content": "Tutor Profile Review",
    "/admin/content-intelligence": "Content Intelligence",
    "/admin/academy-assessments": "Learning Assessments",
    "/admin/schools": "Schools & Organisations",
    "/admin/classroom": "Classrooms",
    "/admin/moderation": "Community Moderation",
    "/admin/ai": "AI Controls & Quotas",
    "/admin/pricing": "Plans & Pricing",
    "/admin/refunds": "Refund Queue",
    "/admin/coupons": "Coupons & Campaigns",
    "/admin/gamification": "Gamification & Rewards",
    "/admin/settings": "Settings",
    "/admin/config": "Exam Configuration",
    "/admin/academic": "Academic Structure",
    "/admin/communication": "Communications & Email Hub",
    "/admin/users": "Administrator Roles",
    "/admin/security": "Security & Audit",
    "/admin/access": "Access & Cohort Management Centre",
    "/admin/cohorts": "Access & Cohort Management Centre",
    "/admin/audit": "Audit Trail",
  };

  const currentLabel = routeLabels[pathname] ?? pathname.split("/").filter(Boolean).pop()?.replaceAll("-", " ") ?? "Workspace";
  const roleLabel = user.role.replaceAll("_", " ");

  // All hooks run before this guard to preserve React hook ordering.
  if (isInsideShell) {
    return <>{children}</>;
  }

  return (
    <AdminShellContext.Provider value={true}>
      <div className={"admin-workspace" + (collapsed ? " is-collapsed" : "")}>
      <aside className={"admin-sidebar" + (mobileOpen ? " is-open" : "")} aria-label="Admin navigation">
        {/* Brand Header */}
        <div className="admin-brand-row">
          <Link
            href="/admin/dashboard"
            className="admin-brand"
            onClick={() => setMobileOpen(false)}
            aria-label="BrainLab Academy admin dashboard"
          >
            <div className="admin-brand-mark" aria-hidden="true">
              <span>B</span>
            </div>
            <div className="admin-brand-copy">
              <strong>BRAINLAB</strong>
              <small>ACADEMY ADMIN</small>
            </div>
          </Link>

          {/* Quick Collapse Button inside Sidebar Header */}
          <button
            type="button"
            className="admin-sidebar-rail-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <>
                  <polyline points="9 18 15 12 9 6" />
                </>
              ) : (
                <>
                  <polyline points="15 18 9 12 15 6" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="admin-nav-search">
          <label htmlFor={searchInputId} className="admin-nav-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </label>
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search navigation..."
            aria-label="Search admin navigation"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              ×
            </button>
          ) : (
            <kbd className="admin-search-kbd" title="Search shortcut">/</kbd>
          )}
        </div>

        {/* Navigation Accordion Groups */}
        <nav className="admin-nav-groups" aria-label="Main sidebar navigation">
          {groups.length === 0 && (
            <div className="admin-nav-empty">
              <span>No pages match &ldquo;{query}&rdquo;</span>
            </div>
          )}

          {groups.map((group) => {
            const isSectionCollapsed = !isSearching && Boolean(collapsedSections[group.id]);

            return (
              <section className={"admin-nav-group" + (isSectionCollapsed ? " is-section-collapsed" : "")} key={group.id}>
                {/* Accordion Group Header (clickable to collapse/expand) */}
                <button
                  type="button"
                  className="admin-nav-group-header"
                  onClick={() => toggleSection(group.id)}
                  aria-expanded={!isSectionCollapsed}
                >
                  <span className="admin-nav-group-title">{group.label}</span>
                  <span className="admin-nav-group-badge">{group.items.length}</span>
                  <svg
                    className="admin-nav-group-chevron"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Group Items */}
                <div className="admin-nav-group-items">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/admin/dashboard" && pathname.startsWith(item.href + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={"admin-nav-link " + (active ? "is-active" : "")}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="admin-nav-glyph" aria-hidden="true">
                          <NavIcon name={item.icon} />
                        </span>
                        <span className="admin-nav-label">{item.label}</span>

                        {/* Floating Tooltip Card for Collapsed Rail View */}
                        <div className="admin-nav-tooltip" role="tooltip">
                          <strong className="admin-nav-tooltip-title">{item.label}</strong>
                          <span className="admin-nav-tooltip-desc">{item.description}</span>
                          <span className="admin-nav-tooltip-group">{group.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </nav>

        {/* Polished Footer with User Card & Logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-avatar-wrap">
            <span className="admin-avatar" aria-hidden="true">
              {user.email.slice(0, 1).toUpperCase() || "A"}
            </span>
            <span className="admin-avatar-status" title="Administrator active" />
          </div>
          <div className="admin-sidebar-user">
            <strong title={user.email}>{user.email}</strong>
            <span>{roleLabel}</span>
          </div>
          <button
            className="admin-logout-button"
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out of Admin"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop Scrim */}
      {mobileOpen && (
        <button
          type="button"
          className="admin-nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content Workspace */}
      <div className="admin-workspace-main">
        <header className="admin-topbar">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="admin-sidebar-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                {collapsed ? <path d="m14 9 3 3-3 3" /> : <path d="m17 9-3 3 3 3" />}
              </svg>
            </button>

            <button
              className="admin-mobile-menu"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            >
              {mobileOpen ? "×" : "☰"}
            </button>

            <div className="admin-topbar-breadcrumb">
              <Link href="/admin/dashboard" className="admin-breadcrumb-home" aria-label="Dashboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </Link>
              <span className="admin-breadcrumb-separator" aria-hidden="true">/</span>
              <span className="admin-breadcrumb-parent">Administration</span>
              <span className="admin-breadcrumb-separator" aria-hidden="true">/</span>
              <strong className="admin-breadcrumb-current truncate max-w-[140px] sm:max-w-xs">{currentLabel}</strong>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <div className="admin-cloud-indicator hidden lg:inline-flex" title="All CBT cloud microservices operational">
              <span className="admin-status-dot is-online" />
              <span>Cloud Online</span>
            </div>

            {/* Unified Instructor Studio Entry Point */}
            <Link
              href="/tutor"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-600 hover:text-white px-3.5 py-1.5 text-xs font-black text-indigo-300 transition shadow-sm active:scale-95"
              title="Open Instructor Studio (Author questions, curriculum, syllabus and lessons with Super Admin read/write privileges)"
            >
              <span>👨‍🏫</span>
              <span>Instructor Studio</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </Link>

            {/* Unified Student Learner Portal Entry Point */}
            <Link
              href="/dashboard"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 text-xs font-black text-blue-300 transition shadow-sm active:scale-95"
              title="Open Learner Portal (Experience platform from student perspective with Admin VIP privileges)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <polyline points="10 2 10 10 13 7 16 10 16 2" />
              </svg>
              <span>Student Portal</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" x2="21" y1="14" y2="3" />
              </svg>
            </Link>

            <span className="admin-role-chip" title="Your active administrator role">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
              {roleLabel}
            </span>
            <AdminNotificationBell />
          </div>
        </header>

        <main className="admin-workspace-content">{children}</main>
      </div>
    </div>
    </AdminShellContext.Provider>
  );
}
