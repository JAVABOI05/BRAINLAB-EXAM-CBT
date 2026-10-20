"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { getAuditLogs, type AuditLogEntry } from "../../lib/platformConfig";
import "../admin.css";

export default function AdminAuditPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/account");
        return;
      }
      setAdmin(session);
      const data = await getAuditLogs(100);
      if (active) {
        setLogs(data);
        setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const filteredLogs = logs.filter((l) => (filterType === "all" ? true : l.entity_type === filterType));

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">Loading administrative audit logs…</section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Navigation Header */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Platform Security &amp; Compliance</div>
              <h1 className="admin-title">Administrative Audit Trail</h1>
              <p className="admin-subtitle">
                Immutable record of all administrative changes across pricing, coupons, exam rules, and academic settings.
              </p>
              {admin && (
                <div className="admin-user-chip">
                  {admin.email} · {admin.role.replaceAll("_", " ")}
                </div>
              )}
            </div>
            <div className="admin-actions">
              <Link href="/admin/dashboard" className="admin-btn-light">
                ← Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Audit Filter & Table */}
        <section className="admin-section admin-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Change History ({filteredLogs.length})</h2>
              <p className="text-xs text-slate-500">Chronological ledger of platform mutations.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-slate-300 p-2 text-xs bg-white font-bold"
              >
                <option value="all">All Entity Types</option>
                <option value="plan">Subscription Plans</option>
                <option value="coupon">Coupons &amp; Discounts</option>
                <option value="exam">CBT Exam Rules</option>
                <option value="academic">Academic Structure</option>
                <option value="ai">AI Controls</option>
                <option value="config">Platform Config</option>
              </select>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No audit log entries recorded yet for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-slate-500">
                    <th className="py-3 pr-4">Timestamp</th>
                    <th className="py-3 pr-4">Administrator</th>
                    <th className="py-3 pr-4">Entity Type</th>
                    <th className="py-3 pr-4">Target ID</th>
                    <th className="py-3 pr-4">Action</th>
                    <th className="py-3 pr-4">Change Reason</th>
                    <th className="py-3">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 pr-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "Just now"}
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-xs text-slate-900">{log.admin_email}</td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-slate-800">{log.entity_id}</td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            log.action === "created"
                              ? "bg-emerald-100 text-emerald-900"
                              : log.action === "deleted"
                              ? "bg-red-100 text-red-900"
                              : "bg-blue-100 text-blue-900"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-700 max-w-xs truncate">
                        {log.change_reason || "—"}
                      </td>
                      <td className="py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(log)}
                          className="rounded-lg border px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Diff Inspection Modal */}
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Audit Log Details</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedEntry.admin_email} · {selectedEntry.created_at}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="rounded-xl border p-2 text-slate-500 hover:bg-slate-100 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 space-y-4 text-xs">
                <div>
                  <span className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Reason:
                  </span>
                  <p className="rounded-xl bg-slate-50 border p-3 text-slate-900 font-medium">
                    {selectedEntry.change_reason || "No explicit reason logged."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                      Previous Value:
                    </span>
                    <pre className="rounded-xl bg-slate-50 border p-3 text-[11px] font-mono overflow-auto max-h-56">
                      {JSON.stringify(selectedEntry.previous_value, null, 2) || "None"}
                    </pre>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                      New Value:
                    </span>
                    <pre className="rounded-xl bg-slate-50 border p-3 text-[11px] font-mono overflow-auto max-h-56 text-indigo-950 font-bold">
                      {JSON.stringify(selectedEntry.new_value, null, 2) || "None"}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="rounded-xl bg-[#061a3a] px-6 py-2.5 font-bold text-white hover:bg-[#123566]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
