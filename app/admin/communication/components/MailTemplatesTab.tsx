"use client";

import React, { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  description?: string;
  category: "marketing" | "transactional" | "announcement" | "newsletter" | "system";
  subject: string;
  html_content: string;
  available_tokens: string[];
  is_active: boolean;
  created_at: string;
}

export function MailTemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Template Modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Template["category"]>("marketing");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mail/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch {
      setFeedback({ text: "Failed to load templates", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setCategory("marketing");
    setSubject("");
    setHtmlContent("");
    setShowModal(true);
  };

  const openEditModal = (t: Template) => {
    setEditId(t.id);
    setName(t.name);
    setDescription(t.description || "");
    setCategory(t.category);
    setSubject(t.subject);
    setHtmlContent(t.html_content);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !htmlContent) return;

    setSaving(true);
    setFeedback(null);

    try {
      const method = editId ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        name,
        description,
        category,
        subject,
        html_content: htmlContent,
      };
      if (editId) payload.id = editId;

      const res = await fetch("/api/admin/mail/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setFeedback({ text: editId ? "✓ Template updated successfully." : "✓ Template created successfully.", type: "success" });
        void fetchTemplates();
      } else {
        setFeedback({ text: data.error || "Failed to save template", type: "error" });
      }
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">Email Template Manager</h2>
          <p className="text-xs text-slate-500">
            Design and govern reusable responsive HTML templates for notifications, digests, and campaigns.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <span>+</span> Create New Template
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

      {/* Templates Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          No templates found. Click &quot;Create New Template&quot; to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => {
            const categoryColors: Record<string, string> = {
              transactional: "bg-emerald-50 text-emerald-800 border-emerald-200",
              marketing: "bg-blue-50 text-blue-800 border-blue-200",
              announcement: "bg-amber-50 text-amber-900 border-amber-200",
              newsletter: "bg-purple-50 text-purple-900 border-purple-200",
              system: "bg-slate-100 text-slate-800 border-slate-200",
            };

            return (
              <div
                key={tmpl.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between hover:shadow-sm transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${
                        categoryColors[tmpl.category] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(tmpl.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-extrabold text-slate-950 truncate">{tmpl.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {tmpl.description || tmpl.subject}
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Default Subject</span>
                    <p className="font-medium text-slate-800 truncate">{tmpl.subject}</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    Preview HTML
                  </button>

                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-950">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                dangerouslySetInnerHTML={{ __html: previewTemplate.html_content }}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-950">
                {editId ? "Edit Email Template" : "Create New Email Template"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WAEC SSCE Countdown Digest"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Template["category"])}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="marketing">Marketing (Promotions &amp; Announcements)</option>
                    <option value="transactional">Transactional (Access Codes &amp; Receipts)</option>
                    <option value="newsletter">Weekly Digest / Newsletter</option>
                    <option value="system">System Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Internal)</label>
                <input
                  type="text"
                  placeholder="e.g. Sent 7 days before major examination window"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7 Days Remaining to Master Your Weakest Subjects"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">HTML Template Body *</label>
                  <span className="text-[10px] text-slate-400">Tokens: {`{{first_name}}`}, {`{{unsubscribe_url}}`}</span>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="<div style='font-family:sans-serif;'><h2>Hello {{first_name}}</h2>...</div>"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm"
                >
                  {saving ? "Saving..." : editId ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
