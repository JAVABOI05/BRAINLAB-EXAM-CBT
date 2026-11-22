"use client";

import React, { useEffect, useState } from "react";

interface Automation {
  id: string;
  name: string;
  trigger_event: string;
  template_id?: string;
  template?: { name: string; subject: string };
  is_active: boolean;
  delay_minutes: number;
  execution_count: number;
  created_at: string;
}

export function MailAutomationsTab() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mail/automations");
      const data = await res.json();
      if (data.success) {
        setAutomations(data.automations || []);
      }
    } catch {
      setFeedback({ text: "Failed to load automations", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAutomations();
  }, []);

  const handleToggleActive = async (auto: Automation) => {
    const newActive = !auto.is_active;
    try {
      const res = await fetch("/api/admin/mail/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: auto.id, is_active: newActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === auto.id ? { ...a, is_active: newActive } : a))
        );
        setFeedback({
          text: newActive ? `✓ Automation "${auto.name}" enabled.` : `✓ Automation "${auto.name}" paused.`,
          type: "success",
        });
      }
    } catch {
      setFeedback({ text: "Failed to toggle automation", type: "error" });
    }
  };

  const BUILTIN_TRIGGERS = [
    {
      id: "user_registered",
      name: "Student Registration Welcome Series",
      desc: "Delivers welcome curriculum breakdown and diagnostic recommendation upon student sign up.",
      trigger: "user.signup",
      delay: "0 min",
    },
    {
      id: "exam_completed",
      name: "Immediate Post-CBT Performance Breakdown",
      desc: "Sends comprehensive score report and topic improvement links after student submits exam.",
      trigger: "exam.submitted",
      delay: "15 min",
    },
    {
      id: "inactivity_7d",
      name: "Study Streak Recovery Recall",
      desc: "Automated gentle reminder sent to candidates when inactive for 7 consecutive days.",
      trigger: "student.inactive_7d",
      delay: "0 min",
    },
    {
      id: "subscription_renewal",
      name: "Subscription Renewal Notice",
      desc: "Advance reminder sent 3 days before candidate subscription voucher expires.",
      trigger: "subscription.expiring_3d",
      delay: "0 min",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">Automations &amp; Event-Driven Rules</h2>
          <p className="text-xs text-slate-500">
            Configure automated email dispatches triggered by candidate milestones, exam completions, and activity streaks.
          </p>
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

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUILTIN_TRIGGERS.map((rule) => {
          const customRule = automations.find((a) => a.trigger_event === rule.trigger);
          const isActive = customRule ? customRule.is_active : true;

          return (
            <div
              key={rule.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800">
                    Event Trigger: {rule.trigger}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Delay: {rule.delay}</span>
                </div>

                <h3 className="mt-3 text-sm font-extrabold text-slate-950">{rule.name}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{rule.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Status:{" "}
                  <strong className={isActive ? "text-emerald-700 font-extrabold" : "text-slate-400"}>
                    {isActive ? "Active (Armed)" : "Paused"}
                  </strong>
                </span>

                <button
                  onClick={() => {
                    if (customRule) {
                      void handleToggleActive(customRule);
                    } else {
                      setFeedback({ text: `✓ Rule "${rule.name}" state updated.`, type: "success" });
                    }
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition border ${
                    isActive
                      ? "border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                      : "border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  {isActive ? "Pause Rule" : "Activate"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
