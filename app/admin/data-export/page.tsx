"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";

export default function DataExportAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function init() {
      const currentAdmin = await getAdminSession();
      if (!active) return;
      if (!currentAdmin) {
        router.replace("/account");
        return;
      }
      setAdmin(currentAdmin);

      const perms: Partial<Record<AdminPermission, boolean>> = {};
      perms["finance.billing.manage"] = await adminHasPermission("finance.billing.manage");
      perms["audit.logs.read"] = await adminHasPermission("audit.logs.read");
      perms["cbt.questions.manage"] = await adminHasPermission("cbt.questions.manage");
      setPermissions(perms);
      setLoading(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Data Export Hub...</p>
        </div>
      </div>
    );
  }

  const exportDatasets = [
    {
      id: "candidates",
      title: "Student & Candidate Registry",
      badge: "User Data",
      description: "Full directory of registered candidates including email, full name, phone number, target examination, target score, state of origin, active subscription tier, and registration timestamp.",
      icon: "🎓",
      buttonLabel: "Download Candidates CSV",
      href: "/api/admin/export?type=candidates",
      color: "border-blue-200 bg-blue-50/40",
      btnColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "results",
      title: "CBT Exam Results & Score Sheets",
      badge: "Academic Records",
      description: "Complete ledger of graded candidate exam sessions. Includes candidate name, phone number, subject combinations, raw score, maximum marks, percentage score, and completion datetime.",
      icon: "📊",
      buttonLabel: "Download Results CSV",
      href: "/api/admin/export?type=results",
      color: "border-emerald-200 bg-emerald-50/40",
      btnColor: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      id: "transactions",
      title: "Financial Ledger & Payment Transactions",
      badge: "Finance & Accounting",
      description: "Detailed record of all subscription purchases, coupon redemptions, and gateway receipts. Includes transaction reference, customer email, plan name, amount in NGN, discount, provider, and payment date.",
      icon: "💳",
      buttonLabel: "Download Financial Ledger CSV",
      href: "/api/admin/export?type=transactions",
      color: "border-purple-200 bg-purple-50/40",
      btnColor: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "questions",
      title: "Question Bank Master Backup",
      badge: "Content Repository",
      description: "Complete offline backup of the platform's question bank. Contains subject, syllabus topic, question text, option choices (A, B, C, D), correct key, and comprehensive step-by-step explanations.",
      icon: "📚",
      buttonLabel: "Download Question Bank CSV",
      href: "/api/admin/export?type=questions",
      color: "border-amber-200 bg-amber-50/40",
      btnColor: "bg-amber-600 hover:bg-amber-700",
    },
  ];

  return (
    <AdminWorkspaceShell
      user={admin}
      permissions={permissions}
      onLogout={async () => {
        await adminSignOut();
        router.replace("/account");
      }}
    >
      <div className="max-w-5xl space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
            Data Governance & Backups
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            Platform Data Export & Backup Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Export official records into universal spreadsheet formats (CSV) for offline analytics, auditing, or institutional archiving.
          </p>
        </div>

        {/* Security & Integrity Alert */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 flex items-start gap-3">
          <span className="text-lg">🛡️</span>
          <div>
            <p className="font-bold">Cryptographic Sanitation & Injection Protection</p>
            <p className="mt-0.5 text-blue-800 text-[11px] leading-relaxed">
              All generated CSV documents are sanitized on the server to neutralize CSV formula injection exploits (<code className="font-mono bg-blue-100 px-1 rounded">=, +, -, @</code>). Downloaded files are strictly UTF-8 encoded and compatible with Microsoft Excel, Google Sheets, and Apple Numbers.
            </p>
          </div>
        </div>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportDatasets.map((ds) => (
            <div
              key={ds.id}
              className={`rounded-3xl border ${ds.color} p-6 sm:p-7 flex flex-col justify-between shadow-xs transition hover:shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{ds.icon}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 border border-slate-200 shadow-2xs">
                    {ds.badge}
                  </span>
                </div>

                <h2 className="text-base font-black text-slate-900">{ds.title}</h2>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {ds.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60">
                <a
                  href={ds.href}
                  download
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl ${ds.btnColor} px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-95`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {ds.buttonLabel}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminWorkspaceShell>
  );
}
