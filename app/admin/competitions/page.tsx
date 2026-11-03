"use client";

import { useEffect, useState, useCallback, useId } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { getAdminSession, AdminUser } from "@/app/lib/adminAuth";
import {
  COMPETITION_PERMISSIONS,
  CompetitionRole,
  CompetitionPermission,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/app/lib/competitionRbac";
import {
  CompetitionQuestionItem,
  CSVValidationError,
  DuplicateDetectionResult,
} from "@/app/lib/competitionQuestionBank";

type TabKey = "competitions" | "banks" | "builder" | "csv_import" | "moderation" | "rewards" | "audit" | "live_matches" | "squads" | "disputes" | "emergency";

interface CompetitionBank {
  id: string;
  name: string;
  description: string;
  subject: string;
  academic_level: string;
  visibility: string;
  status: string;
  owner_id: string;
  competition_questions?: [{ count: number }];
  created_at: string;
}

interface CompetitionRecord {
  id: string;
  title: string;
  code: string;
  competition_type: string;
  question_source_mode: "competition_bank" | "main_bank" | "combined";
  question_bank_id?: string;
  competition_question_banks?: { name: string; subject: string };
  rules: {
    question_count: number;
    duration_seconds: number;
    randomize_questions: boolean;
    randomize_options: boolean;
    identical_questions_for_all: boolean;
    attempt_limit: number;
  };
  rewards_config: {
    xp_first_place: number;
    xp_participation: number;
  };
  status: string;
  visibility: string;
  created_at: string;
}

interface ModerationCase {
  id: string;
  competition_id: string;
  competitions?: { title: string };
  case_type: string;
  description: string;
  status: string;
  reporter_id: string;
  created_at: string;
}

interface RewardProposal {
  id: string;
  competition_id: string;
  competitions?: { title: string };
  recipient_id: string;
  reward_type: string;
  status: string;
  proposed_by: string;
  amount_or_details: { xp?: number; reason?: string };
  created_at: string;
}

interface AuditLogRecord {
  id: string;
  acting_user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export default function CompetitionArenaAdminPage() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("competitions");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [banks, setBanks] = useState<CompetitionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankQuestions, setBankQuestions] = useState<CompetitionQuestionItem[]>([]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  const [rewardProposals, setRewardProposals] = useState<RewardProposal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // CSV Import states
  const [csvText, setCsvText] = useState("");
  const [csvDryRunSummary, setCsvDryRunSummary] = useState<{
    total_rows: number;
    valid_count: number;
    rejected_count: number;
    duplicates_count: number;
    errors: CSVValidationError[];
    duplicates: DuplicateDetectionResult[];
  } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);

  // In-Web Builder states
  const [builderStem, setBuilderStem] = useState("");
  const [builderSubject, setBuilderSubject] = useState("Mathematics");
  const [builderTopic, setBuilderTopic] = useState("");
  const [builderDifficulty, setBuilderDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [builderOptA, setBuilderOptA] = useState("");
  const [builderOptB, setBuilderOptB] = useState("");
  const [builderOptC, setBuilderOptC] = useState("");
  const [builderOptD, setBuilderOptD] = useState("");
  const [builderOptE, setBuilderOptE] = useState("");
  const [builderIncludeE, setBuilderIncludeE] = useState(false);
  const [builderCorrectAns, setBuilderCorrectAns] = useState("A");
  const [builderExplanation, setBuilderExplanation] = useState("");
  const [builderMarks, setBuilderMarks] = useState(1);
  const [builderSaving, setBuilderSaving] = useState(false);

  // New Competition modal states
  const [showNewCompModal, setShowNewCompModal] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState("");
  const [newCompSourceMode, setNewCompSourceMode] = useState<"competition_bank" | "main_bank" | "combined">("competition_bank");
  const [newCompBankId, setNewCompBankId] = useState("");
  const [newCompType, setNewCompType] = useState("arena");
  const [newCompQCount, setNewCompQCount] = useState(10);
  const [newCompDuration, setNewCompDuration] = useState(300);
  const [newComp1v1Identical, setNewComp1v1Identical] = useState(false);
  const [newCompVisibility, setNewCompVisibility] = useState("public");

  // New Bank modal states
  const [showNewBankModal, setShowNewBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankSubject, setNewBankSubject] = useState("Mathematics");
  const [newBankDesc, setNewBankDesc] = useState("");
  const [newBankVisibility, setNewBankVisibility] = useState("private");

  // New Reward Proposal modal states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardCompId, setRewardCompId] = useState("");
  const [rewardRecipientId, setRewardRecipientId] = useState("");
  const [rewardXpAmount, setRewardXpAmount] = useState(100);
  const [rewardReason, setRewardReason] = useState("");

  // Live Matches, Squads, Disputes, and Emergency States
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [adminSquads, setAdminSquads] = useState<any[]>([]);
  const [adminDisputes, setAdminDisputes] = useState<any[]>([]);
  const [emergencyControls, setEmergencyControls] = useState<{
    is_paused: boolean;
    freeze_leaderboards: boolean;
    maintenance_mode: boolean;
    announcement: string;
  }>({
    is_paused: false,
    freeze_leaderboards: false,
    maintenance_mode: false,
    announcement: "",
  });
  const [emergencyPin, setEmergencyPin] = useState("");
  const [emergencySaving, setEmergencySaving] = useState(false);

  const searchInputId = useId();

  // Authenticated fetch helper that automatically attaches the admin session Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  // Load initial session
  useEffect(() => {
    async function init() {
      try {
        const user = await getAdminSession();
        setAdminUser(user);
        await Promise.all([loadCompetitions(), loadBanks()]);
      } catch (err: unknown) {
        console.warn("Failed initializing admin session:", err);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const loadCompetitions = async () => {
    try {
      const res = await authFetch("/api/competition/competitions");
      if (res.ok) {
        const data = await res.json();
        setCompetitions(data.competitions || []);
      }
    } catch (err) {
      console.warn("Error loading competitions:", err);
    }
  };

  const loadBanks = async () => {
    try {
      const res = await authFetch("/api/competition/banks");
      if (res.ok) {
        const data = await res.json();
        const b = data.banks || [];
        setBanks(b);
        if (b.length > 0 && !selectedBankId) {
          setSelectedBankId(b[0].id);
          loadBankQuestions(b[0].id);
        }
      }
    } catch (err) {
      console.warn("Error loading banks:", err);
    }
  };

  const loadBankQuestions = async (bankId: string) => {
    if (!bankId) return;
    try {
      const res = await authFetch(`/api/competition/banks/${bankId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setBankQuestions(data.questions || []);
      }
    } catch (err) {
      console.warn("Error loading questions for bank:", err);
    }
  };

  const loadModerationCases = async () => {
    try {
      const res = await authFetch("/api/competition/moderation");
      if (res.ok) {
        const data = await res.json();
        setModerationCases(data.cases || []);
      }
    } catch (err) {
      console.warn("Error loading moderation cases:", err);
    }
  };

  const loadRewardProposals = async () => {
    try {
      const res = await authFetch("/api/competition/rewards");
      if (res.ok) {
        const data = await res.json();
        setRewardProposals(data.proposals || []);
      }
    } catch (err) {
      console.warn("Error loading reward proposals:", err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await authFetch("/api/competition/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn("Error loading audit logs:", err);
    }
  };

  const loadLiveMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/competition/spectators");
      if (res.ok) {
        const d = await res.json();
        setLiveMatches(d.matches || []);
      }
    } catch {}
  }, []);

  const loadAdminSquads = useCallback(async () => {
    try {
      const res = await fetch("/api/competition/teams");
      if (res.ok) {
        const d = await res.json();
        setAdminSquads(d.teams || []);
      }
    } catch {}
  }, []);

  const loadAdminDisputes = useCallback(async () => {
    try {
      const res = await authFetch("/api/competition/disputes");
      if (res.ok) {
        const d = await res.json();
        setAdminDisputes(d.disputes || []);
      }
    } catch {}
  }, [authFetch]);

  const loadEmergencyControls = useCallback(async () => {
    try {
      const res = await fetch("/api/competition/emergency-controls");
      if (res.ok) {
        const d = await res.json();
        if (d.controls) setEmergencyControls(d.controls);
      }
    } catch {}
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setError(null);
    setMessage(null);
    if (tab === "moderation") loadModerationCases();
    if (tab === "rewards") loadRewardProposals();
    if (tab === "live_matches") loadLiveMatches();
    if (tab === "squads") loadAdminSquads();
    if (tab === "disputes") loadAdminDisputes();
    if (tab === "emergency") loadEmergencyControls();
    if (tab === "audit") loadAuditLogs();
    if (tab === "banks" && selectedBankId) loadBankQuestions(selectedBankId);
  };

  // Create new Bank
  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authFetch("/api/competition/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBankName,
          subject: newBankSubject,
          description: newBankDesc,
          visibility: newBankVisibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bank");
      setMessage(`Question Bank '${data.bank.name}' created successfully.`);
      setShowNewBankModal(false);
      setNewBankName("");
      setNewBankDesc("");
      await loadBanks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating bank");
    }
  };

  // Create new Competition
  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authFetch("/api/competition/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCompTitle,
          competition_type: newCompType,
          question_source_mode: newCompSourceMode,
          question_bank_id: newCompSourceMode !== "main_bank" ? newCompBankId : null,
          visibility: newCompVisibility,
          rules: {
            question_count: Number(newCompQCount),
            duration_seconds: Number(newCompDuration),
            identical_questions_for_all: newCompType === "battle_1v1" || newComp1v1Identical,
            randomize_questions: true,
            randomize_options: true,
            attempt_limit: 1,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create competition");
      setMessage(`Competition '${data.competition.title}' created (Code: ${data.competition.code}).`);
      setShowNewCompModal(false);
      setNewCompTitle("");
      await loadCompetitions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating competition");
    }
  };

  // Competition workflow action (publish, schedule, cancel, etc.)
  const handleCompetitionAction = async (compId: string, action: string) => {
    setError(null);
    try {
      const res = await authFetch(`/api/competition/competitions/${compId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} competition`);
      if (data.status === "pending_approval") {
        setMessage("Public quiz submitted for independent administrator approval.");
      } else {
        setMessage(`Competition ${action}ed successfully.`);
      }
      await loadCompetitions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} competition`);
    }
  };

  // In-Web Question Builder Save
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId) {
      setError("Please select a target question bank first.");
      return;
    }
    setBuilderSaving(true);
    setError(null);
    try {
      const res = await authFetch(`/api/competition/banks/${selectedBankId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: builderStem,
          subject: builderSubject,
          topic: builderTopic,
          difficulty: builderDifficulty,
          option_a: builderOptA,
          option_b: builderOptB,
          option_c: builderOptC,
          option_d: builderOptD,
          option_e: builderIncludeE ? builderOptE : null,
          correct_answer: builderCorrectAns,
          explanation: builderExplanation,
          marks: Number(builderMarks),
          status: "approved",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save question");
      setMessage("Question saved successfully to dedicated competition bank.");
      // Reset form
      setBuilderStem("");
      setBuilderOptA("");
      setBuilderOptB("");
      setBuilderOptC("");
      setBuilderOptD("");
      setBuilderOptE("");
      setBuilderExplanation("");
      await loadBankQuestions(selectedBankId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving question");
    } finally {
      setBuilderSaving(false);
    }
  };

  // CSV Preview & Validation
  const handlePreviewCSV = async () => {
    if (!selectedBankId || !csvText.trim()) {
      setError("Please choose a bank and provide CSV text.");
      return;
    }
    setCsvImporting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/competition/banks/${selectedBankId}/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setCsvDryRunSummary(data.summary);
      setMessage(`Preview validated: ${data.summary.valid_count} valid, ${data.summary.rejected_count} rejected, ${data.summary.duplicates_count} duplicates.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error running preview");
    } finally {
      setCsvImporting(false);
    }
  };

  // CSV Safe Commit Import
  const handleCommitCSV = async () => {
    if (!selectedBankId || !csvText.trim()) return;
    setCsvImporting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/competition/banks/${selectedBankId}/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMessage(`Successfully imported ${data.importReport.imported_count} questions into the bank!`);
      setCsvText("");
      setCsvDryRunSummary(null);
      await loadBankQuestions(selectedBankId);
      await loadBanks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error committing import");
    } finally {
      setCsvImporting(false);
    }
  };

  // Propose Reward
  const handleProposeReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authFetch("/api/competition/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose",
          competitionId: rewardCompId,
          recipientId: rewardRecipientId,
          rewardType: "xp",
          amountOrDetails: { xp: Number(rewardXpAmount), reason: rewardReason },
          notes: rewardReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to propose reward");
      setMessage("Reward proposed. Awaiting independent administrator approval.");
      setShowRewardModal(false);
      setRewardRecipientId("");
      setRewardReason("");
      await loadRewardProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error proposing reward");
    }
  };

  // Approve Reward
  const handleApproveReward = async (proposalId: string, decision: "approved" | "rejected") => {
    setError(null);
    try {
      const res = await authFetch("/api/competition/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", proposalId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMessage(`Reward proposal ${decision} successfully.`);
      await loadRewardProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error approving reward");
    }
  };

  // Moderation Case Resolution
  const handleResolveCase = async (caseId: string, resolution: string) => {
    setError(null);
    try {
      const res = await authFetch("/api/competition/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_case", caseId, resolution }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMessage("Moderation case resolved.");
      await loadModerationCases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error resolving case");
    }
  };

  return (
    <div className="admin-page-container p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-6 shadow-xl border border-blue-700/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <h1 className="text-2xl font-bold tracking-tight">BrainLab Academy Competition Arena</h1>
              <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-full border border-blue-400/30 font-semibold uppercase">
                RBAC & Dedicated Question Bank
              </span>
            </div>
            <p className="text-blue-200/80 text-sm mt-1">
              Multi-source question architecture (Dedicated, Main CBT, Combined), 4/5-option MCQs, duplicate intelligence, separation of duties, and immutable attempt snapshots.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-xs space-y-1">
            <div className="text-blue-200">Active Operator Identity:</div>
            <div className="font-semibold text-white truncate max-w-xs">{adminUser?.email || "Checking auth..."}</div>
            <div className="inline-block bg-emerald-500/30 text-emerald-300 font-mono text-[11px] px-2 py-0.5 rounded border border-emerald-400/30">
              Role: {adminUser?.role || "authenticated"}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">&times;</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => handleTabChange("competitions")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "competitions" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          ⚔️ Competitions ({competitions.length})
        </button>
        <button
          onClick={() => handleTabChange("banks")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "banks" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📚 Dedicated Banks ({banks.length})
        </button>
        <button
          onClick={() => handleTabChange("builder")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "builder" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          ✍️ In-Web Question Builder
        </button>
        <button
          onClick={() => handleTabChange("csv_import")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "csv_import" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          📥 CSV Importer & Duplicates
        </button>
        <button
          onClick={() => handleTabChange("moderation")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "moderation" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          🛡️ Moderation & Reviews ({moderationCases.filter((c) => c.status === "pending").length})
        </button>
        <button
          onClick={() => handleTabChange("rewards")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "rewards" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          🎁 Reward Approvals ({rewardProposals.filter((p) => p.status === "proposed").length})
        </button>
        <button
          onClick={() => handleTabChange("audit")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "audit" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          📜 Audit Logs
        </button>
        <button
          onClick={() => handleTabChange("live_matches")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "live_matches" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          👁️ Live Matches (${liveMatches.length})
        </button>
        <button
          onClick={() => handleTabChange("squads")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "squads" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          🛡️ Squad Governance (${adminSquads.length})
        </button>
        <button
          onClick={() => handleTabChange("disputes")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "disputes" ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          ⚖️ Disputes Queue (${adminDisputes.filter((d: any) => d.status === "pending").length})
        </button>
        <button
          onClick={() => handleTabChange("emergency")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === "emergency" ? "bg-red-600 text-white shadow-md" : "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          }`}
        >
          🚨 Emergency Controls
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPETITIONS */}
      {/* ========================================================================= */}
      {activeTab === "competitions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Competition Arena Management</h2>
              <p className="text-xs text-gray-500">Configure rounds, 1v1 battles, question source modes, and publication workflows.</p>
            </div>
            <button
              onClick={() => setShowNewCompModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow transition flex items-center gap-2"
            >
              <span>➕</span> Create Competition
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitions.map((comp) => (
              <div key={comp.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      {comp.code}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                        comp.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : comp.status === "pending_approval"
                          ? "bg-amber-100 text-amber-800"
                          : comp.status === "draft"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-2">{comp.title}</h3>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span>Source:</span>
                    <span className="font-semibold text-indigo-700 uppercase">
                      {comp.question_source_mode.replace("_", " ")}
                    </span>
                    {comp.competition_question_banks && (
                      <span className="truncate">({comp.competition_question_banks.name})</span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div>Questions: <span className="font-bold">{comp.rules?.question_count || 10}</span></div>
                    <div>Duration: <span className="font-bold">{(comp.rules?.duration_seconds || 300) / 60}m</span></div>
                    <div>Type: <span className="font-bold capitalize">{comp.competition_type}</span></div>
                    <div>1v1 Equivalent: <span className="font-bold">{comp.rules?.identical_questions_for_all ? "Yes (Sync)" : "Randomized"}</span></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                  {comp.status === "draft" && (
                    <button
                      onClick={() => handleCompetitionAction(comp.id, "publish")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      Publish
                    </button>
                  )}
                  {comp.status === "pending_approval" && (
                    <button
                      onClick={() => handleCompetitionAction(comp.id, "publish")}
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      Approve & Publish
                    </button>
                  )}
                  {comp.status === "published" && (
                    <button
                      onClick={() => handleCompetitionAction(comp.id, "pause")}
                      className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      Pause
                    </button>
                  )}
                  {comp.status !== "cancelled" && (
                    <button
                      onClick={() => handleCompetitionAction(comp.id, "cancel")}
                      className="text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEDICATED QUESTION BANKS */}
      {/* ========================================================================= */}
      {activeTab === "banks" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Dedicated Competition Question Banks</h2>
              <p className="text-xs text-gray-500">Completely independent from main CBT bank at permission and storage layers.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedBankId}
                onChange={(e) => {
                  setSelectedBankId(e.target.value);
                  loadBankQuestions(e.target.value);
                }}
                className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm font-medium"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.subject})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewBankModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow transition flex items-center gap-2"
              >
                <span>➕</span> New Bank
              </button>
            </div>
          </div>

          {/* Questions in selected bank */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div className="font-bold text-gray-800 text-sm">
                Questions in Selected Bank ({bankQuestions.length})
              </div>
              <div className="text-xs text-gray-500">
                Supports 4-option & 5-option MCQs with explanations and media
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {bankQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 hover:bg-gray-50/60 transition space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{q.subject}</span>
                      {q.topic && <span className="text-gray-600">› {q.topic}</span>}
                      <span className="capitalize px-2 py-0.5 rounded bg-gray-100 font-medium">{q.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Ans: Option {q.correct_answer}
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{q.marks} Mark{q.marks !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{q.question}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs pt-1">
                    <div className={`p-2 rounded border ${q.correct_answer === "A" ? "border-emerald-500 bg-emerald-50 font-bold" : "border-gray-200 bg-white"}`}>
                      A: {q.option_a}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "B" ? "border-emerald-500 bg-emerald-50 font-bold" : "border-gray-200 bg-white"}`}>
                      B: {q.option_b}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "C" ? "border-emerald-500 bg-emerald-50 font-bold" : "border-gray-200 bg-white"}`}>
                      C: {q.option_c}
                    </div>
                    <div className={`p-2 rounded border ${q.correct_answer === "D" ? "border-emerald-500 bg-emerald-50 font-bold" : "border-gray-200 bg-white"}`}>
                      D: {q.option_d}
                    </div>
                    {q.option_e && (
                      <div className={`p-2 rounded border ${q.correct_answer === "E" ? "border-emerald-500 bg-emerald-50 font-bold" : "border-gray-200 bg-white"}`}>
                        E: {q.option_e}
                      </div>
                    )}
                  </div>
                  {q.explanation && (
                    <div className="text-xs text-gray-600 bg-blue-50/50 p-2 rounded border border-blue-100/60 mt-1">
                      <span className="font-semibold text-blue-900">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
              {bankQuestions.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No questions in this bank yet. Use the <strong>In-Web Builder</strong> or <strong>CSV Importer</strong> to add questions!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IN-WEB QUESTION BUILDER */}
      {/* ========================================================================= */}
      {activeTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Builder Editor Form */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">In-Web Question Builder</h2>
                <p className="text-xs text-gray-500">Create competition questions with live student renderer preview.</p>
              </div>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bank: {b.name}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Question Stem / Prompt *</label>
                <textarea
                  rows={3}
                  value={builderStem}
                  onChange={(e) => setBuilderStem(e.target.value)}
                  placeholder="Type question stem..."
                  required
                  className="w-full text-sm p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    value={builderSubject}
                    onChange={(e) => setBuilderSubject(e.target.value)}
                    required
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={builderTopic}
                    onChange={(e) => setBuilderTopic(e.target.value)}
                    placeholder="e.g. Calculus"
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={builderDifficulty}
                    onChange={(e) => setBuilderDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-700">Answer Options (4 or 5)</label>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={builderIncludeE}
                      onChange={(e) => {
                        setBuilderIncludeE(e.target.checked);
                        if (!e.target.checked && builderCorrectAns === "E") setBuilderCorrectAns("A");
                      }}
                      className="rounded"
                    />
                    Enable 5th Option (Option E)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Option A *"
                    value={builderOptA}
                    onChange={(e) => setBuilderOptA(e.target.value)}
                    required
                    className="text-sm p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option B *"
                    value={builderOptB}
                    onChange={(e) => setBuilderOptB(e.target.value)}
                    required
                    className="text-sm p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option C *"
                    value={builderOptC}
                    onChange={(e) => setBuilderOptC(e.target.value)}
                    required
                    className="text-sm p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option D *"
                    value={builderOptD}
                    onChange={(e) => setBuilderOptD(e.target.value)}
                    required
                    className="text-sm p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {builderIncludeE && (
                  <input
                    type="text"
                    placeholder="Option E *"
                    value={builderOptE}
                    onChange={(e) => setBuilderOptE(e.target.value)}
                    required
                    className="w-full text-sm p-2 border border-indigo-300 bg-indigo-50/30 rounded-lg"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Correct Answer Key *</label>
                  <select
                    value={builderCorrectAns}
                    onChange={(e) => setBuilderCorrectAns(e.target.value)}
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg font-bold"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                    {builderIncludeE && <option value="E">Option E</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Marks Assigned *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={builderMarks}
                    onChange={(e) => setBuilderMarks(parseFloat(e.target.value) || 1)}
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Explanation / Worked Solution</label>
                <textarea
                  rows={2}
                  value={builderExplanation}
                  onChange={(e) => setBuilderExplanation(e.target.value)}
                  placeholder="Explanation shown during debrief..."
                  className="w-full text-sm p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={builderSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow transition"
              >
                {builderSaving ? "Validating & Saving..." : "💾 Validate & Save Question to Bank"}
              </button>
            </form>
          </div>

          {/* Real-time Student Assessment Preview */}
          <div className="bg-gradient-to-b from-gray-900 to-slate-900 text-white p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                  👁️ Student CBT Assessment Preview
                </span>
                <span className="text-xs text-gray-400 font-mono">Difficulty: {builderDifficulty}</span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-400 font-semibold">{builderSubject} {builderTopic && `• ${builderTopic}`}</div>
                <div className="text-base font-semibold leading-relaxed text-gray-100">
                  {builderStem || "Question prompt will appear here as you type in the editor..."}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {[
                  { key: "A", val: builderOptA },
                  { key: "B", val: builderOptB },
                  { key: "C", val: builderOptC },
                  { key: "D", val: builderOptD },
                  ...(builderIncludeE ? [{ key: "E", val: builderOptE }] : []),
                ].map((opt) => (
                  <div
                    key={opt.key}
                    className={`p-3 rounded-xl border text-sm flex items-center justify-between transition ${
                      builderCorrectAns === opt.key
                        ? "border-emerald-500/70 bg-emerald-950/40 text-emerald-200"
                        : "border-gray-800 bg-gray-800/40 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-700/80 text-white flex items-center justify-center text-xs font-bold font-mono">
                        {opt.key}
                      </span>
                      <span>{opt.val || `Option ${opt.key} text`}</span>
                    </div>
                    {builderCorrectAns === opt.key && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/30">
                        Answer Key
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {builderExplanation && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-xs text-blue-200">
                  <span className="font-bold text-blue-300">Worked Solution:</span> {builderExplanation}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-800/80 text-center text-[11px] text-gray-500">
              The preview dynamically reflects 4 or 5 options, marks, and explanation fidelity.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CSV IMPORTER & DUPLICATES */}
      {/* ========================================================================= */}
      {activeTab === "csv_import" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">CSV Question Importer & Duplicate Detector</h2>
                <p className="text-xs text-gray-500">
                  Safe transactional import workflow. Detects exact duplicates, equivalent wording, and invalid rows.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/competition/banks/template"
                  download
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-2 rounded-xl font-semibold transition flex items-center gap-1.5"
                >
                  <span>📥</span> Download Template CSV
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Question Bank *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-xl"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                CSV Content (Paste CSV or upload) *
              </label>
              <textarea
                rows={7}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows with headers (Question,Subject,Topic,Subtopic,Difficulty,Question Type,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Marks,Tags)..."
                className="w-full font-mono text-xs p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreviewCSV}
                disabled={csvImporting || !csvText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2.5 rounded-xl font-semibold shadow transition"
              >
                🔍 Step 1: Preview & Validate Rows
              </button>
              {csvDryRunSummary && csvDryRunSummary.valid_count > 0 && (
                <button
                  type="button"
                  onClick={handleCommitCSV}
                  disabled={csvImporting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2.5 rounded-xl font-semibold shadow transition animate-pulse"
                >
                  ✅ Step 2: Confirm & Commit Import ({csvDryRunSummary.valid_count} Questions)
                </button>
              )}
            </div>

            {/* Validation & Duplicate Detection Report */}
            {csvDryRunSummary && (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    Total Rows: <span className="font-bold">{csvDryRunSummary.total_rows}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-800">
                    Valid to Import: <span className="font-bold">{csvDryRunSummary.valid_count}</span>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-rose-800">
                    Rejected / Errors: <span className="font-bold">{csvDryRunSummary.rejected_count}</span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-800">
                    Duplicates: <span className="font-bold">{csvDryRunSummary.duplicates_count}</span>
                  </div>
                </div>

                {csvDryRunSummary.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-rose-700">Validation Errors:</div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                      {csvDryRunSummary.errors.map((err, i) => (
                        <div key={i} className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800">
                          Row {err.row} [{err.field}]: {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MODERATION & SEPARATION OF DUTIES */}
      {/* ========================================================================= */}
      {activeTab === "moderation" && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Competition Moderation & Appeals Console</h2>
            <p className="text-xs text-gray-500">
              Separation of duties: Moderators flag cases, authorized administrators approve publication or corrections.
            </p>
          </div>

          <div className="space-y-3">
            {moderationCases.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {c.case_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">Status: {c.status}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{c.description}</div>
                </div>

                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveCase(c.id, "approved_by_admin")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Admin Approve
                    </button>
                    <button
                      onClick={() => handleResolveCase(c.id, "rejected_by_admin")}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
            {moderationCases.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                No active moderation cases. All quizzes and participant reports are clear.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REWARD APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === "rewards" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Competition Reward Authorization Queue</h2>
              <p className="text-xs text-gray-500">
                Separation of duties: Host/Manager proposes rewards; authorized Administrator reviews and approves issuance.
              </p>
            </div>
            <button
              onClick={() => setShowRewardModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl font-semibold shadow transition"
            >
              ➕ Propose Reward
            </button>
          </div>

          <div className="space-y-3">
            {rewardProposals.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700 text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded">
                      {p.reward_type.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      Amount: {p.amount_or_details?.xp || 0} XP
                    </span>
                    <span className="text-xs text-gray-400">Status: {p.status}</span>
                  </div>
                  <div className="text-sm text-gray-800 mt-1">
                    Recipient: <span className="font-mono text-xs">{p.recipient_id}</span> • Reason: {p.amount_or_details?.reason || "Prize"}
                  </div>
                </div>

                {p.status === "proposed" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReward(p.id, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Authorize Issuance
                    </button>
                    <button
                      onClick={() => handleApproveReward(p.id, "rejected")}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {rewardProposals.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
                No pending reward proposals in queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: IMMUTABLE AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900">Competition Arena Audit Trail</h2>
            <p className="text-xs text-gray-500">
              Immutable records of sensitive administrative actions (creations, publications, CSV imports, corrections, and reward authorizations).
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 text-xs space-y-1">
                <div className="flex justify-between items-center text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span>Resource: {log.resource_type} ({log.resource_id.slice(0, 8)}...)</span>
                  </div>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div className="text-gray-800 font-medium">Actor: {log.acting_user_email}</div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="bg-gray-50 p-2 rounded text-[11px] font-mono text-gray-600 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">No audit records logged yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE COMPETITION */}
      {/* ========================================================================= */}
      {showNewCompModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Create Competition / Challenge</h3>
              <button onClick={() => setShowNewCompModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateCompetition} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Competition Title *</label>
                <input
                  type="text"
                  required
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                  placeholder="e.g. UTME Science Triple-Threat Arena"
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Competition Type</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  >
                    <option value="arena">General Arena</option>
                    <option value="battle_1v1">1v1 Synchronized Battle</option>
                    <option value="tournament">Tournament Round</option>
                    <option value="quiz_sprint">Quiz Sprint</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Question Source Mode *</label>
                  <select
                    value={newCompSourceMode}
                    onChange={(e) => setNewCompSourceMode(e.target.value as "competition_bank" | "main_bank" | "combined")}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-semibold"
                  >
                    <option value="competition_bank">1. Dedicated Competition Bank</option>
                    <option value="main_bank">2. Main BrainLab CBT Bank</option>
                    <option value="combined">3. Combined Sources (50/50)</option>
                  </select>
                </div>
              </div>

              {newCompSourceMode !== "main_bank" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Dedicated Bank *</label>
                  <select
                    value={newCompBankId}
                    onChange={(e) => setNewCompBankId(e.target.value)}
                    required={newCompSourceMode === "competition_bank"}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  >
                    <option value="">-- Choose Dedicated Bank --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.subject})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Question Count</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={newCompQCount}
                    onChange={(e) => setNewCompQCount(parseInt(e.target.value, 10) || 10)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="60"
                    step="30"
                    value={newCompDuration}
                    onChange={(e) => setNewCompDuration(parseInt(e.target.value, 10) || 300)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk1v1Identical"
                  checked={newCompType === "battle_1v1" || newComp1v1Identical}
                  disabled={newCompType === "battle_1v1"}
                  onChange={(e) => setNewComp1v1Identical(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="chk1v1Identical" className="text-xs text-gray-700 cursor-pointer">
                  Preserve Identical Questions for all participants (Synchronized battle equivalence)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewCompModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Create Competition Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE QUESTION BANK */}
      {/* ========================================================================= */}
      {showNewBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Create Dedicated Question Bank</h3>
              <button onClick={() => setShowNewBankModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateBank} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics Olympiad 2026 Bank"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, English, Biology"
                  value={newBankSubject}
                  onChange={(e) => setNewBankSubject(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Visibility</label>
                <select
                  value={newBankVisibility}
                  onChange={(e) => setNewBankVisibility(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                >
                  <option value="private">Private (Restricted to creator & admins)</option>
                  <option value="shared">Shared (Authorized hosts & tutors)</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose of this dedicated bank..."
                  value={newBankDesc}
                  onChange={(e) => setNewBankDesc(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewBankModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Create Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROPOSE REWARD */}
      {/* ========================================================================= */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-base font-bold text-gray-900">Propose Competition Reward</h3>
              <button onClick={() => setShowRewardModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">&times;</button>
            </div>

            <form onSubmit={handleProposeReward} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Competition *</label>
                <select
                  required
                  value={rewardCompId}
                  onChange={(e) => setRewardCompId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                >
                  <option value="">-- Select Competition --</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient User UUID *</label>
                <input
                  type="text"
                  required
                  placeholder="Supabase Auth User UUID"
                  value={rewardRecipientId}
                  onChange={(e) => setRewardRecipientId(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">XP Amount *</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={rewardXpAmount}
                  onChange={(e) => setRewardXpAmount(parseInt(e.target.value, 10) || 100)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Citation *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 1st Place UTME Speedrun Challenge"
                  value={rewardReason}
                  onChange={(e) => setRewardReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
