"use client";

import React from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export interface PublicLayoutShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PublicLayoutShell({
  children,
  className = "",
}: PublicLayoutShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bl-color-canvas)] text-[var(--bl-color-text-primary)] antialiased transition-colors">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-[var(--bl-color-brand-primary)] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Skip to main content
      </a>

      {/* Public Header */}
      <PublicHeader />

      {/* Main Content Landmark */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 focus:outline-none ${className}`}
      >
        {children}
      </main>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
}
