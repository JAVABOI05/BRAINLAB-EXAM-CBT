"use client";

import React, { useEffect } from "react";
import ExamCountdownBanner from "@/app/components/ExamCountdownBanner";
import { trackEvent } from "@/app/lib/analytics";

export interface DynamicCountdownSlotProps {
  className?: string;
}

export function DynamicCountdownSlot({ className = "" }: DynamicCountdownSlotProps) {
  useEffect(() => {
    trackEvent("countdown_viewed", { slot: "hero_countdown" });
  }, []);

  return (
    <div className={`dynamic-countdown-slot ${className}`}>
      <ExamCountdownBanner variant="hero" />
    </div>
  );
}
