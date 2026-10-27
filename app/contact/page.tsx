"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "../lib/toast";

const CONTACT_INFO = {
  primaryPhone: "+234 907 431 0204",
  secondaryPhone: "+234 902 111 8231",
  whatsappNumber: "2349074310204",
  email: "support@brainlabacademy.com.ng",
  academyEmail: "hello@brainlabacademy.com.ng",
  whatsappChannel: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
  location: "Lagos, Nigeria",
  workingHours: "Monday – Saturday: 8:00 AM – 8:00 PM (WAT)",
};

const SOCIAL_CHANNELS = [
  {
    name: "WhatsApp Channel",
    handle: "15,000+ Students",
    url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
    icon: "💬",
    color: "group-hover:border-emerald-500 group-hover:text-emerald-500",
    badge: "Active Channel",
  },
  {
    name: "Instagram",
    handle: "@brain_labacademy",
    url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4",
    icon: "📸",
    color: "group-hover:border-pink-500 group-hover:text-pink-500",
    badge: "Visual Guides",
  },
  {
    name: "TikTok",
    handle: "@brainlabacademy",
    url: "https://www.tiktok.com/@brainlabacademy",
    icon: "🎵",
    color: "group-hover:border-cyan-400 group-hover:text-cyan-400",
    badge: "Quick Tips",
  },
  {
    name: "YouTube",
    handle: "@thebrainlabhub",
    url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u",
    icon: "📺",
    color: "group-hover:border-red-500 group-hover:text-red-500",
    badge: "Video Lectures",
  },
  {
    name: "X (Twitter)",
    handle: "@The_brainlabhub",
    url: "https://x.com/The_brainlabhub",
    icon: "🐦",
    color: "group-hover:border-slate-700 dark:group-hover:border-slate-300 group-hover:text-black dark:group-hover:text-white",
    badge: "Exam News",
  },
  {
    name: "Facebook",
    handle: "BrainLab Academy",
    url: "https://www.facebook.com/profile.php?id=61595669640028",
    icon: "👥",
    color: "group-hover:border-blue-600 group-hover:text-blue-600",
    badge: "Community",
  },
];

