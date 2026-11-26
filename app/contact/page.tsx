"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "../lib/toast";
import { getFooterConfig } from "../lib/platformConfig";
import { normalizeWhatsAppNumber, getWhatsAppChatUrl } from "../lib/whatsapp";
import { CONTACT_CONFIG } from "../lib/contactConfig";

const DEFAULT_CONTACT_INFO = {
  primaryPhone: CONTACT_CONFIG.phone.display,
  secondaryPhone: CONTACT_CONFIG.phone.display,
  whatsappNumber: CONTACT_CONFIG.whatsapp.number,
  email: CONTACT_CONFIG.email.support,
  academyEmail: CONTACT_CONFIG.email.enquiries,
  whatsappChannel: CONTACT_CONFIG.whatsapp.channelUrl,
  location: "Lagos, Nigeria",
  workingHours: "Monday – Saturday: 8:00 AM – 8:00 PM (WAT)",
};

const SOCIAL_CHANNELS = [
  {
    name: "WhatsApp Channel",
    handle: "Official Channel",
    url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
    color: "group-hover:border-emerald-500 group-hover:text-emerald-500",
    badge: "Active Channel",
  },
  {
    name: "Instagram",
    handle: "@brain_labacademy",
    url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4",
    color: "group-hover:border-pink-500 group-hover:text-pink-500",
    badge: "Visual Guides",
  },
  {
    name: "TikTok",
    handle: "@brainlabacademy",
    url: "https://www.tiktok.com/@brainlabacademy",
    color: "group-hover:border-cyan-400 group-hover:text-cyan-400",
    badge: "Quick Tips",
  },
  {
    name: "YouTube",
    handle: "@thebrainlabhub",
    url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u",
    color: "group-hover:border-red-500 group-hover:text-red-500",
    badge: "Video Lectures",
  },
  {
    name: "X (Twitter)",
    handle: "@The_brainlabhub",
    url: "https://x.com/The_brainlabhub",
    color: "group-hover:border-slate-700 dark:group-hover:border-slate-300 group-hover:text-black dark:group-hover:text-white",
    badge: "Exam News",
  },
  {
    name: "Facebook",
    handle: "BrainLab Academy",
    url: "https://www.facebook.com/profile.php?id=61595669640028",
    color: "group-hover:border-blue-600 group-hover:text-blue-600",
    badge: "Community",
  },
];

const TOPIC_PRESETS = [
  { id: "cbt_exam", label: "CBT Exam Practice" },
  { id: "access_code", label: "Access Code Help" },
  { id: "subscription", label: "Billing & Subscriptions" },
  { id: "revision_class", label: "Live Masterclass" },
  { id: "institutional", label: "School Partnership" },
  { id: "other", label: "General Inquiry" },
];

