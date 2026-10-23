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

function AcademicCapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
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

  // Filter out any social links that are disabled, empty, or placeholder '#'
  const activeSocialLinks = (config.social_links || []).filter(
    (item) =>
      item.enabled &&
      Boolean(item.url) &&
      item.url.trim() !== "#" &&
      (item.url.startsWith("http://") || item.url.startsWith("https://"))
  );

  const supportEmail = config.support_email || "support@brainlab.edu.ng";
  const academyEmail = config.academy_email || "academy@brainlab.edu.ng";
  const supportPhone = config.support_phone || "+234 907 431 0204";

  return (
    <footer
      className="border-t border-slate-800 bg-[#000d21] text-slate-300"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        BrainLab Academy Footer
      </h2>

      {/* Main Spacious 4-Column Layout */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          
          {/* Column 1: Brand Introduction & Dual Official Support/Academy Channels (lg:col-span-4) */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
              aria-label="BrainLab Academy home"
            >
              <Image
                src="/brainlab-logo-light.png"
                alt="BrainLab Academy"
                width={128}
                height={109}
                className="h-10 w-auto"
                priority={false}
              />
            </Link>

            <p className="mt-3 text-sm font-semibold text-slate-100">
              {config.brand_tagline}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              {config.brand_description}
            </p>

            {/* Clear, Non-repetitive Contact Channels */}
            <div className="mt-5 space-y-2 text-xs text-slate-300">
              {/* CBT & Technical Support Email */}
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-blue-400 shrink-0">
                  <MailIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <span className="text-[11px] text-slate-400 block">CBT Support:</span>
                  <a
                    href={`mailto:${supportEmail}?subject=BrainLab%20CBT%20Support%20Request`}
                    className="font-medium text-slate-200 transition-colors hover:text-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>

              {/* Academy & Admissions Office Email */}
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-indigo-400 shrink-0">
                  <AcademicCapIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <span className="text-[11px] text-slate-400 block">Academy Office:</span>
                  <a
                    href={`mailto:${academyEmail}?subject=BrainLab%20Academy%20Inquiry`}
                    className="font-medium text-slate-200 transition-colors hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    {academyEmail}
                  </a>
                </div>
              </div>

              {/* Direct Support Line */}
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-emerald-400 shrink-0">
                  <PhoneIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <span className="text-[11px] text-slate-400 block">Phone Line:</span>
                  <a
                    href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                    className="font-medium text-slate-200 transition-colors hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    {supportPhone}
                  </a>
                </div>
              </div>
            </div>

            {/* Single Focused Primary CTA */}
            <div className="mt-5">
              <a
                href={`mailto:${supportEmail}?subject=BrainLab%20CBT%20Support%20Request`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-95"
                title={`Email ${supportEmail}`}
              >
                <MailIcon className="h-3.5 w-3.5" />
                <span>Open CBT support</span>
              </a>
            </div>
          </div>

          {/* Column 2: CBT Practice & Exam Suite (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              CBT Practice
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/cbt">
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
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/schools">
                  For Schools &amp; Centres
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Learning Hub & Classes (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Learning Hub
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
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
                  Live Classroom Stage
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/recordings">
                  Class Recordings
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/ai-learning">
                  AI Study Studio
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/challenge-arena">
                  Challenge Arena (Daily Sprints)
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/resources">
                  Formula Sheets &amp; Resources
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/learning-dna">
                  Learning DNA Diagnostic
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/study-groups">
                  Study Circles &amp; Groups
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/community">
                  Community &amp; Discussions
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/skills-passport">
                  Study Report &amp; Badges
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/learning/achievements">
                  Achievements &amp; Streaks
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Trust (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Support &amp; Trust
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/support">
                  Help Centre &amp; FAQs
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/contact">
                  Contact Directory
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/about">
                  About Our Academy
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/pricing">
                  Practice Plans &amp; Pricing
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/verify">
                  Verify Certificate
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" href="/account/subscription/refund">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Clean Sub-Footer Bar */}
      <div className="border-t border-slate-800/80 bg-[#000814]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 text-xs text-slate-400 sm:px-8 md:flex-row">
          
          {/* Copyright Notice */}
          <div className="text-center sm:text-left">
            <span>&copy; {currentYear} {config.copyright_notice}</span>
          </div>

          {/* Essential Legal Links */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Privacy Notice
            </Link>
            <span className="text-slate-700" aria-hidden="true">&bull;</span>
            <Link
              href="/terms"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Terms of Use
            </Link>
            <span className="text-slate-700" aria-hidden="true">&bull;</span>
            <Link
              href="/account/subscription/refund"
              className="transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              Refund Policy
            </Link>
          </div>

          {/* Social Media Link Pills */}
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
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
