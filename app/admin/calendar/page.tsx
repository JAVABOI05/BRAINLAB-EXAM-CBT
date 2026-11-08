"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { adminHasPermission } from "../../lib/adminRoles";
import {
  type ExamCalendarEvent,
  type ChannelConfig,
  DEFAULT_CHANNEL_CONFIG,
  formatLagosDate,
} from "../../lib/services/examCalendarService";
import "../admin.css";

const PROGRAMME_OPTIONS = [
  { value: "utme", label: "JAMB UTME" },
  { value: "waec", label: "WAEC SSCE" },
  { value: "neco", label: "NECO SSCE" },
  { value: "post_utme", label: "Post-UTME" },
  { value: "all", label: "All Programmes" },
];

const PLACEMENT_OPTIONS = [
  { value: "both", label: "Both (Landing Page & Student Dashboard)" },
  { value: "landing", label: "Landing Page Only" },
  { value: "dashboard", label: "Student Dashboard Only" },
];

export default function AdminCalendarPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ExamCalendarEvent[]>([]);
  const [channelConfig, setChannelConfig] = useState<ChannelConfig>(DEFAULT_CHANNEL_CONFIG);
  const [filter, setFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form modal state
  const [editingEvent, setEditingEvent] = useState<Partial<ExamCalendarEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);

  // 1. Permission Check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // Check permission
      const hasPerm = await adminHasPermission("exam.calendar.manage");
      if (!hasPerm) {
        // Check fallback super_admin / platform_admin role
        const { data: adminRecord } = await supabase
          .from("admin_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (adminRecord && ["super_admin", "platform_admin", "cbt_admin"].includes(adminRecord.role)) {
          setAllowed(true);
        } else {
          setAllowed(false);
          setLoading(false);
          return;
        }
      } else {
        setAllowed(true);
      }

      await loadData();
    }

    void checkAuth();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.channelConfig) {
          setChannelConfig(data.channelConfig);
        }
      } else {
        setFeedback({ type: "error", text: "Failed to load calendar events and channel configuration." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error loading calendar events." });
    } finally {
      setLoading(false);
    }
  }

  // Handle Event Save
  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent || !editingEvent.name || !editingEvent.start_time) return;

    setSavingEvent(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_event",
          event: editingEvent,
          change_reason: editingEvent.id ? "Updated exam calendar event" : "Created new exam calendar event",
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setFeedback({ type: "success", text: "Examination event saved successfully." });
        setIsModalOpen(false);
        setEditingEvent(null);
        await loadData();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to save event." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error saving examination event." });
    } finally {
      setSavingEvent(false);
    }
  }

  // Handle Event Delete
  async function handleDeleteEvent(id: string) {
    if (!confirm("Are you sure you want to delete this examination event? This action will be recorded in the audit log.")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_event",
          id,
          change_reason: "Admin removed exam event",
        }),
      });

      if (res.ok) {
        setFeedback({ type: "success", text: "Event deleted successfully." });
        await loadData();
      } else {
        const data = await res.json();
        setFeedback({ type: "error", text: data.error || "Failed to delete event." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error deleting event." });
    }
  }

  // Handle Channel Config Save
  async function handleSaveChannelConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingChannel(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_channel",
          channel: channelConfig,
          change_reason: "Admin updated community broadcast channel settings",
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setFeedback({ type: "success", text: "Community channel configuration saved successfully." });
        await loadData();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to save channel configuration." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error saving channel configuration." });
    } finally {
      setSavingChannel(false);
    }
  }

  if (allowed === null || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-slate-600">
        <div className="text-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-sm font-bold">Checking permissions and loading calendar schedule…</p>
        </div>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
          <h1 className="text-xl font-black">Access Restricted</h1>
          <p className="mt-2 text-sm">
            Managing the National Exam Calendar and Dynamic Community Slots requires the{" "}
            <code>exam.calendar.manage</code> permission. Contact your system super administrator.
          </p>
          <div className="mt-4">
            <Link href="/admin" className="text-xs font-bold text-rose-800 underline">
              &larr; Return to Admin Command Centre
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.status === filter);

  return (
    <main className="mx-auto max-w-7xl p-5 sm:p-8">
      {/* Breadcrumb Header */}
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600">
              <Link href="/admin" className="hover:underline">
                Admin Command Centre
              </Link>
              <span>/</span>
              <span>Platform Governance</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              National Exam Calendar & Broadcast Channels
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Curate authoritative national examination schedules (JAMB UTME, WAEC, NECO) and configure official WhatsApp/Telegram broadcast links. All dates operate under West Africa Time (WAT / Lagos UTC+1).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingEvent({
                  name: "",
                  short_name: "",
                  programme: "utme",
                  start_time: new Date().toISOString(),
                  end_time: null,
                  short_note: "",
                  official_source_url: "",
                  placement: "both",
                  priority: 100,
                  status: "draft",
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs shadow transition active:scale-95"
            >
              <span>+ Add Examination Event</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {feedback && (
        <div
          role="alert"
          className={`mt-4 rounded-xl border p-4 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-rose-200 bg-rose-50 text-rose-950"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* SECTION 1: NATIONAL EXAM CALENDAR */}
      <section className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              National Examination Schedule
            </h2>
            <p className="text-xs text-slate-500">
              Published events automatically drive the countdown on the landing page hero and student portal.
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {["all", "published", "draft", "archived"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition ${
                  filter === st
                    ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-cyan-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="p-3.5">Examination Name</th>
                <th className="p-3.5">Programme</th>
                <th className="p-3.5">Start Date (WAT)</th>
                <th className="p-3.5">Placement</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No examination events matching current filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3.5 font-bold text-slate-950 dark:text-white">
                      <div>{evt.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{evt.short_name}</div>
                    </td>
                    <td className="p-3.5 uppercase font-mono font-bold text-blue-600 dark:text-cyan-400">
                      {evt.programme}
                    </td>
                    <td className="p-3.5 font-medium whitespace-nowrap">
                      {formatLagosDate(evt.start_time)}
                    </td>
                    <td className="p-3.5 capitalize font-medium">
                      {evt.placement}
                    </td>
                    <td className="p-3.5 font-mono">
                      {evt.priority}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          evt.status === "published"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : evt.status === "draft"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(evt);
                          setIsModalOpen(true);
                        }}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="rounded-md border border-rose-200 px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: OFFICIAL BROADCAST CHANNEL CONFIGURATION */}
      <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            Official Broadcast Channel & Live Banner Settings
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure the prominent Join Our Channel block displayed directly beneath the homepage hero and in the student dashboard.
          </p>
        </header>

        <form onSubmit={handleSaveChannelConfig} className="mt-6 space-y-6 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Channel Display Title
              </label>
              <input
                type="text"
                value={channelConfig.whatsapp_title}
                onChange={(e) => setChannelConfig({ ...channelConfig, whatsapp_title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                WhatsApp Channel Link (Invite URL)
              </label>
              <input
                type="url"
                value={channelConfig.whatsapp_url}
                onChange={(e) => setChannelConfig({ ...channelConfig, whatsapp_url: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Telegram Channel Link (Optional Fallback)
              </label>
              <input
                type="url"
                value={channelConfig.telegram_url || ""}
                onChange={(e) => setChannelConfig({ ...channelConfig, telegram_url: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                placeholder="https://t.me/brainlabacademy"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Verified Candidate / Member Count (Rule S7: Leave blank if unverified)
              </label>
              <input
                type="number"
                value={channelConfig.verified_member_count ?? ""}
                onChange={(e) =>
                  setChannelConfig({
                    ...channelConfig,
                    verified_member_count: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                placeholder="e.g. 15000"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                If left blank, the figure is cleanly hidden from the banner.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Verified As-Of Date / Notice
              </label>
              <input
                type="text"
                value={channelConfig.as_of_date || ""}
                onChange={(e) => setChannelConfig({ ...channelConfig, as_of_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                placeholder="e.g. November 2026 Audit"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={channelConfig.is_active}
                onChange={(e) => setChannelConfig({ ...channelConfig, is_active: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Master Switch: Channel Banner Enabled</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={channelConfig.show_on_landing}
                onChange={(e) => setChannelConfig({ ...channelConfig, show_on_landing: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show on Landing Page</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={channelConfig.show_on_dashboard}
                onChange={(e) => setChannelConfig({ ...channelConfig, show_on_dashboard: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show in Student Dashboard</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingChannel}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 text-xs shadow transition active:scale-95"
            >
              {savingChannel ? "Saving Configuration…" : "Save Broadcast Channel Settings"}
            </button>
          </div>
        </form>
      </section>

      {/* MODAL: ADD / EDIT EVENT */}
      {isModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-950 dark:text-white">
                {editingEvent.id ? "Edit Examination Event" : "Create New Examination Event"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEvent(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Examination Title
                </label>
                <input
                  type="text"
                  value={editingEvent.name || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                  placeholder="e.g. 2027 JAMB UTME National Examination"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Short Label
                  </label>
                  <input
                    type="text"
                    value={editingEvent.short_name || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, short_name: e.target.value })}
                    placeholder="e.g. JAMB UTME"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Programme
                  </label>
                  <select
                    value={editingEvent.programme || "utme"}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        programme: e.target.value as ExamCalendarEvent["programme"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  >
                    {PROGRAMME_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Start Date & Time (Lagos WAT)
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingEvent.start_time
                        ? new Date(editingEvent.start_time).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        start_time: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    End Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingEvent.end_time
                        ? new Date(editingEvent.end_time).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        end_time: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Display Placement
                  </label>
                  <select
                    value={editingEvent.placement || "both"}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        placement: e.target.value as ExamCalendarEvent["placement"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  >
                    {PLACEMENT_OPTIONS.map((pl) => (
                      <option key={pl.value} value={pl.value}>
                        {pl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Priority (Lower = Higher Precedence)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.priority ?? 100}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, priority: parseInt(e.target.value, 10) || 100 })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Official Source Link (JAMB / WAEC Portal)
                </label>
                <input
                  type="url"
                  value={editingEvent.official_source_url || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, official_source_url: e.target.value })}
                  placeholder="https://www.jamb.gov.ng"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Short Note / Proctoring Context
                </label>
                <textarea
                  rows={2}
                  value={editingEvent.short_note || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, short_note: e.target.value })}
                  placeholder="e.g. Official Computer Based Test across all accredited CBT examination centres nationwide."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={editingEvent.status || "draft"}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      status: e.target.value as ExamCalendarEvent["status"],
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="draft">Draft (Hidden from public readers)</option>
                  <option value="published">Published (Visible on site and countdowns)</option>
                  <option value="archived">Archived (Ended or superseded)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2 text-xs shadow transition active:scale-95"
                >
                  {savingEvent ? "Saving…" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
