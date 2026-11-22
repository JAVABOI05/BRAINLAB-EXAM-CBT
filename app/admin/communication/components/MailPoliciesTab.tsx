"use client";

import React from "react";
import type { CommunicationConfig, AudioPolicyConfig } from "@/app/lib/platformConfig";

interface MailPoliciesTabProps {
  commConfig: CommunicationConfig;
  setCommConfig: React.Dispatch<React.SetStateAction<CommunicationConfig>>;
  audioConfig: AudioPolicyConfig;
  setAudioConfig: React.Dispatch<React.SetStateAction<AudioPolicyConfig>>;
  onSavePolicies: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
}

export function MailPoliciesTab({
  commConfig,
  setCommConfig,
  audioConfig,
  setAudioConfig,
  onSavePolicies,
  saving,
}: MailPoliciesTabProps) {
  return (
    <form onSubmit={onSavePolicies} className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-extrabold text-slate-950">In-App Messaging &amp; Voice Note Policies</h2>
        <p className="text-xs text-slate-500">
          Governance rules for learner-tutor communications, course group chats, and audio recording limits.
        </p>
      </div>

      {/* Messaging Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-950">1. Messaging &amp; Collaboration Controls</h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              Enable delivery and read receipts (blue ticks)
            </span>
          </label>
        </div>
      </section>

      {/* Voice Notes & Audio Submissions Policy */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-950">2. Audio &amp; Voice Note Submission Limits</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Server validation enforces these recording duration and file size limits unconditionally.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
                  max_duration_seconds: Number.parseInt(e.target.value, 10) || 300,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Max Audio File Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={audioConfig.max_file_size_mb}
              onChange={(e) =>
                setAudioConfig({
                  ...audioConfig,
                  max_file_size_mb: Number.parseInt(e.target.value, 10) || 25,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Policies"}
        </button>
      </div>
    </form>
  );
}
