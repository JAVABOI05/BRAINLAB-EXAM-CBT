"use client";

import React from "react";
import Link from "next/link";

export function HomeStemStudio() {
  const STEM_LABS = [
    {
      title: "Physics Mechanics & Kinematics",
      discipline: "Physics",
      description: "Tweak velocity, angles, and gravitational constants with real-time trajectory curves and projectile formula derivation.",
      badge: "Parameter Sandbox",
      icon: "📐",
    },
    {
      title: "Acid-Base Titration & pH Reactions",
      discipline: "Chemistry",
      description: "Simulate volumetric analysis, neutralization endpoints, and indicator color changes with precise molarity sliders.",
      badge: "Volumetric Lab",
      icon: "🧪",
    },
    {
      title: "Cellular Atlas & Metabolic Pathways",
      discipline: "Biology",
      description: "Interactive 3D organelle explorer and stepped Krebs cycle enzyme pathways with high-contrast cellular diagrams.",
      badge: "3D Biology",
      icon: "🧬",
    },
    {
      title: "Logic Gates & Circuit Simulators",
      discipline: "Applied Science",
      description: "Build AND, OR, and NOT gate configurations. Test truth tables with live toggles directly mapped to secondary physics curricula.",
      badge: "Circuit Stage",
      icon: "⚡",
    },
  ];

  return (
    <section
      id="stem-studio"
      aria-label="STEM Studio Virtual Science Laboratories"
      className="py-16 sm:py-20 lg:py-24 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#070D18]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-slate-950 p-8 sm:p-12 lg:p-14 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Header & Actions */}
            <div className="lg:col-span-5 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-400" />
                <span>STEM STUDIO SPOTLIGHT</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Virtual Science Labs. Real Empirical Understanding.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Rather than memorizing abstract textbook equations, candidates manipulate variables, observe instantaneous physical outcomes, and connect practical laboratory concepts directly to CBT examination questions.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Link
                  href="/classroom/stem"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition bl-focus-ring min-h-[44px]"
                >
                  <span>Launch STEM Studio</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>

                <Link
                  href="/products/stem-studio"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition bl-focus-ring min-h-[44px]"
                >
                  Learn About Labs
                </Link>
              </div>
            </div>

            {/* Right Interactive Lab Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STEM_LABS.map((lab) => (
                <div
                  key={lab.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl" role="img" aria-hidden="true">
                      {lab.icon}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded bg-slate-800 px-2 py-0.5 text-blue-300">
                      {lab.discipline}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lab.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
