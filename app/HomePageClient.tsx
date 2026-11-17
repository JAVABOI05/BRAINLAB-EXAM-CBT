"use client";

import React from "react";
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
import { Reveal } from "./components/home/Reveal";

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
 *
 * Below-the-fold sections fade and rise once on first view (Reveal). The hero and the
 * channel ribbon are never wrapped, so the first screen paints immediately.
 */
export default function HomePageClient() {
  return (
    <div className="relative w-full bg-[#060D20] overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Brilliant Subtle Dot Matrix Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#1e293b 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/10 blur-[130px]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* 1. Hero Section */}
        <HomeHero />

        {/* Compact, High-Impact Broadcast Channel Ribbon */}
        <HomeJoinChannel />

        {/* 2. Audience Entry Points */}
        <Reveal>
          <HomeAudiences />
        </Reveal>

        {/* 3. The BrainLab Loop */}
        <Reveal>
          <HomeBrainLabLoop />
        </Reveal>

        {/* 4. Product Showcase */}
        <Reveal>
          <HomeProductShowcase />
        </Reveal>

        {/* 5. STEM Studio Spotlight */}
        <Reveal>
          <HomeStemStudio />
        </Reveal>

        {/* 6. Trust and Outcomes (Conditional) */}
        <Reveal>
          <HomeTrustOutcomes />
        </Reveal>

        {/* University Target Benchmarks & Social Proof (Lower Page Positioning) */}
        <Reveal>
          <HomeUniversityTargetSocialProof />
        </Reveal>

        {/* 7. Pricing Teaser (Real Data) */}
        <Reveal>
          <HomePricingTeaser />
        </Reveal>

        {/* 8. Founder Note (Conditional) */}
        <Reveal>
          <HomeFounderNote />
        </Reveal>

        {/* 9. FAQ and Final Call to Action */}
        <Reveal>
          <HomeFaqCta />
        </Reveal>
      </div>
    </div>
  );
}