export default function ContactPage() {
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);

  useEffect(() => {
    let mounted = true;
    void getFooterConfig().then((cfg) => {
      if (!mounted || !cfg) return;
      setContactInfo((prev) => ({
        ...prev,
        primaryPhone: cfg.support_phone || prev.primaryPhone,
        whatsappNumber: cfg.whatsapp_number ? normalizeWhatsAppNumber(cfg.whatsapp_number) : prev.whatsappNumber,
        whatsappChannel: cfg.whatsapp_channel_url || prev.whatsappChannel,
        email: cfg.support_email || prev.email,
        academyEmail: cfg.academy_email || prev.academyEmail,
        location: cfg.office_location || prev.location,
      }));
    });
    return () => {
      mounted = false;
    };
  }, []);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    category: "cbt_exam",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState<string>("");
  const [ticketWaUrl, setTicketWaUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast.error("Please fill in your name, contact phone number, and inquiry message.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTicketRef(data.referenceCode || "BL-CNT-ACK");
        setTicketWaUrl(data.whatsappUrl || "");
        setSubmitted(true);
        toast.success(`Inquiry registered! Reference: ${data.referenceCode}`);
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        toast.error(data.error || "Unable to submit inquiry. Please try again.");
      }
    } catch {
      // Fallback: direct WhatsApp open if network fails
      const encodedMsg = encodeURIComponent(
        `Hello BrainLab Academy Desk,\n\nName: ${formData.name}\nPhone: ${formData.phone}\nTopic: ${formData.category}\n\nMessage:\n${formData.message}`
      );
      const fallbackUrl = `https://wa.me/${contactInfo.whatsappNumber}?text=${encodedMsg}`;
      setTicketRef("OFFLINE-DISPATCH");
      setTicketWaUrl(fallbackUrl);
      setSubmitted(true);
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg></div>
                    <div>
                      <h2 className="text-base font-bold text-slate-950 dark:text-white">Direct WhatsApp Desk</h2>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Average response time: &lt; 5 mins</p>
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
                    href={`https://wa.me/${contactInfo.whatsappNumber}?text=${encodeURIComponent("Hello BrainLab Academy, I need assistance with CBT practice.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow transition-all active:scale-95"
                  >
                    <span>Chat on WhatsApp</span> ({contactInfo.primaryPhone}) &rarr;
                  </a>
                  <a
                    href={contactInfo.whatsappChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900/80 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition active:scale-95"
                  >
                    <span>Join WhatsApp Community Channel</span> ↗
                  </a>
                </div>
              </div>

              {/* Direct Phone Lines Card */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-cyan-400"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                  <div>
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">Voice Helplines</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Monday – Saturday: 8:00 AM – 8:00 PM</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs sm:text-sm font-semibold">
                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-slate-500 dark:text-slate-400">Helpline 1:</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${contactInfo.primaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                        {contactInfo.primaryPhone}
                      </a>
                      <button
                        onClick={() => handleCopy(contactInfo.primaryPhone, "Phone 1")}
                        className="text-xs text-slate-400 hover:text-blue-600"
                        title="Copy number"
                      ><svg className="h-3.5 w-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <span className="text-slate-500 dark:text-slate-400">Helpline 2:</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${contactInfo.secondaryPhone}`} className="text-slate-900 dark:text-white hover:text-blue-600 font-bold">
                        {contactInfo.secondaryPhone}
                      </a>
                      <button
                        onClick={() => handleCopy(contactInfo.secondaryPhone, "Phone 2")}
                        className="text-xs text-slate-400 hover:text-blue-600"
                        title="Copy number"
                      ><svg className="h-3.5 w-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Email Inquiries */}
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-black">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
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
                      <a href={`mailto:${contactInfo.email}`} className="text-blue-600 dark:text-cyan-400 hover:underline">
                        {contactInfo.email}
                      </a>
                    </div>
                    <button
                      onClick={() => handleCopy(contactInfo.email, "Support email")}
                      className="text-xs text-slate-400 hover:text-blue-600"
                      title="Copy email"
                    ><svg className="h-3.5 w-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                  </div>

                  <div className="flex justify-between items-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Institutional / Partnerships</p>
                      <a href={`mailto:${contactInfo.academyEmail}`} className="text-blue-600 dark:text-cyan-400 hover:underline">
                        {contactInfo.academyEmail}
                      </a>
                    </div>
                    <button
                      onClick={() => handleCopy(contactInfo.academyEmail, "Academy email")}
                      className="text-xs text-slate-400 hover:text-blue-600"
                      title="Copy email"
                    ><svg className="h-3.5 w-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
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
                    Ref: NG-DESK
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
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
                      <svg className="h-5 w-5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-emerald-950 dark:text-emerald-200">
                      Inquiry Registered &amp; Dispatched!
                    </h3>
                    {ticketRef && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 text-xs font-black text-emerald-900 dark:text-emerald-200">
                        <span>Ticket ID:</span>
                        <span className="font-mono">{ticketRef}</span>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
                      Your query has been logged to our academic queue. Click below if WhatsApp didn&apos;t open automatically on your device:
                    </p>
                    <a
                      href={ticketWaUrl || `https://wa.me/${contactInfo.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
                    >
                      <span>Continue on WhatsApp with Ticket #{ticketRef}</span> &rarr;
                    </a>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setTicketRef("");
                        setTicketWaUrl("");
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
                        Form submissions are safeguarded under our NDPA 2023 privacy commitment.
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    </div>
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
