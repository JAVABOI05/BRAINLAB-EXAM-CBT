"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import { toast } from "@/app/lib/toast";
import { getAdminSession, type AdminUser } from "@/app/lib/adminAuth";
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
  portfolio_url?: string;
  statement_of_pedagogy: string;
  status: "Pending" | "Shortlisted" | "Interviewed" | "Approved" | "Rejected";
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  consent_recorded_at: string;
  consent_version?: string;
  created_at: string;
}

export default function AdminTutorApplicationsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<TutorApplication | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);

      try {
        const res = await fetch("/api/tutors/apply");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.applications)) {
            setApplications(data.applications);
          }
        }
      } catch {
        toast.error("Could not load applications from server.");
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [router]);

  const handleStatusChange = async (
    id: string,
    newStatus: TutorApplication["status"],
    notes?: string
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/tutors/apply", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
          adminNotes: notes ?? editingNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: newStatus,
                  admin_notes: notes ?? editingNotes,
                  reviewed_at: new Date().toISOString(),
                }
              : app
          )
        );
        if (selectedApp?.id === id) {
          setSelectedApp((prev) => (prev ? { ...prev, status: newStatus, admin_notes: notes ?? editingNotes } : null));
        }
        toast.success(`Application status updated to ${newStatus}`);
      } else {
        toast.error(data.error || "Failed to update status.");
      }
    } catch {
      toast.error("Network error while updating application.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredApplications.length === 0) {
      toast.error("No applications to export.");
      return;
    }

    const headers =
      "Reference_Code,Full_Name,Email,Phone,Location,Subjects,Highest_Qualification,Experience,Status,NDPA_Consent_At,Submitted_At\n";
    const rows = filteredApplications
      .map((app) =>
        `"${app.reference_code}","${app.full_name.replace(/"/g, '""')}","${app.email}","${app.phone}","${app.state_of_residence}","${app.primary_subjects.join("; ")}","${app.highest_qualification}","${app.years_experience}","${app.status}","${app.consent_recorded_at}","${app.created_at}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `brainlab_tutor_applications_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Tutor applications exported to CSV.");
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === "All" || app.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      app.full_name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.reference_code.toLowerCase().includes(q) ||
      (Array.isArray(app.primary_subjects) && app.primary_subjects.some((s) => s.toLowerCase().includes(q)));
    return matchesStatus && matchesQuery;
  });

  const countPending = applications.filter((a) => a.status === "Pending").length;
  const countShortlisted = applications.filter((a) => a.status === "Shortlisted").length;
  const countInterviewed = applications.filter((a) => a.status === "Interviewed").length;
  const countApproved = applications.filter((a) => a.status === "Approved").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p className="text-sm font-bold animate-pulse">Loading Educator Applications...</p>
      </div>
    );
  }

  return (
    <div className="admin-page min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="rounded-2xl bg-[#012153] p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <h1 className="text-2xl font-black tracking-tight">Tutor &amp; Educator Applications</h1>
            </div>
            <p className="mt-1 text-xs text-blue-200">
              Vetting, credential review, and NDPA 2023 compliant data capture for prospective masterclass instructors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <AdminNotificationBell />
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-slate-700 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/20 transition"
            >
              ← Back to Admin
            </Link>
            <Link
              href="/for-tutors/apply"
              target="_blank"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
            >
              View Public Form ↗
            </Link>
          </div>
        </header>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <p className="mt-1 text-2xl font-black text-amber-600">{countPending}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shortlisted</span>
            <p className="mt-1 text-2xl font-black text-blue-600">{countShortlisted}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Interviewed</span>
            <p className="mt-1 text-2xl font-black text-purple-600">{countInterviewed}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Candidates</span>
            <p className="mt-1 text-2xl font-black text-emerald-600">{countApproved}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status:</span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {["All", "Pending", "Shortlisted", "Interviewed", "Approved", "Rejected"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1 font-bold transition ${
                    statusFilter === st
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ref, subject..."
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                No educator applications found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || statusFilter !== "All"
                  ? "Try resetting your search query or status filter."
                  : "New applications submitted via /for-tutors/apply will appear here."}
              </p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <article
                key={app.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-0.5 rounded-md border border-blue-200 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300">
                      {app.reference_code}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-black text-[10px] ${
                        app.status === "Pending"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                          : app.status === "Shortlisted"
                          ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300"
                          : app.status === "Interviewed"
                          ? "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300"
                          : app.status === "Approved"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      ● {app.status}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(app.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">
                      {app.full_name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <strong>Qualification:</strong> {app.highest_qualification} •{" "}
                      <strong>Experience:</strong> {app.years_experience} •{" "}
                      <strong>Location:</strong> {app.state_of_residence}
                    </p>
                  </div>

                  {/* Subjects Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(app.primary_subjects) &&
                      app.primary_subjects.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {sub}
                        </span>
                      ))}
                  </div>

                  {/* Teaching Statement Preview */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                    &ldquo;{app.statement_of_pedagogy}&rdquo;
                  </p>
                </div>

                {/* Right Action Column */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(app);
                      setEditingNotes(app.admin_notes || "");
                    }}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition text-center shadow-xs"
                  >
                    🔍 Inspect Dossier
                  </button>

                  <div className="flex flex-col gap-1.5 pt-1">
                    {app.status === "Pending" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(app.id, "Shortlisted")}
                        className="w-full rounded-lg border border-blue-600/40 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 transition"
                      >
                        Shortlist Candidate
                      </button>
                    )}
                    {(app.status === "Pending" || app.status === "Shortlisted") && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(app.id, "Interviewed")}
                        className="w-full rounded-lg border border-purple-600/40 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-200 transition"
                      >
                        Record Interview
                      </button>
                    )}
                    {app.status === "Interviewed" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(app.id, "Approved")}
                        className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                      >
                        Approve Candidate
                      </button>
                    )}
                    {app.status === "Approved" && (
                      <Link
                        href="/admin/users"
                        className="w-full inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 transition"
                      >
                        Provision Teacher Account ↗
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Candidate Dossier Modal */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 dark:text-white space-y-6">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {selectedApp.reference_code}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedApp.full_name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-bold">Email:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedApp.email}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Phone:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedApp.phone}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Location:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedApp.state_of_residence}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Qualification:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedApp.highest_qualification}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Experience:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedApp.years_experience}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">NDPA 2023 Consent Timestamp:</span>
                  <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    {new Date(selectedApp.consent_recorded_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedApp.portfolio_url && (
                <div className="text-xs">
                  <span className="text-slate-500 font-bold">CV / Portfolio Link:</span>
                  <p className="mt-0.5">
                    <a
                      href={selectedApp.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {selectedApp.portfolio_url} ↗
                    </a>
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-bold">Teaching Philosophy Statement:</span>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedApp.statement_of_pedagogy}
                </p>
              </div>

              {/* Admin Notes Section */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Internal Administrative Vetting Notes:
                </label>
                <textarea
                  rows={3}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Record interview notes, subject assessment score, or vetting decision..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(selectedApp.id, "Rejected", editingNotes)}
                    className="rounded-xl border border-rose-600/40 bg-rose-50 px-3.5 py-2 font-bold text-rose-900 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-200 transition"
                  >
                    Reject Candidate
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(selectedApp.id, "Shortlisted", editingNotes)}
                    className="rounded-xl border border-blue-600/40 bg-blue-50 px-3.5 py-2 font-bold text-blue-900 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 transition"
                  >
                    Shortlist
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(selectedApp.id, "Interviewed", editingNotes)}
                    className="rounded-xl border border-purple-600/40 bg-purple-50 px-3.5 py-2 font-bold text-purple-900 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-200 transition"
                  >
                    Record Interview
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(selectedApp.id, "Approved", editingNotes)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                  >
                    Approve Application
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
