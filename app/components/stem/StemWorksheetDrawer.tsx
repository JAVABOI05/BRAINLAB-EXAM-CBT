"use client";

import React, { useState } from "react";
import { supabase } from "@/app/lib/supabase";

interface StemWorksheetDrawerProps {
  resourceVersionId: string;
  resourceTitle: string;
  onSubmitted?: () => void;
}

interface DataRow {
  trial: number;
  paramA: string;
  paramB: string;
  resultVal: string;
}

export default function StemWorksheetDrawer({
  resourceVersionId,
  resourceTitle,
  onSubmitted,
}: StemWorksheetDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [observations, setObservations] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [dataRows, setDataRows] = useState<DataRow[]>([
    { trial: 1, paramA: "", paramB: "", resultVal: "" },
    { trial: 2, paramA: "", paramB: "", resultVal: "" },
    { trial: 3, paramA: "", paramB: "", resultVal: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddRow = () => {
    setDataRows((prev) => [
      ...prev,
      { trial: prev.length + 1, paramA: "", paramB: "", resultVal: "" },
    ]);
  };

  const handleRowChange = (index: number, field: keyof DataRow, value: string) => {
    setDataRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmitWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitStatus(null);

    if (!observations.trim() || !conclusion.trim()) {
      setErrorMsg("Please provide your scientific observations and conclusion before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMsg("Please sign in to submit your experiment report to instructors.");
        setSubmitting(false);
        return;
      }

      const payload = {
        resource_version_id: resourceVersionId,
        observations: {
          hypothesis: hypothesis.trim() || "Standard exploration",
          notes: observations.trim(),
        },
        measurements: dataRows.filter((r) => r.paramA || r.paramB || r.resultVal),
        conclusion: conclusion.trim(),
      };

      const res = await fetch("/api/stem/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit worksheet");
      }

      setSubmitStatus("Lab report successfully submitted to your instructor for review and grading!");
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not submit experiment report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-indigo-200/70 bg-white p-6 shadow-sm dark:border-indigo-950/70 dark:bg-slate-900 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Student Virtual Lab Report
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Experiment Worksheet &amp; Scientific Journal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record trial measurements and submit your laboratory observations for tutor review and grading.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
        >
          {isOpen ? "▲ Collapse Worksheet" : "📝 Open Lab Worksheet"}
        </button>
      </div>

      {submitStatus && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          ✅ {submitStatus}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-800 dark:text-rose-300">
          ⚠️ {errorMsg}
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmitWorksheet} className="space-y-5 pt-2">
          {/* Section 1: Hypothesis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              1. Hypothesis &amp; Target Investigation
            </label>
            <input
              type="text"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g. As resistance increases under constant voltage, total current will decrease proportionally."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* Section 2: Data Collection Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                2. Experimental Data Collection Table
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                + Add Trial Row
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="p-3 w-16">Trial</th>
                    <th className="p-3">Independent Variable (X)</th>
                    <th className="p-3">Dependent Variable (Y)</th>
                    <th className="p-3">Calculated Ratio / Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {dataRows.map((row, idx) => (
                    <tr key={idx} className="dark:text-slate-200">
                      <td className="p-3 font-bold text-slate-400">#{row.trial}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.paramA}
                          onChange={(e) => handleRowChange(idx, "paramA", e.target.value)}
                          placeholder="e.g. Voltage = 12V"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.paramB}
                          onChange={(e) => handleRowChange(idx, "paramB", e.target.value)}
                          placeholder="e.g. Resistance = 4Ω"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.resultVal}
                          onChange={(e) => handleRowChange(idx, "resultVal", e.target.value)}
                          placeholder="e.g. Current = 3.00A"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900 font-bold text-indigo-600 dark:text-indigo-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Scientific Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              3. Qualitative Observations &amp; Behavior Analysis <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Describe what occurred during the simulation trials (color shifts, trajectory curvature, filament luminosity, etc.)…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* Section 4: Conclusion & Deductions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              4. Scientific Deduction &amp; Conclusion <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="State your final conclusion, relate back to the original physical law or equation, and account for any experimental errors…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Transmitting Lab Report…" : "📤 Submit Lab Report for Instructor Grading"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
