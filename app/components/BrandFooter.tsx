"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_FOOTER_CONFIG,
  getFooterConfig,
  type FooterConfig,
  type SocialLinkConfig,
} from "../lib/platformConfig";

/* -------------------------------------------------------------------------
   Crisp Vector SVG Icons (Zero bloat, accessible, high contrast)
------------------------------------------------------------------------- */
function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
    </svg>
  );
}

function PhoneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.477-.15-.678.15-.2.301-.778.98-.953 1.18-.175.201-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.134.301-.351.451-.527.151-.175.201-.301.301-.501.101-.201.05-.376-.025-.526-.075-.151-.678-1.632-.929-2.235-.245-.589-.494-.509-.678-.518-.176-.009-.376-.011-.577-.011-.201 0-.527.075-.803.376-.276.301-1.054 1.03-1.054 2.511 0 1.482 1.079 2.913 1.23 3.114.15.201 2.123 3.242 5.143 4.547.718.311 1.279.497 1.716.636.721.23 1.378.197 1.897.12.578-.087 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.076-.125-.276-.201-.577-.351zM12.04 2C6.517 2 2.033 6.484 2.033 12.008c0 1.93.548 3.733 1.498 5.27L2 22l4.873-1.488a9.96 9.96 0 005.167 1.496c5.523 0 10.007-4.484 10.007-10.008C22.047 6.484 17.563 2 12.04 2zm0 18.254c-1.616 0-3.118-.475-4.382-1.294l-.315-.198-2.888.882.898-2.815-.218-.328a8.214 8.214 0 01-1.375-4.493c0-4.561 3.711-8.272 8.28-8.272 4.569 0 8.28 3.711 8.28 8.272 0 4.561-3.711 8.272-8.28 8.272z" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function YouTubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function ArrowUpRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  );
}

function renderSocialIcon(platform: SocialLinkConfig["platform"]) {
  switch (platform) {
    case "x":
      return <XIcon className="h-4 w-4" />;
    case "instagram":
      return <InstagramIcon className="h-4 w-4" />;
    case "facebook":
      return <FacebookIcon className="h-4 w-4" />;
    case "youtube":
      return <YouTubeIcon className="h-4 w-4" />;
    case "tiktok":
      return <TikTokIcon className="h-4 w-4" />;
    case "whatsapp":
      return <WhatsAppIcon className="h-4 w-4" />;
    default:
      return null;
  }
}

