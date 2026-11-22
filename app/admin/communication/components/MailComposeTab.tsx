"use client";

import React, { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  html_content: string;
  available_tokens?: string[];
}

interface MailComposeTabProps {
  adminEmail?: string;
  onCampaignCreated?: () => void;
}

export function MailComposeTab({ adminEmail, onCampaignCreated }: MailComposeTabProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [fromInbox, setFromInbox] = useState("BrainLab Academy <support@mail.brainlabacademy.com.ng>");
  const [replyTo, setReplyTo] = useState("support@brainlabacademy.com.ng");
  const [recipientMode, setRecipientMode] = useState<"individual" | "broadcast">("individual");
  const [singleRecipientEmail, setSingleRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  const [testingDispatch, setTestingDispatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/admin/mail/templates");
        const data = await res.json();
        if (data.success) {
          setTemplates(data.templates || []);
        }
      } catch {
        // silent fallback
      }
    }
    void loadTemplates();
  }, []);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setSubject(tmpl.subject);
      setHtmlContent(tmpl.html_content);
    }
  };

  const insertToken = (token: string) => {
    setHtmlContent((prev) => prev + ` ${token} `);
  };

  // Live Token Preview rendering
  const getRenderedPreview = () => {
    let rendered = htmlContent;
    const sampleData: Record<string, string> = {
      first_name: "Chinedu",
      full_name: "Chinedu Okafor",
      email: singleRecipientEmail || "chinedu@example.com",
      subscription_plan: "PRO PREMIUM",
      unsubscribe_url: "https://brainlabacademy.com.ng/unsubscribe?email=sample@example.com",
      current_year: new Date().getFullYear().toString(),
    };

    for (const [key, val] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(regex, val);
    }
    return rendered;
  };

  // Send Test Email to Admin
  const handleSendTest = async () => {
    if (!adminEmail) {
      setFeedback({ text: "Logged-in administrator email not detected for test dispatch.", type: "error" });
      return;
    }
    if (!subject || !htmlContent) {
      setFeedback({ text: "Subject and HTML body are required to test dispatch.", type: "error" });
      return;
    }

    setTestingDispatch(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/communications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          targetEmail: adminEmail,
          testSubject: `[TEST] ${subject}`,
          testHtml: getRenderedPreview(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `✓ Test email dispatched to ${adminEmail} via Resend. Check your inbox!`, type: "success" });
      } else {
        setFeedback({ text: data.error || "Test dispatch failed", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setTestingDispatch(false);
    }
  };

  // Dispatch / Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !htmlContent) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      if (recipientMode === "individual") {
        if (!singleRecipientEmail) {
          setFeedback({ text: "Recipient email is required for individual dispatch.", type: "error" });
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/admin/mail/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_inbox: replyTo,
            to_email: singleRecipientEmail,
            subject,
            message: htmlContent.replace(/<[^>]*>/g, ""),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFeedback({ text: `✓ Direct email dispatched to ${singleRecipientEmail}.`, type: "success" });
          setSingleRecipientEmail("");
        } else {
          setFeedback({ text: data.error || "Failed to dispatch email", type: "error" });
        }
      } else {
        // Broadcast campaign submission (requires approval per BrainLab governance)
        const res = await fetch("/api/admin/mail/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: subject,
            subject,
            from_sender: fromInbox,
            reply_to: replyTo,
            body_html: htmlContent,
            target_audience: "active_subscribers",
            category: "marketing",
            submit_for_approval: true,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setFeedback({
            text: "✓ Broadcast campaign created and submitted for Super Admin approval.",
            type: "success",
          });
          if (onCampaignCreated) onCampaignCreated();
        } else {
          setFeedback({ text: data.error || "Failed to create campaign", type: "error" });
        }
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const TOKENS = [
    { label: "First Name", token: "{{first_name}}" },
    { label: "Full Name", token: "{{full_name}}" },
    { label: "Email", token: "{{email}}" },
    { label: "Subscription Plan", token: "{{subscription_plan}}" },
    { label: "Unsubscribe URL", token: "{{unsubscribe_url}}" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">Compose &amp; Dispatch</h2>
          <p className="text-xs text-slate-500">
            Author individualized student correspondence or draft official broadcast announcements.
          </p>
        </div>

        {/* Test Dispatch Button */}
        <button
          type="button"
          onClick={handleSendTest}
          disabled={testingDispatch || !htmlContent.trim()}
          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100 disabled:opacity-50 transition shadow-2xs flex items-center gap-1.5 shrink-0"
        >
          <span>📨</span> {testingDispatch ? "Sending Test..." : `Send Test to ${adminEmail || "Me"}`}
        </button>
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

      {/* Main Composer Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        {/* Row 1: Mode & Template Loader */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecipientMode("individual")}
                className={`rounded-xl py-2 text-xs font-bold transition border ${
                  recipientMode === "individual"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Direct Single Student
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode("broadcast")}
                className={`rounded-xl py-2 text-xs font-bold transition border ${
                  recipientMode === "broadcast"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Broadcast Campaign
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Load Saved Email Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="">— Select a saved template to load —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Sender Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">From Sender</label>
            <input
              type="text"
              value={fromInbox}
              onChange={(e) => setFromInbox(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          {recipientMode === "individual" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Student Email *</label>
              <input
                type="email"
                required
                placeholder="learner@example.com"
                value={singleRecipientEmail}
                onChange={(e) => setSingleRecipientEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                Active Marketing Subscribers (Consent Verified &bull; Suppressed Automatically Excluded)
              </div>
            </div>
          )}
        </div>

        {/* Subject Line */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line *</label>
          <input
            type="text"
            required
            placeholder="e.g. Official BrainLab Examination Passcode & Instructions"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Personalization Tokens Strip */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="font-bold text-slate-500 text-[11px] mr-1">Insert Personalization Token:</span>
          {TOKENS.map((t) => (
            <button
              key={t.token}
              type="button"
              onClick={() => insertToken(t.token)}
              className="rounded-lg bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-mono text-blue-900 hover:bg-blue-50 hover:border-blue-300 transition"
            >
              {t.token}
            </button>
          ))}
        </div>

        {/* Editor vs Live Preview Switcher */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <label className="block text-xs font-bold text-slate-700">Message Content (HTML &amp; Text)</label>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab("edit")}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  previewTab === "edit" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                HTML Editor
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("preview")}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  previewTab === "preview" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Live Token Preview
              </button>
            </div>
          </div>

          {previewTab === "edit" ? (
            <textarea
              rows={10}
              required
              placeholder="<p>Hello {{first_name}},</p><p>We are excited to share...</p>"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div
              className="min-h-[240px] rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: getRenderedPreview() }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {recipientMode === "broadcast"
              ? "Governance rule: Bulk broadcasts must be submitted and approved before dispatch."
              : "Direct student emails are dispatched immediately through verified Resend SMTP."}
          </p>

          <button
            type="submit"
            disabled={submitting || !htmlContent.trim()}
            className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
          >
            {submitting
              ? "Processing..."
              : recipientMode === "individual"
              ? "Dispatch Direct Email &rarr;"
              : "Submit Broadcast for Approval &rarr;"}
          </button>
        </div>
      </form>
    </div>
  );
}
