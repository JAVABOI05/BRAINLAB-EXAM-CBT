"use client";

import { adminSignOut, getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import {
  getExamSettings,
  saveExamSettings,
  type ExamSettings,
  getFooterConfig,
  saveFooterConfig,
  DEFAULT_FOOTER_CONFIG,
  type FooterConfig,
  getMaintenanceModeConfig,
  saveMaintenanceModeConfig,
  DEFAULT_MAINTENANCE_MODE_CONFIG,
  type MaintenanceModeConfig,
} from "../../lib/platformConfig";
import "../admin.css";
import AdminPinGuard from "@/app/components/AdminPinGuard";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type ConfigRow = {
  id: number;
  config_key: string;
  config_value: unknown;
  updated_at?: string;
};

type QuestionCounts = {
  English_objective: number;
  English_literature: number;
  English_comprehension_passages: number;
  English_comprehension_per_passage: number;
  Chemistry: number;
  Physics: number;
  Biology: number;
  Mathematics: number;
};

type ExamArrangement = {
  mode: string;
  order: string[];
};

const SUBJECT_OPTIONS = [
  "English",
  "Chemistry",
  "Physics",
  "Biology",
  "Mathematics",
  "Elective",
];

export default function AdminConfigPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManageConfig, setCanManageConfig] = useState(false);
  const [message, setMessage] = useState("");

  const [subjects, setSubjects] = useState<string[]>([
    "English",
    "Chemistry",
    "Physics",
    "Biology",
  ]);

  const [questionCounts, setQuestionCounts] = useState<QuestionCounts>({
    English_objective: 43,
    English_literature: 7,
    English_comprehension_passages: 2,
    English_comprehension_per_passage: 5,
    Chemistry: 40,
    Physics: 40,
    Biology: 40,
    Mathematics: 40,
  });

  const [examArrangement, setExamArrangement] = useState<ExamArrangement>({
    mode: "default",
    order: ["English", "Chemistry", "Physics", "Elective"],
  });

  const [accessCodeRequired, setAccessCodeRequired] = useState(true);
  const [premiumMockOnly, setPremiumMockOnly] = useState(false);
  const [electiveEnabled, setElectiveEnabled] = useState(true);
  const [examSettings, setExamSettings] = useState<ExamSettings>({
    exam_duration_seconds: 7200,
    pass_mark_percent: 50,
    negative_marking: false,
    max_attempts_per_code: 1,
    randomize_questions: true,
    randomize_options: true,
    show_results_immediately: true,
    show_marks_in_exam: true,
    show_topic_in_exam: true,
    allow_corrections: true,
    result_notifications: true,
  });
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [maintenance, setMaintenance] = useState<MaintenanceModeConfig>(DEFAULT_MAINTENANCE_MODE_CONFIG);

  function updateSocialLink(platform: string, field: "url" | "enabled", value: string | boolean) {
    setFooterConfig((prev) => {
      const links = [...(prev.social_links || [])];
      const index = links.findIndex((item) => item.platform === platform);
      if (index !== -1) {
        links[index] = { ...links[index], [field]: value };
      }
      return { ...prev, social_links: links };
    });
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.config.read"))) {
        if (active) { setMessage("You do not have permission to view examination settings."); setLoading(false); }
        return;
      }
      setCanManageConfig(await adminHasPermission("cbt.config.manage"));
      setAdminUser(admin);
      await loadConfig();
    }
    void init().catch(() => { if (active) { setMessage("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  async function loadConfig() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("exam_config")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      setMessage(`Failed to load config: ${error.message}`);
      setLoading(false);
      return;
    }

    const rows = (data || []) as ConfigRow[];

    rows.forEach((row) => {
      if (row.config_key === "subjects" && Array.isArray(row.config_value)) {
        setSubjects(row.config_value as string[]);
      }

      if (
        row.config_key === "question_counts" &&
        row.config_value &&
        typeof row.config_value === "object"
      ) {
        setQuestionCounts((row.config_value as QuestionCounts) || questionCounts);
      }

      if (
        row.config_key === "exam_arrangement" &&
        row.config_value &&
        typeof row.config_value === "object"
      ) {
        setExamArrangement(
          (row.config_value as ExamArrangement) || {
            mode: "default",
            order: ["English", "Chemistry", "Physics", "Elective"],
          }
        );
      }

      if (row.config_key === "access_code_required") {
        setAccessCodeRequired(row.config_value === true || String(row.config_value).toLowerCase() === "true");
      }

      if (row.config_key === "premium_mock_only") {
        setPremiumMockOnly(row.config_value === true || String(row.config_value).toLowerCase() === "true");
      }

      if (row.config_key === "elective_enabled") {
        setElectiveEnabled(Boolean(row.config_value));
      }
    });

    const [loadedExamSettings, loadedFooter] = await Promise.all([
      getExamSettings().catch(() => null),
      getFooterConfig().catch(() => null),
    ]);
    if (loadedExamSettings) setExamSettings(loadedExamSettings);
    if (loadedFooter) setFooterConfig(loadedFooter);
    setLoading(false);
  }

  async function saveConfigRow(configKey: string, configValue: unknown) {
    if (configKey === "access_code_required" || configKey === "premium_mock_only") {
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData.session?.access_token;
      if (!accessToken) throw new Error(`${configKey}: your administrator session has expired. Please sign in again.`);

      const response = await fetch("/api/admin/exam-access-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ key: configKey, value: configValue }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(`${configKey}: ${result?.message || "The setting could not be saved."}`);
      }
      return;
    }

    const { error } = await supabase
      .from("exam_config")
      .update({
        config_value: configValue,
        updated_at: new Date().toISOString(),
      })
      .eq("config_key", configKey);

    if (error) throw new Error(`${configKey}: ${error.message}`);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      await Promise.all([
        saveConfigRow("subjects", subjects),
        saveConfigRow("question_counts", questionCounts),
        saveConfigRow("exam_arrangement", examArrangement),
        saveConfigRow("access_code_required", accessCodeRequired),
        saveConfigRow("premium_mock_only", premiumMockOnly),
        saveConfigRow("elective_enabled", electiveEnabled),
        saveConfigRow("show_results", examSettings.show_results_immediately).catch(() => null),
        saveConfigRow("allow_corrections", examSettings.allow_corrections !== false).catch(() => null),
        saveConfigRow("result_notifications", examSettings.result_notifications !== false).catch(() => null),
      ]);
      if (adminUser) {
        const [examSaved, footerSaved, maintSaved] = await Promise.all([
          saveMaintenanceModeConfig(maintenance, adminUser),
          saveExamSettings(examSettings, adminUser, "Updated CBT exam rules and duration"),
          saveFooterConfig(
            {
              ...footerConfig,
              support_phone: footerConfig.support_phone.trim(),
              whatsapp_number: footerConfig.whatsapp_number.replace(/\D/g, ""),
            },
            adminUser,
            "Updated website footer and official channels"
          ),
        ]);

        if (!examSaved) throw new Error("Exam settings could not be saved.");
        if (!footerSaved) {
          throw new Error("Footer and WhatsApp Helpdesk settings could not be saved. Please check your connection and try again.");
        }
      }

      setMessage("Configuration and footer settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    void adminSignOut();
    router.push("/admin/login");
  }

  function toggleSubject(subject: string) {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((item) => item !== subject)
        : [...prev, subject]
    );
  }

  function updateOrder(index: number, value: string) {
    setExamArrangement((prev) => {
      const nextOrder = [...prev.order];
      nextOrder[index] = value;
      return { ...prev, order: nextOrder };
    });
  }

  function addOrderSlot() {
    setExamArrangement((prev) => ({
      ...prev,
      order: [...prev.order, "English"],
    }));
  }

  function removeOrderSlot(index: number) {
    setExamArrangement((prev) => ({
      ...prev,
      order: prev.order.filter((_, i) => i !== index),
    }));
  }

  const arrangementPreview = useMemo(() => {
    return examArrangement.order.join(" → ");
  }, [examArrangement.order]);

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <section className="admin-card">
            <p className="text-lg font-medium text-slate-700">
              Loading exam configuration...
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Exam Configuration</div>
              <h1 className="admin-title">Configure mock exam setup</h1>
              <p className="admin-subtitle">
                Control subjects, arrangement, question counts, elective
                behavior, and access-code requirement from one page.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <Link href="/admin/calendar" className="admin-btn-light border-blue-300 text-blue-700 font-bold">
                📅 Exam Calendar &amp; Channels
              </Link>
              <Link href="/admin/questions/blueprints" className="admin-btn-light border-blue-300 text-blue-700 font-bold">
                📖 Section Blueprints &amp; Quotas
              </Link>
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push("/admin/questions/manage")}
                className="admin-btn-light"
              >
                Questions
              </button>
              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Subjects Enabled</p>
            <p className="admin-stat-value">{subjects.length}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Access Codes</p>
            <p className="admin-stat-value">
              {accessCodeRequired ? "ON" : "OFF"}
            </p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Elective Mode</p>
            <p className="admin-stat-value">{electiveEnabled ? "ON" : "OFF"}</p>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Core Exam Controls</h2>
          <p className="admin-card-text">
            Decide whether access codes are required and whether the elective
            system is enabled.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <p className="admin-label">Access Code Requirement</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={accessCodeRequired}
                  onChange={(e) => setAccessCodeRequired(e.target.checked)}
                />
                <span>Require access code before starting exam</span>
              </label>
              <p className="admin-help">
                Turn this off if candidates should go straight from login to the
                exam flow.
              </p>
            </div>

            <div className="admin-setting-box">
              <p className="admin-label">Premium-Only Mock Access</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={premiumMockOnly}
                  onChange={(e) => setPremiumMockOnly(e.target.checked)}
                />
                <span>Restrict the full UTME mock to active paid subscribers</span>
              </label>
              <p className="admin-help">
                When enabled, only accounts with an active Premium, Plus, Pro or Apex plan (and administrators) can start the mock. Public/Free accounts are blocked even if they have an access voucher. This does not change anyone&apos;s subscription.
              </p>
            </div>

            <div className="admin-setting-box">
              <p className="admin-label">Elective Subject Mode</p>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={electiveEnabled}
                  onChange={(e) => setElectiveEnabled(e.target.checked)}
                />
                <span>Allow Biology/Mathematics elective selection</span>
              </label>
              <p className="admin-help">
                Turn this off if you want a fixed subject arrangement instead of
                elective mode.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Subjects Included</h2>
          <p className="admin-card-text">
            Choose which subjects should be part of the mock exam setup.
          </p>

          <div className="admin-settings-grid">
            {SUBJECT_OPTIONS.map((subject) => (
              <div key={subject} className="admin-setting-box">
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject)}
                    onChange={() => toggleSubject(subject)}
                  />
                  <span>{subject}</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Question Counts</h2>
          <p className="admin-card-text">
            Control the number of questions each part of the exam should use.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">English Objective</label>
              <input
                type="number"
                min={0}
                value={questionCounts.English_objective}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    English_objective: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">English Literature</label>
              <input
                type="number"
                min={0}
                value={questionCounts.English_literature}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    English_literature: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Comprehension Passages</label>
              <input
                type="number"
                min={0}
                value={questionCounts.English_comprehension_passages}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    English_comprehension_passages:
                      Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Questions Per Passage</label>
              <input
                type="number"
                min={0}
                value={questionCounts.English_comprehension_per_passage}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    English_comprehension_per_passage:
                      Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Chemistry</label>
              <input
                type="number"
                min={0}
                value={questionCounts.Chemistry}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    Chemistry: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Physics</label>
              <input
                type="number"
                min={0}
                value={questionCounts.Physics}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    Physics: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Biology</label>
              <input
                type="number"
                min={0}
                value={questionCounts.Biology}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    Biology: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Mathematics</label>
              <input
                type="number"
                min={0}
                value={questionCounts.Mathematics}
                onChange={(e) =>
                  setQuestionCounts((prev) => ({
                    ...prev,
                    Mathematics: Number(e.target.value) || 0,
                  }))
                }
                className="admin-input"
              />
            </div>
          </div>
        </section>

        <section className="admin-section admin-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="admin-card-title">Subject Arrangement</h2>
              <p className="admin-card-text">
                Set the order in which subjects appear in the exam.
              </p>
            </div>

            <div className="admin-user-chip">
              Arrangement <strong>{arrangementPreview}</strong>
            </div>
          </div>

          <div className="admin-settings-grid">
            <div className="admin-setting-box" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Arrangement Mode</label>
              <select
                value={examArrangement.mode}
                onChange={(e) =>
                  setExamArrangement((prev) => ({
                    ...prev,
                    mode: e.target.value,
                  }))
                }
                className="admin-input"
              >
                <option value="default">default</option>
                <option value="custom">custom</option>
              </select>
              <p className="admin-help">
                Use custom if you want the app to obey your exact subject order.
              </p>
            </div>

            {examArrangement.order.map((item, index) => (
              <div key={index} className="admin-setting-box">
                <label className="admin-label">Position {index + 1}</label>
                <select
                  value={item}
                  onChange={(e) => updateOrder(index, e.target.value)}
                  className="admin-input"
                >
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>

                <div className="mt-4">
                  <button
                    onClick={() => removeOrderSlot(index)}
                    className="admin-btn-light"
                    type="button"
                  >
                    Remove Slot
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button onClick={addOrderSlot} className="admin-btn-light" type="button">
              Add Subject Slot
            </button>
          </div>
        </section>

        
        <section className="admin-section admin-card">
          <h2 className="admin-card-title">CBT Timing, Pass Mark & Exam Rules</h2>
          <p className="admin-card-text">
            Configure live exam rules applied to student examination sessions.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Exam Duration (Minutes)</label>
              <input
                type="number"
                min={10}
                max={360}
                value={Math.round(examSettings.exam_duration_seconds / 60)}
                onChange={(e) =>
                  setExamSettings((prev) => ({
                    ...prev,
                    exam_duration_seconds: Math.max(600, (Number(e.target.value) || 120) * 60),
                  }))
                }
                className="admin-input"
              />
              <p className="admin-help">Standard 2 hours = 120 minutes ({examSettings.exam_duration_seconds}s).</p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Pass Mark Percentage (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={examSettings.pass_mark_percent}
                onChange={(e) =>
                  setExamSettings((prev) => ({
                    ...prev,
                    pass_mark_percent: Number(e.target.value) || 50,
                  }))
                }
                className="admin-input"
              />
              <p className="admin-help">Minimum percentage needed to achieve a PASS grade.</p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Max Attempts Per Access Code</label>
              <input
                type="number"
                min={1}
                max={10}
                value={examSettings.max_attempts_per_code}
                onChange={(e) =>
                  setExamSettings((prev) => ({
                    ...prev,
                    max_attempts_per_code: Number(e.target.value) || 1,
                  }))
                }
                className="admin-input"
              />
              <p className="admin-help">Number of times a student can reuse a test PIN.</p>
            </div>

            <div className="admin-setting-box flex flex-col justify-between">
              <label className="admin-label">Negative Marking (-0.25 mark per wrong answer)</label>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, negative_marking: !prev.negative_marking }))
                }
                className={examSettings.negative_marking ? "admin-btn-primary" : "admin-btn-light"}
              >
                {examSettings.negative_marking ? "✓ Negative Marking Enabled" : "Disabled (Standard UTME)"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between">
              <label className="admin-label">Show Results Immediately After Exam</label>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, show_results_immediately: !prev.show_results_immediately }))
                }
                className={examSettings.show_results_immediately ? "admin-btn-primary" : "admin-btn-light"}
              >
                {examSettings.show_results_immediately ? "✓ Instant Results ON" : "Hold Results (Admin Approval)"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between">
              <label className="admin-label">Randomize Question Order</label>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, randomize_questions: !prev.randomize_questions }))
                }
                className={examSettings.randomize_questions ? "admin-btn-primary" : "admin-btn-light"}
              >
                {examSettings.randomize_questions ? "✓ Question Shuffling ON" : "Fixed Question Order"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between border-2 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20">
              <div>
                <label className="admin-label font-black text-slate-900 dark:text-white">Exam Marks Display</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Show or switch off marks (e.g. 100 Marks, 400 Marks Total, per-question marks) in candidate exam screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, show_marks_in_exam: prev.show_marks_in_exam === false }))
                }
                className={`mt-3 ${examSettings.show_marks_in_exam !== false ? "admin-btn-primary" : "admin-btn-light"}`}
              >
                {examSettings.show_marks_in_exam !== false ? "✓ Marks Visible in Exam" : "✕ Marks Switched OFF (Hidden)"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between border-2 border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20">
              <div>
                <label className="admin-label font-black text-slate-900 dark:text-white">Question Topic Display</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Show or switch off question topic &amp; category tags (e.g. Organic Chemistry, Calculus) during CBT testing.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, show_topic_in_exam: prev.show_topic_in_exam === false }))
                }
                className={`mt-3 ${examSettings.show_topic_in_exam !== false ? "admin-btn-primary" : "admin-btn-light"}`}
              >
                {examSettings.show_topic_in_exam !== false ? "✓ Question Topics Visible" : "✕ Question Topics Switched OFF (Subject Only)"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20">
              <div>
                <label className="admin-label font-black text-slate-900 dark:text-white">Question Corrections &amp; Explanations</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Allow or lock candidate access to review question answers, options, and AI Tutor step-by-step solutions post-exam.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, allow_corrections: prev.allow_corrections === false }))
                }
                className={`mt-3 ${examSettings.allow_corrections !== false ? "admin-btn-primary" : "admin-btn-light"}`}
              >
                {examSettings.allow_corrections !== false ? "✓ Corrections & Explanations ON" : "🔒 Corrections Withheld (Locked by Proctor)"}
              </button>
            </div>

            <div className="admin-setting-box flex flex-col justify-between border-2 border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/20">
              <div>
                <label className="admin-label font-black text-slate-900 dark:text-white">Candidate Result Notifications</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Enable or turn off automatic external notification dispatch (SMS, Email, WhatsApp alerts) for finalized results.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExamSettings((prev) => ({ ...prev, result_notifications: prev.result_notifications === false }))
                }
                className={`mt-3 ${examSettings.result_notifications !== false ? "admin-btn-primary" : "admin-btn-light"}`}
              >
                {examSettings.result_notifications !== false ? "✓ Result Notifications ON" : "🔕 Result Notifications OFF (Manual Portal Only)"}
              </button>
            </div>

            {/* Chief Examination Officer / Proctor Signatory */}
            <div className="admin-setting-box border-2 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 sm:col-span-2">
              <div>
                <label className="admin-label font-black text-slate-900 dark:text-white">
                  Official Result Slip Signatory (Chief Examination Officer / Proctor)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Customize the signatory name and designation displayed on all candidate CBT result slips, printable certificates, and verification records.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Signatory Name &amp; Honors
                  </label>
                  <input
                    type="text"
                    value={examSettings.chief_proctor_name || ""}
                    onChange={(e) =>
                      setExamSettings((prev) => ({ ...prev, chief_proctor_name: e.target.value }))
                    }
                    placeholder="e.g. Dr. K. Adeleke, F.Ed."
                    className="admin-input"
                  />
                  <p className="admin-help mt-1">Appears directly above the official signature line.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Official Title / Designation
                  </label>
                  <input
                    type="text"
                    value={examSettings.chief_proctor_title || ""}
                    onChange={(e) =>
                      setExamSettings((prev) => ({ ...prev, chief_proctor_title: e.target.value }))
                    }
                    placeholder="e.g. Chief Examination Officer / Chief Examination Proctor"
                    className="admin-input"
                  />
                  <p className="admin-help mt-1">Appears directly beneath the signatory name.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Website Footer & Official Contact Channels */}
        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Website Footer &amp; Official Contact Channels</h2>
          <p className="admin-card-text">
            Configure the public support channels, brand copy, and social media links displayed across the platform footer.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Public Support Email (CBT Helpdesk)</label>
              <input
                type="email"
                value={footerConfig.support_email}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, support_email: e.target.value }))
                }
                placeholder="support@brainlab.edu.ng"
                className="admin-input"
              />
              <p className="admin-help">
                Primary public learner CBT and technical support address.
              </p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Academy Email (Admissions &amp; Office)</label>
              <input
                type="email"
                value={footerConfig.academy_email || "academy@brainlab.edu.ng"}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, academy_email: e.target.value }))
                }
                placeholder="academy@brainlab.edu.ng"
                className="admin-input"
              />
              <p className="admin-help">
                Official academy correspondence and admissions address.
              </p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Public Support Phone</label>
              <input
                type="text"
                value={footerConfig.support_phone}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, support_phone: e.target.value }))
                }
                placeholder="+234 907 431 0204"
                className="admin-input"
              />
              <p className="admin-help">Displays in the footer with direct tel: and dialling capability.</p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">WhatsApp Helpdesk Number</label>
              <input
                type="text"
                value={footerConfig.whatsapp_number}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, whatsapp_number: e.target.value }))
                }
                placeholder="2349074310204"
                className="admin-input"
              />
              <p className="admin-help">Digits only (with country code 234) for direct WhatsApp chat links.</p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">WhatsApp Community Channel URL</label>
              <input
                type="url"
                value={footerConfig.whatsapp_channel_url}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, whatsapp_channel_url: e.target.value }))
                }
                placeholder="https://whatsapp.com/channel/..."
                className="admin-input"
              />
              <p className="admin-help">Official WhatsApp community announcements channel link.</p>
            </div>

            <div className="admin-setting-box col-span-full">
              <label className="admin-label">Brand Tagline</label>
              <input
                type="text"
                value={footerConfig.brand_tagline}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, brand_tagline: e.target.value }))
                }
                placeholder="Helping learners prepare smarter, build confidence, and achieve their academic goals."
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box col-span-full">
              <label className="admin-label">Brand Description</label>
              <textarea
                value={footerConfig.brand_description}
                onChange={(e) =>
                  setFooterConfig((prev) => ({ ...prev, brand_description: e.target.value }))
                }
                rows={2}
                placeholder="Concise, verified description of active services..."
                className="admin-input"
              />
            </div>
          </div>

          <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-800">
            Social Media Channels
          </h3>
          <p className="text-xs text-slate-500">
            Enable or disable specific channels. Links with empty or invalid URLs are automatically hidden from the public footer.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(footerConfig.social_links || []).map((social) => (
              <div key={social.platform} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{social.name}</span>
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={social.enabled}
                      onChange={(e) =>
                        updateSocialLink(social.platform, "enabled", e.target.checked)
                      }
                    />
                    <span className="text-xs">{social.enabled ? "Visible" : "Hidden"}</span>
                  </label>
                </div>
                <input
                  type="url"
                  value={social.url}
                  onChange={(e) =>
                    updateSocialLink(social.platform, "url", e.target.value)
                  }
                  placeholder={`https://${social.platform}.com/...`}
                  className="admin-input mt-2 text-xs"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Save Configuration</h2>
          {!canManageConfig && <p className="admin-help">Your administrator role can view these settings but cannot change them.</p>}
          <p className="admin-card-text">
            Save your exam setup so the login and exam pages can use it.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleSave}
              disabled={saving || !canManageConfig}
              className="admin-btn-primary"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>

            <button onClick={loadConfig} className="admin-btn-light" type="button">
              Refresh Config
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>
      </div>
    </main>
  );
}