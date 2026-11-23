"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/app/lib/authFetch";

interface Conversation {
  id: string;
  recipient_inbox: string;
  customer_email: string;
  customer_name?: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to?: string;
  assigned_admin_name?: string;
  message_count: number;
  last_message_at: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound" | "internal_note";
  from_email: string;
  from_name?: string;
  to_email: string;
  subject?: string;
  body_html?: string;
  body_text: string;
  created_at: string;
  attachments?: Array<{ filename: string; path?: string }>;
}

export function MailInboxTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filters
  const [inboxFilter, setInboxFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [search, setSearch] = useState("");

  // Reply Composer State
  const [replyMode, setReplyMode] = useState<"outbound" | "internal_note">("outbound");
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("resolved");
  const [sendingReply, setSendingReply] = useState(false);

  // New Thread Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFromInbox, setNewFromInbox] = useState("support@brainlabacademy.com.ng");
  const [newToEmail, setNewToEmail] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [startingThread, setStartingThread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [simulatingInbound, setSimulatingInbound] = useState(false);

  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (inboxFilter !== "all") params.append("inbox", inboxFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await authFetch(`/api/admin/mail/inbox?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !selectedConvId) {
          setSelectedConvId(data.conversations[0].id);
        }
      }
    } catch {
      setFeedback({ text: "Failed to load conversations", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
  }, [inboxFilter, statusFilter]);

  // Load message thread when selectedConvId changes
  useEffect(() => {
    if (!selectedConvId) {
      setActiveConv(null);
      setMessages([]);
      return;
    }

    async function loadThread() {
      setLoadingMessages(true);
      try {
        const res = await authFetch(`/api/admin/mail/inbox/${selectedConvId}`);
        const data = await res.json();
        if (data.success) {
          setActiveConv(data.conversation);
          setMessages(data.messages || []);
        }
      } catch {
        setFeedback({ text: "Failed to load thread messages", type: "error" });
      } finally {
        setLoadingMessages(false);
      }
    }

    void loadThread();
  }, [selectedConvId]);

  // Handle Send Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !replyText.trim()) return;

    setSendingReply(true);
    setFeedback(null);

    try {
      const res = await authFetch(`/api/admin/mail/inbox/${selectedConvId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: replyMode,
          body_text: replyText,
          new_status: replyMode === "outbound" ? replyStatus : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.message]);
        setReplyText("");
        if (data.simulated) {
          setFeedback({
            text: "⚠️ Reply recorded, but email dispatch was SIMULATED. Configure live Resend API key in Gateways to deliver to recipient's email.",
            type: "error",
          });
        } else {
          setFeedback({ text: replyMode === "outbound" ? "✓ Reply delivered to customer via Resend." : "✓ Internal note added.", type: "success" });
        }
        // Refresh conversation list to update last message time
        void fetchConversations();
      } else {
        setFeedback({ text: data.error || "Failed to post message", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSendingReply(false);
    }
  };

  // One-click Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setFeedback(null);
    try {
      await fetchConversations();
      setFeedback({ text: "✓ Unified Inbox refreshed.", type: "success" });
    } finally {
      setRefreshing(false);
    }
  };

  // One-click Portal Inbound Test Message
  const handleSimulateInbound = async () => {
    setSimulatingInbound(true);
    setFeedback(null);
    try {
      const res = await authFetch("/api/admin/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate_inbound" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: "✓ Test portal candidate inquiry created and loaded into your inbox!", type: "success" });
        await fetchConversations();
        if (data.conversation?.id) {
          setSelectedConvId(data.conversation.id);
        }
      } else {
        setFeedback({ text: data.error || "Failed to simulate inquiry", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Failed to simulate inquiry", type: "error" });
    } finally {
      setSimulatingInbound(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (newStatus: "open" | "pending" | "resolved" | "archived") => {
    if (!selectedConvId) return;
    try {
      const res = await authFetch(`/api/admin/mail/inbox/${selectedConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveConv(data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, status: newStatus } : c))
        );
        setFeedback({ text: `✓ Thread marked as ${newStatus}`, type: "success" });
      }
    } catch {
      setFeedback({ text: "Failed to update status", type: "error" });
    }
  };

  // Handle Start New Thread
  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToEmail || !newSubject || !newMessage) return;

    setStartingThread(true);
    setFeedback(null);

    try {
      const res = await authFetch("/api/admin/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_inbox: newFromInbox,
          to_email: newToEmail,
          customer_name: newCustomerName,
          subject: newSubject,
          message: newMessage,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowNewModal(false);
        setNewToEmail("");
        setNewCustomerName("");
        setNewSubject("");
        setNewMessage("");
        if (data.simulated) {
          setFeedback({
            text: "⚠️ Thread initialized, but email dispatch was SIMULATED. Enter live Resend API key in Gateways to deliver real emails to inboxes.",
            type: "error",
          });
        } else {
          setFeedback({ text: "✓ Outbound message delivered and thread initialized.", type: "success" });
        }
        await fetchConversations();
        setSelectedConvId(data.conversation.id);
      } else {
        setFeedback({ text: data.error || "Failed to start thread", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setStartingThread(false);
    }
  };

  const INBOXES = [
    { id: "all", label: "All Inboxes" },
    { id: "support@brainlabacademy.com.ng", label: "support@" },
    { id: "hello@brainlabacademy.com.ng", label: "hello@" },
    { id: "admin@brainlabacademy.com.ng", label: "admin@" },
    { id: "info@brainlabacademy.com.ng", label: "info@" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar: Inbox Selector & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        {/* Inbox Switcher Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {INBOXES.map((ib) => (
            <button
              key={ib.id}
              onClick={() => setInboxFilter(ib.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                inboxFilter === ib.id
                  ? "bg-blue-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {ib.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh inbox conversations"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>🔄</span> Refresh
          </button>

          <button
            onClick={handleSimulateInbound}
            disabled={simulatingInbound}
            title="Simulate a candidate submitting a support ticket from the website"
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>🧪</span> {simulatingInbound ? "Simulating..." : "Test Inbound Portal Message"}
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>+</span> New Outbound Thread
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs font-semibold ${
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[750px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Left Column: Thread List (4 cols) */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          {/* Status & Search Filter Bar */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(["all", "open", "pending", "resolved", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-2.5 py-1 font-bold capitalize transition ${
                    statusFilter === s ? "bg-blue-100 text-blue-900" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by student or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchConversations()}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Threads Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading threads...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations found in this view.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const statusColor =
                  c.status === "open"
                    ? "bg-emerald-100 text-emerald-800"
                    : c.status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : c.status === "resolved"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-200 text-slate-700";

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full p-3 text-left transition flex flex-col gap-1 ${
                      isSelected ? "bg-blue-50/80 border-l-4 border-blue-700" : "hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-900 truncate max-w-[160px]">
                        {c.customer_name || c.customer_email}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(c.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <p className="font-bold text-xs text-slate-800 truncate">{c.subject}</p>

                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-slate-500 truncate max-w-[140px]">{c.recipient_inbox.split("@")[0]}@</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md px-1.5 py-0.5 font-black uppercase text-[9px] ${statusColor}`}>
                          {c.status}
                        </span>
                        {c.message_count > 1 && (
                          <span className="rounded-full bg-slate-200 px-1.5 py-0.2 font-bold text-slate-700 text-[9px]">
                            {c.message_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Conversation Thread Viewer (8 cols) */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a conversation to view thread history.
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">{activeConv.recipient_inbox}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-600 font-medium">To: {activeConv.customer_email}</span>
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-950 mt-0.5">{activeConv.subject}</h2>
                </div>

                {/* Status Switcher Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500 font-medium mr-1">Status:</span>
                  {(["open", "pending", "resolved", "archived"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase transition ${
                        activeConv.status === st
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Thread History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">No messages in this thread.</div>
                ) : (
                  messages.map((msg) => {
                    const isInbound = msg.direction === "inbound";
                    const isInternal = msg.direction === "internal_note";

                    if (isInternal) {
                      return (
                        <div
                          key={msg.id}
                          className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-extrabold pb-2 border-b border-amber-200/60">
                            <span className="flex items-center gap-1.5 text-amber-900">
                              <span>🔒</span> Internal Administrator Note &bull; {msg.from_name || msg.from_email}
                            </span>
                            <span className="text-[10px] font-normal text-amber-800">
                              {new Date(msg.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <div className="mt-2 whitespace-pre-wrap leading-relaxed">{msg.body_text}</div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl p-4 text-xs shadow-2xs ${
                          isInbound
                            ? "bg-slate-50 border border-slate-200 text-slate-900 ml-0 mr-8"
                            : "bg-blue-50/60 border border-blue-200 text-slate-900 ml-8 mr-0"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 text-[11px]">
                          <span className="font-extrabold text-slate-900">
                            {isInbound ? msg.from_name || msg.from_email : `Support (${msg.from_email})`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-800">{msg.body_text}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Box Composer */}
              <div className="p-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyMode("outbound")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        replyMode === "outbound" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Email Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyMode("internal_note")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        replyMode === "internal_note" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Add Internal Note
                    </button>
                  </div>

                  {replyMode === "outbound" && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px]">Next status:</span>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="pending">Set Pending</option>
                        <option value="resolved">Set Resolved</option>
                        <option value="open">Keep Open</option>
                      </select>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder={
                      replyMode === "outbound"
                        ? "Type official email reply to candidate (delivered via Resend)..."
                        : "Type internal note visible only to administrators and support agents..."
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
                    >
                      {sendingReply
                        ? "Dispatching..."
                        : replyMode === "outbound"
                        ? "Send Email Reply &rarr;"
                        : "Post Note"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Start New Thread Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-950">Start Outbound Customer Thread</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewThread} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Inbox</label>
                <select
                  value={newFromInbox}
                  onChange={(e) => setNewFromInbox(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="support@brainlabacademy.com.ng">BrainLab Support (support@brainlabacademy.com.ng)</option>
                  <option value="hello@brainlabacademy.com.ng">BrainLab Admissions (hello@brainlabacademy.com.ng)</option>
                  <option value="admin@brainlabacademy.com.ng">BrainLab Administration (admin@brainlabacademy.com.ng)</option>
                  <option value="info@brainlabacademy.com.ng">BrainLab Info Desk (info@brainlabacademy.com.ng)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={newToEmail}
                    onChange={(e) => setNewToEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Your JAMB UTME Diagnostic Inquiry"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Compose official message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingThread}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm"
                >
                  {startingThread ? "Dispatching..." : "Send Outbound Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