const TOPIC_PRESETS = [
  { id: "cbt_exam", label: "📝 CBT Exam Practice" },
  { id: "access_code", label: "🔑 Access Code Help" },
  { id: "subscription", label: "💳 Billing & Subscriptions" },
  { id: "revision_class", label: "🎥 Live Masterclass" },
  { id: "institutional", label: "🏫 School Partnership" },
  { id: "other", label: "💬 General Inquiry" },
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
      toast.error("Please fill in your name, contact phone number, and inquiry message.");
      return;
    }

    setLoading(true);

    const encodedMsg = encodeURIComponent(
      `Hello BrainLab Academy Desk,\n\nCandidate Name: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email || "N/A"}\nTopic: ${formData.category}\n\nMessage:\n${formData.message}`
    );
    const whatsappUrl = `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodedMsg}`;

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }, 500);
  };

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060e1a] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#071328]/90 py-12 sm:py-16">
        {/* Ambient Gradient Glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-cyan-500/10"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Support</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-cyan-400">Contact &amp; Helpdesk</span>
          </nav>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold text-blue-900 dark:text-cyan-300">
              Verified Help Desk Directory
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Desk Online &bull; Mon – Sat 8AM – 8PM
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
            We Are Here to Help You Excel
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto sm:mx-0">
            Have questions about CBT simulations, access codes, subscription billing, or live masterclasses? Reach our certified academic coordinators across our verified Nigerian channels.
          </p>
        </div>
      </section>

      {/* Main Grid Section */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Quick Contact Cards Column (Left - 5 Cols) */}
            <div className="space-y-5 lg:col-span-5">
              
              {/* WhatsApp Priority Helpdesk Card */}
              <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-sm">
                      💬
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-950 dark:text-white">Direct WhatsApp Desk</h2>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">⚡ Average reply &lt; 5 mins</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Fastest
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Chat directly with an exam coordinator for immediate access code generation, PIN unlocks, or subscription verifications.
                </p>

                <div className="mt-4 space-y-2">
                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent("Hello BrainLab Academy, I need assistance with CBT practice.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow transition-all active:scale-95"
                  >
                    <span>💬</span> Chat on WhatsApp ({CONTACT_INFO.primaryPhone}) &rarr;
                  </a>
                  <a
                    href={CONTACT_INFO.whatsappChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900/80 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition active:scale-95"
                  >
                    <span>📢</span> Join 15k+ WhatsApp Community ↗
                  </a>
                </div>
              </div>

              {/* Direct Phone Lines Card */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-cyan-400 font-black text-lg">
                    📞
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">Voice Helplines</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Monday – Saturday: 8:00 AM – 8:00 PM</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs sm:text-sm font-semibold">
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-slate-500 dark:text-slate-400">Helpline 1:</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${CONTACT_INFO.primaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                        {CONTACT_INFO.primaryPhone}
                      </a>
                      <button
                        onClick={() => handleCopy(CONTACT_INFO.primaryPhone, "Phone 1")}
                        className="text-xs text-slate-400 hover:text-blue-600"
                        title="Copy number"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-slate-500 dark:text-slate-400">Helpline 2:</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${CONTACT_INFO.secondaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                        {CONTACT_INFO.secondaryPhone}
                      </a>
                      <button
                        onClick={() => handleCopy(CONTACT_INFO.secondaryPhone, "Phone 2")}
                        className="text-xs text-slate-400 hover:text-blue-600"
                        title="Copy number"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Email Inquiries */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-black text-lg">
                    ✉️
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">Official Email Desks</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Written correspondence &amp; partnerships</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Student Support</p>
                      <a href={`mailto:${CONTACT_INFO.email}`} className="text-blue-600 dark:text-cyan-400 hover:underline">
                        {CONTACT_INFO.email}
                      </a>
                    </div>
                    <button
                      onClick={() => handleCopy(CONTACT_INFO.email, "Support email")}
                      className="text-xs text-slate-400 hover:text-blue-600"
                      title="Copy email"
                    >
                      📋
                    </button>
                  </div>

                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Institutional / Partnerships</p>
                      <a href={`mailto:${CONTACT_INFO.academyEmail}`} className="text-blue-600 dark:text-cyan-400 hover:underline">
                        {CONTACT_INFO.academyEmail}
                      </a>
                    </div>
                    <button
                      onClick={() => handleCopy(CONTACT_INFO.academyEmail, "Academy email")}
                      className="text-xs text-slate-400 hover:text-blue-600"
                      title="Copy email"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Direct Message Form Column (Right - 7 Cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                    Dispatch an Academic Ticket
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Ref: 🇳🇬 NG-DESK
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  Academic &amp; Student Helpdesk Form
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fill in your details below. Once packaged, your request will be delivered to our support queue and opened in WhatsApp for instant one-on-one attention.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-6 text-center">
                    <span className="text-3xl" aria-hidden="true">✓</span>
                    <h3 className="mt-2 text-lg font-bold text-emerald-950 dark:text-emerald-200">
                      Inquiry Packaged &amp; Dispatched!
                    </h3>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      Your query has been routed. If WhatsApp didn&apos;t open automatically on your device, click below to connect:
                    </p>
                    <a
                      href={`https://wa.me/${CONTACT_INFO.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
                    >
                      <span>💬</span> Open WhatsApp Chat Now &rarr;
                    </a>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", phone: "", email: "", category: "cbt_exam", message: "" });
                      }}
                      className="mt-3 block w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {/* Category Selector Pills */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                        Select Inquiry Topic *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TOPIC_PRESETS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: t.id })}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              formData.category === t.id
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Candidate / Parent Name *
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

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. candidate@example.com"
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Inquiry Details / Problem Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Describe how our academic support team can assist you today..."
                        className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        🔒 Form submissions are safeguarded under our NDPA 2023 privacy commitment.
                      </p>

                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                      >
                        {loading ? "Packaging Ticket..." : "Send to Support Queue →"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>

          {/* Social Channels Section */}
          <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center sm:text-left mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Official Social Networks
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight mt-1">
                Connect With BrainLab Across Channels
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Follow our official accounts for daily exam tips, question walkthroughs, scholarship announcements, and syllabus updates.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SOCIAL_CHANNELS.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-inherit">
                        {item.name}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {item.handle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {item.badge}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Footer Bridge */}
          <div className="mt-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Looking for self-service answers?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Browse our comprehensive Knowledge Base covering access codes, mock results, and CBT keyboard shortcuts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/faq"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              >
                Browse FAQ &rarr;
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Pricing Plans
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
