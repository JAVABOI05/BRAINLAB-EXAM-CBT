"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const CONTACT_INFO = {
  primaryPhone: "0907 431 0204",
  secondaryPhone: "0902 111 8231",
  whatsappNumber: "2349074310204",
  email: "support@brainlab.edu.ng",
  academyEmail: "academy@brainlab.edu.ng",
  whatsappChannel: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
  location: "Lagos, Nigeria",
  workingHours: "Monday – Saturday: 8:00 AM – 8:00 PM (WAT)",
};

const SOCIAL_CHANNELS = [
  {
    name: "X (Twitter)",
    handle: "@The_brainlabhub",
    url: "https://x.com/The_brainlabhub",
    color: "hover:border-slate-800 hover:text-black dark:hover:text-white",
  },
  {
    name: "Instagram",
    handle: "@brain_labacademy",
    url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4",
    color: "hover:border-pink-500 hover:text-pink-600",
  },
  {
    name: "Facebook",
    handle: "BrainLab Academy",
    url: "https://www.facebook.com/profile.php?id=61595669640028",
    color: "hover:border-blue-600 hover:text-blue-600",
  },
  {
    name: "YouTube",
    handle: "@thebrainlabhub",
    url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u",
    color: "hover:border-red-600 hover:text-red-600",
  },
  {
    name: "TikTok",
    handle: "@brainlabacademy",
    url: "https://www.tiktok.com/@brainlabacademy",
    color: "hover:border-slate-900 hover:text-slate-900 dark:hover:text-white",
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    category: "cbt_exam",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      alert("Please fill in your name, contact phone number, and inquiry message.");
      return;
    }

    setLoading(true);

    // Create a pre-filled WhatsApp message link as direct fallback
    const encodedMsg = encodeURIComponent(
      `Hello BrainLab Academy,\n\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email || "N/A"}\nCategory: ${formData.category}\n\nMessage:\n${formData.message}`
    );
    const whatsappUrl = `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodedMsg}`;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      // Automatically open WhatsApp in new tab for fastest resolution
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#060e1a] text-slate-900 dark:text-slate-100 transition-colors">
      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-cyan-400">
              Verified Contact Directory
            </span>
            <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white tracking-tight sm:text-5xl">
              We Are Here to Help You Succeed
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-7 text-slate-600 dark:text-slate-300">
              Have questions about your CBT mock attempts, access code redemption, revision timetables, or subscription billing? Reach our academic and technical support desks through any of our official channels below.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {/* Quick Contact Methods */}
            <div className="space-y-4 lg:col-span-1">
              {/* WhatsApp Card */}
              <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-lg">
                    💬
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Direct WhatsApp Support</h2>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">Fastest Response Time</p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Chat directly with an exam coordinator for immediate access code generation or account unlocks.
                </p>

                <div className="mt-4 space-y-2">
                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent("Good day BrainLab Tutorials, I need assistance with CBT practice.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all active:scale-95"
                  >
                    Chat on WhatsApp ({CONTACT_INFO.primaryPhone}) →
                  </a>
                  <a
                    href={CONTACT_INFO.whatsappChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition active:scale-95"
                  >
                    Join WhatsApp Community Channel ↗
                  </a>
                </div>
              </div>

              {/* Phone & Voice Card */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-cyan-400 font-black text-lg">
                    📞
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Phone Support Lines</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Available Mon – Sat</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm font-semibold">
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Line 1:</span>
                    <a href={`tel:${CONTACT_INFO.primaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                      {CONTACT_INFO.primaryPhone}
                    </a>
                  </div>
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Line 2:</span>
                    <a href={`tel:${CONTACT_INFO.secondaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                      {CONTACT_INFO.secondaryPhone}
                    </a>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  {CONTACT_INFO.workingHours}
                </p>
              </div>

              {/* Official Social Accounts */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Official Social Accounts
                </h2>
                <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                  {SOCIAL_CHANNELS.map((item) => (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors ${item.color}`}
                    >
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-400 dark:text-slate-500">{item.handle} ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Inquiry Form */}
            <div className="rounded-3xl border border-white/70 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-xl shadow-blue-100/30 dark:shadow-none lg:col-span-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                Send a Direct Message
              </span>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Academic &amp; Student Helpdesk
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Fill in your details below. Once submitted, our team will process your inquiry and you will be connected directly to WhatsApp for real-time resolution.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-6 text-center">
                  <span className="text-3xl" aria-hidden="true">✓</span>
                  <h3 className="mt-2 text-lg font-bold text-emerald-950 dark:text-emerald-200">
                    Message Dispatched Successfully!
                  </h3>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                    Your inquiry has been packaged. If your WhatsApp window did not open automatically, click the button below:
                  </p>
                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 active:scale-95"
                  >
                    Open WhatsApp Chat Now →
                  </a>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", phone: "", email: "", category: "cbt_exam", message: "" });
                    }}
                    className="mt-3 block w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Student / Parent Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Samuel Adekunle"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Phone Number (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. 08012345678"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. student@example.com"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Inquiry Topic *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="cbt_exam">CBT Exam Practice &amp; Score Issue</option>
                        <option value="access_code">Request or Validate Access Code</option>
                        <option value="subscription">Subscriptions, Bachs &amp; Paystack Billing</option>
                        <option value="revision_class">2 Weeks JAMB Revision Class Registration</option>
                        <option value="institutional">School / Center Partnership</option>
                        <option value="other">General Feedback &amp; Suggestions</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Message / Question Description *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe how we can assist you..."
                      className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      🔒 Your details are safeguarded under BrainLab’s privacy notice.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "Packaging Inquiry..." : "Send Inquiry via Official Desk →"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
