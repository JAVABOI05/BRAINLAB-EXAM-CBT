"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  calculateTargetProportions,
  calculateWholeQuestionCounts,
  calculateDifficultyScore,
  validateManualDifficultyInput,
  resolveDifficultyDistribution,
  AvailableDifficultyPool,
  DifficultyCategoryCounts,
  DifficultyDistributionProportions,
  ReferenceDistributions,
  ShortagePolicy,
  ConflictPriorityPolicy,
  AllocationMode,
  DEFAULT_REFERENCE_DISTRIBUTIONS,
  DifficultyAllocationResult,
} from "../lib/difficultyEngine";

export interface DifficultySliderProps {
  totalQuestions: number;
  value?: number; // 0 to 100
  onChange?: (result: DifficultyAllocationResult) => void;
  availablePool?: AvailableDifficultyPool;
  referenceDistributions?: ReferenceDistributions;
  defaultShortagePolicy?: ShortagePolicy;
  defaultConflictPriority?: ConflictPriorityPolicy;
  allowManualMode?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DifficultySlider({
  totalQuestions,
  value = 50,
  onChange,
  availablePool,
  referenceDistributions = DEFAULT_REFERENCE_DISTRIBUTIONS,
  defaultShortagePolicy = "best_effort",
  defaultConflictPriority = "balanced",
  allowManualMode = true,
  disabled = false,
  className = "",
}: DifficultySliderProps) {
  const [sliderValue, setSliderValue] = useState<number>(value);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>("slider");
  const [manualCounts, setManualCounts] = useState<DifficultyCategoryCounts>({
    easy: Math.round(totalQuestions * 0.3),
    medium: Math.round(totalQuestions * 0.4),
    hard: totalQuestions - Math.round(totalQuestions * 0.3) - Math.round(totalQuestions * 0.4),
  });
  const [shortagePolicy, setShortagePolicy] = useState<ShortagePolicy>(defaultShortagePolicy);
  const [conflictPriority, setConflictPriority] = useState<ConflictPriorityPolicy>(defaultConflictPriority);
  const [showSliderOverwriteModal, setShowSliderOverwriteModal] = useState<boolean>(false);
  const [pendingSliderValue, setPendingSliderValue] = useState<number | null>(null);

  // Keep sliderValue in sync if prop changes from outside
  useEffect(() => {
    if (value !== undefined && allocationMode === "slider") {
      setSliderValue(value);
    }
  }, [value, allocationMode]);

  // Compute live target proportions from slider position
  const targetProportions = useMemo<DifficultyDistributionProportions>(() => {
    return calculateTargetProportions(sliderValue, referenceDistributions);
  }, [sliderValue, referenceDistributions]);

  // Compute whole-number question counts using Largest-Remainder Method
  const targetCounts = useMemo<DifficultyCategoryCounts>(() => {
    if (allocationMode === "manual") {
      return manualCounts;
    }
    return calculateWholeQuestionCounts(totalQuestions, targetProportions);
  }, [allocationMode, manualCounts, totalQuestions, targetProportions]);

  // Validate manual input if in manual mode
  const manualValidation = useMemo(() => {
    if (allocationMode !== "manual") return null;
    return validateManualDifficultyInput({
      manualCounts,
      totalRequested: totalQuestions,
      availablePool,
    });
  }, [allocationMode, manualCounts, totalQuestions, availablePool]);

  // Compute allocation resolution and shortage analysis
  const allocationResult = useMemo<DifficultyAllocationResult>(() => {
    const pool = availablePool || {
      easy: 9999,
      medium: 9999,
      hard: 9999,
      total: 99999,
    };

    return resolveDifficultyDistribution({
      targetCounts,
      availablePool: pool,
      policy: shortagePolicy,
      allocationMode,
      sliderPosition: allocationMode === "slider" ? sliderValue : null,
      targetProportions:
        allocationMode === "manual" && manualValidation?.isValid
          ? manualValidation.proportions
          : targetProportions,
    });
  }, [
    targetCounts,
    availablePool,
    shortagePolicy,
    allocationMode,
    sliderValue,
    manualValidation,
    targetProportions,
  ]);

  // Notify parent component whenever allocation updates
  useEffect(() => {
    if (onChange) {
      onChange(allocationResult);
    }
  }, [allocationResult, onChange]);

  // Handle slider drag interaction
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    if (allocationMode === "manual") {
      // Section 10: Moving the slider while a manual distribution is active must not silently overwrite
      setPendingSliderValue(nextVal);
      setShowSliderOverwriteModal(true);
      return;
    }
    setSliderValue(nextVal);
  };

  const confirmSwitchToSlider = () => {
    if (pendingSliderValue !== null) {
      setSliderValue(pendingSliderValue);
      setPendingSliderValue(null);
    }
    setAllocationMode("slider");
    setShowSliderOverwriteModal(false);
  };

  const cancelSwitchToSlider = () => {
    setPendingSliderValue(null);
    setShowSliderOverwriteModal(false);
  };