export default function BrandFooter() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    void getFooterConfig().then((cfg) => {
      if (active && cfg) {
        setConfig(cfg);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const activeSocialLinks = (config.social_links || []).filter(
    (item) =>
      item.enabled &&
      Boolean(item.url) &&
      item.url.trim() !== "#" &&
      (item.url.startsWith("http://") || item.url.startsWith("https://"))
  );

  return (
    <footer
      className="border-t border-slate-800 bg-[#000d21] text-slate-300"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        BrainLab Academy Footer
      </h2>

      {/* Main Multi-Column Footer Grid */}
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          
          {/* Column 1: Brand Introduction, Direct Support Channels & Open CBT Support Action */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
              aria-label="BrainLab Academy homepage"
            >
              <Image
                src="/brainlab-logo-light.svg"
                alt="BrainLab Academy"
                width={128}
                height={70}
                className="h-11 w-auto"
                priority={false}
              />
            </Link>

            <p className="mt-4 text-sm font-semibold text-slate-100">
              {config.brand_tagline}
            </p>

            <p className="mt-2 text-xs leading-6 text-slate-400">
              {config.brand_description}
            </p>

            {/* Direct Official Contact Info */}
            <div className="mt-6 space-y-2.5 text-xs text-slate-300">
              {config.support_email && (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800/90 text-blue-400">
                    <MailIcon className="h-3.5 w-3.5" />
                  </span>
                  <a
                    href={`mailto:${config.support_email}?subject=BrainLab%20Support%20Inquiry`}
                    className="font-medium text-slate-200 transition-colors hover:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    {config.support_email}
                  </a>
                </div>
              )}

              {config.support_phone && (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800/90 text-emerald-400">
                    <PhoneIcon className="h-3.5 w-3.5" />
                  </span>
                  <a
                    href={`tel:${config.support_phone.replace(/\s+/g, "")}`}
                    className="font-medium text-slate-200 transition-colors hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    {config.support_phone}
                  </a>
                </div>
              )}
            </div>

            {/* Prominent Action Buttons: Open CBT Support & WhatsApp Helpdesk */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href={`mailto:${config.support_email || "support@brainlab.edu.ng"}?subject=BrainLab%20CBT%20Support%20Request`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-95"
                title="Send an email to support@brainlab.edu.ng"
              >
                <MailIcon className="h-3.5 w-3.5" />
                <span>Open CBT support</span>
              </a>

              {config.whatsapp_number && (
                <a
                  href={`https://wa.me/${config.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-emerald-600/50 hover:bg-slate-800 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-95"
                  aria-label="Chat with BrainLab learner support on WhatsApp"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>WhatsApp Helpdesk</span>
                </a>
              )}
            </div>
          </div>

          {/* Column 2: CBT Practice & Exam Support (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              CBT Practice
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/login">
                  JAMB UTME CBT
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/access">
                  Enter Access Code
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/self-practice">
                  Self-Paced Practice
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/assessments">
                  Quizzes &amp; Competitions
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/leaderboard">
                  National Leaderboard
                </Link>
              </li>
              {/* Explicit CBT Support Mail Link */}
              <li className="pt-1 border-t border-slate-800/80">
                <a
                  className="inline-flex items-center gap-1.5 font-bold text-sky-400 transition-colors hover:text-sky-300"
                  href={`mailto:${config.support_email || "support@brainlab.edu.ng"}?subject=BrainLab%20CBT%20Support%20Request`}
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  <span>Open CBT Support</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Learning Hub & Classes (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Learning Hub
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/learn">
                  Subject Curriculum
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/learn?tab=timetable">
                  Timetable &amp; Schedule
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/learn?tab=live">
                  Live Classroom Portal
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/recordings">
                  Class Recordings Archive
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/ai-learning">
                  AI Study Studio
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/verify">
                  Verify Certificate
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Academics & Company (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              BrainLab
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/about">
                  About Our Academy
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  className="text-slate-300 transition-colors hover:text-white"
                  href="/contact?subject=Tutor+Application"
                >
                  Become a Tutor
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/pricing">
                  Practice Plans &amp; Pricing
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/account/access">
                  Membership &amp; Access
                </Link>
              </li>
              <li>
                {config.whatsapp_channel_url ? (
                  <a
                    className="inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-emerald-300"
                    href={config.whatsapp_channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Community Channel</span>
                    <ArrowUpRightIcon className="h-3 w-3 text-slate-400" />
                  </a>
                ) : (
                  <Link className="text-slate-300 transition-colors hover:text-white" href="/learn">
                    Community Hub
                  </Link>
                )}
              </li>
            </ul>
          </div>

          {/* Column 5: Help & Support (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Help &amp; Support
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              {/* Prominent Open CBT Support Link */}
              <li>
                <a
                  className="inline-flex items-center gap-1.5 font-bold text-sky-400 transition-colors hover:text-sky-300"
                  href={`mailto:${config.support_email || "support@brainlab.edu.ng"}?subject=BrainLab%20CBT%20Support%20Request`}
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  <span>Open CBT Support</span>
                </a>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/support">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/faq">
                  FAQs &amp; Answers
                </Link>
              </li>
              <li>
                <Link
                  className="text-slate-300 transition-colors hover:text-white"
                  href="/contact?subject=Issue+Report"
                >
                  Report a Problem
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/account/access">
                  Billing &amp; Access Support
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/account/subscription/refund">
                  Refund Policy
                </Link>
              </li>
              <li>
                <a
                  className="text-slate-400 transition-colors hover:text-slate-200"
                  href={`mailto:${config.support_email || "support@brainlab.edu.ng"}`}
                >
                  {config.support_email || "support@brainlab.edu.ng"}
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Sub-Footer Bottom Bar: Legal, Attribution & Accessible Social Links */}
      <div className="border-t border-slate-800/80 bg-[#000814]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-xs text-slate-400 sm:px-8 md:flex-row">
          
          {/* Copyright & Mission Statement */}
          <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
            <span>
              &copy; {currentYear} {config.copyright_notice}
            </span>
            <span className="text-[11px] text-slate-400">
              {config.accreditation_statement}
            </span>
          </div>

          {/* Legal Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Privacy Notice
            </Link>
            <span className="text-slate-600" aria-hidden="true">&bull;</span>
            <Link
              href="/terms"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Terms of Use
            </Link>
            <span className="text-slate-600" aria-hidden="true">&bull;</span>
            <Link
              href="/account/subscription/refund"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Refund Policy
            </Link>
            <span className="text-slate-600" aria-hidden="true">&bull;</span>
            <Link
              href="/verify"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Verify Certificate
            </Link>
          </div>

          {/* Social Media Link Pills (Renders only configured, valid URLs) */}
          {activeSocialLinks.length > 0 && (
            <div className="flex items-center gap-2" aria-label="Social media channels">
              {activeSocialLinks.map((social) => {
                const icon = renderSocialIcon(social.platform);
                if (!icon) return null;
                return (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                    aria-label={`BrainLab Academy on ${social.name}`}
                    title={social.name}
                  >
                    {icon}
                  </a>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </footer>
  );
}
