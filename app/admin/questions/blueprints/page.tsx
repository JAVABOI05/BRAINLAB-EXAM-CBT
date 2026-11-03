"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// Admin session and permissions handled at route level

import {
  OFFICIAL_UTME_ENGLISH_BLUEPRINT,
  OFFICIAL_STANDARD_SUBJECT_BLUEPRINT,
} from "../../../lib/examEngine/blueprints";
import { ExamBlueprint, SectionConfig } from "../../../lib/examEngine/types";
import { supabase } from "../../../lib/supabase";
import DifficultySlider from "../../../components/DifficultySlider";
import "../../admin.css";

type ReadingTextItem = {
  id: string;
  title: string;
  author: string;
  is_active: boolean;
  question_quota: number;
  description: string;
};

export default function BlueprintsAdminPage() {
  const [activeTab, setActiveTab] = useState<"english" | "standard" | "reading_texts" | "preview">("english");
  const [englishBlueprint, setEnglishBlueprint] = useState<ExamBlueprint>(OFFICIAL_UTME_ENGLISH_BLUEPRINT);
  const [standardBlueprint, setStandardBlueprint] = useState<ExamBlueprint>(OFFICIAL_STANDARD_SUBJECT_BLUEPRINT);
  const [readingTexts, setReadingTexts] = useState<ReadingTextItem[]>([
    {
      id: "lekki_headmaster",
      title: "The Lekki Headmaster",
      author: "Kabir Alabi Garba",
      is_active: true,
      question_quota: 10,
      description: "Official prescribed novel for current UTME examination cycle.",
    },
    {
      id: "life_changer",
      title: "The Life Changer",
      author: "Khadija Abubakar Jalli",
      is_active: false,
      question_quota: 10,
      description: "Previous syllabus novel. Deferred from new paper generation.",
    },
  ]);

  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [previewSubject, setPreviewSubject] = useState("English");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPaper, setPreviewPaper] = useState<Array<{ id: number; question: string; category: string; marks: number }> | null>(null);

  // Active novel helper
  const activeReadingText = readingTexts.find((r) => r.is_active) || readingTexts[0];

  // Calculate live English totals
  const totalEnglishQuestions = englishBlueprint.sections_config.reduce((sum, s) => sum + (Number(s.quota) || 0), 0);
  const totalEnglishRawMarks = englishBlueprint.sections_config.reduce(
    (sum, s) => sum + (Number(s.quota) || 0) * (Number(s.marks_per_question) || 0),
    0
  );

  // Calculate live Standard Subject totals
  const standardQuota = standardBlueprint.sections_config[0]?.quota || 40;
  const standardMarksPerQ = standardBlueprint.sections_config[0]?.marks_per_question || 2.5;
  const standardRawMarks = Math.round(standardQuota * standardMarksPerQ * 10) / 10;

  // Total 4-subject exam questions & marks
  const totalExamQuestions = totalEnglishQuestions + standardQuota * 3;


  // 1. Load Blueprint and Database Stats from server
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoadingConfig(true);
        const res = await fetch("/api/admin/blueprints");
        const data = await res.json();
        if (active && data.ok) {
          if (data.englishBlueprint) setEnglishBlueprint(data.englishBlueprint);
          if (data.standardBlueprint) setStandardBlueprint(data.standardBlueprint);
          if (Array.isArray(data.readingTexts) && data.readingTexts.length > 0) {
            setReadingTexts(data.readingTexts);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote blueprints, falling back to local defaults:", err);
      } finally {
        if (active) setLoadingConfig(false);
      }

      try {
        setLoadingStats(true);
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
        if (active) setDbStats(counts);
      } catch (err) {
        console.error("Failed to load DB stats:", err);
      } finally {
        if (active) setLoadingStats(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  // Update a specific English section field
  const handleUpdateEnglishSection = (index: number, field: keyof SectionConfig, value: unknown) => {
    setEnglishBlueprint((prev) => {
      const nextSections = [...prev.sections_config];
      const sec = { ...nextSections[index] };

      if (field === "quota") {
        sec.quota = Math.max(1, parseInt(String(value), 10) || 1);
        sec.raw_total = Math.round(sec.quota * sec.marks_per_question * 10) / 10;
      } else if (field === "marks_per_question") {
        sec.marks_per_question = Math.max(0.1, parseFloat(String(value)) || 1);
        sec.raw_total = Math.round(sec.quota * sec.marks_per_question * 10) / 10;
      } else {
        (sec as Record<string, unknown>)[field] = value;
      }

      nextSections[index] = sec;

      const calcTotalQ = nextSections.reduce((s, item) => s + item.quota, 0);
      const calcTotalRaw = nextSections.reduce((s, item) => s + item.raw_total, 0);

      return {
        ...prev,
        sections_config: nextSections,
        total_questions: calcTotalQ,
        raw_max_marks: calcTotalRaw,
      };
    });
  };

  // Add new English section
  const handleAddEnglishSection = () => {
    setEnglishBlueprint((prev) => {
      const newSec: SectionConfig = {
        section: `New Section ${prev.sections_config.length + 1}`,
        quota: 5,
        marks_per_question: 1,
        raw_total: 5,
        description: "Custom examination section",
        matching_categories: [],
      };
      const nextSections = [...prev.sections_config, newSec];
      const calcTotalQ = nextSections.reduce((s, item) => s + item.quota, 0);
      const calcTotalRaw = nextSections.reduce((s, item) => s + item.raw_total, 0);
      return {
        ...prev,
        sections_config: nextSections,
        total_questions: calcTotalQ,
        raw_max_marks: calcTotalRaw,
      };
    });
  };

  // Remove English section
  const handleRemoveEnglishSection = (index: number) => {
    if (englishBlueprint.sections_config.length <= 1) return;
    setEnglishBlueprint((prev) => {
      const nextSections = prev.sections_config.filter((_, i) => i !== index);
      const calcTotalQ = nextSections.reduce((s, item) => s + item.quota, 0);
      const calcTotalRaw = nextSections.reduce((s, item) => s + item.raw_total, 0);
      return {
        ...prev,
        sections_config: nextSections,
        total_questions: calcTotalQ,
        raw_max_marks: calcTotalRaw,
      };
    });
  };

  // Update Standard Blueprint Quota & Marks
  const handleUpdateStandardSection = (quotaVal: number, marksVal: number) => {
    setStandardBlueprint((prev) => {
      const safeQuota = Math.max(1, quotaVal || 40);
      const safeMarks = Math.max(0.1, marksVal || 2.5);
      const safeRaw = Math.round(safeQuota * safeMarks * 10) / 10;
      return {
        ...prev,
        total_questions: safeQuota,
        raw_max_marks: safeRaw,
        sections_config: [
          {
            ...prev.sections_config[0],
            quota: safeQuota,
            marks_per_question: safeMarks,
            raw_total: safeRaw,
          },
        ],
      };
    });
  };

  // Set Active Reading Text
  const handleSetActiveReadingText = (id: string) => {
    setReadingTexts((prev) =>
      prev.map((r) => ({
        ...r,
        is_active: r.id === id,
      }))
    );
    // Also update english blueprint reading text reference
    const selectedText = readingTexts.find((r) => r.id === id);
    if (selectedText) {
      setEnglishBlueprint((prev) => ({
        ...prev,
        reading_text_config: {
          active_text_id: selectedText.id,
          active_title: selectedText.title,
          question_quota: selectedText.question_quota || 10,
        },
      }));
    }
  };

  // Add custom reading text
  const handleAddReadingText = () => {
    const newId = "novel_" + Date.now();
    setReadingTexts((prev) => [
      ...prev,
      {
        id: newId,
        title: "New Prescribed Novel",
        author: "Author Name",
        is_active: false,
        question_quota: 10,
        description: "Prescribed literary text for English examination syllabus.",
      },
    ]);
  };

  // Save Blueprint Changes
  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        englishBlueprint: {
          ...englishBlueprint,
          reading_text_config: {
            active_text_id: activeReadingText?.id || "lekki_headmaster",
            active_title: activeReadingText?.title || "The Lekki Headmaster",
            question_quota: activeReadingText?.question_quota || 10,
          },
        },
        standardBlueprint,
        readingTexts,
      };

      const res = await fetch("/api/admin/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveMessage({ type: "error", text: data.error || "Failed to persist examination blueprints." });
      } else {
        setSaveMessage({ type: "success", text: "Examination blueprints and scoring rules saved successfully." });
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Network error while saving blueprints.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to Canonical JAMB UTME Standard
  const handleResetToDefault = async () => {
    if (!confirm("Are you sure you want to reset all examination blueprints to the official JAMB UTME standard (English: 60 Qs / 90 Raw Marks, Electives: 40 Qs / 100 Marks)?")) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSaveMessage({ type: "error", text: data.error || "Failed to reset blueprints." });
      } else {
        setEnglishBlueprint(data.englishBlueprint || OFFICIAL_UTME_ENGLISH_BLUEPRINT);
        setStandardBlueprint(data.standardBlueprint || OFFICIAL_STANDARD_SUBJECT_BLUEPRINT);
        setSaveMessage({ type: "success", text: "Successfully reset blueprints to official JAMB UTME standard." });
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (err) {
      setSaveMessage({ type: "error", text: "Failed to reset blueprints." });
    } finally {
      setSaving(false);
    }
  };

  // Live preview simulation
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
        .limit(isEnglish ? totalEnglishQuestions : standardQuota);

      if (rows) {
        setPreviewPaper(
          rows.map((r, idx) => ({
            id: r.id,
            question: r.question,
            category: r.category || r.section || "General",
            marks: isEnglish
              ? idx < 5
                ? 3
                : idx < 15
                ? 2
                : 1
              : 2.5,
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
      {/* Header */}
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
            Configure section question quotas, mark weights, prescribed novel, and standardized 400-point scoring.
          </p>
        </div>

        {/* Global Save & Reset Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            ↺ Reset UTME Defaults
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Message Notification */}
      {saveMessage && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-sm border ${
            saveMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{saveMessage.text}</span>
          <button type="button" onClick={() => setSaveMessage(null)} className="underline text-slate-500 hover:text-slate-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">English Language (Slot 1)</span>
          <p className="text-2xl font-black text-blue-950 mt-1">{totalEnglishQuestions} Questions</p>
          <p className="text-[11px] text-blue-800 mt-0.5">Raw Max Marks: {totalEnglishRawMarks} · Converted: 100/100</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Elective Subjects (Slots 2–4)</span>
          <p className="text-2xl font-black text-indigo-950 mt-1">{standardQuota} Questions / Each</p>
          <p className="text-[11px] text-indigo-800 mt-0.5">{standardMarksPerQ} marks/q · Max: {standardRawMarks} marks each</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Full Paper &amp; Score Cap</span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{totalExamQuestions} Questions · 400 Total</p>
          <p className="text-[11px] text-emerald-800 mt-0.5">100 marks/subject cap · 4 subjects in total</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Active Prescribed Novel</span>
          <p className="text-base font-black text-amber-950 mt-1 truncate">{activeReadingText?.title || "None"}</p>
          <p className="text-[11px] text-amber-800 mt-0.5">{activeReadingText?.question_quota || 10} Questions · 1 mark each</p>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("english")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "english"
              ? "border-blue-600 text-blue-700 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📖 English Section Distribution ({totalEnglishQuestions} Qs · {totalEnglishRawMarks} Raw)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("standard")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "standard"
              ? "border-blue-600 text-blue-700 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📐 Standard Subjects Blueprint ({standardQuota} Qs · {standardRawMarks} Marks)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reading_texts")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "reading_texts"
              ? "border-blue-600 text-blue-700 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📚 Prescribed Novels Registry ({readingTexts.length} Titles)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-700 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          🔬 Paper Generation Preview
        </button>
      </div>

      {/* TAB 1: UTME English Blueprint */}
      {activeTab === "english" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  UTME English 8-Section Distribution &amp; Scoring Weights
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust quotas, marks per question, and passage requirements. The examination generator strictly selects questions adhering to this configuration.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddEnglishSection}
                  className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  + Add Section
                </button>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                    totalEnglishQuestions === 60 && totalEnglishRawMarks === 90
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {totalEnglishQuestions === 60 && totalEnglishRawMarks === 90
                    ? "✓ Balanced (60 Qs · 90 Raw)"
                    : `⚠️ Unbalanced: ${totalEnglishQuestions} Qs · ${totalEnglishRawMarks} Raw`}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-10">#</th>
                    <th className="py-3 px-4 min-w-[200px]">Section Name</th>
                    <th className="py-3 px-4 text-center w-28">Question Quota</th>
                    <th className="py-3 px-4 text-center w-28">Marks / Question</th>
                    <th className="py-3 px-4 text-center w-24">Raw Subtotal</th>
                    <th className="py-3 px-4 min-w-[160px]">Passage / Text Constraint</th>
                    <th className="py-3 px-4 text-center w-24">DB Active</th>
                    <th className="py-3 px-4 text-right w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {englishBlueprint.sections_config.map((sec, idx) => {
                    let poolKey = "";
                    if (sec.section.toLowerCase().includes("comprehension")) poolKey = "comprehension";
                    else if (sec.section.toLowerCase().includes("cloze")) poolKey = "cloze";
                    else if (sec.section.toLowerCase().includes("reading")) poolKey = "reading_text";
                    else if (sec.section.toLowerCase().includes("interpretation")) poolKey = "sentence_interpretation";
                    else if (sec.section.toLowerCase().includes("antonym")) poolKey = "antonyms";
                    else if (sec.section.toLowerCase().includes("synonym")) poolKey = "synonyms";
                    else if (sec.section.toLowerCase().includes("completion")) poolKey = "sentence_completion";
                    else if (sec.section.toLowerCase().includes("oral")) poolKey = "oral_forms";

                    const activeCount = dbStats[poolKey] || 0;
                    const isSufficient = activeCount >= sec.quota;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={sec.section}
                            onChange={(e) => handleUpdateEnglishSection(idx, "section", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{sec.description || "Section distribution domain"}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={sec.quota}
                            onChange={(e) => handleUpdateEnglishSection(idx, "quota", e.target.value)}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-xs font-extrabold text-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="0.5"
                            value={sec.marks_per_question}
                            onChange={(e) => handleUpdateEnglishSection(idx, "marks_per_question", e.target.value)}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-xs font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-black text-indigo-700 text-xs">
                          {sec.raw_total}
                        </td>
                        <td className="py-3 px-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(sec.passage_required)}
                              onChange={(e) => handleUpdateEnglishSection(idx, "passage_required", e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span className="text-[11px] font-semibold text-slate-600">
                              {sec.passage_required ? "Linked Passage Unit" : sec.reading_text_id ? `Novel: ${activeReadingText?.title}` : "Discrete Questions"}
                            </span>
                          </label>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isSufficient ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {loadingStats ? "..." : activeCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveEnglishSection(idx)}
                            className="text-slate-400 hover:text-rose-600 font-bold text-sm px-1.5"
                            title="Remove section"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-900">
                  <tr>
                    <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-xs">
                      Configured Totals
                    </td>
                    <td className="py-3.5 px-4 text-center text-blue-700 text-sm font-black">
                      {totalEnglishQuestions} Qs
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500">—</td>
                    <td className="py-3.5 px-4 text-center text-indigo-700 text-sm font-black">
                      {totalEnglishRawMarks} Raw
                    </td>
                    <td colSpan={3} className="py-3.5 px-4 text-right text-emerald-700 font-bold">
                      Standardized Score: 100/100 (Formula: Raw ÷ {totalEnglishRawMarks || 90} × 100)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Difficulty Composition */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">English Language Difficulty Composition</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of Easy, Medium, and Hard questions selected across the {totalEnglishQuestions} English questions.
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold font-mono">
                Slot 1: {totalEnglishQuestions} Qs · {totalEnglishRawMarks} Raw Marks
              </span>
            </div>
            <DifficultySlider totalQuestions={totalEnglishQuestions} value={50} />
          </div>
        </div>
      )}

      {/* TAB 2: Standard Subjects Blueprint */}
      {activeTab === "standard" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Elective Examination Quotas &amp; Scoring Standard</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard UTME elective subjects (Mathematics, Chemistry, Physics, Biology, etc.) each form 1 of the candidate&apos;s 3 chosen electives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Questions Quota Per Subject
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={standardQuota}
                  onChange={(e) => handleUpdateStandardSection(parseInt(e.target.value, 10), standardMarksPerQ)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-extrabold text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default: 40 questions per elective</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Marks Awarded Per Question
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={standardMarksPerQ}
                  onChange={(e) => handleUpdateStandardSection(standardQuota, parseFloat(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-extrabold text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Default: 2.5 marks (40 × 2.5 = 100 marks)</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Maximum Subject Score
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 font-black text-lg">
                  {standardRawMarks} / 100 Marks
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Each subject strictly capped at 100 marks</p>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-200 text-xs text-blue-950 space-y-1">
              <p className="font-bold">• 4-Subject Aggregate UTME Standard:</p>
              <p>• 1 Compulsory English paper ({totalEnglishQuestions} Qs $\to$ 100 marks) + 3 Elective papers ({standardQuota} Qs $\to$ 100 marks each) = <strong>{totalExamQuestions} total questions</strong> and <strong>400 maximum total score</strong>.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Elective Difficulty Calibration ({standardQuota} Questions)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of Easy, Medium, and Hard questions selected across elective subject papers.
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold font-mono">
                Standard Elective: {standardQuota} Qs · {standardRawMarks} Marks
              </span>
            </div>
            <DifficultySlider totalQuestions={standardQuota} value={50} />
          </div>
        </div>
      )}

      {/* TAB 3: Prescribed Novels Registry */}
      {activeTab === "reading_texts" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Prescribed Reading Texts Registry</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the active reading text for the academic cycle. The exam engine extracts {activeReadingText?.question_quota || 10} questions from this novel for each English paper.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddReadingText}
                className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                + Add Reading Text
              </button>
            </div>

            <div className="space-y-4">
              {readingTexts.map((text) => (
                <div
                  key={text.id}
                  className={`rounded-2xl border-2 p-5 transition-all ${
                    text.is_active
                      ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                      : "border-slate-200 bg-white opacity-80"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={text.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReadingTexts((prev) =>
                              prev.map((r) => (r.id === text.id ? { ...r, title: val } : r))
                            );
                          }}
                          className="font-black text-base text-slate-900 rounded-lg border border-slate-300 px-2.5 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        {text.is_active ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black uppercase">
                            ● Active Prescribed Novel
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-300 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                            Deferred / Archived
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 font-bold">Author:</span>
                          <input
                            type="text"
                            value={text.author}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReadingTexts((prev) =>
                                prev.map((r) => (r.id === text.id ? { ...r, author: val } : r))
                              );
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 font-bold">Question Quota:</span>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={text.question_quota || 10}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 10;
                              setReadingTexts((prev) =>
                                prev.map((r) => (r.id === text.id ? { ...r, question_quota: val } : r))
                              );
                            }}
                            className="w-16 rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-bold text-center text-blue-700"
                          />
                        </div>
                      </div>

                      <input
                        type="text"
                        value={text.description || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReadingTexts((prev) =>
                            prev.map((r) => (r.id === text.id ? { ...r, description: val } : r))
                          );
                        }}
                        className="w-full text-xs text-slate-500 rounded-lg border border-slate-200 px-2 py-1"
                        placeholder="Description / curriculum notes..."
                      />
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {!text.is_active && (
                        <button
                          type="button"
                          onClick={() => handleSetActiveReadingText(text.id)}
                          className="rounded-xl border border-emerald-600 bg-white hover:bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition"
                        >
                          Set as Active Novel
                        </button>
                      )}
                      {readingTexts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setReadingTexts((prev) => prev.filter((r) => r.id !== text.id))}
                          className="rounded-xl border border-slate-300 bg-white hover:bg-rose-50 hover:text-rose-600 px-2.5 py-1.5 text-xs text-slate-400"
                          title="Remove from registry"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Paper Generation Preview */}
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
                <option value="English">English Language ({totalEnglishQuestions} Questions · {totalEnglishRawMarks} Raw Marks)</option>
                <option value="Mathematics">Mathematics ({standardQuota} Questions · {standardRawMarks} Marks)</option>
                <option value="Chemistry">Chemistry ({standardQuota} Questions · {standardRawMarks} Marks)</option>
                <option value="Physics">Physics ({standardQuota} Questions · {standardRawMarks} Marks)</option>
                <option value="Biology">Biology ({standardQuota} Questions · {standardRawMarks} Marks)</option>
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
