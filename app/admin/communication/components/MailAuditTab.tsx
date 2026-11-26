"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";

interface AuditLog {
  id: string;
  admin_id?: string;
  admin_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export function MailAuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await authFetch("/api/admin/mail/audit-logs");
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      } catch {
        // silent fallback
      } finally {
        setLoading(false);
      }
    }
    void loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-extrabold text-slate-950">Mail Governance &amp; Action Audit Trail</h2>
        <p className="text-xs text-slate-500">
          Immutable forensic log of campaign approvals, dispatches, template edits, and contact suppression operations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Resource Target</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const actionColor =
                    log.action.includes("approve")
                      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                      : log.action.includes("reject")
                      ? "text-rose-800 bg-rose-50 border-rose-200"
                      : log.action.includes("dispatch")
                      ? "text-blue-800 bg-blue-50 border-blue-200"
                      : "text-slate-800 bg-slate-100 border-slate-200";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase border ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">{log.admin_name}</td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-semibold text-slate-800">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
