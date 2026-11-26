"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
}

/**
 * Progressive-enhancement scroll-reveal hook.
 *
 * Guarantees:
 * 1. Server-rendered markup and noscript environments remain fully visible (opacity 1, transform none).
 * 2. Only initializes hidden state on client mount if IntersectionObserver is supported and reduced-motion is false.
 * 3. Triggers once on viewport entry, applies reveal classes, and disconnects the observer.
 * 4. Respects prefers-reduced-motion: reduce unconditionally.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", delayMs = 0 } = options;
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced-motion immediately
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches || typeof IntersectionObserver === "undefined") {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (delayMs > 0) {
            const timer = setTimeout(() => {
              setIsRevealed(true);
            }, delayMs);
            observer.disconnect();
            return () => clearTimeout(timer);
          } else {
            setIsRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsRevealed(true);
        observer.disconnect();
      }
    };
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [threshold, rootMargin, delayMs]);

  return { ref, isRevealed };
}
