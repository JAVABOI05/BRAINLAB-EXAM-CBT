"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import { toast } from "@/app/lib/toast";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import "@/app/admin/admin.css";

interface SchoolInquiry {
  id: string;
  referenceCode: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  studentCount: string;
  examType: string;
  notes?: string;
  status: "Pending" | "Contacted" | "Quoted" | "Active Partner";
  submittedAt: string;
}

interface MockPinBatch {
  batchId: string;
  schoolName: string;
  examType: string;
  count: number;
  pins: string[];
  createdAt: string;
  expiryDate: string;
}

const INITIAL_INQUIRIES: SchoolInquiry[] = [
  {
    id: "inq-1",
    referenceCode: "BL-SCH-7X92A",
    schoolName: "Apex Model College, Ibadan",
    contactName: "Dr. K. Adeleke (Vice Principal)",
    email: "academics@apexcollege.edu.ng",
    phone: "+2348169389816",
    location: "Oyo State, Ibadan",
    studentCount: "101-300 students",
    examType: "JAMB UTME Mocks",
    notes: "We have 80 computers in our main lab and want to run 3 batches for 240 SS3 students next month.",
    status: "Pending",
    submittedAt: "2026-10-22 14:30",
  },
  {
    id: "inq-2",
    referenceCode: "BL-SCH-3K41P",
    schoolName: "St. Jude International Academy",
    contactName: "Mrs. O. Chukwuma (ICT Director)",
    email: "ict@stjudeacademy.org",
    phone: "+2348035552190",
    location: "Lagos State, Lekki",
    studentCount: "301-600 students",
    examType: "Full Comprehensive Suite",
    notes: "Interested in both JAMB mock and SSCE terminal assessment. Need school crest on printable slips.",
    status: "Quoted",
    submittedAt: "2026-10-21 09:15",
  },
  {
    id: "inq-3",
    referenceCode: "BL-SCH-9M88Q",
    schoolName: "Federal Science College Tutorial Centre",
    contactName: "Engr. B. Musa",
    email: "info@fsctutorials.com",
    phone: "+2349071234567",
    location: "Abuja, FCT",
    studentCount: "30-100 students",
    examType: "JAMB UTME Mocks",
    notes: "Require 60 candidate passes for weekend mock sprint.",
    status: "Active Partner",
    submittedAt: "2026-10-19 16:40",
  },
];

function createMockPinBatch(inq: SchoolInquiry, count: number): MockPinBatch {
  const generatedPins: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    generatedPins.push(`BL-${randomSuffix}`);
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 45);

  return {
    batchId: `BATCH-${Date.now().toString(36).toUpperCase()}`,
    schoolName: inq.schoolName,
    examType: inq.examType,
    count,
    pins: generatedPins,
    createdAt: new Date().toLocaleString(),
    expiryDate: expiryDate.toLocaleDateString(),
  };
}

