"use client";

import React from "react";
import Image from "next/image";
import NextLink from "next/link";
import { HOMEPAGE_CONTENT_CONFIG } from "@/app/lib/contentConfig";
import { CONTACT_CONFIG } from "@/app/lib/contactConfig";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const config = HOMEPAGE_CONTENT_CONFIG.footer;
  const contacts = CONTACT_CONFIG;

  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-900 text-slate-300 dark:border-slate-800 dark:bg-[#050b18]">
      {/* Upper Main Footer Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-6 lg:gap-8">
          {/* Brand & Contact Column */}
          <div className="space-y-6 lg:col-span-2">
            <NextLink href="/" className="inline-block bl-focus-ring rounded-lg">
              <Image
                src="/brainlab-logo-light.svg"
                alt="BrainLab Academy"
                width={150}
                height={38}
                className="h-8 w-auto"
              />
            </NextLink>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Nigeria&apos;s intelligent learning ecosystem. Providing syllabus-calibrated CBT practice, weakness diagnostics, and tutor-led academic mastery.
            </p>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
                <a
                  href={contacts.whatsapp.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Join Official WhatsApp Channel
                </a>
              </div>

              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <a
                  href={contacts.phone.dialUri}
                  className="hover:text-white transition-colors"
                >
                  {contacts.phone.display}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
                </svg>
                <a
                  href={`mailto:${contacts.email.support}`}
                  className="hover:text-white transition-colors"
                >
                  {contacts.email.support}
                </a>
              </div>
            </div>
          </div>

          {/* Sitemap Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {config.sitemap.map((category) => (
              <div key={category.category} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  {category.category}
                </h4>
                <ul className="space-y-2.5 text-sm">
                  {category.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <NextLink
                          href={link.href}
                          className="hover:text-white transition-colors"
                        >
                          {link.label}
                        </NextLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <span>Follow BrainLab Updates:</span>
            <div className="flex items-center gap-4 text-slate-300">
              <a
                href={contacts.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="Instagram"
              >
                Instagram
              </a>
              <a
                href={contacts.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="TikTok"
              >
                TikTok
              </a>
              <a
                href={contacts.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                aria-label="YouTube"
              >
                YouTube
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {currentYear} {config.legal.copyrightClaim.value}
          </p>
          <div className="flex items-center gap-6">
            <NextLink
              href={config.legal.termsHref}
              className="hover:text-slate-200 transition-colors"
            >
              Terms of Use
            </NextLink>
            <NextLink
              href={config.legal.privacyHref}
              className="hover:text-slate-200 transition-colors"
            >
              Privacy Policy
            </NextLink>
            <NextLink
              href="/syllabus"
              className="hover:text-slate-200 transition-colors"
            >
              Syllabus
            </NextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
