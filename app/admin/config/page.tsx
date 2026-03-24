"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "../admin.css";

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
  const [electiveEnabled, setElectiveEnabled] = useState(true);

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_user");

    if (!savedAdmin) {
      router.push("/admin/login");
      return;
    }

    try {
      const parsed = JSON.parse(savedAdmin) as AdminUser;
      setAdminUser(parsed);
      loadConfig();
    } catch {
      localStorage.removeItem("admin_user");
      router.push("/admin/login");
    }
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
        setAccessCodeRequired(Boolean(row.config_value));
      }

      if (row.config_key === "elective_enabled") {
        setElectiveEnabled(Boolean(row.config_value));
      }
    });

    setLoading(false);
  }

  async function saveConfigRow(configKey: string, configValue: unknown) {
    const { error } = await supabase
      .from("exam_config")
      .update({
        config_value: configValue,
        updated_at: new Date().toISOString(),
      })
      .eq("config_key", configKey);

    if (error) {
      throw new Error(`${configKey}: ${error.message}`);
    }
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
        saveConfigRow("elective_enabled", electiveEnabled),
      ]);

      setMessage("Exam configuration saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_user");
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
          <h2 className="admin-card-title">Save Configuration</h2>
          <p className="admin-card-text">
            Save your exam setup so the login and exam pages can use it.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={handleSave}
              disabled={saving}
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