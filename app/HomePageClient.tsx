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
import HomeInstantMiniMock from "./components/home/HomeInstantMiniMock";

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
    <div className="relative w-full bg-[#070D18] text-slate-100 overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Global Atmospheric Mesh Glow & High-Tech Grid Structure */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[28%] -left-48 w-[600px] h-[600px] bg-cyan-500/10 blur-[150px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[55%] -right-48 w-[700px] h-[700px] bg-purple-600/10 blur-[160px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[80%] left-1/3 w-[650px] h-[650px] bg-blue-500/10 blur-[150px]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* 1. Hero Section */}
        <HomeHero />

        {/* University Target Badges & Social Proof Bar (Directly beneath hero) */}
        <HomeUniversityTargetSocialProof />

        {/* Compact, High-Impact Broadcast Channel Ribbon */}
        <HomeJoinChannel />

        {/* 2. Audience Entry Points */}
        <HomeAudiences />

        {/* Interactive 90-Second Instant Sampler Mini-Mock */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <HomeInstantMiniMock />
        </div>

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
    </div>
  );
}
