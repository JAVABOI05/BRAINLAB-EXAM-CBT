"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { listHighYieldRules, saveHighYieldRule, deleteHighYieldRule, checkHighYieldShortages } from "../../../lib/examEngine/highYieldManager";
import { HighYieldRule, EngineQuestion } from "../../../lib/examEngine/types";
import { supabase } from "../../../lib/supabase";
import "../../admin.css";

export default function HighYieldTopicsAdminPage() {
  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [rules, setRules] = useState<HighYieldRule[]>([]);
  const [questions, setQuestions] = useState<EngineQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New rule form state
  const [newTopic, setNewTopic] = useState("");
  const [newQuota, setNewQuota] = useState(5);
  const [newMin, setNewMin] = useState(2);
  const [newMax, setNewMax] = useState(8);
  const [newPriority, setNewPriority] = useState(1);
  const [newNotes, setNewNotes] = useState("");

  // Load rules and questions for the subject
  async function loadData(subj: string) {
    setLoading(true);
    setMessage("");
    try {
      const allRules = await listHighYieldRules(subj);
      setRules(allRules);

      const isEnglish = subj.toLowerCase().includes("english");
      const { data: qData } = await supabase
        .from("questions")
        .select("id, subject, section, category, topic, question, is_active, marks")
        .eq("is_active", true)
        .ilike("subject", isEnglish ? "English" : subj);

      setQuestions((qData || []) as EngineQuestion[]);
    } catch (err) {
      console.error("Failed to load high yield data:", err);
      setMessage("Could not load high-yield topics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(selectedSubject);
  }, [selectedSubject]);

  // Extract all distinct topics in database for this subject
  const availableDbTopics = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      const top = (q.topic || q.category || "").trim();
      if (top) set.add(top);
    }
    return Array.from(set).sort();
  }, [questions]);

  // Tally questions by topic
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of questions) {
      const top = (q.topic || q.category || "Unassigned").trim();
      counts[top] = (counts[top] || 0) + 1;
    }
    return counts;
  }, [questions]);

  // Calculate shortage warnings
  const { warnings, totalReserved } = useMemo(() => {
    return checkHighYieldShortages(rules, questions, selectedSubject === "English" ? 60 : 40);
  }, [rules, questions, selectedSubject]);

  async function handleToggleRule(rule: HighYieldRule) {
    const updated: HighYieldRule = { ...rule, isActive: !rule.isActive };
    setSaving(true);
    const res = await saveHighYieldRule(updated);
    setSaving(false);
    if (res.ok) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } else {
      setMessage(res.message || "Could not update rule.");
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.trim()) {
      setMessage("Please select or enter a topic.");
      return;
    }

    const newRule: HighYieldRule = {
      id: `hy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      subject: selectedSubject,
      topic: newTopic.trim(),
      quota: Number(newQuota) || 5,
      priority: Number(newPriority) || 1,
      min_questions: Number(newMin) || 1,
      max_questions: Number(newMax) || 10,
      isActive: true,
      notes: newNotes.trim(),
      created_at: new Date().toISOString(),
    };

    setSaving(true);
    const res = await saveHighYieldRule(newRule);
    setSaving(false);
    if (res.ok) {
      setRules((prev) => [...prev, newRule]);
      setNewTopic("");
      setNewNotes("");
      setMessage(`High-yield topic rule for '${newRule.topic}' saved successfully.`);
    } else {
      setMessage(res.message || "Failed to add high-yield rule.");
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Are you sure you want to remove this high-yield allocation rule?")) return;
    setSaving(true);
    const res = await deleteHighYieldRule(ruleId);
    setSaving(false);
    if (res.ok) {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setMessage("Rule deleted.");
    } else {
      setMessage(res.message || "Could not delete rule.");
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
            <span className="text-slate-800">High-Yield Topics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            High-Yield Topic Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reserve question quotas for high-frequency syllabus topics and monitor question-bank inventory readiness in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/blueprints"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            📋 View Blueprints
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">
          {message}
        </div>
      )}

      {/* Subject Filter Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-6 overflow-x-auto">
        {["Mathematics", "Chemistry", "Physics", "Biology", "English"].map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSelectedSubject(subj)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
              selectedSubject === subj
                ? "bg-slate-950 text-white shadow"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Questions in Bank</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{questions.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{availableDbTopics.length} distinct topics available</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Configured High-Yield Rules</span>
          <p className="text-2xl font-black text-blue-950 mt-1">{rules.length}</p>
          <p className="text-[11px] text-blue-800 mt-0.5">{rules.filter((r) => r.isActive).length} active</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
          <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Total Quota Reserved</span>
          <p className="text-2xl font-black text-indigo-950 mt-1">{totalReserved} Questions</p>
          <p className="text-[11px] text-indigo-800 mt-0.5">Out of {selectedSubject === "English" ? 60 : 40} paper total</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Shortage Warnings</span>
          <p className="text-2xl font-black text-amber-950 mt-1">{warnings.length}</p>
          <p className="text-[11px] text-amber-800 mt-0.5">{warnings.length === 0 ? "Bank fully satisfies quotas" : "Shortage detected"}</p>
        </div>
      </div>

      {/* Shortage Warnings Banner if any */}
      {warnings.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900">
            <span>⚠️ Question Shortage Warnings ({warnings.length})</span>
          </div>
          <div className="space-y-1">
            {warnings.map((w, idx) => (
              <p key={idx} className="text-xs font-medium text-amber-800">
                • {w.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-8">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {selectedSubject} High-Yield Topic Quotas
          </h3>
          <span className="text-xs text-slate-500">
            {rules.filter((r) => r.isActive).length} of {rules.length} rules active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Topic Name</th>
                <th className="py-3 px-4 text-center">Reserved Quota</th>
                <th className="py-3 px-4 text-center">Min / Max Range</th>
                <th className="py-3 px-4 text-center">Bank Available</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No high-yield rules configured for {selectedSubject}. Add one below.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const available = topicCounts[rule.topic.trim()] || 0;
                  const hasShortage = available < rule.quota;

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">#{rule.priority}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{rule.topic}</p>
                        {rule.section && <p className="text-[10px] text-slate-400">Section: {rule.section}</p>}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-blue-700">
                        {rule.quota} qs
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {rule.min_questions} - {rule.max_questions}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        <span className={hasShortage ? "text-amber-600 font-black" : "text-emerald-700"}>
                          {available} in bank
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {rule.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule)}
                          disabled={saving}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                            rule.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {rule.isActive ? "● Active" : "○ Disabled"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
                          disabled={saving}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Rule Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Add High-Yield Topic Rule for {selectedSubject}</h3>
        <p className="text-xs text-slate-500 mb-5">
          Choose an actual topic from the question bank to guarantee high-frequency coverage on every generated paper.
        </p>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="admin-label">Topic / Curriculum Theme</label>
            <select
              className="admin-input"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            >
              <option value="">-- Choose a topic from question bank --</option>
              {availableDbTopics.map((top) => (
                <option key={top} value={top}>
                  {top} ({topicCounts[top] || 0} questions available)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-label">Question Quota</label>
            <input
              type="number"
              min={1}
              max={15}
              className="admin-input"
              value={newQuota}
              onChange={(e) => setNewQuota(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="admin-label">Priority Order</label>
            <input
              type="number"
              min={1}
              max={10}
              className="admin-input"
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="admin-label">Minimum Questions</label>
            <input
              type="number"
              min={1}
              max={10}
              className="admin-input"
              value={newMin}
              onChange={(e) => setNewMin(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="admin-label">Maximum Questions</label>
            <input
              type="number"
              min={1}
              max={20}
              className="admin-input"
              value={newMax}
              onChange={(e) => setNewMax(Number(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="admin-label">Syllabus Notes / Justification</label>
            <input
              className="admin-input"
              placeholder="e.g. High-density UTME question domain"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "+ Add High-Yield Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
