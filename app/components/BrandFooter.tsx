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
   Crisp Vector SVG Icons (Accessible, zero external bloat)
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

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.99.69.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z" />
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

function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

const OFFICIAL_SOCIAL_FALLBACKS: SocialLinkConfig[] = [
  { platform: "x", name: "X (Twitter)", url: "https://x.com/The_brainlabhub", enabled: true },
  { platform: "instagram", name: "Instagram", url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4", enabled: true },
  { platform: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61595669640028", enabled: true },
  { platform: "youtube", name: "YouTube", url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u", enabled: true },
  { platform: "tiktok", name: "TikTok", url: "https://www.tiktok.com/@brainlabacademy", enabled: true },
  { platform: "whatsapp", name: "WhatsApp Channel", url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m", enabled: true },
];

function renderSocialIcon(platform: SocialLinkConfig["platform"], className = "h-4 w-4") {
  switch (platform) {
    case "whatsapp":
      return <WhatsAppIcon className={className} />;
    case "x":
      return <XIcon className={className} />;
    case "instagram":
      return <InstagramIcon className={className} />;
    case "facebook":
      return <FacebookIcon className={className} />;
    case "youtube":
      return <YouTubeIcon className={className} />;
    case "tiktok":
      return <TikTokIcon className={className} />;
    case "linkedin":
      return <LinkedInIcon className={className} />;
    default:
      return null;
  }
}

/**
 * Returns uniform sleek neutral styling at rest.
 * ONLY illuminates with authentic brand colors when hovered upon.
 */
function getPlatformPillStyle(platform: SocialLinkConfig["platform"]) {
  const baseNeutral =
    "border border-slate-800 bg-slate-900/80 text-slate-400";

  switch (platform) {
    case "whatsapp":
      return `${baseNeutral} hover:border-[#25D366] hover:bg-[#25D366] hover:text-white hover:shadow-lg hover:shadow-emerald-950/40`;
    case "instagram":
      return `${baseNeutral} hover:border-transparent hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:shadow-lg hover:shadow-pink-950/40`;
    case "tiktok":
      return `${baseNeutral} hover:border-slate-500 hover:bg-black hover:text-white hover:shadow-lg hover:shadow-cyan-950/40`;
    case "youtube":
      return `${baseNeutral} hover:border-[#FF0000] hover:bg-[#FF0000] hover:text-white hover:shadow-lg hover:shadow-red-950/40`;
    case "facebook":
      return `${baseNeutral} hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:shadow-lg hover:shadow-blue-950/40`;
    case "x":
      return `${baseNeutral} hover:border-slate-200 hover:bg-white hover:text-black hover:shadow-lg hover:shadow-slate-800/40`;
    case "linkedin":
      return `${baseNeutral} hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white hover:shadow-lg hover:shadow-sky-950/40`;
    default:
      return `${baseNeutral} hover:border-slate-600 hover:bg-slate-800 hover:text-white`;
  }
}

export default function BrandFooter() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    void getFooterConfig()
      .then((cfg) => {
        if (active && cfg) {
          setConfig({ ...DEFAULT_FOOTER_CONFIG, ...cfg });
        }
        if (active) setConfigLoaded(true);
      })
      .catch(() => {
        if (active) setConfigLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Filter out any social links that are disabled, empty, or placeholder '#'
  const rawLinks =
    config.social_links && config.social_links.length > 0
      ? config.social_links
      : OFFICIAL_SOCIAL_FALLBACKS;

  const activeSocialLinks = rawLinks.filter(
    (item) =>
      item.enabled &&
      Boolean(item.url) &&
      item.url.trim() !== "#" &&
      (item.url.startsWith("http://") || item.url.startsWith("https://"))
  );

  const supportEmail = config.support_email || "support@brainlabacademy.com.ng";
  const academyEmail = config.academy_email || "hello@brainlabacademy.com.ng";
  const supportPhone = config.support_phone || "+234 907 431 0204";
  const supportPhoneDial = supportPhone.replace(/[^\d+]/g, "");
  const whatsappNumber = (config.whatsapp_number || "").replace(/\D/g, "");
  const whatsappHelpdeskUrl =
    configLoaded && whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          "Hello BrainLab Academy, I need assistance with CBT and classes."
        )}`
      : null;
  const whatsappDisplayNumber = whatsappNumber ? `+${whatsappNumber}` : "";

  return (
    <footer
      className="border-t border-slate-800/80 bg-[#040e21] text-slate-300 font-sans"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        BrainLab Academy Footer
      </h2>

      {/* Main Balanced Grid */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Column 1: Brand Identity, Direct Contact & Straight Horizontal Socials (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
              aria-label="BrainLab Academy home"
            >
              <Image
                src="/brainlab-mark.png"
                alt="BrainLab Emblem"
                width={40}
                height={34}
                className="h-9 w-auto drop-shadow-md transition-transform group-hover:scale-105"
                priority={false}
              />
              <div className="flex flex-col justify-center leading-none">
                <span className="text-lg font-black tracking-tight text-white">
                  BrainLab Academy
                </span>
                <span className="text-[10px] font-bold tracking-wider text-slate-400 mt-1 uppercase">
                  Excellence in CBT &amp; Learning
                </span>
              </div>
            </Link>

            <p className="text-xs leading-relaxed text-slate-400 max-w-md">
              Nigeria&apos;s premier online CBT examination platform, syllabus-calibrated revision modules, and AI tutor for UTME, O Level (WAEC/NECO), and Post-UTME screening.
            </p>

            {/* Direct Contact Details: Clean, uniform color until hover */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-400 group">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 shrink-0 group-hover:text-slate-200 group-hover:border-slate-700 transition-colors">
                  <MailIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-slate-400 text-[11px] font-medium">CBT Support:</span>
                <a
                  href={`mailto:${supportEmail}?subject=BrainLab%20Technical%20and%20CBT%20Support`}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {supportEmail}
                </a>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400 group">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 shrink-0 group-hover:text-slate-200 group-hover:border-slate-700 transition-colors">
                  <AcademicCapIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-slate-400 text-[11px] font-medium">Office Desk:</span>
                <a
                  href={`mailto:${academyEmail}?subject=BrainLab%20Academy%20and%20Partnership%20Inquiry`}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {academyEmail}
                </a>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400 group">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 shrink-0 group-hover:text-slate-200 group-hover:border-slate-700 transition-colors">
                  <PhoneIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-slate-400 text-[11px] font-medium">Call Support:</span>
                <a
                  href={`tel:${supportPhoneDial}`}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {supportPhone}
                </a>
              </div>

              {whatsappHelpdeskUrl && (
                <div className="flex items-center gap-2.5 text-slate-400 group">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 shrink-0 group-hover:text-slate-200 group-hover:border-slate-700 transition-colors">
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-slate-400 text-[11px] font-medium">WhatsApp:</span>
                  <a
                    href={whatsappHelpdeskUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    {whatsappDisplayNumber}
                  </a>
                </div>
              )}
            </div>

            {/* Official Social Channels */}
            <div className="pt-2 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Channels
              </span>

              <div
                className="flex items-center gap-2.5 pt-0.5"
                aria-label="Official Social Media Links"
              >
                {activeSocialLinks.map((social) => {
                  const icon = renderSocialIcon(social.platform, "h-4 w-4 shrink-0");
                  if (!icon) return null;
                  const pillStyle = getPlatformPillStyle(social.platform);

                  return (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${pillStyle}`}
                      aria-label={`Follow BrainLab Academy on ${social.name}`}
                      title={social.name}
                    >
                      {icon}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Candidate Tracks & Programmes (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3 sm:pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Candidate Tracks
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/programmes/utme">
                  UTME Candidates (JAMB Prep)
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/programmes/waec">
                  O Level Candidates (WAEC/NECO)
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/programmes/post-utme">
                  Post-UTME Screening Accelerator
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/resources/exam-calendar">
                  National Exam Timetables &amp; Calendar
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/syllabus">
                  Official Examination Syllabi
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/resources">
                  Formula Sheets &amp; Revision Notes
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/programmes">
                  All Academic Programmes &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Products & Platform (lg:col-span-3) */}
          <div className="lg:col-span-3 space-y-3 sm:pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Products
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/cbt">
                  JAMB UTME CBT Simulator
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/learning-hub">
                  Curriculum Learning Hub
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/ai-learning">
                  AI Study Studio &amp; Diagnostics
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/stem-studio">
                  STEM Virtual Labs
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/live-classroom">
                  Live Classroom Stage
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products/challenge-arena">
                  1v1 Challenge Arena
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/products">
                  All Products Overview &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Institutional, Community & Support (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-3 sm:pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Audience &amp; Support
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/for-students">
                  For Students &amp; Candidates
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/schools">
                  For Schools &amp; Centres
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/for-tutors">
                  For Educators &amp; Tutors
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/pricing">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/about">
                  About Our Academy
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/faq">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150" href="/contact">
                  Direct Contact Desk
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modern High-Clarity Bottom Legal & Trust Bar */}
      <div className="border-t border-slate-800/80 bg-[#020610]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 text-xs text-slate-400 sm:px-8 md:flex-row">
          {/* Copyright & Compliance */}
          <div className="text-center md:text-left">
            <span>&copy; {currentYear} {config.copyright_notice}</span>
            <span className="hidden sm:inline text-slate-700 mx-2">&bull;</span>
            <span className="block sm:inline text-slate-400 text-[11px] mt-0.5 sm:mt-0">
              Lagos, Nigeria &bull; NDPA 2023 Compliant
            </span>
          </div>

          {/* Essential Legal Links: Uniform styling, lights up on hover */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 font-medium">
            <Link href="/privacy" className="hover:text-white transition-colors duration-150">
              Privacy Notice
            </Link>
            <span className="text-slate-700" aria-hidden="true">&bull;</span>
            <Link href="/terms" className="hover:text-white transition-colors duration-150">
              Terms of Use
            </Link>
            <span className="text-slate-700" aria-hidden="true">&bull;</span>
            <Link href="/account/subscription/refund" className="hover:text-white transition-colors duration-150">
              Refund Policy
            </Link>
            <span className="text-slate-700" aria-hidden="true">&bull;</span>
            <Link href="/contact" className="hover:text-white transition-colors duration-150">
              Contact Desk
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