  // Helper for difficulty score label
  const getDifficultyLevelLabel = (score: number) => {
    if (score < 30) return { label: "Primarily Easy", color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30" };
    if (score <= 65) return { label: "Balanced Distribution", color: "text-amber-400 bg-amber-950/60 border-amber-500/30" };
    return { label: "Primarily Hard", color: "text-rose-400 bg-rose-950/60 border-rose-500/30" };
  };

  const scoreBadge = getDifficultyLevelLabel(allocationResult.targetScore);

  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl ${className}`}>
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-wide">Difficulty Calculation Model</h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                allocationMode === "manual"
                  ? "bg-purple-950/70 text-purple-300 border-purple-500/40"
                  : "bg-blue-950/70 text-blue-300 border-blue-500/40"
              }`}
            >
              {allocationMode === "manual" ? "Custom (Manual)" : "Slider Interpolation"}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Controls the proportion of Easy, Medium, and Hard questions selected from the eligible bank.
          </p>
        </div>

        {allowManualMode && (
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setAllocationMode("slider")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                allocationMode === "slider"
                  ? "bg-blue-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Slider Mode
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                // Initialize manual with current target counts
                setManualCounts({ ...targetCounts });
                setAllocationMode("manual");
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                allocationMode === "manual"
                  ? "bg-purple-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Manual Counts
            </button>
          </div>
        )}
      </div>

