"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import {
  getCommunicationConfig,
  saveCommunicationConfig,
  getAudioPolicyConfig,
  saveAudioPolicyConfig,
  type CommunicationConfig,
  type AudioPolicyConfig,
} from "../../lib/platformConfig";
import { supabase } from "../../lib/supabase";
import "../admin.css";

interface OfficialTag {
  id: string;
  bg_color: string;
  color: string;
  display_label: string;
  name: string;
}

export default function AdminCommunicationControlPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<Awaited<ReturnType<typeof getAdminSession>>>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [commConfig, setCommConfig] = useState<CommunicationConfig>({
    private_messaging_enabled: true,
    group_messaging_enabled: true,
    student_can_message_tutor: true,
    read_receipts_enabled: true,
    reactions_enabled: true,
    official_tags_enabled: true,
    announcement_views_enabled: true,
    presence_visibility_default: true,
    message_rate_limit_per_minute: 20,
  });

  const [audioConfig, setAudioConfig] = useState<AudioPolicyConfig>({
    max_duration_seconds: 300,
    max_file_size_mb: 25,
    allowed_formats: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"],
    student_audio_enabled_globally: true,
    transcription_enabled: true,
    audio_retention_days: 90,
    allow_downloads: true,
  });

  const [officialTags, setOfficialTags] = useState<OfficialTag[]>([]);

  useEffect(() => {
    let active = true;

    async function init() {
      const admin = await getAdminSession();
      if (!admin) {
        router.replace("/account");
        return;
      }
      setAdminUser(admin);

      const hasPerm = await adminHasPermission("security.settings.manage");
      if (!hasPerm && !["super_admin", "platform_admin", "community_moderator"].includes(admin.role)) {
        setFeedback("You do not have permission to modify communication settings.");
        setLoading(false);
        return;
      }

      const [comm, audio, { data: tags }] = await Promise.all([
        getCommunicationConfig(),
        getAudioPolicyConfig(),
        supabase.from("official_tags").select("*").order("sort_order"),
      ]);

      if (active) {
        setCommConfig(comm);
        setAudioConfig(audio);
        setOfficialTags((tags ?? []) as OfficialTag[]);
        setLoading(false);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setSaving(true);
    setFeedback("");

    try {
      const okComm = await saveCommunicationConfig(
        commConfig,
        { id: adminUser.id, email: adminUser.email },
        "Administrator modified communication policies"
      );

      const okAudio = await saveAudioPolicyConfig(
        audioConfig,
        { id: adminUser.id, email: adminUser.email },
        "Administrator modified audio & voice note policies"
      );

      if (okComm && okAudio) {
        setFeedback("Communication and Audio policies saved successfully.");
      } else {
        setFeedback("Failed to update some configuration settings.");
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main id="main" className="mx-auto min-h-[75vh] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
            Platform Administration
          </span>
          <h1 className="mt-1 text-3xl font-black text-slate-950">
            Communication & Audio Policies
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Control private messaging, official tags, read receipts, tutor voice notes, and student audio submissions.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Admin Dashboard
        </Link>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mt-4 rounded-2xl p-4 text-xs font-semibold ${
            feedback.includes("successfully")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {feedback}
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-xs text-slate-500">Loading policy settings…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Messaging Controls */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              1. Messaging & Collaboration
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commConfig.private_messaging_enabled}
                  onChange={(e) =>
                    setCommConfig({ ...commConfig, private_messaging_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable private 1-on-1 messaging platform-wide
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commConfig.student_can_message_tutor}
                  onChange={(e) =>
                    setCommConfig({ ...commConfig, student_can_message_tutor: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Allow students to initiate messages with tutors
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commConfig.group_messaging_enabled}
                  onChange={(e) =>
                    setCommConfig({ ...commConfig, group_messaging_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable course and class group discussions
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commConfig.read_receipts_enabled}
                  onChange={(e) =>
                    setCommConfig({ ...commConfig, read_receipts_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Enable delivery and read receipts
                </span>
              </label>
            </div>
          </section>

          {/* Voice Notes & Audio Submissions Policy */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              2. Audio & Voice Note Policies
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure recording limits and student audio response permissions. Server validation enforces these settings unconditionally.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Audio Duration (Seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={900}
                  value={audioConfig.max_duration_seconds}
                  onChange={(e) =>
                    setAudioConfig({
                      ...audioConfig,
                      max_duration_seconds: parseInt(e.target.value) || 300,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Currently: {Math.floor(audioConfig.max_duration_seconds / 60)} minutes
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Audio Upload Size (MB)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={audioConfig.max_file_size_mb}
                  onChange={(e) =>
                    setAudioConfig({
                      ...audioConfig,
                      max_file_size_mb: parseInt(e.target.value) || 25,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioConfig.student_audio_enabled_globally}
                  onChange={(e) =>
                    setAudioConfig({
                      ...audioConfig,
                      student_audio_enabled_globally: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Allow student audio assignment submissions (global master switch)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioConfig.allow_downloads}
                  onChange={(e) =>
                    setAudioConfig({ ...audioConfig, allow_downloads: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Allow students to download audio lesson files
                </span>
              </label>
            </div>
          </section>

          {/* Official Tags Roster */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-950">
              3. Official Content Tags
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Standard structured tags used by instructors to highlight critical information.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {officialTags.map((tag) => (
                <div
                  key={tag.id}
                  style={{ backgroundColor: tag.bg_color, color: tag.color }}
                  className="rounded-2xl border px-3.5 py-2 text-xs font-bold flex items-center gap-2"
                >
                  <span>{tag.display_label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({tag.name})</span>
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#012153] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition disabled:opacity-50"
            >
              {saving ? "Saving Policies…" : "Save Communication & Audio Policies"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
