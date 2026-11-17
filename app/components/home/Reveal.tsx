"use client";

import React, { useEffect, useRef } from "react";
import "./home-motion.css";

interface RevealProps {
  children: React.ReactNode;
  /** Optional stagger delay in milliseconds. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal wrapper (UI_SYSTEM.md section 5).
 *
 * - Server-rendered content is fully visible (no hidden initial state, so no flash and no
 *   dependence on JavaScript for access to content).
 * - After mount, only elements that are below the fold are armed; they fade and rise once
 *   when they enter the viewport.
 * - Skipped entirely under prefers-reduced-motion or when IntersectionObserver is missing.
 * - Animates opacity and transform only, so it causes no layout shift.
 */
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Already on screen at load: leave it visible, no animation.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    el.setAttribute("data-armed", "true");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bl-reveal ${className}`.trim()}
      style={delay ? ({ ["--bl-reveal-delay" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export default Reveal;