      {/* Mode 1: Continuous Slider */}
      {allocationMode === "slider" ? (
        <div className="space-y-6">
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-neutral-400">Slider Position:</span>
              <span className="text-sm font-bold text-blue-400 font-mono">
                {sliderValue.toFixed(1)} / 100
              </span>
            </div>

            <div className="relative pt-1 pb-2">
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={sliderValue}
                onChange={handleSliderChange}
                disabled={disabled}
                className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex justify-between text-[11px] font-mono text-neutral-500 mt-2">
                <button
                  type="button"
                  onClick={() => setSliderValue(0)}
                  className="hover:text-emerald-400 transition-colors"
                >
                  0 (Low)
                </button>
                <button
                  type="button"
                  onClick={() => setSliderValue(50)}
                  className="hover:text-amber-400 transition-colors"
                >
                  50 (Medium)
                </button>
                <button
                  type="button"
                  onClick={() => setSliderValue(100)}
                  className="hover:text-rose-400 transition-colors"
                >
                  100 (High)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Manual Question Counts */
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">
              Manual Category Counts (Total: {totalQuestions}):
            </span>
            {manualValidation && !manualValidation.isValid && (
              <span className="text-xs text-rose-400 font-medium">
                {manualValidation.error}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1">
                Easy Questions
              </label>
              <input
                type="number"
                min="0"
                max={totalQuestions}
                value={manualCounts.easy}
                onChange={(e) =>
                  setManualCounts({ ...manualCounts, easy: Math.max(0, parseInt(e.target.value) || 0) })
                }
                disabled={disabled}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-400 mb-1">
                Medium Questions
              </label>
              <input
                type="number"
                min="0"
                max={totalQuestions}
                value={manualCounts.medium}
                onChange={(e) =>
                  setManualCounts({ ...manualCounts, medium: Math.max(0, parseInt(e.target.value) || 0) })
                }
                disabled={disabled}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-rose-400 mb-1">
                Hard Questions
              </label>
              <input
                type="number"
                min="0"
                max={totalQuestions}
                value={manualCounts.hard}
                onChange={(e) =>
                  setManualCounts({ ...manualCounts, hard: Math.max(0, parseInt(e.target.value) || 0) })
                }
                disabled={disabled}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Proportional Distribution Bar */}
      <div className="mt-6 space-y-2">
        <div className="flex justify-between items-center text-xs font-medium text-neutral-400">
          <span>Target Distribution Breakdown:</span>
          <span className="font-mono text-neutral-300">
            {targetCounts.easy} + {targetCounts.medium} + {targetCounts.hard} = {totalQuestions} Questions
          </span>
        </div>

        <div className="w-full h-4 bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800">
          <div
            style={{ width: `${(targetCounts.easy / totalQuestions) * 100}%` }}
            className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-300"
            title={`Easy: ${targetCounts.easy} (${((targetCounts.easy / totalQuestions) * 100).toFixed(1)}%)`}
          />
          <div
            style={{ width: `${(targetCounts.medium / totalQuestions) * 100}%` }}
            className="bg-amber-500 hover:bg-amber-400 transition-all duration-300"
            title={`Medium: ${targetCounts.medium} (${((targetCounts.medium / totalQuestions) * 100).toFixed(1)}%)`}
          />
          <div
            style={{ width: `${(targetCounts.hard / totalQuestions) * 100}%` }}
            className="bg-rose-500 hover:bg-rose-400 transition-all duration-300"
            title={`Hard: ${targetCounts.hard} (${((targetCounts.hard / totalQuestions) * 100).toFixed(1)}%)`}
          />
        </div>
      </div>

      {/* Category Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {/* Easy */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">Easy</span>
            <span className="text-xs font-mono text-neutral-400">
              {(targetProportions.easy * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white font-mono">
              {targetCounts.easy} <span className="text-xs font-normal text-neutral-400">questions</span>
            </div>
          </div>
          {availablePool && (
            <div className="mt-2 text-[11px] font-mono text-neutral-400 border-t border-neutral-800/60 pt-1.5 flex justify-between">
              <span>Available in bank:</span>
              <span className={availablePool.easy < targetCounts.easy ? "text-rose-400 font-bold" : "text-neutral-300"}>
                {availablePool.easy}
              </span>
            </div>
          )}
        </div>

        {/* Medium */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">Medium</span>
            <span className="text-xs font-mono text-neutral-400">
              {(targetProportions.medium * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white font-mono">
              {targetCounts.medium} <span className="text-xs font-normal text-neutral-400">questions</span>
            </div>
          </div>
          {availablePool && (
            <div className="mt-2 text-[11px] font-mono text-neutral-400 border-t border-neutral-800/60 pt-1.5 flex justify-between">
              <span>Available in bank:</span>
              <span className={availablePool.medium < targetCounts.medium ? "text-rose-400 font-bold" : "text-neutral-300"}>
                {availablePool.medium}
              </span>
            </div>
          )}
        </div>

        {/* Hard */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400 tracking-wide uppercase">Hard</span>
            <span className="text-xs font-mono text-neutral-400">
              {(targetProportions.hard * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-extrabold text-white font-mono">
              {targetCounts.hard} <span className="text-xs font-normal text-neutral-400">questions</span>
            </div>
          </div>
          {availablePool && (
            <div className="mt-2 text-[11px] font-mono text-neutral-400 border-t border-neutral-800/60 pt-1.5 flex justify-between">
              <span>Available in bank:</span>
              <span className={availablePool.hard < targetCounts.hard ? "text-rose-400 font-bold" : "text-neutral-300"}>
                {availablePool.hard}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty Score Gauge & Policy Settings */}
      <div className="mt-6 pt-5 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Score & Qualitative badge */}
        <div>
          <div className="text-xs font-medium text-neutral-400 mb-1 flex items-center gap-2">
            <span>Difficulty Score:</span>
            <span className="text-[11px] text-neutral-500 font-mono">(0 Easy, 50 Balanced, 100 Hard)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-white font-mono">
              {allocationResult.targetScore.toFixed(2)}
            </div>
            <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${scoreBadge.color}`}>
              {scoreBadge.label}
            </div>
          </div>
          {allocationResult.deviations.hasShortage && (
            <div className="text-xs text-amber-400 font-medium mt-1">
              Actual generated score: {allocationResult.actualScore.toFixed(2)} (delta: {allocationResult.deviations.scoreDelta > 0 ? "+" : ""}{allocationResult.deviations.scoreDelta.toFixed(2)})
            </div>
          )}
        </div>

        {/* Shortage & Priority Selectors */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Shortage Policy:
            </label>
            <select
              value={shortagePolicy}
              onChange={(e) => setShortagePolicy(e.target.value as ShortagePolicy)}
              disabled={disabled}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-blue-500"
            >
              <option value="best_effort">Policy B: Best-effort distribution</option>
              <option value="strict">Policy A: Strict distribution</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Conflict Priority:
            </label>
            <select
              value={conflictPriority}
              onChange={(e) => setConflictPriority(e.target.value as ConflictPriorityPolicy)}
              disabled={disabled}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-blue-500"
            >
              <option value="balanced">Balanced Joint Solver</option>
              <option value="topic_priority">Topic Coverage Priority</option>
              <option value="difficulty_priority">Difficulty Distribution Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shortage & Warnings Banner */}
      {allocationResult.deviations.hasShortage && (
        <div className="mt-4 p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl text-xs text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <span>⚠️</span> Shortage Adjustment Disclosed:
          </div>
          {allocationResult.deviations.notes.map((note, idx) => (
            <div key={idx} className="text-amber-200/90 pl-5">
              • {note}
            </div>
          ))}
        </div>
      )}

      {allocationResult.errorMessage && (
        <div className="mt-4 p-3 bg-rose-950/40 border border-rose-600/30 rounded-xl text-xs text-rose-300">
          <span className="font-semibold">Error:</span> {allocationResult.errorMessage}
        </div>
      )}

      {/* Safety Modal: Overwrite Manual Distribution Warning (Section 10) */}
      {showSliderOverwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <span className="text-2xl">⚠️</span>
              <h4 className="text-base font-bold text-white">Switch to Slider Mode?</h4>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              A manual custom question count distribution is currently active. Moving the difficulty slider
              will replace your custom Easy/Medium/Hard counts with the continuous interpolation formula.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelSwitchToSlider}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition"
              >
                Keep Manual Settings
              </button>
              <button
                type="button"
                onClick={confirmSwitchToSlider}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-lg"
              >
                Switch to Slider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DifficultySlider;
