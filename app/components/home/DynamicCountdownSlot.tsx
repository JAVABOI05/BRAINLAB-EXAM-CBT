"use client";

import React from "react";
import ExamCountdownBanner from "@/app/components/ExamCountdownBanner";

export interface DynamicCountdownSlotProps {
  className?: string;
}

export function DynamicCountdownSlot({ className = "" }: DynamicCountdownSlotProps) {
  return (
    <div className={`dynamic-countdown-slot ${className}`}>
      <ExamCountdownBanner variant="hero" />
    </div>
  );
}
