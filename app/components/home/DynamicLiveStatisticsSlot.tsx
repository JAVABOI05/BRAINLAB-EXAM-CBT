"use client";

import React from "react";
import VerifiedLiveStatsBar from "@/app/components/VerifiedLiveStatsBar";

export interface DynamicLiveStatisticsSlotProps {
  className?: string;
}

export function DynamicLiveStatisticsSlot({ className = "" }: DynamicLiveStatisticsSlotProps) {
  return (
    <div className={`dynamic-live-statistics-slot ${className}`}>
      <VerifiedLiveStatsBar />
    </div>
  );
}
