"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminSession, type AdminUser } from "@/app/lib/adminAuth";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import "@/app/admin/admin.css";

interface TutorApplication {
  id: string;
  reference_code: string;
  full_name: string;
  email: string;
  phone: string;
  state_of_residence: string;
  highest_qualification: string;
  primary_subjects: string[];
  target_curricula: string[];
  years_experience: string;
  portfolio_url?: string | null;
  statement_of_pedagogy: string;
  status: "Pending" | "Shortlisted" | "Interviewed" | "Approved" | "Rejected";
  admin_notes?: string | null;
  reviewed_at?: string | null;
  consent_version: string;
  consent_recorded_at: string;
  created_at: string;
}

export default function AdminTutorsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<TutorApplication | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<TutorApplication["status"]>("Pending");

  useEffect(() => {
    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      await loadApplications();
      setLoading(false);
    }
    void init();
  }, [router]);

  async function loadApplications() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/tutors/apply", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.applications)) {
          setApplications(data.applications);
        }
      } else {
        toast.error("Failed to load tutor applications from registry.");
      }
    } catch {
      toast.error("Network error connecting to educator registry.");
    }
  }

  const handleOpenReview = (app: TutorApplication) => {
    setSelectedApp(app);
    setNotesDraft(app.admin_notes || "");
    setStatusDraft(app.status);
  };

  const handleSaveReview = async () => {
    if (!selectedApp) return;
    setIsUpdating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/tutors/apply", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: selectedApp.id,
          status: statusDraft,
          adminNotes: notesDraft,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(`Application ${selectedApp.reference_code} updated to ${statusDraft}.`);
        setApplications((prev) =>
          prev.map((item) =>
            item.id === selectedApp.id
              ? {
                  ...item,
                  status: statusDraft,
                  admin_notes: notesDraft,
                  reviewed_at: new Date().toISOString(),
                }
              : item
          )
        );
        setSelectedApp(null);
      } else {
        toast.error(data.error || "Failed to update review record.");
      }
    } catch {
      toast.error("Network error updating application.");
    } finally {
      setIsUpdating(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      "Reference Code",
      "Full Name",
      "Email",
      "Phone",
      "State",
      "Qualification",
      "Years Experience",
      "Primary Subjects",
      "Target Curricula",
      "Status",
      "Submitted At",
      "Admin Notes",
    ];

    const rows = filteredApplications.map((app) => [
      app.reference_code,
      `"${app.full_name.replace(/"/g, '""')}"`,
      app.email,
      app.phone,
      `"${app.state_of_residence}"`,
      `"${app.highest_qualification}"`,
      app.years_experience,
      `"${app.primary_subjects.join(", ")}"`,
      `"${app.target_curricula.join(", ")}"`,
      app.status,
      app.created_at,
      `"${(app.admin_notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `brainlab-tutor-applications-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully.");
  };

  // Filter Logic
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === "All" || app.status === filterStatus;
    const matchesSubject =
      filterSubject === "All" || app.primary_subjects.includes(filterSubject);
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      app.full_name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.reference_code.toLowerCase().includes(q) ||
      app.primary_subjects.some((s) => s.toLowerCase().includes(q));

    return matchesStatus && matchesSubject && matchesQuery;
  });

  // Telemetry Counts
  const counts = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "Pending").length,
    shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
    interviewed: applications.filter((a) => a.status === "Interviewed").length,
    approved: applications.filter((a) => a.status === "Approved").length,
    rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-400">Loading Educator Review Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-xs font-bold text-slate-400 hover:text-white transition"
          >
            ← Admin Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>👨‍🏫</span>
            <span>Educator &amp; Tutor Applications</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={filteredApplications.length === 0}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition disabled:opacity-40"
          >
            Export CSV ({filteredApplications.length})
          </button>
          <AdminNotificationBell />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="block text-xs font-bold text-slate-400">Total Received</span>
            <span className="text-2xl font-black text-white">{counts.total}</span>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <span className="block text-xs font-bold text-amber-400">Pending Review</span>
            <span className="text-2xl font-black text-amber-300">{counts.pending}</span>
          </div>
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
            <span className="block text-xs font-bold text-blue-400">Shortlisted</span>
            <span className="text-2xl font-black text-blue-300">{counts.shortlisted}</span>
          </div>
          <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
            <span className="block text-xs font-bold text-purple-400">Interviewed</span>
            <span className="text-2xl font-black text-purple-300">{counts.interviewed}</span>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
            <span className="block text-xs font-bold text-emerald-400">Approved</span>
            <span className="text-2xl font-black text-emerald-300">{counts.approved}</span>
          </div>
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4">
            <span className="block text-xs font-bold text-rose-400">Declined</span>
            <span className="text-2xl font-black text-rose-300">{counts.rejected}</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name, email, ref, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interviewed">Interviewed</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("All");
                setFilterSubject("All");
              }}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Reset
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-bold text-white">{filteredApplications.length}</span> of {applications.length}
          </div>
        </div>

        {/* Applications Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-3">Reference / Applicant</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3">Subjects</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No educator applications found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <span className="block font-mono text-[11px] font-bold text-blue-400">
                          {app.reference_code}
                        </span>
                        <span className="block font-bold text-white text-sm">{app.full_name}</span>
                        <span className="block text-[11px] text-slate-400">{app.email}</span>
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {app.highest_qualification}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {app.primary_subjects.map((sub) => (
                            <span
                              key={sub}
                              className="rounded-md bg-blue-950/60 border border-blue-800/50 px-1.5 py-0.5 text-[10px] font-bold text-blue-300"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-200">{app.years_experience}</span>
                        <span className="block text-[10px] text-slate-500">{app.state_of_residence}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            app.status === "Pending"
                              ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                              : app.status === "Shortlisted"
                              ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                              : app.status === "Interviewed"
                              ? "bg-purple-950/80 text-purple-300 border border-purple-800/60"
                              : app.status === "Approved"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                              : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenReview(app)}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition"
                        >
                          Review &amp; Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Review Modal / Drawer */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400">
                  {selectedApp.reference_code}
                </span>
                <h2 className="text-xl font-black text-white">{selectedApp.full_name}</h2>
                <p className="text-xs text-slate-400">
                  {selectedApp.highest_qualification} • {selectedApp.years_experience} • {selectedApp.state_of_residence}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Contact Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                <span className="text-slate-500 font-bold block">Contact Details</span>
                <span className="block text-white font-medium">{selectedApp.email}</span>
                <span className="block text-slate-300">{selectedApp.phone}</span>
                <a
                  href={`https://wa.me/${selectedApp.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-bold text-emerald-400 hover:underline"
                >
                  Direct WhatsApp Chat →
                </a>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                <span className="text-slate-500 font-bold block">Curricula &amp; Portfolio</span>
                <div className="flex flex-wrap gap-1">
                  {selectedApp.target_curricula.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                {selectedApp.portfolio_url ? (
                  <a
                    href={selectedApp.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-bold text-blue-400 hover:underline truncate"
                  >
                    View External Portfolio ↗
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 italic block mt-1">No portfolio link provided</span>
                )}
              </div>
            </div>

            {/* Pedagogical Statement */}
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="text-xs font-bold text-slate-400 block">Statement of Pedagogy</span>
              <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {selectedApp.statement_of_pedagogy}
              </p>
            </div>

            {/* Status & Review Notes Form */}
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Evaluation &amp; Governance Decision
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Application Status
                  </label>
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as TutorApplication["status"])}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Pending">Pending Review</option>
                    <option value="Shortlisted">Shortlisted for Interview</option>
                    <option value="Interviewed">Interviewed</option>
                    <option value="Approved">Approved for Accreditation</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-300 mb-1">
                    Role Provisioning Notice
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Approving here accredits the educator in the registry. To provision live platform authoring permissions, visit{" "}
                    <Link
                      href="/admin/users"
                      className="text-blue-400 underline font-bold hover:text-blue-300"
                    >
                      User &amp; Role Management
                    </Link>{" "}
                    with Admin PIN confirmation.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Internal Reviewer Notes &amp; Action Items
                </label>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="e.g. Interview scheduled for Thursday 2pm. Verified TRCN registration number..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveReview}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {isUpdating ? "Saving..." : "Save Review Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
