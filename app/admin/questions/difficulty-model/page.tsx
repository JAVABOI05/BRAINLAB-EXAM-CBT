"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getAdminSession, type AdminUser } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { supabase } from "../../../lib/supabase";
import {
  AdministratorDifficultyConfig,
  DEFAULT_ADMIN_DIFFICULTY_CONFIG,
  ReferenceDistributions,
  ShortagePolicy,
  ConflictPriorityPolicy,
  DifficultyAllocationResult,
  AvailableDifficultyPool,
} from "../../../lib/difficultyEngine";
import { getDifficultyConfig, saveDifficultyConfig } from "../../../lib/platformConfig";
import DifficultySlider from "../../../components/DifficultySlider";
import "../../admin.css";

export default function DifficultyModelAdminPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Config state
  const [config, setConfig] = useState<AdministratorDifficultyConfig>(DEFAULT_ADMIN_DIFFICULTY_CONFIG);

  // Live playground state
  const [testQuestionCount, setTestQuestionCount] = useState<number>(40);
  const [testSliderPosition, setTestSliderPosition] = useState<number>(50);
  const [lastAllocationResult, setLastAllocationResult] = useState<DifficultyAllocationResult | null>(null);

  // Question bank statistics from database
  const [bankStats, setBankStats] = useState<{
    easy: number;
    medium: number;
    hard: number;
    total: number;
  }>({ easy: 0, medium: 0, hard: 0, total: 0 });
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const session = await getAdminSession();
        if (!session) return;
        setAdminUser(session);

        const canManage =
          (await adminHasPermission("cbt.questions.manage")) ||
          ["super_admin", "platform_admin"].includes(session.role);

        if (!canManage) {
          setError("You do not have permission to configure the formal difficulty model.");
          setLoading(false);
          return;
        }

        // Load config from database / platformConfig
        const savedConfig = await getDifficultyConfig();
        setConfig(savedConfig);
        setTestSliderPosition(savedConfig.default_slider_position);
        setTestQuestionCount(savedConfig.default_question_count || 40);

        // Fetch bank stats from database
        const { data: qRows } = await supabase
          .from("questions")
          .select("id, subject, difficulty, is_active, is_archived")
          .eq("is_active", true)
          .eq("is_archived", false);

        if (qRows) {
          const subjectsSet = new Set<string>();
          let easy = 0;
          let med = 0;
          let hard = 0;

          for (const q of qRows) {
            if (q.subject) subjectsSet.add(q.subject.trim());
            const d = (q.difficulty || "").toLowerCase();
            if (d === "easy") easy++;
            else if (d === "hard") hard++;
            else med++;
          }

          setBankStats({ easy, medium: med, hard, total: qRows.length });
          setAvailableSubjects(["All", ...Array.from(subjectsSet).sort()]);
        }
      } catch (err: unknown) {
        console.error("Failed to load difficulty model config:", err);
        setError("Error loading difficulty settings.");
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, []);

  // Filter pool by subject if selected
  const activePool: AvailableDifficultyPool = useMemo(() => {
    // If specific subject selected, we could query or use overall
    return {
      easy: bankStats.easy || 150,
      medium: bankStats.medium || 250,
      hard: bankStats.hard || 120,
      total: bankStats.total || 520,
    };
  }, [bankStats]);

  // Update Reference Distribution Proportions
  const handleRefDistChange = (
    level: "low" | "medium" | "high",
    cat: "easy" | "medium" | "hard",
    val: number
  ) => {
    const updatedDist: ReferenceDistributions = {
      ...config.reference_distributions,
      [level]: {
        ...config.reference_distributions[level],
        [cat]: val / 100, // store as 0.0 - 1.0 proportion
      },
    };
    setConfig({
      ...config,
      reference_distributions: updatedDist,
    });
  };

  const calculateSum = (level: "low" | "medium" | "high") => {
    const d = config.reference_distributions[level];
    return Math.round((d.easy + d.medium + d.hard) * 100);
  };

  const handleSaveConfig = async () => {
    if (!adminUser) return;
    setSaving(true);
    setMessage("");
    setError("");

    // Validate sums
    for (const lvl of ["low", "medium", "high"] as const) {
      const sum = calculateSum(lvl);
      if (sum !== 100) {
        setError(`The ${lvl.toUpperCase()} reference distribution must sum to exactly 100% (currently ${sum}%).`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await saveDifficultyConfig(
        config,
        { id: adminUser.id, email: adminUser.email },
        `Updated reference distributions and difficulty policies (version ${(config.version || 1) + 1})`
      );

      if (res.success) {
        setMessage(`Difficulty model configuration updated successfully (Version ${(config.version || 1) + 1}).`);
      } else {
        setError(res.error || "Failed to save difficulty configuration.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-neutral-400 font-mono text-sm">
        Loading difficulty model configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-1">
            <Link href="/admin/dashboard" className="hover:text-neutral-200">
              Admin
            </Link>
            <span>/</span>
            <Link href="/admin/questions/manage" className="hover:text-neutral-200">
              Questions
            </Link>
            <span>/</span>
            <span className="text-blue-400">Difficulty Model</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Formal Difficulty Calculation Model
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure reference distributions (Low, Medium, High), continuous piecewise interpolation,
            largest-remainder rounding, and shortage policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* SECTION 1: Interactive Live Simulator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🎮</span> Live Interactive Difficulty Simulator
          </h2>
          <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Assessment Size:</span>
            <select
              value={testQuestionCount}
              onChange={(e) => setTestQuestionCount(parseInt(e.target.value) || 40)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              {[10, 15, 20, 30, 40, 50, 60, 100].map((n) => (
                <option key={n} value={n}>
                  {n} Questions
                </option>
              ))}
            </select>
          </div>
        </div>

        <DifficultySlider
          totalQuestions={testQuestionCount}
          value={testSliderPosition}
          onChange={(res) => setLastAllocationResult(res)}
          availablePool={activePool}
          referenceDistributions={config.reference_distributions}
          defaultShortagePolicy={config.default_shortage_policy}
          defaultConflictPriority={config.default_conflict_priority}
          allowManualMode={config.allow_manual_mode}
        />
      </div>

      {/* SECTION 2: Reference Distributions Configuration */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">
            Default Reference Distributions (Section 2)
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Reference coordinates for Low (0), Medium (50), and High (100). Each distribution must total exactly 100%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Low (0) */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Low (Slider = 0)
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  calculateSum("low") === 100 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Sum: {calculateSum("low")}%
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Easy (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.low.easy * 100)}
                onChange={(e) => handleRefDistChange("low", "easy", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Medium (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.low.medium * 100)}
                onChange={(e) => handleRefDistChange("low", "medium", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Hard (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.low.hard * 100)}
                onChange={(e) => handleRefDistChange("low", "hard", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Medium (50) */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Medium (Slider = 50)
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  calculateSum("medium") === 100 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Sum: {calculateSum("medium")}%
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Easy (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.medium.easy * 100)}
                onChange={(e) => handleRefDistChange("medium", "easy", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Medium (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.medium.medium * 100)}
                onChange={(e) => handleRefDistChange("medium", "medium", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Hard (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.medium.hard * 100)}
                onChange={(e) => handleRefDistChange("medium", "hard", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* High (100) */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                High (Slider = 100)
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  calculateSum("high") === 100 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Sum: {calculateSum("high")}%
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Easy (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.high.easy * 100)}
                onChange={(e) => handleRefDistChange("high", "easy", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Medium (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.high.medium * 100)}
                onChange={(e) => handleRefDistChange("high", "medium", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Hard (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(config.reference_distributions.high.hard * 100)}
                onChange={(e) => handleRefDistChange("high", "hard", parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: System Policies & Creator Permissions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">
            System Policies & Assessment Creator Governance (Section 11)
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Global fallbacks for shortage handling, multi-constraint priority, and creator manual distribution rights.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Default Shortage Policy:
            </label>
            <select
              value={config.default_shortage_policy}
              onChange={(e) =>
                setConfig({ ...config, default_shortage_policy: e.target.value as ShortagePolicy })
              }
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="best_effort">Policy B: Best-effort distribution</option>
              <option value="strict">Policy A: Strict distribution</option>
            </select>
            <p className="text-[11px] text-neutral-500 mt-1">
              Strict rejects assessment generation if question bank lacks exact counts. Best-effort preserves total.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Default Conflict Priority:
            </label>
            <select
              value={config.default_conflict_priority}
              onChange={(e) =>
                setConfig({
                  ...config,
                  default_conflict_priority: e.target.value as ConflictPriorityPolicy,
                })
              }
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="balanced">Balanced Joint Solver</option>
              <option value="topic_priority">Topic Coverage Priority</option>
              <option value="difficulty_priority">Difficulty Distribution Priority</option>
            </select>
            <p className="text-[11px] text-neutral-500 mt-1">
              Resolves conflicts when high-yield topic quotas and difficulty targets cannot both be satisfied.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Default Slider Position:
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.default_slider_position}
              onChange={(e) =>
                setConfig({
                  ...config,
                  default_slider_position: Math.min(100, Math.max(0, parseFloat(e.target.value) || 50)),
                })
              }
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Initial slider value (0 = Low, 50 = Balanced, 100 = High).
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allow_manual_mode}
              onChange={(e) => setConfig({ ...config, allow_manual_mode: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-semibold text-white block">Allow Manual Allocation</span>
              <span className="text-[11px] text-neutral-400">
                Creators can enter Easy/Medium/Hard counts manually.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allow_creator_override}
              onChange={(e) => setConfig({ ...config, allow_creator_override: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-semibold text-white block">Creator Policy Override</span>
              <span className="text-[11px] text-neutral-400">
                Creators can switch between Strict and Best-effort policies.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enable_audit_logging}
              onChange={(e) => setConfig({ ...config, enable_audit_logging: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-semibold text-white block">Difficulty Audit Trail</span>
              <span className="text-[11px] text-neutral-400">
                Record immutable difficulty snapshots for all attempts.
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
