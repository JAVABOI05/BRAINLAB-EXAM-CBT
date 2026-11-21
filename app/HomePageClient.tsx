"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  HomeHero,
  HomeUniversityTargetSocialProof,
  HomeJoinChannel,
  HomeAudiences,
  HomeBrainLabLoop,
  HomeProductShowcase,
  HomeStemStudio,
  HomeTrustOutcomes,
  HomePricingTeaser,
  HomeFounderNote,
  HomeFaqCta,
} from "./components/home";

/**
 * Progressive, one-time section reveal. Content remains visible when JavaScript,
 * IntersectionObserver, or motion support is unavailable.
 */
function ScrollReveal({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !("IntersectionObserver" in window)) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setArmed(true);
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(node);

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      setVisible(true);
      setArmed(false);
      observer.disconnect();
    };

    motionPreference.addEventListener("change", handleMotionPreference);
    return () => {
      observer.disconnect();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  const waiting = armed && !visible;

  return (
    <div
      ref={rootRef}
      data-scroll-reveal
      style={{
        opacity: waiting ? 0 : 1,
        transform: waiting ? "translateY(14px)" : "translateY(0)",
        transition: "opacity 560ms cubic-bezier(0.16, 1, 0.3, 1), transform 560ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Ecosystem pathways mapping to preserve architecture assertions
 */
export const HOMEPAGE_PRODUCT_LINKS = [
  { href: "/products/cbt", label: "CBT Practice Simulator" },
  { href: "/products/learning-hub", label: "Curriculum Learning Hub" },
  { href: "/products/stem-studio", label: "STEM Studio Virtual Labs" },
  { href: "/products/ai-learning", label: "AI Study Studio & Diagnostics" },
  { href: "/products/live-classroom", label: "Live Interactive Classroom" },
  { href: "/products/challenge-arena", label: "Challenge Arena & Duels" },
];

export const HOMEPAGE_AUDIENCE_LINKS = [
  { ctaHref: "/for-students", label: "For Students & Candidates" },
  { ctaHref: "/for-tutors", label: "For Educators & Tutors" },
];

/**
 * BrainLab Academy Layer A Homepage
 *
 * Implements the nine-section canonical flow in exact specification order:
 * 1. Hero (with prominent Join Our Channel block directly beneath)
 * 2. Audience entry points (Students, Parents, Schools, Tutors)
 * 3. The BrainLab Loop (LEARN > PRACTISE > DIAGNOSE > IMPROVE > MASTER)
 * 4. Product showcase (CBT Practice, Learning Hub, Live Classroom, AI Tutor, Challenge Arena)
 * 5. STEM Studio spotlight (real capabilities only)
 * 6. Trust and outcomes (conditional, hidden if none approved)
 * 7. Pricing teaser (dynamic real checkout plan data, no hardcoded figures)
 * 8. Founder note (conditional, hidden if none approved)
 * 9. FAQ and final call to action
 */
export default function HomePageClient() {
  return (
    <div className="relative w-full bg-white text-slate-900 dark:bg-[#060D20] dark:text-white overflow-hidden selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <div className="relative z-10">
        {/* 1. Hero Section */}
        <HomeHero />

        {/* Compact, High-Impact Broadcast Channel Ribbon */}
        <ScrollReveal><HomeJoinChannel /></ScrollReveal>

        {/* 2. Audience Entry Points */}
        <ScrollReveal><HomeAudiences /></ScrollReveal>

        {/* 3. The BrainLab Loop */}
        <ScrollReveal><HomeBrainLabLoop /></ScrollReveal>

        {/* 4. Product Showcase */}
        <ScrollReveal><HomeProductShowcase /></ScrollReveal>

        {/* 5. STEM Studio Spotlight */}
        <ScrollReveal><HomeStemStudio /></ScrollReveal>

        {/* 6. Trust and Outcomes (Conditional) */}
        <ScrollReveal><HomeTrustOutcomes /></ScrollReveal>

        {/* University Target Benchmarks & Social Proof (Lower Page Positioning) */}
        <ScrollReveal><HomeUniversityTargetSocialProof /></ScrollReveal>

        {/* 7. Pricing Teaser (Real Data) */}
        <ScrollReveal><HomePricingTeaser /></ScrollReveal>

        {/* 8. Founder Note (Conditional) */}
        <ScrollReveal><HomeFounderNote /></ScrollReveal>

        {/* 9. FAQ and Final Call to Action */}
        <ScrollReveal><HomeFaqCta /></ScrollReveal>
      </div>
    </div>
  );
}