export default function AdminSchoolsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inquiries" | "generator" | "batches">("inquiries");

  // Inquiries State
  const [inquiries, setInquiries] = useState<SchoolInquiry[]>(INITIAL_INQUIRIES);
  const [filterStatus, setFilterStatus] = useState<string>("All");

  // Generator State
  const [genSchool, setGenSchool] = useState("");
  const [genExamType, setGenExamType] = useState("JAMB UTME Mock (4 Subjects)");
  const [genCount, setGenCount] = useState<number>(50);
  const [genExpiryDays, setGenExpiryDays] = useState<number>(30);
  const [batches, setBatches] = useState<MockPinBatch[]>([]);
  const [voucherModalBatch, setVoucherModalBatch] = useState<MockPinBatch | null>(null);

  const handleQuickApproveAndGenerate = (inq: SchoolInquiry) => {
    let parsedCount = 100;
    if (inq.studentCount.includes("101-300")) parsedCount = 200;
    else if (inq.studentCount.includes("301-600")) parsedCount = 400;
    else if (inq.studentCount.includes("601+")) parsedCount = 700;
    else if (inq.studentCount.includes("50-100")) parsedCount = 80;

    const newBatch = createMockPinBatch(inq, parsedCount);

    setBatches((prev) => [newBatch, ...prev]);
    setInquiries((prev) =>
      prev.map((item) => (item.id === inq.id ? { ...item, status: "Active Partner" } : item))
    );
    setVoucherModalBatch(newBatch);
  };

  useEffect(() => {
    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);
      setLoading(false);
    }
    void init();
  }, [router]);

  // Update Status of an Inquiry
  const handleUpdateStatus = (id: string, newStatus: SchoolInquiry["status"]) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
    );
  };

  // Generate Batch of Mock PINs
  const handleGenerateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSchool.trim()) {
      toast.error("Please enter the school or institution name.");
      return;
    }

    const generatedPins: string[] = [];
    for (let i = 0; i < genCount; i++) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
      generatedPins.push(`BL-${randomSuffix}`);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + genExpiryDays);

    const newBatch: MockPinBatch = {
      batchId: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      schoolName: genSchool.trim(),
      examType: genExamType,
      count: genCount,
      pins: generatedPins,
      createdAt: new Date().toLocaleString(),
      expiryDate: expiryDate.toLocaleDateString(),
    };

    setBatches([newBatch, ...batches]);
    setActiveBatch(newBatch);
    setActiveTab("batches");
    setGenSchool("");
  };

  // Export Batch to CSV
  const handleExportBatchCsv = (batch: MockPinBatch) => {
    let csv = "Candidate_Slip_Number,School_Name,Exam_Type,Candidate_Access_PIN,Expiry_Date\n";
    batch.pins.forEach((pin, index) => {
      csv += `${index + 1},"${batch.schoolName}","${batch.examType}",${pin},${batch.expiryDate}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batch.schoolName.replace(/\s+/g, "_")}_CBT_PINs.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredInquiries = inquiries.filter((inq) =>
    filterStatus === "All" ? true : inq.status === filterStatus
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-800">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold">Verifying administrative access...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header Strip */}
        <header className="rounded-2xl bg-[#00112b] p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Institutional Directorate
              </span>
              <span className="text-xs text-slate-400">Admin: {adminUser?.email}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              School CBT Lab &amp; Mock License Manager
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Manage incoming school inquiries, generate bulk computer lab candidate PINs, and track partner institutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AdminNotificationBell />
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-slate-700 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/20 transition"
            >
              ← Back to Admin Hub
            </Link>
            <Link
              href="/schools"
              target="_blank"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
            >
              View Public School Portal ↗
            </Link>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("inquiries")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "inquiries"
                ? "bg-[#012153] text-white shadow"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            📋 School Inquiries ({inquiries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "generator"
                ? "bg-[#012153] text-white shadow"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            ⚡ Bulk PIN Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "batches"
                ? "bg-[#012153] text-white shadow"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            🖨️ Generated Batches ({batches.length})
          </button>
          <Link
            href="/admin/questions"
            className="rounded-xl px-4 py-2 text-xs font-bold bg-white text-blue-800 border border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-1.5"
          >
            📥 Bulk CSV Question Uploader ↗
          </Link>
        </div>

        {/* -----------------------------------------------------------------
            TAB 1: School Inquiries
        ----------------------------------------------------------------- */}
        {activeTab === "inquiries" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Filter Inquiries by Status:</span>
              <div className="flex gap-1.5 text-xs">
                {["All", "Pending", "Quoted", "Active Partner"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`rounded-lg px-3 py-1 font-bold ${
                      filterStatus === st
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredInquiries.map((inq) => (
                <article
                  key={inq.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold bg-blue-50 text-blue-900 px-2.5 py-0.5 rounded-md border border-blue-200">
                        {inq.referenceCode}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-black text-[10px] ${
                          inq.status === "Pending"
                            ? "bg-amber-100 text-amber-900"
                            : inq.status === "Quoted"
                            ? "bg-purple-100 text-purple-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        ● {inq.status}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{inq.submittedAt}</span>
                    </div>

                    <h3 className="text-lg font-black text-slate-950">{inq.schoolName}</h3>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>
                        <strong className="text-slate-900">Contact:</strong> {inq.contactName}
                      </p>
                      <p>
                        <strong className="text-slate-900">Phone:</strong> {inq.phone}
                      </p>
                      <p>
                        <strong className="text-slate-900">Email:</strong> {inq.email}
                      </p>
                      <p>
                        <strong className="text-slate-900">Location:</strong> {inq.location}
                      </p>
                      <p>
                        <strong className="text-slate-900">Expected Students:</strong>{" "}
                        <span className="font-bold text-blue-700">{inq.studentCount}</span>
                      </p>
                      <p>
                        <strong className="text-slate-900">Target Mock:</strong> {inq.examType}
                      </p>
                    </div>

                    {inq.notes && (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 italic">
                        &quot;{inq.notes}&quot;
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleQuickApproveAndGenerate(inq)}
                        className="rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 px-3.5 py-1.5 font-bold text-white hover:from-blue-800 hover:to-cyan-700 transition shadow"
                        title="1-Click Approve, Generate PIN batch, and open printable Accreditation Voucher"
                      >
                        ⚡ Approve &amp; Issue Slip
                      </button>
                      <a
                        href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(
                          inq.contactName
                        )},%20this%20is%20BrainLab%20Academy%20following%20up%20on%20your%20institutional%20CBT%20mock%20inquiry%20(Ref:%20${
                          inq.referenceCode
                        })`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 transition shadow"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`mailto:${inq.email}?subject=BrainLab%20CBT%20Proposal%20for%20${encodeURIComponent(
                          inq.schoolName
                        )}&body=Dear%20${encodeURIComponent(inq.contactName)},`}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      >
                        Email
                      </a>
                    </div>

                    {/* Status updater */}
                    <div className="mt-2 text-right">
                      <label className="text-[10px] font-bold text-slate-500 block uppercase">
                        Change Status:
                      </label>
                      <select
                        value={inq.status}
                        onChange={(e) =>
                          handleUpdateStatus(inq.id, e.target.value as SchoolInquiry["status"])
                        }
                        className="mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Quoted">Quoted</option>
                        <option value="Active Partner">Active Partner</option>
                      </select>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* -----------------------------------------------------------------
            TAB 2: Bulk PIN Generator
        ----------------------------------------------------------------- */}
        {activeTab === "generator" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              Generate Computer Lab Candidate PIN Batch
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Create a batch of 6-digit cryptographic candidate PINs assigned to a school computer laboratory session.
            </p>

            <form onSubmit={handleGenerateBatch} className="mt-6 space-y-4 max-w-2xl">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  School / Centre Name *
                </label>
                <input
                  type="text"
                  required
                  value={genSchool}
                  onChange={(e) => setGenSchool(e.target.value)}
                  placeholder="e.g. Corona Secondary School, Agbara"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Mock Examination Type</label>
                  <select
                    value={genExamType}
                    onChange={(e) => setGenExamType(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="JAMB UTME Mock (4 Subjects)">JAMB UTME Mock (4 Subjects, 120 Mins)</option>
                    <option value="WAEC SSCE Comprehensive Mock">WAEC SSCE Comprehensive Mock</option>
                    <option value="NECO Terminal Mock">NECO Terminal Mock</option>
                    <option value="Mid-Term CBT Assessment">Mid-Term CBT Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Number of Candidate PINs</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value={20}>20 PINs (Complimentary Sandbox Trial)</option>
                    <option value={50}>50 PINs (Small Lab)</option>
                    <option value={100}>100 PINs (Standard Cohort)</option>
                    <option value={200}>200 PINs (Large Secondary School)</option>
                    <option value={500}>500 PINs (Multi-Lab / Full Grade)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">PIN Validity Duration</label>
                <div className="mt-1.5 flex gap-2">
                  {[7, 14, 30, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setGenExpiryDays(days)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                        genExpiryDays === days
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-[#012153] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-900 active:scale-95 transition"
                >
                  ⚡ Generate {genCount} Candidate PINs for {genSchool || "School"} →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* -----------------------------------------------------------------
            TAB 3: Generated Batches
        ----------------------------------------------------------------- */}
        {activeTab === "batches" && (
          <div className="space-y-6">
            {batches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <span className="text-4xl">🖨️</span>
                <h3 className="mt-3 text-sm font-bold text-slate-900">No PIN batches generated yet</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Switch to the &quot;Bulk PIN Generator&quot; tab to generate computer lab candidate passes.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("generator")}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Open Generator Tab
                </button>
              </div>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.batchId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                          {batch.batchId}
                        </span>
                        <span className="text-slate-500">Created: {batch.createdAt}</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          Expires: {batch.expiryDate}
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg font-black text-slate-900">{batch.schoolName}</h3>
                      <p className="text-xs text-slate-600">
                        Exam: {batch.examType} • Total Allocation: {batch.count} Candidates
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVoucherModalBatch(batch)}
                        className="rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:from-blue-800 hover:to-cyan-700 transition shadow"
                        title="View and print official BrainLab Accreditation Voucher Certificate"
                      >
                        📜 Accreditation Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportBatchCsv(batch)}
                        className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow"
                      >
                        📥 Download CSV PINs
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        🖨️ Print Lab Slips
                      </button>
                    </div>
                  </div>

                  {/* Sample PIN Grid */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Candidate Access PINs (First 20 Shown):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 font-mono text-xs">
                      {batch.pins.slice(0, 20).map((pin, idx) => (
                        <div
                          key={pin}
                          className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center"
                        >
                          <span className="text-[10px] text-slate-400 block">Seat #{idx + 1}</span>
                          <span className="font-black text-blue-900">{pin}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Official Institutional Accreditation Voucher Modal */}
      {voucherModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-10 shadow-2xl text-slate-900 border-4 border-double border-blue-900">
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900 uppercase tracking-widest">
                Official Institutional Dispatch
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-[#012153] px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-900 transition flex items-center gap-1.5"
                >
                  <span>🖨️ Print / Save PDF Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherModalBatch(null)}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Voucher Certificate Sheet */}
            <div className="mt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-blue-900 pb-5 text-center sm:text-left">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">
                    BrainLab Academy • Directorate of Academic Assessment
                  </p>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-black text-[#012153] tracking-tight">
                    CBT ACCREDITATION &amp; PASS VOUCHER
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Authorization for Computer Lab Automated Examination Session
                  </p>
                </div>
                <div className="flex flex-col items-center sm:items-end">
                  <span className="rounded-xl bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-cyan-300">
                    {voucherModalBatch.batchId}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Issued: {voucherModalBatch.createdAt}
                  </span>
                </div>
              </div>

              {/* Institution Metadata Grid */}
              <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-blue-50/70 p-5 border border-blue-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Accredited Institution:</span>
                  <strong className="text-base text-blue-950 font-black">{voucherModalBatch.schoolName}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Examination Program:</span>
                  <strong className="text-base text-blue-950 font-black">{voucherModalBatch.examType}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Candidate Seat Allocation:</span>
                  <strong className="text-sm text-emerald-800 font-black">{voucherModalBatch.count} Authorized Candidates</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Batch Expiration Date:</span>
                  <strong className="text-sm text-rose-800 font-black">{voucherModalBatch.expiryDate}</strong>
                </div>
              </div>

              {/* Activation Instructions */}
              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  📌 ICT Laboratory / Exam Officer Instructions:
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>
                    Instruct candidates to open their laboratory browser and visit:{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-blue-900 border border-slate-300">
                      https://brainlabexam-cbt.vercel.app/access
                    </code>
                  </li>
                  <li>
                    Distribute an individual 6-digit Candidate PIN from this batch to each candidate seat.
                  </li>
                  <li>
                    Candidates enter their PIN, verify their subject combination, and launch the timed CBT exam.
                  </li>
                  <li>
                    Results and instantaneous cognitive diagnostic slips will generate automatically upon test completion.
                  </li>
                </ol>
              </div>

              {/* Signatures & Seal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-200 text-xs">
                <div className="text-center sm:text-left">
                  <div className="h-10 w-36 border-b border-dashed border-slate-400 mb-1" />
                  <p className="font-bold text-slate-900">Dr. K. Adeleke</p>
                  <p className="text-[10px] text-slate-500">Academic Assessment Director</p>
                </div>
                <div className="rounded-full border-2 border-double border-blue-900 p-3 text-center">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-950 block">
                    ★ OFFICIAL SEAL ★
                  </span>
                  <span className="text-[9px] text-slate-500 block">BrainLab Nigeria</span>
                </div>
                <div className="text-center sm:text-right">
                  <div className="h-10 w-36 border-b border-dashed border-slate-400 mb-1" />
                  <p className="font-bold text-slate-900">Exam Officer / Principal</p>
                  <p className="text-[10px] text-slate-500">{voucherModalBatch.schoolName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
