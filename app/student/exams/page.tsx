"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";
import { downloadCertificatePdf } from "@/app/lib/certificatePdfService";
import type { CandidateExamItem } from "@/app/api/student/exam-history/route";

export default function CandidateExamHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<CandidateExamItem[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    certificatesCount: 0,
    averageScore: 0,
    highestScore: 0,
    passRate: 0,
  });
  const [candidateName, setCandidateName] = useState<string>("Student");
  const [candidatePhone, setCandidatePhone] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "mock" | "certified">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);

      // 1. Identify current user or stored candidate session
      const { data: { user } } = await supabase.auth.getUser();

      let detectedName = "BrainLab Candidate";
      let detectedPhone = "";

      if (user) {
        detectedName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
        detectedPhone = user.phone || "";
      }

      // Check localStorage for offline / recent candidate session
      try {
        const savedCand = localStorage.getItem("candidate");
        if (savedCand) {
          const parsed = JSON.parse(savedCand);
          if (parsed.name) detectedName = parsed.name;
          if (parsed.phone) detectedPhone = parsed.phone;
        }
      } catch {}

      if (active) {
        setCandidateName(detectedName);
        setCandidatePhone(detectedPhone);
      }

      try {
        const queryParam = detectedPhone ? `?phone=${encodeURIComponent(detectedPhone)}` : "";
        const res = await fetch(`/api/student/exam-history${queryParam}`);
        if (res.ok) {
          const json = await res.json();
          if (active && json.ok && json.data) {
            setExams(json.data.exams || []);
            setStats(json.data.stats || {
              totalExams: 0,
              certificatesCount: 0,
              averageScore: 0,
              highestScore: 0,
              passRate: 0,
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall back to localStorage summary if API call fails
      }

      // Fallback check from client localStorage
      if (active) {
        try {
          const summaryStr = localStorage.getItem("exam_summary");
          if (summaryStr) {
            const summary = JSON.parse(summaryStr);
            const score = summary.score || 0;
            const total = summary.total || 400;
            const pct = Math.min(100, Math.round((score / total) * 100));

            const fallbackItem: CandidateExamItem = {
              id: summary.result_id || "mock-recent",
              resultId: summary.result_id || "mock-recent",
              type: "mock_cbt",
              title: "JAMB UTME National Standardized Mock",
              subjects: summary.subject_scores ? Object.keys(summary.subject_scores) : ["English", "Mathematics"],
              date: new Date().toISOString(),
              score,
              total,
              percentage: pct,
              grade: pct >= 75 ? "Distinction" : pct >= 60 ? "Very Good" : pct >= 50 ? "Credit" : "Pass",
              standing: pct >= 75 ? "Tier 1 University Readiness" : "Qualified Benchmark",
              status: "submitted",
              subjectScores: summary.subject_scores || {},
              certificate: null,
              hasCorrections: true,
            };

            setExams([fallbackItem]);
            setStats({
              totalExams: 1,
              certificatesCount: 0,
              averageScore: pct,
              highestScore: pct,
              passRate: pct >= 50 ? 100 : 0,
            });
          }
        } catch {}
        setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  // Filtered exams list
  const filteredExams = useMemo(() => {
    let list = exams;
    if (filter === "mock") list = list.filter((e) => e.type === "mock_cbt");
    if (filter === "certified") list = list.filter((e) => e.certificate !== null);

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((e) => {
      if (e.title.toLowerCase().includes(q)) return true;
      if (e.grade && e.grade.toLowerCase().includes(q)) return true;
      if (e.standing && e.standing.toLowerCase().includes(q)) return true;
      if (e.subjects && e.subjects.some((s) => s.toLowerCase().includes(q))) return true;
      if (e.certificate?.certificateNumber && e.certificate.certificateNumber.toLowerCase().includes(q)) return true;
      if (e.certificate?.courseName && e.certificate.courseName.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [exams, filter, searchQuery]);

  // Handle certificate issuance/generation
  async function handleClaimCertificate(exam: CandidateExamItem) {
    setGeneratingCertId(exam.id);
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: exam.resultId || exam.id,
          candidateName,
          examTitle: exam.title,
          score: exam.score,
          total: exam.total,
          subjectScores: exam.subjectScores || {},
        }),
      });

      const json = await res.json();
      if (json.ok && json.certificate) {
        const cert = json.certificate;
        toast.success("Verifiable Digital Certificate Issued!");

        // Update state with newly issued certificate
        setExams((prev) =>
          prev.map((e) => {
            if (e.id === exam.id || e.resultId === exam.resultId) {
              return {
                ...e,
                certificate: {
                  id: cert.id,
                  certificateNumber: cert.certificate_number,
                  issuedAt: cert.issued_at,
                  verifyUrl: `/verify/${cert.certificate_number}`,
                  downloadUrl: `/api/certificates/download/${cert.certificate_number}`,
                },
              };
            }
            return e;
          })
        );
        setStats((prev) => ({ ...prev, certificatesCount: prev.certificatesCount + 1 }));

        // Download the generated PDF certificate directly
        downloadCertificatePdf({
          certificateNumber: cert.certificate_number,
          recipientName: candidateName,
          examTitle: exam.title,
          score: exam.score,
          totalPossible: exam.total,
          percentage: exam.percentage,
          grade: cert.grade || exam.grade,
          standing: exam.standing,
          subjectScores: exam.subjectScores || {},
          verificationUrl: `https://www.brainlabacademy.com.ng/verify/${cert.certificate_number}`,
        });
      } else {
        toast.error(json.message || "Could not generate certificate");
      }
    } catch {
      toast.error("Failed to connect to certificate authority");
    } finally {
      setGeneratingCertId(null);
    }
  }

  // Handle direct PDF download for existing certificate
  function handleDownloadExisting(exam: CandidateExamItem) {
    if (!exam.certificate) return;
    downloadCertificatePdf({
      certificateNumber: exam.certificate.certificateNumber,
      recipientName: candidateName,
      examTitle: exam.title,
      score: exam.score,
      totalPossible: exam.total,
      percentage: exam.percentage,
      grade: exam.grade,
      standing: exam.standing,
      subjectScores: exam.subjectScores || {},
      verificationUrl: `https://www.brainlabacademy.com.ng/verify/${exam.certificate.certificateNumber}`,
    });
    toast.success("Certificate PDF downloaded!");
  }

  // View full result slip in /result
  function handleViewResult(exam: CandidateExamItem) {
    localStorage.setItem(
      "exam_summary",
      JSON.stringify({
        result_id: exam.resultId || exam.id,
        score: exam.score,
        total: exam.total,
        subject_scores: exam.subjectScores || {},
        show_results: true,
        status: exam.status,
      })
    );
    router.push("/result");
  }

  return (
    <div className="candidate-exams-page mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-slate-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-white transition">
            ← Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white">Examination History &amp; Certificates</span>
        </div>

        <Link
          href="/cbt"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] hover:bg-[#071c43] px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
        >
          <span className="flex items-center gap-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Take New CBT Exam</span></span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#012153] via-[#082a63] to-[#01183c] p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            <span className="flex items-center gap-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Verifiable Academic Ledger</span></span>
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Candidate Examination History &amp; Certificates
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed">
            Review your standardized CBT mock exams, track aggregate score trends across sittings, and generate tamper-evident PDF certificates with public verification barcodes for universities and scholarship directors.
          </p>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Exams Completed</p>
            <p className="mt-1 text-2xl font-black text-white">{stats.totalExams}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Certificates Earned</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{stats.certificatesCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Average Accuracy</p>
            <p className="mt-1 text-2xl font-black text-cyan-300">{stats.averageScore}%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Highest Score</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{stats.highestScore}%</p>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filter === "all"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All Sittings ({exams.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("mock")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filter === "mock"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Milestone Mocks ({exams.filter((e) => e.type === "mock_cbt").length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("certified")}
              className={`rounded-xl px-3.5 py-1.5 transition ${
                filter === "certified"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Certified Credentials ({exams.filter((e) => e.certificate !== null).length})
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exam, subject, grade, or certificate ID..."
              className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 pl-9 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-600 dark:focus:border-cyan-400 transition"
              aria-label="Search exam records"
            />
            <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <Link
          href="/verify"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline"
        >
          <span className="flex items-center gap-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>Search Public Verification Registry &rarr;</span></span>
        </Link>
      </div>

      {/* Main Examination History Content */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
            Querying candidate examination records &amp; certificates...
          </p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-950/60 text-blue-600">
            <svg className="h-10 w-10 text-slate-400 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
            {filter === "certified" ? "No Certificates Issued Yet" : "No Examination Attempts Recorded"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {filter === "certified"
              ? "Complete a milestone CBT mock exam scoring above the passing threshold to earn and claim your official verifiable certificate."
              : "Launch your first mock examination session to simulate real JAMB test conditions, record your aggregate score, and unlock digital certificates."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/cbt"
              className="inline-flex items-center gap-2 rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-3 text-xs font-bold text-white shadow-md transition active:scale-95"
            >
              <span className="flex items-center gap-1.5"><svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg><span>Launch JAMB Mock Simulator</span></span>
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <span className="flex items-center gap-1.5"><svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg><span>Topic Practice in Learning Hub</span></span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredExams.map((exam) => {
            const hasCertificate = Boolean(exam.certificate);
            const isMilestone = exam.type === "mock_cbt" || exam.percentage >= 50;
            const isGenerating = generatingCertId === exam.id;

            return (
              <div
                key={exam.id}
                className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700"
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-cyan-300 text-sm font-bold">
                      {exam.type === "mock_cbt" ? (
                      <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                    )}
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {exam.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Completed on {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {hasCertificate ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <span className="flex items-center gap-1"><svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Certified &bull; {exam.certificate?.certificateNumber}</span></span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <span>Score Recorded</span>
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        exam.percentage >= 75
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : exam.percentage >= 50
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                      }`}
                    >
                      {exam.grade}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6">
                  <div className="grid gap-6 sm:grid-cols-12 items-center">
                    {/* Score display */}
                    <div className="sm:col-span-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center dark:border-slate-800 dark:bg-slate-950/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Aggregate Score
                      </p>
                      <div className="my-1 flex items-baseline justify-center gap-1.5">
                        <span className="text-3xl font-black text-[#012153] dark:text-cyan-400">
                          {exam.score}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ {exam.total}</span>
                      </div>
                      <p className="text-xs font-extrabold text-blue-700 dark:text-sky-300">
                        {exam.percentage}% Accuracy
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {exam.standing}
                      </p>
                    </div>

                    {/* Subject Pills & Breakdown */}
                    <div className="sm:col-span-8 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Standardized Subjects
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {exam.subjects.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <span>{s}</span>
                              {exam.subjectScores && exam.subjectScores[s] !== undefined && (
                                <span className="font-mono font-bold text-blue-700 dark:text-cyan-400">
                                  ({exam.subjectScores[s]}/100)
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewResult(exam)}
                            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                          >
                            Result Slip
                          </button>
                          <Link
                            href="/corrections"
                            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                          >
                            Corrections
                          </Link>
                        </div>

                        {/* Certificate Actions */}
                        <div className="flex items-center gap-2">
                          {hasCertificate ? (
                            <>
                              <Link
                                href={exam.certificate!.verifyUrl}
                                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 transition"
                              >
                                Verify Credential
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDownloadExisting(exam)}
                                className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                              >
                                Download PDF
                              </button>
                            </>
                          ) : isMilestone ? (
                            <button
                              type="button"
                              onClick={() => handleClaimCertificate(exam)}
                              disabled={isGenerating}
                              className="rounded-xl bg-[#012153] hover:bg-[#071c43] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
                            >
                              <span>{isGenerating ? "Issuing..." : "Generate Verifiable Certificate"}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
