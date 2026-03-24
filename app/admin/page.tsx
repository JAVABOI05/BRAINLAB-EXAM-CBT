"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type SettingRow = {
  key: string;
  value: unknown;
};

type SettingsMap = {
  exam_duration: number;
  calculator_enabled: boolean;
  leaderboard_enabled: boolean;
  show_results: boolean;
  mock_enabled: boolean;
};

type StatCard = {
  title: string;
  value: number;
};

export default function AdminPage() {
  const [settings, setSettings] = useState<SettingsMap>({
    exam_duration: 7200,
    calculator_enabled: true,
    leaderboard_enabled: false,
    show_results: false,
    mock_enabled: true,
  });

  const [stats, setStats] = useState<StatCard[]>([
    { title: "Total Questions", value: 0 },
    { title: "Total Results", value: 0 },
    { title: "Access Codes", value: 0 },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setMessage("");

    const [settingsRes, questionsRes, resultsRes, codesRes] = await Promise.all([
      supabase.from("settings").select("key, value"),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("results").select("*", { count: "exact", head: true }),
      supabase.from("access_codes").select("*", { count: "exact", head: true }),
    ]);

    if (settingsRes.error) {
      setMessage(`Failed to load settings: ${settingsRes.error.message}`);
      setLoading(false);
      return;
    }

    const rows = (settingsRes.data || []) as SettingRow[];

    const nextSettings: SettingsMap = {
      exam_duration: 7200,
      calculator_enabled: true,
      leaderboard_enabled: false,
      show_results: false,
      mock_enabled: true,
    };

    rows.forEach((row: SettingRow) => {
      const key = row.key as keyof SettingsMap;

      if (key === "exam_duration") {
        nextSettings.exam_duration = Number(row.value) || 7200;
      }

      if (key === "calculator_enabled") {
        nextSettings.calculator_enabled = row.value === true || row.value === "true";
      }

      if (key === "leaderboard_enabled") {
        nextSettings.leaderboard_enabled = row.value === true || row.value === "true";
      }

      if (key === "show_results") {
        nextSettings.show_results = row.value === true || row.value === "true";
      }

      if (key === "mock_enabled") {
        nextSettings.mock_enabled = row.value === true || row.value === "true";
      }
    });

    setSettings(nextSettings);

    setStats([
      { title: "Total Questions", value: questionsRes.count || 0 },
      { title: "Total Results", value: resultsRes.count || 0 },
      { title: "Access Codes", value: codesRes.count || 0 },
    ]);

    setLoading(false);
  }

  async function saveSetting(key: keyof SettingsMap, value: number | boolean) {
    const { error } = await supabase
      .from("settings")
      .update({ value })
      .eq("key", key);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      await Promise.all([
        saveSetting("exam_duration", settings.exam_duration),
        saveSetting("calculator_enabled", settings.calculator_enabled),
        saveSetting("leaderboard_enabled", settings.leaderboard_enabled),
        saveSetting("show_results", settings.show_results),
        saveSetting("mock_enabled", settings.mock_enabled),
      ]);

      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatDuration(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (mins === 0) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
    return `${hrs}h ${mins}m`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-md">
          <p className="text-lg text-gray-700">Loading admin dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#dfe8f7] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage exam settings and monitor platform activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.title} className="rounded-3xl bg-white p-6 shadow-md">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-800">Exam Settings</h2>
          <p className="mt-2 text-gray-600">
            These settings control the live CBT experience.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-5">
              <label className="block text-sm font-semibold text-gray-700">
                Exam Duration (seconds)
              </label>
              <input
                type="number"
                min={60}
                value={settings.exam_duration}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    exam_duration: Number(e.target.value) || 7200,
                  }))
                }
                className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Current duration: {formatDuration(settings.exam_duration)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700">Calculator</p>
              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.calculator_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator_enabled: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Enable calculator during exam</span>
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700">Leaderboard</p>
              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.leaderboard_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      leaderboard_enabled: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Show leaderboard to users</span>
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700">Results</p>
              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.show_results}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      show_results: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Release results to candidates</span>
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700">Mock Access</p>
              <label className="mt-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.mock_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mock_enabled: e.target.checked,
                    }))
                  }
                />
                <span className="text-gray-700">Allow candidates to start exam</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-8 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-3 font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {message && (
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}