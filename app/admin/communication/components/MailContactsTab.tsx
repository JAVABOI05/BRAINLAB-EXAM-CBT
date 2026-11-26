"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/app/lib/authFetch";
import { normalizeWhatsAppNumber } from "@/app/lib/whatsapp";

interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  marketing_consent: boolean;
  is_suppressed: boolean;
  suppression_reason?: string;
  subscription_tier: string;
  created_at: string;
}

interface ContactsSummary {
  total: number;
  withPhone: number;
  consented: number;
  paid: number;
  newThisWeek: number;
}

export function MailContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [summary, setSummary] = useState<ContactsSummary>({
    total: 0,
    withPhone: 0,
    consented: 0,
    paid: 0,
    newThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "phone" | "consented" | "paid" | "new_7d" | "suppressed">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (filter !== "all") params.append("filter", filter);
      params.append("page", String(page));
      params.append("limit", "25");

      const res = await authFetch(`/api/admin/mail/contacts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        setFeedback({ text: data.error || "Failed to load directory", type: "error" });
      }
    } catch {
      setFeedback({ text: "Failed to load contacts directory", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

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
          text: newSuppressed
            ? `✓ ${contact.email} added to suppression list.`
            : `✓ ${contact.email} restored to active status.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Failed to update suppression state", type: "error" });
    }
  };

  // Copy phone number to clipboard
  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Format creation date
  const formatJoinedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">
            Contacts, Sign-ups &amp; Audience Directory
          </h2>
          <p className="text-xs text-slate-500">
            Search all registered accounts, view student phone numbers, launch WhatsApp chats, and manage notification consent.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/admin/mail/contacts?export=csv"
            download
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </a>

          <button
            onClick={handleSyncAuth}
            disabled={syncing}
            className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
          >
            <span>🔄</span> {syncing ? "Indexing Accounts..." : "Sync from Registered Accounts"}
          </button>
        </div>
      </div>

      {/* Directory Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Sign-ups</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{summary.total || totalCount}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">All registered users</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">📱 With Phone Number</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{summary.withPhone}</p>
          <p className="mt-0.5 text-[10px] text-emerald-700 font-semibold">
            {summary.total > 0 ? `${((summary.withPhone / summary.total) * 100).toFixed(0)}% coverage` : "SMS Ready"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Subscribers</p>
          <p className="mt-1 text-2xl font-black text-blue-900">{summary.consented}</p>
          <p className="mt-0.5 text-[10px] text-blue-700 font-semibold">Email announcements</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">⚡ New This Week</p>
          <p className="mt-1 text-2xl font-black text-amber-900">{summary.newThisWeek}</p>
          <p className="mt-0.5 text-[10px] text-amber-700 font-semibold">Recent 7 days</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">⭐ Paid Pro Candidates</p>
          <p className="mt-1 text-2xl font-black text-purple-900">{summary.paid}</p>
          <p className="mt-0.5 text-[10px] text-purple-700 font-semibold">Pro subscriptions</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-3.5 text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-sm font-black opacity-60 hover:opacity-100 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Sign-ups" },
            { id: "phone", label: "📱 Has Phone Number" },
            { id: "consented", label: "Active Subscribers" },
            { id: "new_7d", label: "⚡ New This Week" },
            { id: "paid", label: "Paid Pro" },
            { id: "suppressed", label: "⛔ Suppressed" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id as typeof filter);
                setPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filter === f.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-80">
          <input
            type="text"
            placeholder="Search name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Contacts Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2" />
            Loading contacts and phone numbers...
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <p className="font-bold text-slate-700 mb-1">No candidate records found matching this filter.</p>
            <p className="text-slate-400 mb-3">Try clearing search or click below to re-index all platform sign-ups.</p>
            <button
              onClick={handleSyncAuth}
              disabled={syncing}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Sync All Sign-ups Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Learner &amp; Email</th>
                  <th className="py-3 px-4">Phone Number &amp; WhatsApp</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Audience Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((contact) => {
                  const hasPhone = Boolean(contact.phone && contact.phone.replace(/\D/g, "").length >= 9);
                  const cleanPhone = contact.phone ? contact.phone.trim() : null;
                  const waNumber = hasPhone ? normalizeWhatsAppNumber(cleanPhone) : null;
                  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${contact.first_name || "Learner"}, this is BrainLab Academy support regarding your CBT studies.`)}` : null;

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/80 transition">
                      {/* Name and Email */}
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-slate-950">
                          {contact.full_name || contact.email.split("@")[0]}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{contact.email}</p>
                      </td>

                      {/* Phone Number & WhatsApp Direct */}
                      <td className="py-3 px-4">
                        {hasPhone && cleanPhone ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              {cleanPhone}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCopyPhone(contact.id, cleanPhone)}
                              title="Copy Phone Number"
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                            >
                              {copiedPhoneId === contact.id ? "✓ Copied" : "Copy"}
                            </button>

                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition"
                              >
                                <span>💬</span> WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">— No phone on file</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        {formatJoinedDate(contact.created_at)}
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold uppercase text-[10px] ${
                            contact.subscription_tier === "pro"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : contact.subscription_tier === "enterprise" || contact.subscription_tier === "school"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {contact.subscription_tier}
                        </span>
                      </td>

                      {/* Audience & Consent Status */}
                      <td className="py-3 px-4">
                        {contact.is_suppressed ? (
                          <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            ⛔ Suppressed
                          </span>
                        ) : contact.marketing_consent ? (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            ✓ Subscriber
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                            Opted-out
                          </span>
                        )}
                        {contact.suppression_reason && (
                          <p className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[160px]">
                            {contact.suppression_reason}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleSuppression(contact)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                            contact.is_suppressed
                              ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                              : "border-rose-200 text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          {contact.is_suppressed ? "Unsuppress" : "Suppress"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} &bull; Showing {contacts.length} of {totalCount} contacts
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-100 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold disabled:opacity-40 hover:bg-slate-100 transition"
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
