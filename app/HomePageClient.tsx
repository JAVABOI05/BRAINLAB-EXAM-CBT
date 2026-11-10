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
    <div className="w-full bg-[var(--bl-color-canvas)] text-[var(--bl-color-text-primary)] transition-colors">
      {/* 1. Hero Section */}
      <HomeHero />

      {/* University Target Badges & Social Proof Bar (Directly beneath hero) */}
      <HomeUniversityTargetSocialProof />

      {/* Prominent Join Our Channel Block (directly beneath hero on mobile & desktop) */}
      <HomeJoinChannel />

      {/* 2. Audience Entry Points */}
      <HomeAudiences />

      {/* 3. The BrainLab Loop */}
      <HomeBrainLabLoop />

      {/* 4. Product Showcase */}
      <HomeProductShowcase />

      {/* 5. STEM Studio Spotlight */}
      <HomeStemStudio />

      {/* 6. Trust and Outcomes (Conditional) */}
      <HomeTrustOutcomes />

      {/* 7. Pricing Teaser (Real Data) */}
      <HomePricingTeaser />

      {/* 8. Founder Note (Conditional) */}
      <HomeFounderNote />

      {/* 9. FAQ and Final Call to Action */}
      <HomeFaqCta />
    </div>
  );
}
