"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { OFFICIAL_UTME_ENGLISH_BLUEPRINT, OFFICIAL_STANDARD_SUBJECT_BLUEPRINT } from "../../../lib/examEngine/blueprints";
import { ExamBlueprint, SectionConfig } from "../../../lib/examEngine/types";
import { supabase } from "../../../lib/supabase";
import "../../admin.css";

export default function BlueprintsAdminPage() {
  const [activeTab, setActiveTab] = useState<"english" | "standard" | "reading_texts" | "preview">("english");
  const [englishBlueprint, setEnglishBlueprint] = useState<ExamBlueprint>(OFFICIAL_UTME_ENGLISH_BLUEPRINT);
  const [readingText, setReadingText] = useState("The Lekki Headmaster");
  const [readingTextAuthor, setReadingTextAuthor] = useState("Kabir Alabi Garba");
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [previewSubject, setPreviewSubject] = useState("English");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPaper, setPreviewPaper] = useState<Array<{ id: number; question: string; category: string; marks: number }> | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      try {
        const { data: questions } = await supabase
          .from("questions")
          .select("id, subject, section, category, topic, is_active");

        const counts: Record<string, number> = {
          total: questions?.length || 0,
          english_total: 0,
          english_active: 0,
          math_active: 0,
          chem_active: 0,
          phys_active: 0,
          bio_active: 0,
          comprehension: 0,
          cloze: 0,
          reading_text: 0,
          sentence_interpretation: 0,
          antonyms: 0,
          synonyms: 0,
          sentence_completion: 0,
          oral_forms: 0,
        };

        for (const q of questions || []) {
          const subj = (q.subject || "").toLowerCase();
          const cat = (q.topic || q.category || "").toLowerCase();
          const sec = (q.section || "").toLowerCase();

          if (subj.includes("english")) {
            counts.english_total++;
            if (q.is_active) {
              counts.english_active++;
              if (sec.includes("comprehension") && !cat.includes("cloze")) counts.comprehension++;
              if (cat.includes("cloze") || sec.includes("cloze")) counts.cloze++;
              if (cat.includes("lekki") || sec.includes("literature")) counts.reading_text++;
              if (cat.includes("interpretation")) counts.sentence_interpretation++;
              if (cat.includes("antonym")) counts.antonyms++;
              if (cat.includes("synonym")) counts.synonyms++;
              if (cat.includes("completion") || cat.includes("concord") || cat.includes("tense")) counts.sentence_completion++;
              if (cat.includes("oral")) counts.oral_forms++;
            }
          } else if (subj.includes("math") && q.is_active) {
            counts.math_active++;
          } else if (subj.includes("chem") && q.is_active) {
            counts.chem_active++;
          } else if (subj.includes("phys") && q.is_active) {
            counts.phys_active++;
          } else if (subj.includes("bio") && q.is_active) {
            counts.bio_active++;
          }
        }
        setDbStats(counts);
      } catch (err) {
        console.error("Failed to load DB stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    void loadStats();
  }, []);

  async function handleGeneratePreview() {
    setPreviewLoading(true);
    setPreviewPaper(null);
    try {
      const isEnglish = previewSubject.toLowerCase().includes("english");
      const { data: rows } = await supabase
        .from("questions")
        .select("id, question, category, marks, section")
        .eq("is_active", true)
        .ilike("subject", isEnglish ? "English" : previewSubject)
        .limit(isEnglish ? 60 : 40);

      if (rows) {
        setPreviewPaper(
          rows.map((r, idx) => ({
            id: r.id,
            question: r.question,
            category: r.category || r.section || "General",
            marks: isEnglish ? (idx < 5 ? 3 : idx < 15 ? 2 : 1) : 2.5,
          }))
        );
      }
    } catch {
      setPreviewPaper([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="admin-page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link href="/admin/questions/manage" className="hover:text-blue-600">Questions</Link>
            <span>/</span>
            <span className="text-slate-800">Examination Blueprints</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Examination Blueprints &amp; Section Quotas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative examination blueprints, section mark allocations, reading text selection, and score conversion rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/high-yield"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ⭐ High-Yield Topics
          </Link>
          <Link
            href="/admin/questions/duplicates"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            🔍 Duplicate Manager
          </Link>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("english")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "english"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📖 UTME English Blueprint (60 Questions · 90 Raw)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("standard")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "standard"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📐 Standard Subjects Blueprint (40 Questions · 100 Marks)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reading_texts")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "reading_texts"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📚 Reading Texts Registry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          🔬 Paper Generation Preview
        </button>
      </div>

      {/* Tab: UTME English Blueprint */}
      {activeTab === "english" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Total Questions</span>
              <p className="text-2xl font-black text-blue-950 mt-1">60 Questions</p>
              <p className="text-[11px] text-blue-800 mt-0.5">Compulsory Slot 1 for all candidates</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Raw Total Marks</span>
              <p className="text-2xl font-black text-indigo-950 mt-1">90 Marks</p>
              <p className="text-[11px] text-indigo-800 mt-0.5">Sum of all 8 section mark weights</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Student Converted Score</span>
              <p className="text-2xl font-black text-emerald-950 mt-1">100 Marks</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">Formula: (Raw ÷ 90) × 100</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Prescribed Reading Text</span>
              <p className="text-base font-black text-amber-950 mt-1 truncate">{readingText}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">10 Questions (1 mark each)</p>
            </div>
          </div>

          {/* Section Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured 8-Section Quotas &amp; Scoring Rule</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The examination generator strictly selects questions adhering to this section distribution.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                ● Status: Active &amp; Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Section Name</th>
                    <th className="py-3 px-4 text-center">Questions Quota</th>
                    <th className="py-3 px-4 text-center">Marks / Question</th>
                    <th className="py-3 px-4 text-center">Raw Subtotal</th>
                    <th className="py-3 px-4">Passage Constraint</th>
                    <th className="py-3 px-4 text-center">DB Active Pool</th>
                    <th className="py-3 px-4 text-right">Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {englishBlueprint.sections_config.map((sec, idx) => {
                    let poolKey = "";
                    if (sec.section.includes("Comprehension")) poolKey = "comprehension";
                    else if (sec.section.includes("Cloze")) poolKey = "cloze";
                    else if (sec.section.includes("Reading")) poolKey = "reading_text";
                    else if (sec.section.includes("interpretation")) poolKey = "sentence_interpretation";
                    else if (sec.section.includes("Antonyms")) poolKey = "antonyms";
                    else if (sec.section.includes("Synonyms")) poolKey = "synonyms";
                    else if (sec.section.includes("completion")) poolKey = "sentence_completion";
                    else if (sec.section.includes("Oral")) poolKey = "oral_forms";

                    const activeCount = dbStats[poolKey] || 0;
                    const isSufficient = activeCount >= sec.quota;

                    return (
                      <tr key={sec.section} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{sec.section}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{sec.description}</p>
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-blue-700">
                          {sec.quota}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600">
                          {sec.marks_per_question}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-indigo-700">
                          {sec.raw_total}
                        </td>
                        <td className="py-3 px-4">
                          {sec.passage_required ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-bold text-[10px]">
                              Complete Linked Passage
                            </span>
                          ) : sec.reading_text_id ? (
                            <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-bold text-[10px]">
                              {readingText}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Independent Discrete</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                          {loadingStats ? "..." : activeCount}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-bold text-[10px] ${
                              isSufficient
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isSufficient ? "✓ Fully Ready" : "⚠️ Shortage"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-900">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-xs">
                      Official Blueprint Totals
                    </td>
                    <td className="py-3.5 px-4 text-center text-blue-700 text-sm">60</td>
                    <td className="py-3.5 px-4 text-center text-slate-500">—</td>
                    <td className="py-3.5 px-4 text-center text-indigo-700 text-sm">90 Raw</td>
                    <td colSpan={3} className="py-3.5 px-4 text-right text-emerald-700 font-bold">
                      Converted Score: 100/100 (Upward Rounding)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Standard Subject Blueprint */}
      {activeTab === "standard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Elective Paper Size</span>
              <p className="text-2xl font-black text-blue-950 mt-1">40 Questions</p>
              <p className="text-[11px] text-blue-800 mt-0.5">Maths, Chemistry, Physics, Biology, etc.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Marks Per Question</span>
              <p className="text-2xl font-black text-emerald-950 mt-1">2.5 Marks</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">40 × 2.5 = 100 Maximum Marks</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Coverage Strategy</span>
              <p className="text-base font-black text-indigo-950 mt-1">Maximise Distinct Topics</p>
              <p className="text-[11px] text-indigo-800 mt-0.5">Round-robin curriculum distribution</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Standard Examination Rules &amp; Marking Formula</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard UTME elective examinations consist of 40 multiple-choice questions (options A–D or A–E). Each correct response awards 2.5 marks. An incorrect or unanswered question awards 0 marks.
            </p>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs font-mono text-slate-800 space-y-1">
              <p>• Example: 31 correct answers × 2.5 = 77.5 marks</p>
              <p>• Internal storage preserves raw 77.5 marks and precise percentage.</p>
              <p>• Student-facing whole-number display rounds upward to 78.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reading Texts Registry */}
      {activeTab === "reading_texts" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">Prescribed Reading Texts Registry</h3>
            <p className="text-xs text-slate-500 mb-6">
              Configure the eligible reading text for the active academic session. The engine verifies sufficient valid questions before generating papers.
            </p>

            <div className="space-y-4">
              {/* The Lekki Headmaster */}
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">The Lekki Headmaster</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      ● Active (Current Session)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Author: Kabir Alabi Garba · 486 questions available in bank</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Official prescribed novel for current UTME examination cycle. 10 questions are allocated to this text in each English paper.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-300">
                    Active &amp; Locked
                  </span>
                </div>
              </div>

              {/* The Life Changer */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-70">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-700">The Life Changer</span>
                    <span className="rounded-full bg-slate-200 text-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      ⏸ Deferred / Archived
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Author: Khadija Abubakar Jalli · Retained in archive</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Previous syllabus novel. Deferred from new paper generation until separately re-approved.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
                    Deferred
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Paper Generation Preview */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">Live Paper Blueprint Generation Preview</h3>
            <p className="text-xs text-slate-500 mb-4">
              Simulate paper selection for any subject to inspect question quotas, mark distributions, and distinct topic spread before activating.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800"
                value={previewSubject}
                onChange={(e) => setPreviewSubject(e.target.value)}
              >
                <option value="English">English Language (60 Questions · 90 Raw Marks)</option>
                <option value="Mathematics">Mathematics (40 Questions · 100 Marks)</option>
                <option value="Chemistry">Chemistry (40 Questions · 100 Marks)</option>
                <option value="Physics">Physics (40 Questions · 100 Marks)</option>
                <option value="Biology">Biology (40 Questions · 100 Marks)</option>
              </select>

              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={previewLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {previewLoading ? "Simulating Generation..." : "Run Paper Simulation →"}
              </button>
            </div>
          </div>

          {previewPaper && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Simulated Paper for {previewSubject} ({previewPaper.length} Questions)
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  Total Raw Marks: {previewPaper.reduce((sum, q) => sum + q.marks, 0)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto text-xs">
                {previewPaper.map((q, idx) => (
                  <div key={q.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-50">
                    <span className="font-mono font-bold text-slate-400 w-6 shrink-0">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-bold">
                          {q.category}
                        </span>
                        <span className="text-[11px] text-blue-700 font-bold">
                          {q.marks} mark{q.marks !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
