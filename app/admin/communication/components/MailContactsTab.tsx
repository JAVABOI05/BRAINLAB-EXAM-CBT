"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";

interface Contact {
  id: string;
  email: string;
  first_name?: string;
  full_name?: string;
  phone?: string;
  marketing_consent: boolean;
  is_suppressed: boolean;
  suppression_reason?: string;
  subscription_tier: string;
  created_at: string;
}

export function MailContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "consented" | "suppressed" | "paid">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filter !== "all") params.append("filter", filter);
      params.append("page", String(page));
      params.append("limit", "25");

      const res = await authFetch(`/api/admin/mail/contacts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch {
      setFeedback({ text: "Failed to load contacts directory", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContacts();
  }, [filter, page]);

  // Handle Sync from Supabase Auth
  const handleSyncAuth = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await authFetch("/api/admin/mail/contacts", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `✓ ${data.message}`, type: "success" });
        void fetchContacts();
      } else {
        setFeedback({ text: data.error || "Sync failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Suppression
  const handleToggleSuppression = async (contact: Contact) => {
    const newSuppressed = !contact.is_suppressed;
    try {
      const res = await authFetch("/api/admin/mail/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          is_suppressed: newSuppressed,
          suppression_reason: newSuppressed ? "Manually suppressed by administrator" : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, is_suppressed: newSuppressed } : c))
        );
        setFeedback({
          text: newSuppressed ? `✓ ${contact.email} added to suppression list.` : `✓ ${contact.email} removed from suppression list.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Failed to update suppression state", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">Contacts &amp; Audience Directory</h2>
          <p className="text-xs text-slate-500">
            {totalCount} registered candidate records &bull; Synced with Supabase Auth &amp; student notification preferences.
          </p>
        </div>

        <button
          onClick={handleSyncAuth}
          disabled={syncing}
          className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <span>🔄</span> {syncing ? "Synchronizing..." : "Sync from Registered Accounts"}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs font-semibold ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {(["all", "consented", "paid", "suppressed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold capitalize transition ${
                filter === f ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f === "consented" ? "Marketing Consented" : f === "paid" ? "Paid Subscribers" : f}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <input
            type="text"
            placeholder="Search email or learner name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading contacts directory...</div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No contacts found. Click &quot;Sync from Registered Accounts&quot; to index your active candidates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Learner &amp; Email</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Marketing Consent</th>
                  <th className="py-3 px-4">Suppression Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-900">{contact.full_name || contact.email.split("@")[0]}</p>
                      <p className="text-[11px] text-slate-500">{contact.email}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px] text-slate-700">
                        {contact.subscription_tier}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {contact.marketing_consent ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          ✓ Consented
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                          Opted-out
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {contact.is_suppressed ? (
                        <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                          ⛔ Suppressed
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-50 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                          Active
                        </span>
                      )}
                      {contact.suppression_reason && (
                        <p className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[200px]">
                          {contact.suppression_reason}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleSuppression(contact)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                          contact.is_suppressed
                            ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                            : "border-rose-200 text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        {contact.is_suppressed ? "Unsuppress" : "Suppress"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1 font-bold disabled:opacity-40 hover:bg-white"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 px-3 py-1 font-bold disabled:opacity-40 hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
